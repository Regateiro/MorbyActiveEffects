import { effectsAPI } from "./morby-active-effects.js";

/**
 * Triggers waiting for save request resolution
 */
let pendingTriggers = {};

/**
 * Damage and temp HP to be applied at the end of the current processing
 *   to avoid multiple applications of the same effect in one turn from stacking incorrectly
 */
let damage = 0;

/**
 * Process all applicable turn start effects and begin processing
 * @param {Combat} combat Foundry combat data
 */
export async function handleTurnStartEffects(combat) {
    const combatant = combat.combatants.get(combat.current.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);

    // Reset damage to be applied at the end of the processing
    damage = 0;

    let saveRequests = 0;
    const timestamp = String(Date.now());
    if(actor.flags?.mae?.heroismTempHP) {
        await applyHP(combatant._id, true, actor.flags.mae.heroismTempHP, "Heroism");
    };
    if(actor.flags?.mae?.lacerated) {
        await applyDamage(combatant._id, actor.flags.mae.lacerated, "being lacerated");
    };
    if(actor.flags?.mae?.gashed) {
        await applyDamage(combatant._id, actor.flags.mae.gashed, "being gashed");
    };
    if(actor.flags?.mae?.estrike) {
        await applyDamage(combatant._id, actor.flags.mae.estrike, "Ensnaring Strike");
    };
    if(actor.flags?.mae?.causticbrew) {
        await applyDamage(combatant._id, actor.flags.mae.causticbrew, "Tasha's Caustic Brew");
    };
    if(actor.flags?.mae?.rbreak) {
        saveRequests += await handleRealityBreak(combatant._id, timestamp);
    };
    if(actor.flags?.mae?.confusion) {
        await handleConfusion(combatant._id);
    };
    if(actor.flags?.mae?.searingsmite) {
        saveRequests += 1;
        await requestSave(combatant._id, actor.flags.mae.searingsmite, "CON", "Searing Smite", timestamp);
    };
    if(actor.flags?.mae?.regenerate) {
        if(saveRequests == 0) {
            await applyHP(combatant._id, false, actor.flags.mae.regenerate, "Regenerate");
            if(actor.flags?.mae?.lacerated) {
                await effectsAPI.removeEffectOnToken(combatant.tokenId, "Lacerated");
            };
        } else {
            pendingTriggers[timestamp] = {
                "saveRequests": saveRequests,
                "trigger": async function() {
                    await applyHP(combatant._id, false, actor.flags.mae.regenerate, "Regenerate");
                    if(actor.flags?.mae?.lacerated) {
                        await effectsAPI.removeEffectOnToken(combatant.tokenId, "Lacerated");
                    };
                }
            };
        };
    };

    // Apply any damage that was delayed to be applied at the end of the turn
    if (damage > 0) {
        await actor.applyDamage(damage);
    };
};

/**
 * Process all applicable turn end effects and begin processing
 * @param {Combat} combat Foundry combat data
 */
export async function handleTurnEndEffects(combat) {
    const combatant = combat.combatants.get(combat.previous.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);

    // Reset damage to be applied at the end of the processing
    damage = 0;

    if(actor.flags?.mae?.idinsinuation) {
        await applyDamage(combatant._id, actor.flags.mae.idinsinuation, "Id Insinuation");
    };
    if(actor.flags?.mae?.acidarrow) {
        await applyDamage(combatant._id, actor.flags.mae.acidarrow, "Melf's Acid Arrow");
        await effectsAPI.removeEffectOnToken(combatant.tokenId, "Melf's Acid Arrow");
    };
    if(actor.flags?.mae?.vsphere) {
        await applyDamage(combatant._id, actor.flags.mae.vsphere, "Vitriolic Sphere");
        await effectsAPI.removeEffectOnToken(combatant.tokenId, "Vitriolic Sphere");
    };
    if(actor.flags?.mae?.lacerated) {
        await requestSave(combatant._id, "", "CON", "Lacerated");
    };
    if(actor.flags?.mae?.gashed) {
        await requestSave(combatant._id, "", "CON", "Gashed");
    };
    if(actor.flags?.mae?.greaterMalison) {
        await requestSave(combatant._id, "", "CHA", "Greater Malison");
    };
    if(actor.flags?.mae?.bloodboil) {
        await requestSave(combatant._id, actor.flags.mae.bloodboil, "CON", "Blood Boil");
    };
    if(actor.flags?.mae?.immolation) {
        await requestSave(combatant._id, actor.flags.mae.immolation, "DEX", "Immolation");
    };
    if(actor.flags?.mae?.killingwinds) {
        await requestSave(combatant._id, actor.flags.mae.killingwinds, "CON", "Killing Winds");
    };
    if(actor.flags?.mae?.pkiller) {
        await requestSave(combatant._id, actor.flags.mae.pkiller, "WIS", "Phantasmal Killer");
    };
    if(actor.flags?.mae?.vpoison) {
        await requestSave(combatant._id, actor.flags.mae.vpoison, "CON", "Voracious Poison");
    };
    if(actor.flags?.mae?.weird) {
        await requestSave(combatant._id, actor.flags.mae.weird, "WIS", "Weird");
    };
    if(actor.flags?.mae?.synapticstatic) {
        await requestSave(combatant._id, "", "INT", "Synaptic Static");
    };
    if(actor.flags?.mae?.rbreak) {
        await requestSave(combatant._id, "", "WIS", "Reality Break");
    };
    if(actor.flags?.mae?.confusion) {
        await requestSave(combatant._id, "", "WIS", "Confusion");
    };

    // Apply any damage that was delayed to be applied at the end of the turn
    if (damage > 0) {
        await actor.applyDamage(damage);
    };
};

/**
 * Apply HP to the actor.
 * @param {String} combatantId The id of the combatant
 * @param {Boolean} isTemporary Whether the HP to be applied is temporary or not
 * @param {String} formula The formula to calculate the HP restored from
 * @param {String} effectName The name of the effect triggering this HP recovery
 */
async function applyHP(combatantId, isTemporary, formula, effectName) {
    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    const roll = new Roll(String(formula));
    await roll.evaluate({async: true});

    let extraText = "";
    if (isTemporary) {
        // If the actor already had temporary HP, specify how much they have after applying this effect
        if(actor.system.attributes.hp.temp > roll.total) {
            extraText = `, but they still have ${actor.system.attributes.hp.temp} temporary HP`;
        };
        // Apply temporary HP
        await actor.applyTempHP(roll.total);
    } else {
        // If the actor is being healed from 0 HP, specify that they are no longer dying
        if (actor.system.attributes.hp.value == 0 && roll.total > 0) {
            extraText = ` while at 0HP and is <b>no longer dying</b>`;
        }
        // Apply healing
        damage -= roll.total;
    };

    // Display Chat Message
    await roll.toMessage({ sound: null, speaker: null,
        flavor: `${combatant.name} ${isTemporary ? "gains up to" : "recovers"} ${roll.total} ${isTemporary ? "temporary HP" : "HP"} from ${effectName}${extraText}!`
    }, {rollMode: "public"});
};

/**
 * Apply damage to the actor.
 * @param {String} combatantId The id of the combatant
 * @param {String} formula The formula to calculate the HP restored from
 * @param {String} effectName The name of the effect triggering this damage
 * @param {Boolean} halfDamage Whether damage applied should be cut in half
 */
export async function applyDamage(combatantId, formula, effectName, halfDamage = false) {
    // If there is no formula, do nothing
    if (!formula) return;

    // Calculate damage
    const combatant = game.combat.combatants.get(combatantId);
    const roll = new Roll(String(formula));
    await roll.evaluate({async: true});

    // Apply damage
        damage += roll.total;

    // Display Chat Message
    await roll.toMessage({ sound: null, speaker: null,
        flavor: `${combatant.name} suffers ${roll.total} points of damage from ${effectName}!`
    }, {rollMode: "public"});
};

/**
 * Request a save to the DM
 * @param {String} combatantId The id of the combatant
 * @param {String} formula The formula to calculate the HP restored from
 * @param {String} save The save to requests (STR, CON, DEX, INT, WIS, CHA)
 * @param {String} effectName The name of the effect triggering this save request
 * @param {String} timestamp The timestamp of this request, so waiting triggers can happen after it's resolved
 * @param {Boolean} removeOnSave Whether the effect should be removed on a successful save
 * @param {Boolean} halfDamage Whether the combatant still takes half damage on a successful save
 */
async function requestSave(combatantId, formula, save, effectName, timestamp, removeOnSave = true, halfDamage = false) {
    const combatant = game.combat.combatants.get(combatantId);
    // Define the buttons
    const roll = `<button class='mae-save-roll' data-combatant-id='${combatantId}' data-ability-id='${save}'><i class="fas fa-dice-d20"></i>Roll ${save} Save</button>`;
    const success = `<button class='mae-save-success' data-combatant-id='${combatantId}' data-effect-name='${effectName}' data-effect-formula='${formula}' data-remove='${removeOnSave}' data-half-damage='${halfDamage}' data-timestamp='${timestamp}'><i class="fas fa-check"></i>Success</button>`;
    const fail = `<button class='mae-save-failure' data-combatant-id='${combatantId}' data-effect-name='${effectName}' data-effect-formula='${formula}' data-timestamp='${timestamp}'><i class="fas fa-xmark"></i>Failure</button>`;
    // Print the message
    await ChatMessage.create({content: `${combatant.name} must roll a(n) ${save} save against ${effectName}. <hr/> ${roll} <hr/> ${success} ${fail}`, whisper: game.userId});
};

/**
 * Handle Reality Break roll table
 * @param {String} combatantId The id of the combatant
 * @param {String} timestamp The timestamp of this request, so waiting triggers can happen after it's resolved
 * @returns
 */
async function handleRealityBreak(combatantId, timestamp) {
    const combatant = game.combat.combatants.get(combatantId);
    const roll = new Roll("1d10");
    await roll.evaluate({async: true});

    switch (roll.total) {
        case 1:
        case 2:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} is sees a Vision of the Far Realm and is <b>stunned</b> until the end of the turn!`
            }, {rollMode: "public"});
            await applyDamage(combatantId, "6d12", "from Reality Break's Vision of the Far Realm");
            return 0;
        case 3:
        case 4:
        case 5:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} is swallowed by a Rending Rift!`
            }, {rollMode: "public"});
            await requestSave(combatantId, "8d12", "DEX", "Reality Break's Rending Rift", timestamp, false, true);
            return 1;
        case 6:
        case 7:
        case 8:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} teleports up to 30 feet through a wormhole and is knocked <b>prone</b>!`
            }, {rollMode: "public"});
            await applyDamage(combatantId, "10d12", "from Reality Break's Wormhole");
            return 0;
        case 9:
        case 10:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${combatant.name} chilled by the Dark Void and is <b>blinded</b> until the end of the turn!`
            }, {rollMode: "public"});
            await applyDamage(combatantId, "10d12", "from Reality Break's Dark Void");
    };
    return 0;
};

/**
 * Handle Confusion roll table
 * @param {String} combatantId The id of the combatant
 */
async function handleConfusion(combatantId) {
    const combatant = game.combat.combatants.get(combatantId);
    const roll = new Roll("1d10");
    await roll.evaluate({async: true});

    switch (roll.total) {
        case 1:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} uses all its movement to move in a random direction. The creature doesn't take an action this turn!`
            }, {rollMode: "public"});

            const directions = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
            const dirRoll = new Roll("1d8");
            await dirRoll.evaluate({async: true});
            await dirRoll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} uses all its movement to move <b>${directions[dirRoll.total - 1]}</b>!`
            }, {rollMode: "public"});
            break;
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} doesn't move or take actions this turn!`
            }, {rollMode: "public"});
            break;
        case 7:
        case 8:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} uses its action to make a melee attack against a randomly determined creature within its reach. If there is no creature within its reach, they do nothing this turn!`
            }, {rollMode: "public"});
            break;
        case 9:
        case 10:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${combatant.name} can act and move normally!!`
            }, {rollMode: "public"});
    };
}

/**
 * Resolves one save request and triggers pending functions
 * @param {String} timestamp The timestamp of this request, so waiting triggers can happen after it's resolved
 */
export async function handleResolvedSaveRequest(timestamp) {
    // If there are any pending triggers on this timestamp
    if (pendingTriggers[timestamp]) {
        // Decrements the number of save requests the triggers are waiting on
        pendingTriggers[timestamp]["saveRequests"] = pendingTriggers[timestamp]["saveRequests"] - 1;
        // If the last save request has been resolved
        if (pendingTriggers[timestamp]["saveRequests"] == 0) {
            // Call the trigger
            pendingTriggers[timestamp]["trigger"]();
            // Delete the pending trigger information
            delete pendingTriggers[timestamp];
        };
    };
};