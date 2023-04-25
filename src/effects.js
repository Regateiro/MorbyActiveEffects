import { effectsAPI } from "./morby-active-effects.js";

/**
 * Process all applicable turn start effects and begin processing
 * @param {Combat} combat 
 */
export function handleTurnStartEffects(combat) {
    const combatant = combat.combatants.get(combat.current.combatantId);
    const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
    let actorUpdates = {};

    if(game.user.isGM) {
        if(actor.flags?.mae?.heroismTempHP) {
            applyTempHP(actorUpdates, actor, actor.flags.mae.heroismTempHP, "gainst temporary HP from Heroism");
        }
        if(actor.flags?.mae?.lacerated) {
            applyDamage(actorUpdates, actor, actor.flags.mae.lacerated, "suffers damage from the lacerated condition");
        }
        if(actor.flags?.mae?.estrike) {
            applyDamage(actorUpdates, actor, actor.flags.mae.estrike, "suffers damage from the Ensnaring Strike");
        }
        if(actor.flags?.mae?.causticbrew) {
            applyDamage(actorUpdates, actor, actor.flags.mae.causticbrew, "suffers damage from the Tasha's Caustic Brew");
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

    if(game.user.isGM) {
        if(actor.flags?.mae?.idinsinuation) {
            applyDamage(actorUpdates, actor, actor.flags.mae.idinsinuation, "suffers damage from the Id Insinuation");
        }
        if(actor.flags?.mae?.acidarrow) {
            applyDamage(actorUpdates, actor, actor.flags.mae.acidarrow, "suffers damage and recovers from the Melf's Acid Arrow spell effect");
            effectsAPI.removeEffectOnToken(combatant.tokenId, "Melf's Acid Arrow");
        }
    }

    actor.update(actorUpdates);
}

/**
 * Apply heroism spell effect to the actor.
 * @param {Actor5e} actor 
 */
function applyTempHP(actorUpdates, actor, formula, text) {
    const roll = new Roll(String(formula));
    roll.evaluate({async: false});

    // Apply tempHP if it is higher than the current amount
    if(Number(actor.system.attributes.hp.temp) < roll.total) {
        actorUpdates["system.attributes.hp.temp"] = roll.total;
    }

    // Display Chat Message
    roll.toMessage({
        sound: null,
        flavor: `${actor.name} ${text}!`,
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
    const tempHP = actorUpdates["system.attributes.hp.temp"] || Number(actor.system.attributes.hp.temp);
    const newTempHP = Math.max(tempHP - roll.total, 0);
    const HP = Number(actor.system.attributes.hp.value);
    const newHP = HP - Math.max(roll.total - tempHP, 0);

    // Apply HP
    actorUpdates["system.attributes.hp.temp"] = newTempHP;
    actorUpdates["system.attributes.hp.value"] = newHP;

    // Display Chat Message
    roll.toMessage({
        sound: null,
        flavor: `${actor.name} ${text}!`,
        speaker: ChatMessage.getSpeaker({actor: actor, token: actor.token})
    });
}