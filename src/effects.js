import { effectsAPI } from "./morby-active-effects.js";

/** Pending triggers (keyed by timestamp) awaiting save resolution before firing */
let pendingTriggers = {};

/** Per-combatant damage accumulator — keyed by combatant._id, flushed after each turn phase */
let damageByCombatant = {};

/** Reset all transient combat state (pending triggers and damage accumulator). */
export function resetCombatState() {
    pendingTriggers = {};
    damageByCombatant = {};
}

/**
 * Resolve a combatant by ID and its associated actor.
 * @param {string} combatantId
 * @returns {{combatant: object|null, actor: object|null}}
 */
export function getCombatant(combatantId) {
    const combatant = game.combat?.combatants?.get(combatantId);
    if (!combatant) return { combatant: null, actor: null };
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    return { combatant, actor };
}

/**
 * Evaluate a dice formula. Returns the Roll object or null on failure.
 * @param {string} formula
 * @param {string} label Used in error messages (e.g. "HP", "damage")
 * @returns {Roll|null}
 */
async function evaluateFormula(formula, label) {
    try {
        const roll = new Roll(String(formula));
        await roll.evaluate({async: true});
        return roll;
    } catch (err) {
        console.error(`Morby Active Effects | invalid ${label} formula`, formula, err);
        return null;
    }
}

/**
 * Registry of effects processed at the start of a combatant's turn.
 * Each entry maps a flags.mae key to an async handler receiving (combatant, actor, value, timestamp).
 * The handler return value (0 or 1) is added to the save-request count for Regenerate deferral.
 */
const TURN_START_EFFECTS = [
    { flag: "heroismTempHP", handler: async (c, _a, v) => { await applyHP(c._id, true, v, "Heroism"); } },
    { flag: "lacerated", handler: async (c, _a, v) => { await applyDamage(c._id, v, "being lacerated"); } },
    { flag: "gashed", handler: async (c, _a, v) => { await applyDamage(c._id, v, "being gashed"); } },
    { flag: "acid", handler: async (c, _a, v) => { await applyDamage(c._id, v, "being exposed to acid", false, false, "acid"); } },
    { flag: "burning", handler: async (c, _a, v) => { await applyDamage(c._id, v, "being on fire", false, false, "fire"); } },
    { flag: "estrike", handler: async (c, _a, v) => { await applyDamage(c._id, v, "Ensnaring Strike"); } },
    { flag: "causticbrew", handler: async (c, _a, v) => { await applyDamage(c._id, v, "Tasha's Caustic Brew", false, false, "acid"); } },
    { flag: "rbreak", handler: async (c, _a, _v, ts) => handleRealityBreak(c._id, ts) },
    { flag: "confusion", handler: async (c) => { await handleConfusion(c._id); } },
    { flag: "searingsmite", handler: async (c, a, v, ts) => { await requestSave(c._id, "CON", "Searing Smite", { formula: v, timestamp: ts, damageType: "fire" }); return 1; } },
];

/**
 * Registry of effects processed at the end of a combatant's turn.
 * Same structure as TURN_START_EFFECTS but handlers do not receive a timestamp
 * (no save-deferred triggers originate from end-of-turn effects).
 */
const TURN_END_EFFECTS = [
    { flag: "idinsinuation", handler: async (c, _a, v) => { await applyDamage(c._id, v, "Id Insinuation", false, false, "psychic"); } },
    { flag: "acidarrow", handler: async (c, _a, v) => { await applyDamage(c._id, v, "Melf's Acid Arrow", false, false, "acid"); await effectsAPI.removeEffectOnToken(c.tokenId, "Melf's Acid Arrow"); } },
    { flag: "vsphere", handler: async (c, _a, v) => { await applyDamage(c._id, v, "Vitriolic Sphere", false, false, "acid"); await effectsAPI.removeEffectOnToken(c.tokenId, "Vitriolic Sphere"); } },
    { flag: "lacerated", handler: async (c) => { await requestSave(c._id, "CON", "Lacerated", {}); } },
    { flag: "gashed", handler: async (c) => { await requestSave(c._id, "CON", "Gashed", {}); } },
    { flag: "acid", handler: async (c) => { await requestSave(c._id, "DEX", "Acid", {}); } },
    { flag: "burning", handler: async (c) => { await requestSave(c._id, "DEX", "Burning", {}); } },
    { flag: "greaterMalison", handler: async (c) => { await requestSave(c._id, "CHA", "Greater Malison", {}); } },
    { flag: "bloodboil", handler: async (c, _a, v) => { await requestSave(c._id, "CON", "Blood Boil", { formula: v, damageType: "fire" }); } },
    { flag: "immolation", handler: async (c, _a, v) => { await requestSave(c._id, "DEX", "Immolation", { formula: v, damageType: "fire" }); } },
    { flag: "killingwinds", handler: async (c, _a, v) => { await requestSave(c._id, "CON", "Killing Winds", { formula: v, damageType: "acid" }); } },
    { flag: "pkiller", handler: async (c, _a, v) => { await requestSave(c._id, "WIS", "Phantasmal Killer", { formula: v, damageType: "psychic" }); } },
    { flag: "vpoison", handler: async (c, _a, v) => { await requestSave(c._id, "CON", "Voracious Poison", { formula: v, damageType: "poison" }); } },
    { flag: "weird", handler: async (c, _a, v) => { await requestSave(c._id, "WIS", "Weird", { formula: v, damageType: "psychic" }); } },
    { flag: "synapticstatic", handler: async (c) => { await requestSave(c._id, "INT", "Synaptic Static", {}); } },
    { flag: "rbreak", handler: async (c) => { await requestSave(c._id, "WIS", "Reality Break", {}); } },
    { flag: "confusion", handler: async (c) => { await requestSave(c._id, "WIS", "Confusion", {}); } },
];

/**
 * Process all turn-start effects for the current combatant.
 * @param {Combat} combat Foundry combat object — uses combat.current to identify the combatant
 */
export async function handleTurnStartEffects(combat) {
    if (!combat.current) return;
    const { combatant, actor } = getCombatant(combat.current.combatantId);
    if (!combatant || !actor) return;

    // Initialize the per-combatant damage accumulator for this turn phase
    damageByCombatant[combatant._id] = 0;

    let saveRequests = 0;
    const timestamp = String(Date.now());
    const flags = actor.flags?.mae;

    // Iterate the registry — each handler may call applyDamage (accumulates) or requestSave (returns 1)
    for (const { flag, handler } of TURN_START_EFFECTS) {
        const value = flags?.[flag];
        if (value !== undefined) {
            saveRequests += await handler(combatant, actor, value, timestamp) ?? 0;
        }
    }

    // Regenerate: applies HP and removes Lacerated.
    // If any saves are pending, defer the regen action until all saves are resolved.
    if (flags?.regenerate !== undefined) {
        const doRegen = async () => {
            await applyHP(combatant._id, false, flags.regenerate, "Regenerate", saveRequests > 0);
            if (flags?.lacerated !== undefined) {
                await effectsAPI.removeEffectOnToken(combatant.tokenId, "Lacerated");
            }
        };
        if (saveRequests == 0) {
            await doRegen();
        } else {
            pendingTriggers[timestamp] = { saveRequests, trigger: doRegen };
        }
    }

    // Flush accumulated damage for this combatant
    const netDamage = damageByCombatant[combatant._id];
    delete damageByCombatant[combatant._id];
    if (netDamage !== 0) {
        await actor.applyDamage(netDamage);
    }
};

/**
 * Process all turn-end effects for the previous combatant.
 * @param {Combat} combat Foundry combat object — uses combat.previous to identify the combatant
 */
export async function handleTurnEndEffects(combat) {
    if (!combat.previous) return;
    const { combatant, actor } = getCombatant(combat.previous.combatantId);
    if (!combatant || !actor) return;

    damageByCombatant[combatant._id] = 0;

    const flags = actor.flags?.mae;
    for (const { flag, handler } of TURN_END_EFFECTS) {
        const value = flags?.[flag];
        if (value !== undefined) {
            await handler(combatant, actor, value);
        }
    }

    const netDamage = damageByCombatant[combatant._id];
    delete damageByCombatant[combatant._id];
    if (netDamage !== 0) {
        await actor.applyDamage(netDamage);
    }
};

/**
 * Apply HP (healing or temporary) to a combatant.
 * @param {string} combatantId The combatant._id to apply HP to
 * @param {boolean} isTemporary Whether this is temporary HP (tempHP) or healing
 * @param {string} formula Dice formula to roll (e.g. "2d8+4")
 * @param {string} effectName Display name of the source effect
 * @param {boolean} [direct=false] true = apply directly to actor (save-click handler);
 *   false = accumulate into damageByCombatant for later flush (turn processing)
 */
/** @visibleForTesting */
export async function applyHP(combatantId, isTemporary, formula, effectName, direct = false) {
    const { combatant, actor } = getCombatant(combatantId);
    if (!combatant || !actor) return;
    const roll = await evaluateFormula(formula, "HP");
    if (!roll) return;

    let extraText = "";
    if (isTemporary) {
        if(actor.system.attributes.hp.temp > roll.total) {
            extraText = `, but they still have ${actor.system.attributes.hp.temp} temporary HP`;
        };
        await actor.applyTempHP(roll.total);
    } else {
        if (actor.system.attributes.hp.value == 0 && roll.total > 0) {
            extraText = ` while at 0HP and is <b>no longer dying</b>`;
        }
        // Direct path: save-click handler, apply immediately.
        // Accumulator path: turn processing, defer until end of phase.
        if (direct) {
            await actor.applyDamage(-roll.total);
        } else {
            damageByCombatant[combatantId] = (damageByCombatant[combatantId] || 0) - roll.total;
        }
    };

    await roll.toMessage({ sound: null, speaker: null,
        flavor: `${combatant.name} ${isTemporary ? "gains up to" : "recovers"} ${roll.total} ${isTemporary ? "temporary HP" : "HP"} from ${effectName}${extraText}!`
    }, {rollMode: "public"});
};

/**
 * Compute a damage multiplier based on the actor's damage resistance/vulnerability/immunity.
 * @param {object} actor The actor document
 * @param {string|null} damageType The damage type (e.g. "fire", "acid")
 * @returns {number} 0 (immune), 0.5 (resistant), 2 (vulnerable), or 1 (normal)
 */
function getDamageMultiplier(actor, damageType) {
    // If nothing is known, assume normal damage
    if (!damageType || !actor?.system?.traits) return 1;

    // Get Actor traits (damage resistance, immunity and vulnerability)
    const t = actor.system.traits;
    // Helper function to determine if an actor has a damage type trait
    const has = (set, type) => set?.value?.includes?.(type) || set?.value?.has?.(type) || false;

    // If the actor has damageType immunity, damage multiplier is 0
    if (has(t.di, damageType)) return 0;

    // Process resistance and vulnerability
    const vuln = has(t.dv, damageType);
    const resist = has(t.dr, damageType);
    // If the actor is both, do normal damage
    if (vuln && resist) return 1;
    // If the actor is vulnerable to the damageType, double it
    if (vuln) return 2;
    // If the actor resists the damageType, halve it
    if (resist) return 0.5;

    // If there is no associated trait, do normal damage
    return 1;
}

/**
 * Apply damage to a combatant.
 * @param {string} combatantId The combatant._id to apply damage to
 * @param {string} formula Dice formula to roll (e.g. "6d12")
 * @param {string} effectName Display name of the source effect
 * @param {boolean} [halfDamage=false] Whether to halve the rolled damage
 * @param {boolean} [direct=false] true = apply directly to actor (save-click handler);
 *   false = accumulate into damageByCombatant for later flush (turn processing)
 * @param {string|null} [damageType=null] Damage type for resistance/vulnerability checks
 */
export async function applyDamage(combatantId, formula, effectName, halfDamage = false, direct = false, damageType = null) {
    if (formula == null || formula === "") return;

    // Ensure combatant and roll
    const { combatant, actor } = getCombatant(combatantId);
    if (!combatant) return;
    const roll = await evaluateFormula(formula, "damage");
    if (!roll) return;

    // Determine the amount of damage to apply
    const mult = getDamageMultiplier(actor, damageType);
    const amount = Math.floor(Math.floor(roll.total / (halfDamage ? 2 : 1)) * mult);

    // Apply the damage immediatly if direct or accumulate it
    if (direct) {
        await actor.applyDamage(amount);
    } else {
        damageByCombatant[combatantId] = (damageByCombatant[combatantId] || 0) + amount;
    }

    // Show a chat message with the damage application
    await roll.toMessage({ sound: null, speaker: null,
        flavor: `${combatant.name} suffers ${amount} points of damage from ${effectName}!`
    }, {rollMode: "public"});
};

/**
 * Send a whisper to the GM with Roll Save, Success, and Failure buttons.
 * @param {string} combatantId The combatant._id that must make the save
 * @param {string} save Ability abbreviation: STR, DEX, CON, INT, WIS, CHA
 * @param {string} effectName Display name of the source effect
 * @param {Object} [opts={}] Options
 * @param {string} [opts.formula=""]  Dice formula for damage on a failed save
 * @param {string} [opts.timestamp]   Batch identifier for save-request counting / Regenerate deferral
 * @param {boolean} [opts.removeOnSave=true] Whether to remove the effect on a successful save
 * @param {boolean} [opts.halfDamage=false]  Whether the target takes half damage on a successful save
 * @param {string|null} [opts.damageType=null] Damage type for resistance/vulnerability on save damage
 */
async function requestSave(combatantId, save, effectName, opts = {}) {
    const { formula = "", timestamp, removeOnSave = true, halfDamage = false, damageType = null } = opts;
    const { combatant } = getCombatant(combatantId);
    if (!combatant) return;
    // Escape helper function
    const esc = (s) => String(s).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    // Attribute builder helper function
    const attr = (obj) => Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `data-${k}='${esc(v)}'`).join(' ');
    // Base attributes
    const base = { "combatant-id": combatantId, "effect-name": effectName, "effect-formula": formula, timestamp, "damage-type": damageType };
    // Define the html buttons using the attributes
    const roll = `<button class='mae-save-roll' ${attr({ "combatant-id": combatantId, "ability-id": save })}><i class="fas fa-dice-d20"></i>Roll ${esc(save)} Save</button>`;
    const success = `<button class='mae-save-success' ${attr({ ...base, remove: removeOnSave, "half-damage": halfDamage })}><i class="fas fa-check"></i>Success</button>`;
    const fail = `<button class='mae-save-failure' ${attr(base)}><i class="fas fa-xmark"></i>Failure</button>`;
    // Display chat message
    await ChatMessage.create({content: `${combatant.name} must roll a(n) ${save} save against ${effectName}. <hr/> ${roll} <hr/> ${success} ${fail}`, whisper: game.userId});
};

/**
 * Random d10 table for Reality Break.
 * @param {string} combatantId The combatant._id affected by Reality Break
 * @param {string} timestamp Batch identifier for save-request counting
 * @returns {number} 1 if a save was requested (for Regenerate deferral counting), 0 otherwise
 */
/** @visibleForTesting */
export async function handleRealityBreak(combatantId, timestamp) {
    const { combatant } = getCombatant(combatantId);
    if (!combatant) return 0;
    const roll = new Roll("1d10");
    await roll.evaluate({async: true});

    switch (roll.total) {
        case 1:
        case 2:
            // Stunned + 6d12 damage
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} is sees a Vision of the Far Realm and is <b>stunned</b> until the end of the turn!`
            }, {rollMode: "public"});
            await applyDamage(combatantId, "6d12", "from Reality Break's Vision of the Far Realm");
            return 0;
        case 3:
        case 4:
        case 5:
            // DEX save vs 8d12 (half on success)
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} is swallowed by a Rending Rift!`
            }, {rollMode: "public"});
            await requestSave(combatantId, "DEX", "Reality Break's Rending Rift", { formula: "8d12", timestamp, removeOnSave: false, halfDamage: true });
            return 1;
        case 6:
        case 7:
        case 8:
            // Prone + 10d12 damage
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} teleports up to 30 feet through a wormhole and is knocked <b>prone</b>!`
            }, {rollMode: "public"});
            await applyDamage(combatantId, "10d12", "from Reality Break's Wormhole");
            return 0;
        case 9:
        case 10:
            // Blinded + 10d12 damage
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} chilled by the Dark Void and is <b>blinded</b> until the end of the turn!`
            }, {rollMode: "public"});
            await applyDamage(combatantId, "10d12", "from Reality Break's Dark Void");
    };
    return 0;
};

const CONFUSION_DIRECTIONS = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];

/**
 * Random d10 table for Confusion.
 * Results range from wasting a turn (1–6) to random attacks (7–8) to acting normally (9–10).
 * @param {string} combatantId The combatant._id affected by Confusion
 */
/** @visibleForTesting */
export async function handleConfusion(combatantId) {
    const { combatant } = getCombatant(combatantId);
    if (!combatant) return;
    const roll = new Roll("1d10");
    await roll.evaluate({async: true});

    switch (roll.total) {
        case 1:
            // Random direction movement, no action
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} uses all its movement to move in a random direction. The creature doesn't take an action this turn!`
            }, {rollMode: "public"});

            const dirRoll = new Roll("1d8");
            await dirRoll.evaluate({async: true});
            await dirRoll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} uses all its movement to move <b>${CONFUSION_DIRECTIONS[dirRoll.total - 1]}</b>!`
            }, {rollMode: "public"});
            break;
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
            // No movement or action
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} doesn't move or take actions this turn!`
            }, {rollMode: "public"});
            break;
        case 7:
        case 8:
            // Random melee attack
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} uses its action to make a melee attack against a randomly determined creature within its reach. If there is no creature within its reach, they do nothing this turn!`
            }, {rollMode: "public"});
            break;
        case 9:
        case 10:
            // Acts normally
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} can act and move normally!!`
            }, {rollMode: "public"});
    };
}

/**
 * Resolve one save request.
 * Decrements the pending counter for the given timestamp batch.
 * When all saves in a batch are resolved, fires the deferred trigger (typically Regenerate).
 * @param {string} timestamp The batch identifier from a previous requestSave call
 */
export async function handleResolvedSaveRequest(timestamp) {
    if (pendingTriggers[timestamp]) {
        if (pendingTriggers[timestamp]["saveRequests"] > 0) {
            pendingTriggers[timestamp]["saveRequests"] -= 1;
        }
        if (pendingTriggers[timestamp]["saveRequests"] === 0) {
            await pendingTriggers[timestamp]["trigger"]();
            delete pendingTriggers[timestamp];
        };
    };
};
