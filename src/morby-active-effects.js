import { applyEffectToAllTargets, cm_register } from "./chat-commands.js";
import { applyDamage, getCombatant, handleResolvedSaveRequest, handleTurnEndEffects, handleTurnStartEffects, resetCombatState } from "./effects.js";

/** Active-effect-manager-lib API, set once on ready */
export let effectsAPI = null;
/** Map of tokenId → Token for the current user's targets */
export const targetedTokens = {};

Hooks.once("ready", () => {
    const aemLib = game.modules.get("active-effect-manager-lib");
    if (!aemLib?.api) {
        console.error("Morby Active Effects | active-effect-manager-lib module not found or inactive");
        return;
    }
    effectsAPI = aemLib.api;

    // Ensure all owned actors have the mae flags object initialized
    game.actors.filter((actor) => actor.isOwner)
        .filter((actor) => !actor.flags?.mae)
        .forEach((actor) => actor.update({"flags.mae": {}}));

    // Namespaced jQuery events — .off(ns) on re-init prevents handler accumulation on hot-reload
    const ns = '.mae';
    $(document).off(ns)
        .on(`click${ns}`, '.mae-apply-effect', async function () {
            await applyEffectToAllTargets($(this).data('effect-id'), $(this).data('effect-value'));
        })
        .on(`click${ns}`, '.mae-save-roll', async function () {
            const { actor } = getCombatant($(this).data('combatant-id'));
            if (!actor) return;
            const abilityId = $(this).data('ability-id');
            await actor.rollAbilitySave(abilityId.toLowerCase());
        })
        .on(`click${ns}`, '.mae-save-success', async function () {
            if (!effectsAPI) return;
            const { combatant } = getCombatant($(this).data('combatant-id'));
            if (!combatant) return;
            const formula = $(this).data('effect-formula');
            const effectName = $(this).data('effect-name');
            const removeEffect = Boolean($(this).data('remove'));
            const halfDamage = Boolean($(this).data('half-damage'));
            const timestamp = $(this).data('timestamp');

            // Remove the effect if the save removes it
            if (removeEffect) {
                await effectsAPI.removeEffectOnToken(combatant.tokenId, effectName);
            };
            // Apply half damage if the effect deals half on a successful save
            if (halfDamage) {
                await applyDamage(combatant.id, formula, effectName, true, true);
            };
            // Decrement pending save counter and fire deferred triggers if all resolved
            await handleResolvedSaveRequest(timestamp);
            // Clean up the chat message
            await game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();
        })
        .on(`click${ns}`, '.mae-save-failure', async function () {
            const { combatant } = getCombatant($(this).data('combatant-id'));
            if (!combatant) return;
            const formula = $(this).data('effect-formula');
            const effectName = $(this).data('effect-name');
            const timestamp = $(this).data('timestamp');

            // Apply full damage on a failed save (direct = true, bypasses the per-combatant accumulator)
            await applyDamage(combatant.id, formula, effectName, false, true);
            await handleResolvedSaveRequest(timestamp);
            await game.messages.get($(this).closest(".chat-message").data('message-id'), false).delete();
        });
});

Hooks.on("chatCommandsReady", commands => {
    cm_register(commands);
});

/** Append any active initBonus to the initiative roll formula */
Hooks.on("dnd5e.preRollInitiative", (actor, roll) => {
    if(actor?.isOwner) {
        if(actor.flags?.mae?.initBonus) {
            roll._formula += (" + " + actor.flags.mae.initBonus);
        };
    };
});

/**
 * Process turn-end effects (previous combatant), then turn-start (current combatant).
 * Both accumulate damage in a per-combatant map that is flushed at the end of each phase.
 */
Hooks.on("updateCombat", (combat, _turn, _diff, _userId) => {
    if(!game.user.isGM || !effectsAPI) return;
    handleTurnEndEffects(combat).then(() => {
        handleTurnStartEffects(combat);
    });
});

/** Combat teardown — clear any pending deferred triggers (e.g. Regenerate) and reset the damage accumulator */
Hooks.on("deleteCombat", () => {
    if (!game.user.isGM) return;
    resetCombatState();
});

/** Track which tokens the current user has targeted */
Hooks.on("targetToken", (user, token, targeted) => {
    if (user._id === game.userId) {
        if(targeted) {
            targetedTokens[token.id] = token;
        } else {
            delete targetedTokens[token.id];
        };
    };
});
