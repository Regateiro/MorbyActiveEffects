import { EFFECT_MODE } from "./effects.js";
import { targettedTokens, effectsAPI } from "./morby-active-effects.js";

/**
 * Internal effect information
 */
const _EFFECT_INFO = {
    "bless": {
        name: "Bless",
        icon: "icons/svg/angel.svg",
        commands: "bless",
        changes: [
            "system.bonuses.All-Attacks",
            "system.bonuses.abilities.save"
        ],
        default: "1d4",
        seconds: 60,
        help: "Bonus to be applied by bless. Defaults to 1d4."
    },
    "giftofalacrity": {
        name: "Gift of Alacrity",
        icon: "icons/skills/movement/figure-running-gray.webp",
        commands: "giftofalacrity | goa",
        changes: ["flags.mae.initBonus"],
        default: "1d8",
        seconds: 60*60*8,
        help: "Bonus to be applied to initiative. Defaults to 1d8."
    },
    "guidance": {
        name: "Guidance",
        icon: "icons/svg/stone-path.svg",
        commands: "guidance",
        changes: ["system.bonuses.abilities.check"],
        default: "1d4",
        seconds: 60,
        help: "Bonus to be applied by guidance. Defaults to 1d4."
    },
    "heroism": {
        name: "Heroism",
        icon: "icons/magic/life/heart-cross-strong-blue.webp",
        commands: "heroism",
        changes: ["flags.mae.heroismTempHP"],
        default: null,
        seconds: 60,
        help: "Temporary HP to apply at the start of turn."
    },
    "initiativebonus": {
        name: "Initiative Bonus",
        icon: "icons/skills/movement/arrows-up-trio-red.webp",
        commands: "initiativebonus | initbonus | ib",
        changes: ["flags.mae.initBonus"],
        default: "1d8",
        seconds: 60*60*8,
        help: "Bonus to be applied to initiative. Defaults to 1d8."
    },
    "lacerated": {
        name: "Lacerated",
        icon: "icons/skills/wounds/injury-triple-slash-bleed.webp",
        commands: "lacerated | lace",
        changes: ["flags.mae.lacerated"],
        default: null,
        seconds: 60,
        help: "Damage to apply at the start of turn."
    }
};

/**
 * Effect aliases to information mapping
 */
const EFFECTS = {
    "bless": _EFFECT_INFO["bless"],
    "goa": _EFFECT_INFO["giftofalacrity"],
    "giftofalacrity": _EFFECT_INFO["giftofalacrity"],
    "guidance": _EFFECT_INFO["guidance"],
    "heroism": _EFFECT_INFO["heroism"],
    "ib": _EFFECT_INFO["initiativebonus"],
    "initbonus": _EFFECT_INFO["initiativebonus"],
    "initiativebonus": _EFFECT_INFO["initiativebonus"],
    "lace": _EFFECT_INFO["lacerated"],
    "lacerated": _EFFECT_INFO["lacerated"],
};

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
    if(Object.keys(EFFECTS).includes(parameters[0])) {
        // Get the effect information
        const effectInfo = EFFECTS[parameters[0]];
        // Determine if the effect has a default value or not, and if not, assert that one is provided
        if (Boolean(effectInfo.default) || Boolean(parameters[1])) {
            // For each token that is selected
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
                    effect.changes.push({key: change, value: parameters[1] || effectInfo.default, mode: EFFECT_MODE.ADD});
                }
                // Add the effect to the token
                await effectsAPI.addEffectOnToken(token.id, effectInfo.name, effect);
            }
        }
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
            }
        }
    }

    return {};
};

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
            const entry = game.chatCommands.createInfoElement(EFFECTS[effect].commands);
            if(!entries.includes(entry)) {
                entries.push(entry);
            }
        });
        // If the first parameter is matching the start of the clear command
        if("clear".startsWith(parameters[0])) {
            // Add a seperator if the entry list is not empty
            if(entries.length > 0) entries.push(game.chatCommands.createSeparatorElement());
            // Add clear as a possible command to the autocompletion
            entries.push(game.chatCommands.createInfoElement("clear"));
        }
    // if the second parameter is being written
    } else if(parameters.length == 2) {
        switch(parameters[0]) {
            // If the first parameter is a clear command
            case "clear":
                // Add all the effect entries that match the start of the second parameter
                Object.keys(EFFECTS).filter(effect => effect.startsWith(parameters[1])).forEach(effect => {
                    const entry = game.chatCommands.createInfoElement(EFFECTS[effect].commands);
                    if(!entries.includes(entry)) {
                        entries.push(entry);
                    }
                });
                break;
            default:
                // Otherwise, add the help description of the effect specified in the first parameter
                if(Object.keys(EFFECTS).includes(parameters[0])) {
                    entries.push(game.chatCommands.createInfoElement(EFFECTS[parameters[0]].help));
                }
                break;
        }
    }

    // Trim the entry list
    entries.length = Math.min(entries.length, menu.maxEntries);

    // Return the autocomplete entries
    return entries;
};