/**
 * Supported Effect Keys
 */
export const EFFECTS = {
    blade_mastery: "blade_mastery",
    blessed: "blessed",
    giants_might: "giants_might",
    greater_rage: "greater_rage",
    next_combat_initiative_bonus: "next_combat_initiative_bonus",
};

/**
 * Supported Effect Names
 */
export const EFFECT_NAMES = {
    blade_mastery: "Blade Mastery",
    blessed: "Blessed",
    giants_might: "Giant's Might",
    greater_rage: "Greater Rage",
    next_combat_initiative_bonus: "Next Combat Initiative Bonus",
};

/**
 * List of effect modes
 */
const EFFECT_MODE = {
    CUSTOM: 0,
    MULTIPLY: 1,
    ADD: 2,
    DOWNGRADE: 3,
    UPGRADE: 4,
    OVERRIDE: 5
};

/**
 * Ishiir Effects Manager
 */
export class IshiirEffectManager {
    constructor() {
        // Retrieve the Active Effect Manager module API
        this._API = game.modules.get("active-effect-manager-lib").api;
        this._EFFECTS = {};
    };

    /**
     * Initialize all the effects
     */
    async init() {
        // Ensure flags exist for all actors owned by the user
        await this.ensureFlags();
        // Blade Mastery
        await this.#createEffect(EFFECTS.blade_mastery, "icons/skills/melee/strike-sword-steel-yellow.webp");
        await this.#addChange(EFFECTS.blade_mastery, "system.attributes.ac.bonus", 1, EFFECT_MODE.ADD);
        await this.#addChange(EFFECTS.blade_mastery, "flags.dnd5e.bladeMastery", true, EFFECT_MODE.OVERRIDE);
        // Blessed
        await this.#createEffect(EFFECTS.blessed, "icons/svg/angel.svg", 60);
        await this.#addChange(EFFECTS.blessed, "system.bonuses.All-Attacks", "1d4", EFFECT_MODE.ADD);
        await this.#addChange(EFFECTS.blessed, "system.bonuses.abilities.save", "1d4", EFFECT_MODE.ADD);
        // Giant's Might
        await this.#createEffect(EFFECTS.giants_might, "icons/skills/social/intimidation-impressing.webp", 60);
        await this.#addChange(EFFECTS.giants_might, "system.traits.size", "lg", EFFECT_MODE.OVERRIDE);
        await this.#addChange(EFFECTS.giants_might, "ATL.width", 2, EFFECT_MODE.OVERRIDE);
        await this.#addChange(EFFECTS.giants_might, "ATL.height", 2, EFFECT_MODE.OVERRIDE);
        // Greater Rage
        await this.#createEffect(EFFECTS.greater_rage, "icons/creatures/abilities/mouth-teeth-human.webp");
        await this.#addChange(EFFECTS.greater_rage, "flags.dnd5e.greaterRage", true, EFFECT_MODE.OVERRIDE);
        // Next Combat Initiative Bonus
        await this.#createEffect(EFFECTS.next_combat_initiative_bonus, "icons/skills/movement/arrows-up-trio-red.webp");
        await this.#addChange(EFFECTS.next_combat_initiative_bonus, "system.attributes.init.dynamicBonus", "1d8", EFFECT_MODE.ADD);
    };

    async #createEffect(effectKey, icon, seconds) {
        this._EFFECTS[effectKey] = await this._API.buildDefault(null, EFFECT_NAMES[effectKey], icon);
        await this.#setDuration(effectKey, seconds);
    };

    async #addChange(effectKey, key, value, mode) {
        this._EFFECTS[effectKey].changes.push({key: key, value: value, mode: mode});
    };

    async #setDuration(effectKey, seconds) {
        this._EFFECTS[effectKey].isTemporary = Boolean(seconds);
        this._EFFECTS[effectKey].seconds = seconds;
        this._EFFECTS[effectKey].turns = null;
        this._EFFECTS[effectKey].rounds = null;
    };
    
    /**
     * Register an effect on an actor.
     * @param {String} effectKey The key name of the effect to unregister.
     * @param {String} actorId The id of the actor to register the effect on.
     */
    async registerEffect(effectKey, actorId) {
        const activeEffect = await this._API.addEffectOnActor(actorId, EFFECT_NAMES[effectKey], this._EFFECTS[effectKey]);
        if(activeEffect) {
            await game.actors.get(actorId).update({["flags.iae." + effectKey]: activeEffect._id});
        }
    };
    
    /**
     * Unregister an effect from an actor.
     * @param {String} effectKey The key name of the effect to unregister.
     * @param {String} actorId The id of the actor to unregister the effect from.
     */
    async unregisterEffect(effectKey, actorId) {
        const actor = game.actors.get(actorId);
        const effectId = actor.flags.iae[effectKey];

        if(effectId && await this._API.findEffectByIdOnActor(actorId, effectId)) {
            await actor.update({["flags.iae." + effectKey]: ""});
            await this._API.removeEffectFromIdOnActor(actorId, effectId);
        }
    };
    
    /**
     * Disables an effect from an actor.
     * @param {String} effectKey The key name of the effect to disable.
     * @param {String} actorId The id of the actor to disable the effect on.
     * @param {Boolean} enable Whether to enable or disable the effect
     */
    async toggleEffect(effectKey, actorId, enable) {
        const actor = game.actors.get(actorId);
        const effectId = actor.flags.iae[effectKey];
        if (effectId) {
            const effect = await this._API.findEffectByIdOnActor(actorId, effectId);
            if(effect) {
                await effect.update({disabled: !enable});
            }
        }
    };

    /**
     * Checks if an effect related to the effect key is applied on the actor.
     * @param {String} effectKey The key name of the effect to disable.
     * @param {String} actorId The id of the actor to disable the effect on.
     */
    isApplied(effectKey, actorId) {
        return Boolean(game.actors.get(actorId)?.flags?.iae[effectKey]);
    };

    /**
     * Ensure effect flags exist for all actors owned by the user.
     * @param {*} actors Optional list of actors to ensure flags on.
     */
    async ensureFlags(actors = game.actors) {
        const futures = [];

        // Update owned actors so they have flags defined
        actors.filter((actor) => actor.isOwner).forEach((actor) => {
            const flags = {};
            for (const effect of Object.keys(EFFECTS)) {
                if(!actor.flags?.iae || !actor.flags?.iae[effect]) {
                    flags["flags.iae." + effect] = "";
                }
            }
            futures.push(actor.update(flags));
        });

        // Wait for all updates to go through
        for(const future of futures) {
            await future;
        }
    };
};