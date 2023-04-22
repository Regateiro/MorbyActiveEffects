export function applyHeroismTempHP(actor) {
    const roll = new Roll(String(actor.flags.mae.heroismTempHP));
    roll.evaluate({async: true}).then((roll) => {
        if(Number(actor.system.attributes.hp.temp) < roll.total) {
            // Apply
            actor.update({"system.attributes.hp.temp": roll.total});
        }
        // Display Chat Message
        roll.toMessage({
            flavor: `${actor.name}'s Heroism effect triggers temporary HP!`,
            speaker: ChatMessage.getSpeaker({actor: actor, token: actor.token})
        });
    })
}