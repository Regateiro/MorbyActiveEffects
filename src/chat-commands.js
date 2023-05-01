import { EFFECTS } from "./effect-data.js";
import { targettedTokens, effectsAPI } from "./morby-active-effects.js";

/**
 * Register the mae command with Foundry
 * @param {*} commands
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
 * Handle a chat command
 * @param {*} chat
 * @param {*} parameters
 * @param {*} messageData
 * @returns
 */
async function handleCommand(chat, parameters, messageData) {
    // Split the parameters into separate fields
    parameters = parameters.toLowerCase().split(" ");

    // If the first parameter corresponds to an effect
    if(Object.keys(targettedTokens).length > 0 && Object.keys(EFFECTS).includes(parameters[0])) {
        // Get the effect information
        const effectInfo = EFFECTS[parameters[0]];
        // For each token that is selected
        await applyEffectToAllTargets(parameters[0], parameters[1]);
        await ChatMessage.create({content: effectInfo.toChatMessage(parameters[1])});
    // If the first parameter is a clear command
    } else if (parameters[0] == "clear") {
        // Determine if the second parameter corresponds to an effect
        if(Object.keys(EFFECTS).includes(parameters[1])) {
            // Get the effect information
            const effectInfo = EFFECTS[parameters[1]];
            // For each token that is selected
            for (const token of Object.values(targettedTokens)) {
                // Remove any effect with the same name
                await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
            };
        };
    };

    return {};
};

export async function applyEffectToAllTargets(effectId, value) {
    const effectInfo = EFFECTS[effectId];
    for (const token of Object.values(targettedTokens)) {
        // Remove any effect with the same name
        await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
        // Create a new effect
        const effect = await effectsAPI.buildDefault(null, effectInfo.name, effectInfo.icon);
        effect.isTemporary = true;
        effect.seconds = effectInfo.seconds;
        effect.turns = null;
        effect.rounds = null;
        for (const change of effectInfo.changes) {
            effect.changes.push(
                await handleDynamicChanges(effectInfo, token, change, value)
            );
        };
        // Add the effect to the token
        await effectsAPI.addEffectOnToken(token.id, effectInfo.name, effect);
    };
};

async function handleDynamicChanges(effectInfo, token, change, value) {
    change = Object.assign({}, change);
    if (!effectInfo.locked) {
        change.value = value || change.value;
    };

    switch (effectInfo.id) {
        case "reduce":
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
 * Handle requests for chat autocomplete
 * @param {*} menu
 * @param {*} alias
 * @param {*} parameters
 * @returns
 */
function handleAutoComplete(menu, alias, parameters) {
    // Split the parameters into separate fields
    parameters = parameters.toLowerCase().split(" ");

    // Create an empty list of autocomplete entries
    let entries = [];

    // If the first parameter is being written
    if(parameters.length == 1) {
        // Add all the effect entries that match the start of the first parameter
        Object.keys(EFFECTS).filter(effect => effect.startsWith(parameters[0])).forEach(effect => {
            if(!entries.find((entry) => entry.textContent == EFFECTS[effect].commands)) {
                entries.push(game.chatCommands.createInfoElement(EFFECTS[effect].commands));
            };
        });
        // If the first parameter is matching the start of the clear command
        if("clear".startsWith(parameters[0])) {
            // Add a separator
            if(entries.length > 0) entries.push(game.chatCommands.createSeparatorElement());
            // Add clear as a possible command to the autocompletion
            entries.push(game.chatCommands.createInfoElement("clear - remove effect from token"));
        };
    // if the second parameter is being written
    } else if(parameters.length == 2) {
        switch(parameters[0]) {
            // If the first parameter is a clear command
            case "clear":
                // Add all the effect entries that match the start of the second parameter
                Object.keys(EFFECTS).filter(effect => effect.startsWith(parameters[1])).forEach(effect => {
                    if(!entries.find((entry) => entry.textContent == EFFECTS[effect].commands)) {
                        entries.push(game.chatCommands.createInfoElement(EFFECTS[effect].commands));
                    };
                });
                break;
            default:
                // Otherwise, add the help description of the effect specified in the first parameter
                if(Object.keys(EFFECTS).includes(parameters[0]) && EFFECTS[parameters[0]].help) {
                    entries.push(game.chatCommands.createInfoElement(EFFECTS[parameters[0]].help));
                };
                break;
        };
    };

    // Trim the entry list
    entries.length = Math.min(entries.length, menu.maxEntries);

    // Return the autocomplete entries
    return entries;
};