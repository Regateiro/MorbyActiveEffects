import { EFFECTS } from "./effect-data.js";
import { targetedTokens, effectsAPI } from "./morby-active-effects.js";

/**
 * Register the /mae chat command with Foundry's chat-commands library.
 * @param {*} commands The commands API from the chat-commands module
 */
export function cm_register(commands) {
    commands.register({
        name: "/mae",
        module: "morby-active-effects",
        description: "Apply active effects to selected tokens",
        icon: "<i class='fas fa-hand-holding-magic'></i>",
        requiredRole: "NONE",
        callback: handleCommand,
        autocompleteCallback: handleAutoComplete,
        closeOnComplete: true
    });
};

/**
 * Handle the /mae chat command.
 * Two sub-commands: /mae <effect> [value] to apply, /mae clear <effect> to remove.
 * @param {*} _chat Chat context (unused)
 * @param {string} parameters Raw parameter string from the command
 * @param {*} _messageData Message data (unused)
 * @returns {Object} Empty object (expected by the chat-commands library)
 */
async function handleCommand(_chat, parameters, _messageData) {
    if (!effectsAPI) return {};
    parameters = parameters.toLowerCase().split(" ");

    // Apply effect: /mae <alias> [value]
    if (Object.keys(targetedTokens).length > 0 && parameters[0] in EFFECTS) {
        const effectInfo = EFFECTS[parameters[0]];
        const effectMsg = effectInfo.toChatMessage(parameters[1]);
        await applyEffectToAllTargets(parameters[0], parameters[1]);
        if (effectMsg) {
            await ChatMessage.create({content: effectMsg});
        };
    // Remove effect: /mae clear <alias>
    } else if (parameters[0] === "clear") {
        if (parameters[1] in EFFECTS) {
            const effectInfo = EFFECTS[parameters[1]];
            for (const token of Object.values(targetedTokens)) {
                await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
            };
        };
    };

    return {};
};

/**
 * Apply an effect to every currently targeted token.
 * Removes any existing effect with the same name first, then builds and adds the new one.
 * @param {string} effectId The alias key in EFFECTS (e.g. "bb", "aid")
 * @param {string} [value] User-supplied override value for unlocked effects
 */
export async function applyEffectToAllTargets(effectId, value) {
    if (!effectsAPI) return;
    const effectInfo = EFFECTS[effectId];
    if (!effectInfo) return;
    for (const token of Object.values(targetedTokens)) {
        // Remove any existing effect with the same name (prevents stacking)
        await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
        // Build the effect via the library
        const effect = await effectsAPI.buildDefault(null, effectInfo.name, effectInfo.icon);
        effect.origin = `Actor.${token.document.actorId}`;
        effect.isTemporary = Boolean(effectInfo.seconds);
        effect.seconds = effectInfo.seconds;
        effect.turns = null;
        effect.rounds = null;
        // Apply each change, potentially modified by handleDynamicChanges
        for (const change of effectInfo.changes) {
            effect.changes.push(
                await handleDynamicChanges(effectInfo, token, change, value)
            );
        };
        await effectsAPI.addEffectOnToken(token.id, effectInfo.name, effect);
        // Aid is special: on application it also heals the target
        if (effectInfo.id === "aid") {
            await token.actor.applyDamage(-Number(value));
        };
    };
};

/**
 * Modify an effect's change value based on the token's current state.
 * Handles dynamic sizing for Enlarge/Reduce (computes ±1 or ±half based on current token dims).
 * @param {Object} effectInfo The effect definition from _EFFECT_INFO
 * @param {Token} token The targeted token (for sizing calculations)
 * @param {Object} change The raw change object from the effect definition
 * @param {string} [value] User-supplied override value
 * @returns {Object} The modified change object with updated value
 */
/** @visibleForTesting */
export async function handleDynamicChanges(effectInfo, token, change, value) {
    change = Object.assign({}, change);
    // Unlocked effects accept the user-supplied value; locked effects keep their default
    if (!effectInfo.locked) {
        change.value = value || change.value;
    };

    switch (effectInfo.id) {
        case "reduce":
            // Reduce by 1 square (or half if already <= 1)
            if (change.key.includes("height")) {
                const currentHeight = Number(token.document.height);
                change.value = currentHeight <= 1 ? -currentHeight / 2 : -1;
            };
            if (change.key.includes("width")) {
                const currentWidth = Number(token.document.width);
                change.value = currentWidth <= 1 ? -currentWidth / 2 : -1;
            };
            break;
        case "enlarge":
            // Increase by 1 square (or double if already <= 1)
            if (change.key.includes("height")) {
                const currentHeight = Number(token.document.height);
                change.value = currentHeight <= 1 ? currentHeight : 1;
            };
            if (change.key.includes("width")) {
                const currentWidth = Number(token.document.width);
                change.value = currentWidth <= 1 ? currentWidth : 1;
            };
            break;
    };

    return change;
}

/**
 * Provide autocomplete suggestions for the /mae command.
 * Single-parameter mode: suggest matching effect aliases (deduped by commands field).
 * Two-parameter mode: /mae clear <alias> suggests aliases; /mae <alias> shows help text.
 * @param {*} menu The autocomplete menu (provides maxEntries and helper methods)
 * @param {string} alias The alias parameter (unused, raw parameters used instead)
 * @param {string} parameters The raw parameter string from the chat input
 * @returns {Array} Array of autocomplete entry elements
 */
function handleAutoComplete(menu, alias, parameters) {
    parameters = parameters.toLowerCase().split(" ");

    let entries = [];
    const seen = new Set();

    // First parameter: autocomplete effect aliases
    if (parameters.length === 1) {
        for (const alias in EFFECTS) {
            if (!alias.startsWith(parameters[0])) continue;
            if (seen.has(EFFECTS[alias].commands)) continue;
            seen.add(EFFECTS[alias].commands);
            entries.push(game.chatCommands.createInfoElement(EFFECTS[alias].commands));
        }
        // If "clear" also matches, add a separator before it
        if (entries.length > 0 && "clear".startsWith(parameters[0])) {
            entries.length = Math.min(entries.length, menu.maxEntries - 2);
            entries.push(game.chatCommands.createSeparatorElement());
        }
        if ("clear".startsWith(parameters[0])) {
            entries.push(game.chatCommands.createInfoElement("clear - remove effect from token"));
        }
    // Second parameter: depends on the first
    } else if (parameters.length === 2) {
        switch (parameters[0]) {
            case "clear":
                // /mae clear <alias> — suggest matching aliases
                for (const alias in EFFECTS) {
                    if (!alias.startsWith(parameters[1])) continue;
                    if (seen.has(EFFECTS[alias].commands)) continue;
                    seen.add(EFFECTS[alias].commands);
                    entries.push(game.chatCommands.createInfoElement(EFFECTS[alias].commands));
                }
                break;
            default:
                // /mae <alias> — show the effect's help text if available
                if (parameters[0] in EFFECTS && EFFECTS[parameters[0]].help) {
                    entries.push(game.chatCommands.createInfoElement(EFFECTS[parameters[0]].help));
                }
                break;
        }
    }

    entries.length = Math.min(entries.length, menu.maxEntries);
    return entries;
};
