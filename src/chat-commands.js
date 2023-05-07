import { EFFECTS } from "./effect-data.js";
import { targetedTokens, effectsAPI } from "./morby-active-effects.js";

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
    if(Object.keys(targetedTokens).length > 0 && Object.keys(EFFECTS).includes(parameters[0])) {
        // Get the effect information
        const effectInfo = EFFECTS[parameters[0]];
        // For each token that is selected
        let effectMsg = effectInfo.toChatMessage(parameters[1]);
        await applyEffectToAllTargets(parameters[0], parameters[1]);
        if (effectMsg) {
            await ChatMessage.create({content: effectMsg});
        };
    // If the first parameter is a clear command
    } else if (parameters[0] == "clear") {
        // Determine if the second parameter corresponds to an effect
        if(Object.keys(EFFECTS).includes(parameters[1])) {
            // Get the effect information
            const effectInfo = EFFECTS[parameters[1]];
            // For each token that is selected
            for (const token of Object.values(targetedTokens)) {
                // Remove any effect with the same name
                await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
            };
        };
    } else if (parameters[0] == "amthp") {
        for (const token of Object.values(targetedTokens)) {
            let amTempHP = token.actor.flags.mae.tempArmorMastery;
            let tempHP = token.actor.system.attributes.hp.temp - amTempHP;

            // If a new armor mastery value is provided, update it (0 < newValue < maxValue)
            if(Boolean(parameters[1])) {
                amTempHP = Math.max(Math.min(Number(parameters[1]), token.actor.flags.mae.armorMastery), 0);
                await token.actor.update({"flags.mae.tempArmorMastery": amTempHP});
                await token.actor.update({"system.attributes.hp.temp": amTempHP + tempHP});
            };

            // Display the current temporary HP details of the target
            await ChatMessage.create({
                content: `${token.name} has ${amTempHP} temp HP from armor mastery and ${tempHP} temp HP from other sources!`
            });
        };
    };

    return {};
};

/**
 * Apply an effect to all targeted tokens
 * @param {String} effectId 
 * @param {String} value 
 */
export async function applyEffectToAllTargets(effectId, value) {
    const effectInfo = EFFECTS[effectId];
    for (const token of Object.values(targetedTokens)) {
        // Remove any effect with the same name
        await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
        // Create a new effect
        const effect = await effectsAPI.buildDefault(null, effectInfo.name, effectInfo.icon);
        effect.isTemporary = Boolean(effectInfo.seconds);
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
        // If the effect is Aid, heal the target as well on application
        if (effectInfo.id == "aid") {
            await token.actor.update({"system.attributes.hp.value": (token.actor.system.attributes.hp.value + (Number(value) || 5))});
        // If the effect is armor mastery, set the current armor mastery pool to the value set
        } else if (effectInfo.id == "armor-mastery") {
            let amTempHP = token?.actor?.flags?.mae?.tempArmorMastery || 0;
            let tempHP = token.actor.system.attributes.hp.temp - amTempHP;
            amTempHP = Number(value) || 0;
            await token.actor.update({"flags.mae.tempArmorMastery": amTempHP});
            await token.actor.update({"system.attributes.hp.temp": amTempHP + tempHP});
        };
    };
};

/**
 * Modify the effect change given the token context
 * @param {String} effectInfo 
 * @param {Token5e} token 
 * @param {Object} change 
 * @param {String} value 
 * @returns The modified change object
 */
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
    const special = ["clear", "amthp"];

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
        // Add a separator if there are normal entries and special command entries
        if(entries.length > 0 && special.find(c => c.startsWith(parameters[0]))) {
            entries.length = Math.min(entries.length, menu.maxEntries - special.length - 1);
            entries.push(game.chatCommands.createSeparatorElement());
        }
        // If the first parameter is matching the start of the clear command
        if("amthp".startsWith(parameters[0])) {
            // Add clear as a possible command to the autocompletion
            entries.push(game.chatCommands.createInfoElement("amthp - show armor mastery temporary HP"));
        };
        // If the first parameter is matching the start of the clear command
        if("clear".startsWith(parameters[0])) {
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
            case "amthp":
                // Add all the effect entries that match the start of the second parameter
                entries.push(game.chatCommands.createInfoElement("Value to set armor mastery temporary HP to."));
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