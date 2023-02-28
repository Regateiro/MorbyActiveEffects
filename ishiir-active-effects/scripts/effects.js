// Supported fields
export const EFFECTS = {
    blade_mastery: "Blade Mastery",
    giants_might: "Giant's Might",
    greater_rage: "Greater Rage"
};

const EFFECT_MODE = {
    CUSTOM: 0,
    MULTIPLY: 1,
    ADD: 2,
    DOWNGRADE: 3,
    UPGRADE: 4,
    OVERRIDE: 5
};

export class IshiirEffectManager {
    constructor() {
        this._API = game.modules.get("active-effect-manager-lib").api;
        this._EFFECTS = {};
    };

    async init() {
        // Ensure flags exist for all actors owned by the user
        await this.ensureFlags();
        // Blade Mastery
        await this.#createEffect(EFFECTS.blade_mastery, "icons/skills/melee/strike-sword-steel-yellow.webp");
        await this.#addChange(EFFECTS.blade_mastery, "system.attributes.ac.bonus", 1, EFFECT_MODE.ADD);
        await this.#addChange(EFFECTS.blade_mastery, "flags.dnd5e.bladeMastery", true, EFFECT_MODE.OVERRIDE);
        // Giant's Might
        await this.#createEffect(EFFECTS.giants_might, "icons/skills/social/intimidation-impressing.webp", 60);
        await this.#addChange(EFFECTS.giants_might, "system.traits.size", "lg", EFFECT_MODE.OVERRIDE);
        await this.#addChange(EFFECTS.giants_might, "ATL.width", 2, EFFECT_MODE.OVERRIDE);
        await this.#addChange(EFFECTS.giants_might, "ATL.height", 2, EFFECT_MODE.OVERRIDE);
        // Greater Rage
        await this.#createEffect(EFFECTS.greater_rage, "icons/creatures/abilities/mouth-teeth-human.webp");
        await this.#addChange(EFFECTS.greater_rage, "flags.dnd5e.greaterRage", true, EFFECT_MODE.OVERRIDE);
    }

    async #createEffect(effectName, icon, seconds) {
        this._EFFECTS[effectName] = await this._API.buildDefault(null, effectName, icon);
        await this.#setDuration(effectName, seconds);
    };

    async #addChange(effectName, key, value, mode) {
        this._EFFECTS[effectName].changes.push({key: key, value: value, mode: mode});
    };

    async #setDuration(effectName, seconds) {
        this._EFFECTS[effectName].isTemporary = Boolean(seconds);
        this._EFFECTS[effectName].seconds = seconds;
        this._EFFECTS[effectName].turns = null;
        this._EFFECTS[effectName].rounds = null;
    };
    
    async registerEffect(effectName, actorId) {
        const activeEffect = await this._API.addEffectOnActor(actorId, effectName, this._EFFECTS[effectName]);
        if(activeEffect) {
            const key = Object.keys(EFFECTS).find(key => EFFECTS[key] === effectName);
            await game.actors.get(actorId).update({["flags.iae." + key]: activeEffect._id});
        }
    }
    
    async unregisterEffect(effectName, actorId) {
        if(await this._API.findEffectByNameOnActor(actorId, effectName)) {
            const key = Object.keys(EFFECTS).find(key => EFFECTS[key] === effectName);
            await game.actors.get(actorId).update({["flags.iae." + key]: null});
            await this._API.removeEffectOnActor(actorId, effectName);
        }
    }

    async ensureFlags(actors) {
        const flags = {};
        const futures = [];

        if(!actors) {
            actors = game.actors.filter((actor) => actor.isOwner);
        }

        // Update owned actors so they have flags defined
        actors.filter((actor) => actor.isOwner).forEach((actor) => {
            for (const effect of Object.keys(EFFECTS)) {
                if(!actor.flags.iae || !actor.flags.iae[effect]) {
                    flags["flags.iae." + effect] = null;
                }
            }
            futures.push(actor.update(flags));
        });

        // Wait for all updates to go through
        for(const future of futures) {
            await future;
        }
    }
}