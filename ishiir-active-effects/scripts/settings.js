import { IshiirEffectManager, EFFECT_NAMES } from "./effects.js";

/**
 * Retrieves the value of a setting related to IAE.
 * @param {String} setting 
 * @returns The setting value.
 */
const getIAESetting = (setting) => game.settings.get("ishiir-active-effects", setting);

/**
 * Class type used to initialize and retrieve settings.
 */
class Settings {
    constructor() {
        this.manager = null;
        this.actors = {};
    }

    /**
     * Register settings.
     * This should only be called once, at initialization.
     */
    init() {
        // Initialize the effect manager
        this.manager = new IshiirEffectManager();
        this.manager.init();
        // Get all the actors the current user owns
        game.actors.filter((actor) => actor.isOwner).forEach((actor) => this.actors[actor._id] = actor.name);

        // Register the actor selector on the settings window
        game.settings.register("ishiir-active-effects", "selectedActor", {
            name: "Actor",
            hint: "Actor to edit effects on.",
            scope: "client",
            config: true,
            default: Object.keys(this.actors)[0],
            type: String,
            choices: this.actors
        });

        // Register a checkbox for all supported effects
        for (const effectKey of Object.keys(EFFECT_NAMES)) {
            game.settings.register("ishiir-active-effects", effectKey, {
                name: EFFECT_NAMES[effectKey],
                hint: "Add the " + EFFECT_NAMES[effectKey] + " effect.",
                scope: "client",
                config: true,
                default: false,
                type: Boolean
            });
        }
    };

    /**
     * Gets the Id of the actor selected in the configuration window.
     */
    get selectedActor() {
        return getIAESetting("selectedActor");
    };
    
    /** 
     * Apply last effect configuration
     */
    refreshConfigEffects() {
        // For each effect
        for (const effectKey of Object.keys(EFFECT_NAMES)) {
            const actorId = getIAESetting("selectedActor");
            const shouldApply = getIAESetting(effectKey);

            // If the effect needs to be applied/removed from the actor
            if(this.manager.isApplied(effectKey, actorId) !== shouldApply) {
                if(shouldApply) {
                    // Apply the effect if it should be applied
                    this.manager.registerEffect(effectKey, actorId).then();
                } else {
                    // Remove the effect if it should not be applied
                    this.manager.unregisterEffect(effectKey, actorId).then();
                }
            }
        }
    };
};

/**
 * Class instance that can be used to both initialize and retrieve config
 */
export const IAESettings = new Settings();
