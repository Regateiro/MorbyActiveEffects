import { applyEffectToAllTargets, cm_register } from "./chat-commands.js";
import { handleTurnEndEffects, handleTurnStartEffects } from "./effects.js";

export let effectsAPI = null;
export const targettedTokens = {};

/**
 * One time registration steps for settings and core function overrides.
 */
Hooks.once("ready", () => {
    effectsAPI = game.modules.get("active-effect-manager-lib").api;
    // Ensure flags on existing characters
    game.actors.filter((actor) => actor.isOwner)
        .filter((actor) => !actor.flags?.mae)
        .forEach((actor) => actor.update({"flags.mae": {}}));
    // Bind apply effect buttons to the callback
    $(document).on('click', '.morby-active-effects', function () { 
        applyEffectToAllTargets($(this).data('effect-id'), $(this).data('effect-value')); 
    });
});

/**
 * Register chat commands
 */
Hooks.on("chatCommandsReady", commands => {
    cm_register(commands);
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
Hooks.on("updateCombat", (combat, turn, diff, userId) => {
    handleTurnEndEffects(combat); // Previous Turn
    handleTurnStartEffects(combat); // Current Turn
});

/**
 * Keep track of which token is being controlled
 */
Hooks.on("targetToken", (user, token, targetted) => {
    if(targetted) {
        targettedTokens[token.id] = token;
    } else {
        delete targettedTokens[token.id];
    }
});