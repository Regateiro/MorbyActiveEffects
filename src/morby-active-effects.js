import { applyEffectToAllTargets, cm_register } from "./chat-commands.js";
import { applyDamage, generateActorUpdatesFromActor, generateActorUpdatesFromCombatant, handleResolvedSaveRequest, handleRestEffects, handleTurnEndEffects, handleTurnStartEffects } from "./effects.js";

export let effectsAPI = null;
export const targetedTokens = {};
export const preLongRestArmorMastery = {};

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
    $(document).on('click', '.mae-apply-effect', async function () {
        await applyEffectToAllTargets($(this).data('effect-id'), $(this).data('effect-value'));
    });
    // Bind save success buttons to the callback
    $(document).on('click', '.mae-save-success', async function () {
        const combatant = game.combat.combatants.get($(this).data('combatant-id'));
        const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
        const actorUpgrades = await generateActorUpdatesFromCombatant(combatant._id);
        const formula = $(this).data('effect-formula');
        const effectName = $(this).data('effect-name');
        const removeEffect = Boolean($(this).data('remove'));
        const halfDamage = Boolean($(this).data('half-damage'));
        const timestamp = $(this).data('timestamp');

        // If the effect is to be removed on a successful save, do it
        if (removeEffect) {
            await effectsAPI.removeEffectOnToken(combatant.tokenId, effectName);
        };

        // If the target still takes half damage on a successful save, apply the damage
        if (halfDamage) {
            await applyDamage(actorUpgrades, combatant._id, formula, effectName, true);
        };

        // Handle a save request resolution
        await handleResolvedSaveRequest(actorUpgrades, timestamp);

        // Update the actor
        await actor.update(actorUpgrades);

        // Delete the chat message with the save request as it is no longer needed
        await game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();
    });
    // Bind save failure buttons to the callback
    $(document).on('click', '.mae-save-failure', async function () {
        const combatant = game.combat.combatants.get($(this).data('combatant-id'));
        const actor = game.actors.tokens[combatant.tokenId] || game.actors.get(combatant.actorId);
        const actorUpgrades = await generateActorUpdatesFromCombatant(combatant._id);
        const formula = $(this).data('effect-formula');
        const effectName = $(this).data('effect-name');
        const timestamp = $(this).data('timestamp');

        // Apply effect damage
        await applyDamage(actorUpgrades, combatant._id, formula, effectName, false);

        // Handle a save request resolution
        await handleResolvedSaveRequest(actorUpgrades, timestamp);

        // Update the actor
        await actor.update(actorUpgrades);

        // Delete the chat message with the save request as it is no longer needed
        await game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();
    });
    // Bind Armor mastery yes buttons to the callback
    $(document).on('click', '.mae-am-yes', async function () {
        const actor = game.actors.get($(this).data('actor-id'));
        const actorUpdates = await generateActorUpdatesFromActor(actor);
        const maxArmorMastery = Number(actor.flags.mae.armorMastery);
        const currArmorMastery = Number(actor.flags.mae.tempArmorMastery || 0);
        const tempHPDiff = maxArmorMastery - currArmorMastery;

        actorUpdates["system.attributes.hp.temp"] += tempHPDiff;
        actorUpdates["flags.mae.tempArmorMastery"] = maxArmorMastery;

        // Update the actor
        await actor.update(actorUpdates);

        // Delete the chat message with the save request as it is no longer needed
        await game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();

        // Display that the temporary HP was restored
        await ChatMessage.create({content: `${actor.name}'s has spent resources to restore ${tempHPDiff} temporary HP from armor mastery!`});
    });
    // Bind Armor mastery no buttons to the callback
    $(document).on('click', '.mae-am-no', async function () {
        // Delete the chat message as it is no longer needed
        await game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();
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
        };
    };
});

/**
 * Apply effects at the start of the turn
 */
Hooks.on("updateCombat", (combat, turn, diff, userId) => {
    if(game.user.isGM) {
        // Previous Turn
        handleTurnEndEffects(combat).then(() => {
            // Current Turn
            handleTurnStartEffects(combat);
        });
    };
});

/**
 * Save the current armor mastery temp HP before it is wiped from the long rest
 */
Hooks.on("dnd5e.preRestCompleted", (actor, restInfo) => {
    if (restInfo.longRest) {
        preLongRestArmorMastery[actor._id] = actor.flags.mae.tempArmorMastery;
    };
});

/**
 * Apply effects when a rest is taken
 */
Hooks.on("dnd5e.restCompleted", (actor, restInfo) => {
    setTimeout(() => handleRestEffects(actor, restInfo.longRest), 500);
});

/**
 * Keep track of which token is being targeted
 */
Hooks.on("targetToken", (user, token, targeted) => {
    if(targeted) {
        targetedTokens[token.id] = token;
    } else {
        delete targetedTokens[token.id];
    };
});