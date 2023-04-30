import { effectsAPI } from "./morby-active-effects.js";

/**
 * Triggers waiting for save request resolution
 */
let pendingTriggers = {};

/**
 * Process all applicable turn start effects and begin processing
 * @param {Combat} combat 
 */
export function handleTurnStartEffects(combat) {
    const combatant = combat.combatants.get(combat.current.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    let actorUpdates = generateActorUpdates(actor);

    let saveRequests = 0;
    const timestamp = String(Date.now());
    if(actor.flags?.mae?.heroismTempHP) {
        applyHP(actorUpdates, actor, true, actor.flags.mae.heroismTempHP, "from Heroism");
    }
    if(actor.flags?.mae?.lacerated) {
        applyDamage(actorUpdates, actor, actor.flags.mae.lacerated, "from the lacerated condition");
    }
    if(actor.flags?.mae?.estrike) {
        applyDamage(actorUpdates, actor, actor.flags.mae.estrike, "from the Ensnaring Strike");
    }
    if(actor.flags?.mae?.causticbrew) {
        applyDamage(actorUpdates, actor, actor.flags.mae.causticbrew, "from the Tasha's Caustic Brew");
    }
    if(actor.flags?.mae?.rbreak) {
        saveRequests += handleRealityBreak(actorUpdates, combatant, actor, timestamp);
    }
    if(actor.flags?.mae?.regenerate) {
        if(saveRequests == 0) {
            applyHP(actorUpdates, actor, false, actor.flags.mae.regenerate, "from Regenerate");
        } else {
            pendingTriggers[timestamp] = {
                "saveRequests": saveRequests,
                "trigger": function(au) { applyCombatantHP(au, combatant._id, false, actor.flags.mae.regenerate, "from Regenerate") }
            };
        }
    }

    actor.update(actorUpdates);
}

/**
 * Resolves one save request.
 * @param {*} actorUpdates 
 * @param {*} tokenId 
 * @param {*} actorId 
 * @param {*} timestamp 
 */
export function handleSaveResolved(actorUpdates, tokenId, actorId, timestamp) {
    const actor = game.actors.tokens[tokenId] || game.actors.get(actorId);
    if (!actorUpdates) {
        actorUpdates = generateActorUpdates(actor);
    }
    if (pendingTriggers[timestamp]) {
        pendingTriggers[timestamp]["saveRequests"] = pendingTriggers[timestamp]["saveRequests"] - 1;
        if (pendingTriggers[timestamp]["saveRequests"] == 0) {
            pendingTriggers[timestamp]["trigger"](actorUpdates);
            delete pendingTriggers[timestamp];
        }
    }
    actor.update(actorUpdates);
}

/**
 * Process all applicable turn end effects and begin processing
 * @param {Combat} combat 
 */
export function handleTurnEndEffects(combat) {
    const combatant = combat.combatants.get(combat.previous.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    let actorUpdates = {};

    if(actor.flags?.mae?.idinsinuation) {
        applyDamage(actorUpdates, actor, actor.flags.mae.idinsinuation, "from the Id Insinuation");
    }
    if(actor.flags?.mae?.acidarrow) {
        applyDamage(actorUpdates, actor, actor.flags.mae.acidarrow, "from the Melf's Acid Arrow");
        effectsAPI.removeEffectOnToken(combatant.tokenId, "Melf's Acid Arrow");
    }
    if(actor.flags?.mae?.vsphere) {
        applyDamage(actorUpdates, actor, actor.flags.mae.vsphere, "from the Vitriolic Sphere");
        effectsAPI.removeEffectOnToken(combatant.tokenId, "Vitriolic Sphere");
    }
    if(actor.flags?.mae?.bloodboil) {
        requestSave(combatant, actor, actor.flags.mae.bloodboil, "CON", "Blood Boil");
    }
    if(actor.flags?.mae?.immolation) {
        requestSave(combatant, actor, actor.flags.mae.immolation, "DEX", "Immolation");
    }
    if(actor.flags?.mae?.killingwinds) {
        requestSave(combatant, actor, actor.flags.mae.killingwinds, "CON", "Killing Winds");
    }
    if(actor.flags?.mae?.pkiller) {
        requestSave(combatant, actor, actor.flags.mae.pkiller, "WIS", "Phantasmal Killer");
    }
    if(actor.flags?.mae?.rbreak) {
        requestSave(combatant, actor, "", "WIS", "Reality Break");
    }

    actor.update(actorUpdates);
}

/**
 * Process all applicable turn end effects and begin processing
 * @param {Combat} combat 
 */
export function handleSaveEffectDamage(tokenId, actorId, formula, effectName, halfDamage) {
    if (!formula) return;

    const actor = game.actors.tokens[tokenId] || game.actors.get(actorId);
    let actorUpdates = generateActorUpdates(actor);

    applyDamage(actorUpdates, actor, formula, `from the ${effectName}`, halfDamage);
    return actorUpdates;
}

function generateActorUpdates(actor) {
    return {
        "system.attributes.hp.value": Number(actor.system.attributes.hp.value),
        "system.attributes.hp.max": Number(actor.system.attributes.hp.max),
        "system.attributes.hp.temp": Number(actor.system.attributes.hp.temp)
    };
}

/**
 * Apply heroism spell effect to the actor.
 * @param {Actor5e} actor 
 */
function applyHP(actorUpdates, actor, isTemporary, formula, text) {
    const roll = new Roll(String(formula));
    roll.evaluate({async: false});

    if (isTemporary) {
        // Apply tempHP if it is higher than the current amount
        if(actorUpdates["system.attributes.hp.temp"] < roll.total) {
            actorUpdates["system.attributes.hp.temp"] = roll.total;
        }
    } else {
        if (actorUpdates["system.attributes.hp.value"] == 0 && roll.total > 0) {
            text = `${text} while at 0HP and is <b>no longer dying</b>`;
        }
        actorUpdates["system.attributes.hp.value"] = Math.min(
            actorUpdates["system.attributes.hp.value"] + roll.total, 
            actorUpdates["system.attributes.hp.max"]
        );
    }

    // Display Chat Message
    roll.toMessage({ sound: null, speaker: null,
        flavor: `${actor.name} recovers ${roll.total}${isTemporary ? " temporary HP" : "HP"} ${text}!`
    });
}

/**
 * Apply heroism spell effect to the actor.
 * @param {Actor5e} actor 
 */
function applyCombatantHP(actorUpdates, combatantId, isTemporary, formula, text) {
    const combatant = game.combat.combatants.get(combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    applyHP(actorUpdates, actor, isTemporary, formula, text);
}

/**
 * Apply lacerated effect damage to the actor.
 * @param {Actor5e} actor 
 */
function applyDamage(actorUpdates, actor, formula, text, halfDamage = false) {
    const roll = new Roll(String(formula));
    roll.evaluate({async: false});

    let damage = roll.total;
    if (halfDamage) {
        damage = Math.floor(roll.total / 2);
    }

    // Calculate new HP values
    const tempHP = actorUpdates["system.attributes.hp.temp"];
    const newTempHP = Math.max(tempHP - damage, 0);
    const HP = actorUpdates["system.attributes.hp.value"];
    const newHP = Math.max(HP - damage + tempHP, 0);

    // Warn if the HP reached 0
    if(HP > 0 && newHP == 0) {
        text = `${text} while at ${HP}HP and is now <b>dying</b>`;
    } else if (newHP == 0) {
        text = `${text} while <b>dying</b>`;
    }

    // Apply HP
    actorUpdates["system.attributes.hp.temp"] = newTempHP;
    actorUpdates["system.attributes.hp.value"] = newHP;


    // Display Chat Message
    roll.toMessage({ sound: null, speaker: null,
        flavor: `${actor.name} suffers ${damage} points of damage ${text}!`
    });
}

/**
 * Apply lacerated effect damage to the actor.
 * @param {Actor5e} combatant 
 */
function requestSave(combatant, actor, formula, save, effectName, removeOnSave = true, halfDamage = false, timestamp) {
    // Define the apply button for other users
    const success = `<button class='mae-save-success' data-token-id='${combatant.tokenId}' data-actor-id='${combatant.actorId}' data-effect-name='${effectName}' data-effect-formula='${formula}' data-remove='${removeOnSave}' data-half-damage='${halfDamage}' data-timestamp='${timestamp}'><i class="fas fa-check"></i>Success</button>`;
    const fail = `<button class='mae-save-failure' data-token-id='${combatant.tokenId}' data-actor-id='${combatant.actorId}' data-effect-name='${effectName}' data-effect-formula='${formula}' data-timestamp='${timestamp}'><i class="fas fa-xmark"></i>Failure</button>`;
    // Print the message
    ChatMessage.create({content: `${actor.name} must roll a ${save} save against ${effectName}. ${success} ${fail}`, whisper: game.userId});
}

function handleRealityBreak(actorUpdates, combatant, actor, timestamp) {
    const roll = new Roll("1d10");
    roll.evaluate({async: false});

    switch (roll.total) {
        case 1:
        case 2:
            // Display Chat Message
            roll.toMessage({ sound: null, speaker: null,
                flavor: `${actor.name} is sees a Vision of the Far Realm from Reality Break and is <b>stunned</b> until the end of the turn!`
            });
            applyDamage(actorUpdates, actor, "6d12", "from Reality Break's Vision of the Far Realm");
            return 0;
        case 3:
        case 4:
        case 5:
            // Display Chat Message
            roll.toMessage({ sound: null, speaker: null,
                flavor: `${actor.name} is swallowed by a Rending Rift from Reality Break!`
            });
            requestSave(combatant, actor, "8d12", "DEX", "Reality Break's Rending Rift", false, true, timestamp);
            return 1;
        case 6:
        case 7:
        case 8:
            // Display Chat Message
            roll.toMessage({ sound: null, speaker: null,
                flavor: `${actor.name} teleports up to 30 feet through a wormhole from Reality Break and is knocked <b>prone</b>!`
            });
            applyDamage(actorUpdates, actor, "10d12", "from Reality Break's Wormhole");
            return 0;
        case 9:
        case 10:
            // Display Chat Message
            roll.toMessage({ sound: null, speaker: null,
                flavor: `${actor.name} chilled by the Dark Void from Reality Break and is <b>blinded</b> until the end of the turn!`
            });
            applyDamage(actorUpdates, actor, "10d12", "from Reality Break's Dark Void");
    }
    return 0;
}