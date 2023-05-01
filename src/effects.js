import { effectsAPI } from "./morby-active-effects.js";

/**
 * Triggers waiting for save request resolution
 */
let pendingTriggers = {};

/**
 * Process all applicable turn start effects and begin processing
 * @param {Combat} combat Foundry combat data
 */
export async function handleTurnStartEffects(combat) {
    const combatant = combat.combatants.get(combat.current.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    let actorUpdates = await generateActorUpdates(combatant._id);

    let saveRequests = 0;
    const timestamp = String(Date.now());
    if(actor.flags?.mae?.heroismTempHP) {
        await applyHP(actorUpdates, combatant._id, true, actor.flags.mae.heroismTempHP, "Heroism");
    };
    if(actor.flags?.mae?.lacerated) {
        await applyDamage(actorUpdates, combatant._id, actor.flags.mae.lacerated, "being lacerated");
    };
    if(actor.flags?.mae?.estrike) {
        await applyDamage(actorUpdates, combatant._id, actor.flags.mae.estrike, "Ensnaring Strike");
    };
    if(actor.flags?.mae?.causticbrew) {
        await applyDamage(actorUpdates, combatant._id, actor.flags.mae.causticbrew, "Tasha's Caustic Brew");
    };
    if(actor.flags?.mae?.rbreak) {
        saveRequests += await handleRealityBreak(actorUpdates, combatant._id, timestamp);
    };
    if(actor.flags?.mae?.confusion) {
        await handleConfusion(combatant._id);
    };
    if(actor.flags?.mae?.regenerate) {
        if(saveRequests == 0) {
            await applyHP(actorUpdates, combatant._id, false, actor.flags.mae.regenerate, "Regenerate");
        } else {
            pendingTriggers[timestamp] = {
                "saveRequests": saveRequests,
                "trigger": async function(au) { await applyHP(au, combatant._id, false, actor.flags.mae.regenerate, "Regenerate"); }
            };
        };
    };

    await actor.update(actorUpdates);
};

/**
 * Process all applicable turn end effects and begin processing
 * @param {Combat} combat Foundry combat data
 */
export async function handleTurnEndEffects(combat) {
    const combatant = combat.combatants.get(combat.previous.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    let actorUpdates = await generateActorUpdates(combatant._id);

    if(actor.flags?.mae?.idinsinuation) {
        await applyDamage(actorUpdates, combatant._id, actor.flags.mae.idinsinuation, "Id Insinuation");
    };
    if(actor.flags?.mae?.acidarrow) {
        await applyDamage(actorUpdates, combatant._id, actor.flags.mae.acidarrow, "Melf's Acid Arrow");
        await effectsAPI.removeEffectOnToken(combatant.tokenId, "Melf's Acid Arrow");
    };
    if(actor.flags?.mae?.vsphere) {
        await applyDamage(actorUpdates, combatant._id, actor.flags.mae.vsphere, "Vitriolic Sphere");
        await effectsAPI.removeEffectOnToken(combatant.tokenId, "Vitriolic Sphere");
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
    if(actor.flags?.mae?.rbreak) {
        await requestSave(combatant._id, "", "WIS", "Reality Break");
    };
    if(actor.flags?.mae?.confusion) {
        await requestSave(combatant._id, "", "WIS", "Confusion");
    };

    await actor.update(actorUpdates);
};

/**
 * Generates a new actorUpdates variable from a combatant
 * @param {String} combatantId The id of the combatant
 * @returns An object with current actor values
 */
export async function generateActorUpdates(combatantId) {
    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    return {
        "system.attributes.hp.value": Number(actor.system.attributes.hp.value),
        "system.attributes.hp.max": Number(actor.system.attributes.hp.max),
        "system.attributes.hp.temp": Number(actor.system.attributes.hp.temp)
    };
};

/**
 * Apply HP to the actor.
 * @param {Object} actorUpdates An object with the current HP values of the actor
 * @param {String} combatantId The id of the combatant
 * @param {Boolean} isTemporary Whether the HP to be applied is temporary or not
 * @param {String} formula The formula to calculate the HP restored from
 * @param {String} effectName The name of the effect triggering this HP recovery
 */
async function applyHP(actorUpdates, combatantId, isTemporary, formula, effectName) {
    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    const roll = new Roll(String(formula));
    await roll.evaluate({async: true});

    let extraText = "";
    if (isTemporary) {
        // Apply tempHP if it is higher than the current amount TODO: Armor Masteries support
        if(actorUpdates["system.attributes.hp.temp"] < roll.total) {
            actorUpdates["system.attributes.hp.temp"] = roll.total;
        }
    } else {
        if (actorUpdates["system.attributes.hp.value"] == 0 && roll.total > 0) {
            extraText = ` while at 0HP and is <b>no longer dying</b>`;
        }
        actorUpdates["system.attributes.hp.value"] = Math.min(
            actorUpdates["system.attributes.hp.value"] + roll.total, 
            actorUpdates["system.attributes.hp.max"]
        );
    };

    // Display Chat Message
    await roll.toMessage({ sound: null, speaker: null,
        flavor: `${actor.name} recovers ${roll.total}${isTemporary ? " temporary HP" : "HP"} from ${effectName}${extraText}!`
    });
};

/**
 * Apply damage to the actor.
 * @param {Object} actorUpdates An object with the current HP values of the actor
 * @param {String} combatantId The id of the combatant
 * @param {String} formula The formula to calculate the HP restored from
 * @param {String} effectName The name of the effect triggering this damage
 * @param {Boolean} halfDamage Whether damage applied should be cut in half
 */
export async function applyDamage(actorUpdates, combatantId, formula, effectName, halfDamage = false) {
    if (!formula) return;

    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    const roll = new Roll(String(formula));
    await roll.evaluate({async: true});

    let damage = roll.total;
    if (halfDamage) {
        damage = Math.floor(roll.total / 2);
    };

    // Calculate new HP values
    const tempHP = actorUpdates["system.attributes.hp.temp"];
    const newTempHP = Math.max(tempHP - damage, 0);
    const HP = actorUpdates["system.attributes.hp.value"];
    const newHP = Math.max(HP - damage + tempHP, 0);

    // Warn if the HP reached 0
    let extraText = "";
    if(HP > 0 && newHP == 0) {
        extraText = ` while at ${HP}HP and is now <b>dying</b>`;
    } else if (newHP == 0) {
        extraText = ` while <b>dying</b>`;
    };

    // Apply HP
    actorUpdates["system.attributes.hp.temp"] = newTempHP;
    actorUpdates["system.attributes.hp.value"] = newHP;


    // Display Chat Message
    await roll.toMessage({ sound: null, speaker: null,
        flavor: `${actor.name} suffers ${damage} points of damage from ${effectName}${extraText}!`
    });
};

/**
 * Request a save to the DM
 * @param {String} combatantId The id of the combatant
 * @param {String} formula The formula to calculate the HP restored from
 * @param {String} save The save to requests (STR, CON, DEX, INT, WIS, CHA)
 * @param {String} effectName The name of the effect triggering this save request
 * @param {Boolean} removeOnSave Whether the effect should be removed on a successful save
 * @param {Boolean} halfDamage Whether the combatant still takes half damage on a successful save
 * @param {String} timestamp The timestamp of this request, so waiting triggers can happen after it's resolved
 */
async function requestSave(combatantId, formula, save, effectName, removeOnSave = true, halfDamage = false, timestamp) {
    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    // Define the apply button for other users
    const success = `<button class='mae-save-success' data-combatant-id='${combatantId}' data-effect-name='${effectName}' data-effect-formula='${formula}' data-remove='${removeOnSave}' data-half-damage='${halfDamage}' data-timestamp='${timestamp}'><i class="fas fa-check"></i>Success</button>`;
    const fail = `<button class='mae-save-failure' data-combatant-id='${combatantId}' data-effect-name='${effectName}' data-effect-formula='${formula}' data-timestamp='${timestamp}'><i class="fas fa-xmark"></i>Failure</button>`;
    // Print the message
    await ChatMessage.create({content: `${actor.name} must roll a ${save} save against ${effectName}. ${success} ${fail}`, whisper: game.userId});
};

/**
 * Handle Reality Break roll table
 * @param {Object} actorUpdates An object with the current HP values of the actor
 * @param {String} combatantId The id of the combatant
 * @param {String} timestamp The timestamp of this request, so waiting triggers can happen after it's resolved
 * @returns 
 */
async function handleRealityBreak(actorUpdates, combatantId, timestamp) {
    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    const roll = new Roll("1d10");
    await roll.evaluate({async: true});

    switch (roll.total) {
        case 1:
        case 2:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${actor.name} is sees a Vision of the Far Realm and is <b>stunned</b> until the end of the turn!`
            });
            await applyDamage(actorUpdates, combatantId, "6d12", "from Reality Break's Vision of the Far Realm");
            return 0;
        case 3:
        case 4:
        case 5:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${actor.name} is swallowed by a Rending Rift!`
            });
            await requestSave(combatantId, "8d12", "DEX", "Reality Break's Rending Rift", false, true, timestamp);
            return 1;
        case 6:
        case 7:
        case 8:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${actor.name} teleports up to 30 feet through a wormhole and is knocked <b>prone</b>!`
            });
            await applyDamage(actorUpdates, combatantId, "10d12", "from Reality Break's Wormhole");
            return 0;
        case 9:
        case 10:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Reality Break: ${actor.name} chilled by the Dark Void and is <b>blinded</b> until the end of the turn!`
            });
            await applyDamage(actorUpdates, combatantId, "10d12", "from Reality Break's Dark Void");
    };
    return 0;
};

/**
 * Handle Confusion roll table
 * @param {String} combatantId The id of the combatant
 */
async function handleConfusion(combatantId) {
    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    const roll = new Roll("1d10");
    await roll.evaluate({async: true});

    switch (roll.total) {
        case 1:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${actor.name} uses all its movement to move in a random direction. The creature doesn't take an action this turn!`
            });

            const directions = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
            const dirRoll = new Roll("1d8");
            await dirRoll.evaluate({async: true});
            await dirRoll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${actor.name} uses all its movement to move <b>${directions[dirRoll.total - 1]}</b>!`
            });
            break;
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${actor.name} doesn't move or take actions this turn!`
            });
            break;
        case 7:
        case 8:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${actor.name} uses its action to make a melee attack against a randomly determined creature within its reach. If there is no creature within its reach, they do nothing this turn!`
            });
            break;
        case 9:
        case 10:
            // Display Chat Message
            await roll.toMessage({ sound: null, speaker: null,
                flavor: `Confusion: ${actor.name} can act and move normally!!`
            });
    };
}

/**
 * Resolves one save request and triggers pending functions
 * @param {Object} actorUpdates An object with the current HP values of the actor
 * @param {String} timestamp The timestamp of this request, so waiting triggers can happen after it's resolved
 */
export async function handleResolvedSaveRequest(actorUpdates, timestamp) {
    // If there are any pending triggers on this timestamp
    if (pendingTriggers[timestamp]) {
        // Decrements the number of save requests the triggers are waiting on
        pendingTriggers[timestamp]["saveRequests"] = pendingTriggers[timestamp]["saveRequests"] - 1;
        // If the last save request has been resolved
        if (pendingTriggers[timestamp]["saveRequests"] == 0) {
            // Call the trigger
            pendingTriggers[timestamp]["trigger"](actorUpdates);
            // Delete the pending trigger information
            delete pendingTriggers[timestamp];
        };
    };
};