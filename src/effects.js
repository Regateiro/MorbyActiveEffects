/**
 * List of effect modes
 */
export const EFFECT_MODE = {
    CUSTOM: 0,
    MULTIPLY: 1,
    ADD: 2,
    DOWNGRADE: 3,
    UPGRADE: 4,
    OVERRIDE: 5
};

/**
 * Queue all applicable turn start effects and begin processing
 * @param {Combat} combat 
 */
export function handleTurnStartEffects(combat) {
    const actor = game.actors.get(combat.combatant?.actorId);
    let actorUpdates = {};

    if(game.user.isGM) {
        if(actor.flags?.mae?.heroismTempHP) {
            applyHeroismTempHP(actor, actorUpdates);
        }
        if(actor.flags?.mae?.lacerated) {
            applyLaceratedDamage(actor, actorUpdates);
        }
    }

    actor.update(actorUpdates);
}

/**
 * Apply heroism spell effect to the actor.
 * @param {Actor5e} actor 
 */
function applyHeroismTempHP(actor, actorUpdates) {
    const roll = new Roll(String(actor.flags.mae.heroismTempHP));
    roll.evaluate({async: false});

    // Apply tempHP if it is higher than the current amount
    if(Number(actor.system.attributes.hp.temp) < roll.total) {
        actorUpdates["system.attributes.hp.temp"] = roll.total;
    }

    // Display Chat Message
    roll.toMessage({
        sound: null,
        flavor: `${actor.name}'s Heroism effect triggers temporary HP!`,
        speaker: ChatMessage.getSpeaker({actor: actor, token: actor.token})
    });
}

/**
 * Apply lacerated effect damage to the actor.
 * @param {Actor5e} actor 
 */
function applyLaceratedDamage(actor, actorUpdates) {
    const roll = new Roll(String(actor.flags.mae.lacerated));
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
        flavor: `${actor.name} suffers damage from the lacerated condition!`,
        speaker: ChatMessage.getSpeaker({actor: actor, token: actor.token})
    });
}