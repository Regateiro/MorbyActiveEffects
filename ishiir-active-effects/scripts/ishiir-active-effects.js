import { IAESettings } from "./settings.js";

/**
 * One time registration steps for settings and core function overrides.
 */
Hooks.once("ready", () => {
    // Initialize the settings.
    IAESettings.init();
});

/**
 * Ensure flags on actor creation.
 */
Hooks.on("createActor", (actor) => {
    if(actor.isOwner) {
        IAESettings.manager.ensureFlags([actor]).then(() => {
            console.info(`ishiir-active-effects | Finished creating flags for actor ${actor._id}.`);
        });
    }
});

/**
 * Catch effect deletion from actors and ensure IAE data remains consistent.
 */
Hooks.on("deleteActiveEffect", (effect) => {
    // Get the actor the effect is being removed from
    const actor = game.actors.get(effect?.parent?._id);
    // If the user is the owner of the actor
    if(actor?.isOwner) {
        // Determine if the effect was created by IAE, and if so what is the effect key name
        const key = Object.keys(actor?.flags?.iae).find(key => actor?.flags?.iae[key] === effect?._id);
        // If such a key exists
        if(key) {
            // Update the flags so IAE knows that the effect is no longer applied
            actor.update({["flags.iae." + key]: null}).then(() => {
                console.info(`ishiir-active-effects | Finished unregistering effect ${effect?._id} from actor ${actor._id}.`);
            });
        }
    }
});

/**
 * Ensure the desired effects are present on the actor when the
 * configuration window is closed.
 */
Hooks.on("closeSettingsConfig", () => {
    IAESettings.refreshConfigEffects();
});