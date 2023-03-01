import { EFFECTS } from "./effects.js";
import { IAESettings } from "./settings.js";
import { _rollAttack } from "./utils.js";

// One time registration steps for core function overrides.
Hooks.once("init", () => {
    // Register Extra Character Flags
    CONFIG.DND5E.characterFlags["bladeMastery"] = {
        name: "Blade Mastery",
        hint: "Roll an extra d20 with advantage when using relevant weapons.",
        section: "Feats",
        type: Boolean
    };

    CONFIG.DND5E.characterFlags["greaterRage"] = {
        name: "Greater Rage",
        hint: "Roll an extra d20 with advantage on reckless attacks when raging.",
        section: "Feats",
        type: Boolean
    };

    libWrapper.register("ishiir-active-effects", "CONFIG.Item.documentClass.prototype.rollAttack", _rollAttack, "WRAPPER");
});

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
 * Allow dynamic bonuses to be applies to initiative
 */
Hooks.on("dnd5e.preRollInitiative", (actor, roll) => {
    if(actor.isOwner) {
        if(actor.system?.attributes?.init?.dynamicBonus) {
            roll._formula += (" + " + actor.system.attributes.init.dynamicBonus);
        }
        // Ensure the travel initiative bonus is disabled after rolling
        IAESettings.manager.disableEffect(EFFECTS.travel_initiative_bonus);
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
            actor.update({["flags.iae." + key]: ""}).then(() => {
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