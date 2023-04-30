import { effectsAPI } from "./morby-active-effects.js";

/**
 * Process all applicable turn start effects and begin processing
 * @param {Combat} combat 
 */
export function handleTurnStartEffects(combat) {
    const combatant = combat.combatants.get(combat.current.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    let actorUpdates = {
        "system.attributes.hp.value": Number(actor.system.attributes.hp.value),
        "system.attributes.hp.max": Number(actor.system.attributes.hp.max),
        "system.attributes.hp.temp": Number(actor.system.attributes.hp.temp)
    };

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
    if(actor.flags?.mae?.regenerate) {
        applyHP(actorUpdates, actor, false, actor.flags.mae.regenerate, "from Regenerate");
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

    actor.update(actorUpdates);
}

/**
 * Process all applicable turn end effects and begin processing
 * @param {Combat} combat 
 */
export function handleSaveEffectFailure(tokenId, actorId, formula, effectName) {
    const actor = game.actors.tokens[tokenId] || game.actors.get(actorId);

    let actorUpdates = {
        "system.attributes.hp.value": Number(actor.system.attributes.hp.value),
        "system.attributes.hp.max": Number(actor.system.attributes.hp.max),
        "system.attributes.hp.temp": Number(actor.system.attributes.hp.temp)
    };

    applyDamage(actorUpdates, actor, formula, `from the ${effectName}`);
    actor.update(actorUpdates);
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
    roll.toMessage({
        sound: null,
        flavor: `${actor.name} recovers ${roll.total}${isTemporary ? " temporary HP" : "HP"} ${text}!`,
        speaker: ChatMessage.getSpeaker({actor: actor, token: actor.token})
    });
}

/**
 * Apply lacerated effect damage to the actor.
 * @param {Actor5e} actor 
 */
function applyDamage(actorUpdates, actor, formula, text) {
    const roll = new Roll(String(formula));
    roll.evaluate({async: false});

    // Calculate new HP values
    const tempHP = actorUpdates["system.attributes.hp.temp"];
    const newTempHP = Math.max(tempHP - roll.total, 0);
    const HP = actorUpdates["system.attributes.hp.value"];
    const newHP = Math.max(HP - roll.total + tempHP, 0);

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
    roll.toMessage({
        sound: null,
        flavor: `${actor.name} suffers ${roll.total} points of damage ${text}!`,
        speaker: ChatMessage.getSpeaker({actor: actor, token: actor.token})
    });
}

/**
 * Apply lacerated effect damage to the actor.
 * @param {Actor5e} combatant 
 */
function requestSave(combatant, actor, formula, save, effectName) {
    // Define the apply button for other users
    const success = `<button class='mae-save-success' data-token-id='${combatant.tokenId}' data-effect-name='${effectName}'><i class="fas fa-check"></i>Success</button>`;
    const fail = `<button class='mae-save-failure' data-token-id='${combatant.tokenId}' data-actor-id='${combatant.actorId}' data-effect-name='${effectName}' data-effect-formula='${formula}'><i class="fas fa-xmark"></i>Failure</button>`;
    // Print the message
    ChatMessage.create({content: `${actor.name} must roll a ${save} save against ${effectName}. ${success} ${fail}`, whisper: game.userId});
}