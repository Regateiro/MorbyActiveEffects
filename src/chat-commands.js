import { targettedTokens, effectsAPI } from "./morby-active-effects.js";

/**
 * List of effect modes
 */
export const EFFECT_MODE = {
    CUSTOM: 0,
    MULTIPLY: 1,
    ADD: 2,
    DOWNGRADE: 3,
    UPGRADE: 4,
    OVERRIDE: 5
};

/**
 * Internal effect information
 */
const _EFFECT_INFO = {
    "bane": {
        name: "Bane",
        icon: "icons/svg/cowled.svg",
        commands: "bane",
        changes: [
            "system.bonuses.All-Attacks",
            "system.bonuses.abilities.save"
        ],
        default: "-1d4",
        seconds: 60,
        help: "Bonus to be applied by bane. Defaults to -1d4.",
        toChatMessage: function (value) { return _toChatMessage("bane", "baned", "to attacks and saves", "-1d4", value); }
    },
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
        help: "Bonus to be applied by bless. Defaults to 1d4.",
        toChatMessage: function (value) { return _toChatMessage("bless", "blessed", "to attacks and saves", "1d4", value); }
    },
    "divinefavor": {
        name: "Divine Favor",
        icon: "icons/magic/fire/dagger-rune-enchant-blue-gray.webp",
        commands: "divinefavor | df",
        changes: ["system.bonuses.weapon.damage"],
        default: "1d4",
        seconds: 60,
        help: "Bonus to be applied to weapon attacks. Defaults to 1d4.",
        toChatMessage: function (value) { return _toChatMessage("divinefavor", "empowered", "radiant damage on weapon attacks", "1d4", value); }
    },
    "ensnaringstrike": {
        name: "Ensnaring Strike",
        icon: "icons/svg/net.svg",
        commands: "ensnaringstrike | es",
        changes: ["flags.mae.estrike"],
        default: "1d6",
        seconds: 60,
        help: "Damage to apply at the start of turn. Defaults to 1d6.",
        toChatMessage: function (value) { return _toChatMessage("ensnaringstrike", "being pierced", "damage every turn", "1d6", value); }
    },
    "giftofalacrity": {
        name: "Gift of Alacrity",
        icon: "icons/skills/movement/figure-running-gray.webp",
        commands: "giftofalacrity | goa",
        changes: ["flags.mae.initBonus"],
        default: "1d8",
        seconds: 60*60*8,
        help: "Bonus to be applied to initiative. Defaults to 1d8.",
        toChatMessage: function (value) { return _toChatMessage("giftofalacrity", "gifted with alacrity", "to initiative", "1d8", value); }
    },
    "guidance": {
        name: "Guidance",
        icon: "icons/svg/stone-path.svg",
        commands: "guidance",
        changes: ["system.bonuses.abilities.check"],
        default: "1d4",
        seconds: 60,
        help: "Bonus to be applied by guidance. Defaults to 1d4.",
        toChatMessage: function (value) { return _toChatMessage("guidance", "guided", "to skill checks", "1d4", value); }
    },
    "heroism": {
        name: "Heroism",
        icon: "icons/magic/life/heart-cross-strong-blue.webp",
        commands: "heroism",
        changes: ["flags.mae.heroismTempHP"],
        default: null,
        seconds: 60,
        help: "Temporary HP to apply at the start of turn.",
        toChatMessage: function (value) { return _toChatMessage("heroism", "imbued with bravery", "temporary HP every turn", null, value); }
    },
    "idinsinuation": {
        name: "Id Insinuation",
        icon: "icons/magic/control/hypnosis-mesmerism-pendulum.webp",
        commands: "idinsinuation | ii",
        changes: ["flags.mae.idinsinuation"],
        default: "1d12",
        seconds: 60,
        help: "Damage to apply at the start of turn. Defaults to 1d12.",
        toChatMessage: function (value) { return _toChatMessage("idinsinuation", "affected by id insinuation", "damage every turn", "1d12", value); }
    },
    "initiativebonus": {
        name: "Initiative Bonus",
        icon: "icons/skills/movement/arrows-up-trio-red.webp",
        commands: "initiativebonus | initbonus | ib",
        changes: ["flags.mae.initBonus"],
        default: "1d8",
        seconds: 60*60*8,
        help: "Bonus to be applied to initiative. Defaults to 1d8.",
        toChatMessage: function (value) { return _toChatMessage("initiativebonus", "more alert", "to initiative", "1d8", value); }
    },
    "lacerated": {
        name: "Lacerated",
        icon: "icons/skills/wounds/injury-triple-slash-bleed.webp",
        commands: "lacerated | lace",
        changes: ["flags.mae.lacerated"],
        default: null,
        seconds: 60,
        help: "Damage to apply at the start of turn.",
        toChatMessage: function (value) { return _toChatMessage("lacerated", "lacerated", "damage every turn", null, value); }
    }
};

/**
 * Converts an effect to a chat message upon application.
 * @param {*} effectVerb 
 * @param {*} effectDesc 
 * @param {*} defaultValue 
 * @param {*} value 
 * @returns 
 */
function _toChatMessage(effectId, effectVerb, effectDesc, defaultValue, value) {
    // Join the token names and select the target verb
    let targets = Object.values(targettedTokens).map(t => t.name).join(", ");
    let targetVerb = "is";
    // Fix the last comma into an 'and' if there are more than 1 token and update the verb
    if(Object.values(targettedTokens).length > 1) {
        var pos = targets.lastIndexOf(',');
        targets = targets.substring(0, pos) + " and " + targets.substring(pos + 1);
        targetVerb = "are";
    }
    // Use the default value if the other value is not given
    value = value || defaultValue;
    // Define the apply button for other users
    const button = `<button class='morby-active-effects' data-effect-id=${effectId} data-effect-value=${value}><i class="fas fa-hand-holding-magic"></i>Apply Effect</button>`;
    // return the code
    return `${targets} ${targetVerb} now ${effectVerb} with ${value} ${effectDesc}. ${button}`;
}

/**
 * Effect aliases to information mapping
 */
const EFFECTS = {
    "bane": _EFFECT_INFO["bane"],
    "bless": _EFFECT_INFO["bless"],
    "df": _EFFECT_INFO["divinefavor"],
    "divinefavor": _EFFECT_INFO["divinefavor"],
    "ensnaringstrike": _EFFECT_INFO["ensnaringstrike"],
    "es": _EFFECT_INFO["ensnaringstrike"],
    "goa": _EFFECT_INFO["giftofalacrity"],
    "giftofalacrity": _EFFECT_INFO["giftofalacrity"],
    "guidance": _EFFECT_INFO["guidance"],
    "heroism": _EFFECT_INFO["heroism"],
    "ii": _EFFECT_INFO["idinsinuation"],
    "idinsinuation": _EFFECT_INFO["idinsinuation"],
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
            await applyEffectToAllTargets(parameters[0], parameters[1]);
            ChatLog.prototype.processMessage(effectInfo.toChatMessage(parameters[1]));
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
            effect.changes.push({key: change, value: value || effectInfo.default, mode: EFFECT_MODE.ADD});
        }
        // Add the effect to the token
        await effectsAPI.addEffectOnToken(token.id, effectInfo.name, effect);
    }
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
            }
        });
        // If the first parameter is matching the start of the clear command
        if("clear".startsWith(parameters[0])) {
            // Add a separator
            if(entries.length > 0) entries.push(game.chatCommands.createSeparatorElement());
            // Add clear as a possible command to the autocompletion
            entries.push(game.chatCommands.createInfoElement("clear - remove effect from token"));
        }
    // if the second parameter is being written
    } else if(parameters.length == 2) {
        switch(parameters[0]) {
            // If the first parameter is a clear command
            case "clear":
                // Add all the effect entries that match the start of the second parameter
                Object.keys(EFFECTS).filter(effect => effect.startsWith(parameters[1])).forEach(effect => {
                    if(!entries.find((entry) => entry.textContent == EFFECTS[effect].commands)) {
                        entries.push(game.chatCommands.createInfoElement(EFFECTS[effect].commands));
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