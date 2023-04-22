import { applyHeroismTempHP } from "./effects.js";
import { isActualOwner, noAction, promptUser } from "./utils.js";

let eAPI = null;

/**
 * One time registration steps for settings and core function overrides.
 */
Hooks.once("ready", () => {
    eAPI = game.modules.get("active-effect-manager-lib").api;
    // Ensure flags on existing characters
    game.actors.filter((actor) => actor.isOwner)
        .filter((actor) => !actor.flags?.mae)
        .forEach((actor) => actor.update({"flags.mae": {}}));
});

/**
 * Ensure flags on actor creation.
 */
Hooks.on("createActor", (actor) => {
    if(actor?.isOwner) {
        IAESettings.manager.ensureFlags([actor]).then(() => {
            console.info(`ishiir-active-effects | Finished creating flags for actor ${actor._id}.`);
        });
    }
});

/**
 * Allow dynamic bonuses to be applies to initiative
 */
Hooks.on("dnd5e.preRollInitiative", (actor, roll) => {
    if(actor?.isOwner) {
        if(actor.flags?.mae?.initBonus) {
            roll._formula += (" + " + actor.flags.mae.initBonus);
        }
    }
});

/**
 * Apply spell effects at the start of the turn
 */
Hooks.on("updateCombat", (combat, turn, diff, _) => {
    const actor = game.actors.get(combat.combatant?.actorId);
    if(isActualOwner(actor)) {
        if(actor.flags?.mae?.heroismTempHP) {
            promptUser("Effect: Heroism", "Apply Heroism effect to restore temporary HP?", function() { applyHeroismTempHP(actor) }, noAction);
        }
    }
});