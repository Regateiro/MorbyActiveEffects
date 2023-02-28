import { IshiirEffectManager, EFFECTS } from "./effects.js";

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
        for (const effect of Object.keys(EFFECTS)) {
            game.settings.register("ishiir-active-effects", effect, {
                name: "Effect: " + EFFECTS[effect],
                hint: "Add the " + EFFECTS[effect] + " effect.",
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
        for (const effect of Object.keys(EFFECTS)) {
            const actorId = getIAESetting("selectedActor");
            const state = getIAESetting(effect);
            const effectId = game.actors.get(actorId)?.flags?.iae[effect];

            // If the effect needs to be applied/removed from the actor
            if(Boolean(effectId) !== state) {
                if(state) {
                    // Apply the effect if it is wanted
                    this.manager.registerEffect(EFFECTS[effect], actorId).then();
                } else {
                    // Remove the effect if it is not wanted
                    this.manager.unregisterEffect(effectId, actorId).then();
                }
            }
        }
    };
};

/**
 * Class instance that can be used to both initialize and retrieve config
 */
export const IAESettings = new Settings();
