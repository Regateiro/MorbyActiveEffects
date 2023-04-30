import { applyEffectToAllTargets, cm_register } from "./chat-commands.js";
import { handleSaveEffectDamage, handleSaveResolved, handleTurnEndEffects, handleTurnStartEffects } from "./effects.js";

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
    $(document).on('click', '.mae-apply-effect', function () { 
        applyEffectToAllTargets($(this).data('effect-id'), $(this).data('effect-value')); 
    });
    // Bind save success buttons to the callback
    $(document).on('click', '.mae-save-success', function () {
        let actorUpgrades = null;
        if (Boolean($(this).data('remove'))) effectsAPI.removeEffectOnToken($(this).data('token-id'), $(this).data('effect-name'));
        if (Boolean($(this).data('half-damage'))) actorUpgrades = handleSaveEffectDamage($(this).data('token-id'), $(this).data('actor-id'), $(this).data('effect-formula'), $(this).data('effect-name'), true);
        game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();
        handleSaveResolved(actorUpgrades, $(this).data('token-id'), $(this).data('actor-id'), $(this).data('timestamp'));
    });
    // Bind save failure buttons to the callback
    $(document).on('click', '.mae-save-failure', function () { 
        let actorUpgrades = handleSaveEffectDamage($(this).data('token-id'), $(this).data('actor-id'), $(this).data('effect-formula'), $(this).data('effect-name'), false);
        game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();
        handleSaveResolved(actorUpgrades, $(this).data('token-id'), $(this).data('actor-id'), $(this).data('timestamp'));
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
    if(game.user.isGM) {
        handleTurnEndEffects(combat); // Previous Turn
        handleTurnStartEffects(combat); // Current Turn
    }
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