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
    "aid": {
        name: "Aid",
        icon: "https://assets.forge-vtt.com/bazaar/systems/dnd5e/assets/icons/spells/heal-sky-1.jpg",
        commands: "aid",
        changes: [
            {key: "system.attributes.hp.value", value: "5", mode: EFFECT_MODE.ADD},
            {key: "system.attributes.hp.max", value: "5", mode: EFFECT_MODE.ADD}
        ],
        locked: false,
        seconds: 60,
        help: "Bonus to be applied by aid. Defaults to 5.",
        toChatMessage: function (value) { return _toChatMessage("bane", "aided", "to current and maximum HP", value); }
    },
    "bane": {
        name: "Bane",
        icon: "icons/svg/cowled.svg",
        commands: "bane",
        changes: [
            {key: "system.bonuses.All-Attacks", value: "-1d4", mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.abilities.save", value: "-1d4", mode: EFFECT_MODE.ADD}
        ],
        locked: true,
        seconds: 60,
        toChatMessage: function (value) { return _toChatMessage("bane", "baned", "to attacks and saves", value); }
    },
    "barkskin": {
        name: "Barkskin",
        icon: "icons/svg/aura.svg",
        commands: "barkskin",
        changes: [{key: "system.attributes.ac.value", value: "16", mode: EFFECT_MODE.UPGRADE}],
        locked: true,
        seconds: 60,
        toChatMessage: function (value) { return _toChatMessage("barkskin", "protected", "minimum to AC", value); }
    },
    "bless": {
        name: "Bless",
        icon: "icons/svg/angel.svg",
        commands: "bless",
        changes: [
            {key: "system.bonuses.All-Attacks", value: "1d4", mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.abilities.save", value: "1d4", mode: EFFECT_MODE.ADD}
        ],
        locked: true,
        seconds: 60,
        toChatMessage: function (value) { return _toChatMessage("bless", "blessed", "to attacks and saves", value); }
    },
    "divine-favor": {
        name: "Divine Favor",
        icon: "icons/magic/fire/dagger-rune-enchant-blue-gray.webp",
        commands: "divine-favor | df",
        changes: [{key: "system.bonuses.weapon.damage", value: "1d4", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function (value) { return _toChatMessage("divinefavor", "empowered, enhancing weapon attacks with an extra", "1d4", "radiant damage", value); }
    },
    "enlarge": {
        name: "Enlarge/Reduce",
        icon: "icons/svg/upgrade.svg",
        commands: "enlarge",
        changes: [
            {key: "ATL.width", value: null, mode: EFFECT_MODE.ADD},
            {key: "ATL.height", value: null, mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.weapon.damage", value: "1d4", mode: EFFECT_MODE.ADD},
        ],
        locked: true,
        seconds: 60,
        help: "Damage to add to weapon attacks. Defaults to 1d4.",
        toChatMessage: function (value) { return _toChatMessage("enlarge", "enlarged, doubling their size and enhancing all attacks with an extra", "1d4", "damage", value); }
    },
    "ensnaring-strike": {
        name: "Ensnaring Strike",
        icon: "icons/svg/net.svg",
        commands: "ensnaring-strike | es",
        changes: [{key: "flags.mae.estrike", value: "1d6", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the start of turn. Defaults to 1d6.",
        toChatMessage: function (value) { return _toChatMessage("ensnaringstrike", "being pierced by thorns and taking", "1d6", "piercing damage every turn", value); }
    },
    "gift-of-alacrity": {
        name: "Gift of Alacrity",
        icon: "icons/skills/movement/figure-running-gray.webp",
        commands: "gift-of-alacrity | goa",
        changes: [{key: "flags.mae.initBonus", value: "1d8", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60*60*8,
        toChatMessage: function (value) { return _toChatMessage("giftofalacrity", "gifted with alacrity, granting a", "1d8", "bonus to initiative", value); }
    },
    "guidance": {
        name: "Guidance",
        icon: "icons/svg/stone-path.svg",
        commands: "guidance",
        changes: [{key: "system.bonuses.abilities.check", value: "1d4", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function (value) { return _toChatMessage("guidance", "guided, gaining a", "1d4", "to skill checks", value); }
    },
    "heroism": {
        name: "Heroism",
        icon: "icons/magic/life/heart-cross-strong-blue.webp",
        commands: "heroism",
        changes: [{key: "flags.mae.heroismTempHP", value: "0", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Temporary HP to apply at the start of turn.",
        toChatMessage: function (value) { return _toChatMessage("heroism", "imbued with bravery, receiving", "0", "temporary HP every turn", value); }
    },
    "id-insinuation": {
        name: "Id Insinuation",
        icon: "icons/magic/control/hypnosis-mesmerism-pendulum.webp",
        commands: "id-insinuation | ii",
        changes: [{key: "flags.mae.idinsinuation", value: "1d12", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function (value) { return _toChatMessage("idinsinuation", "suffering from conflicting desires, taking", "1d12", "psychic damage every turn", value); }
    },
    "initiative-bonus": {
        name: "Initiative Bonus",
        icon: "icons/skills/movement/arrows-up-trio-red.webp",
        commands: "initiative-bonus | init-bonus | ib",
        changes: [{key: "flags.mae.initBonus", value: "1d8", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60*60*8,
        help: "Bonus to be applied to initiative. Defaults to 1d8.",
        toChatMessage: function (value) { return _toChatMessage("initiativebonus", "more alert, granting a", "1d8", "bonus to initiative", value); }
    },
    "lacerated": {
        name: "Lacerated",
        icon: "icons/skills/wounds/injury-triple-slash-bleed.webp",
        commands: "lacerated | lace",
        changes: [{key: "flags.mae.lacerated", value: "0", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the start of turn.",
        toChatMessage: function (value) { return _toChatMessage("lacerated", "lacerated, bleeding for", "0", "damage every turn", value); }
    },
    "melfs-acid-arrow": {
        name: "Melf's Acid Arrow",
        icon: "icons/svg/acid.svg",
        commands: "melfs-acid-arrow | acid-arrow | maa",
        changes: [{key: "flags.mae.acidarrow", value: "2d4", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the end of turn.",
        toChatMessage: function (value) { return _toChatMessage("melfsacidarrow", "suffering from acid burns and taking", "2d4", "damage next turn", value); }
    },
    "reduce": {
        name: "Enlarge/Reduce",
        icon: "icons/svg/downgrade.svg",
        commands: "reduce",
        changes: [
            {key: "ATL.width", value: null, mode: EFFECT_MODE.ADD},
            {key: "ATL.height", value: null, mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.weapon.damage", value: "-1d4", mode: EFFECT_MODE.ADD},
        ],
        locked: true,
        seconds: 60,
        help: "Damage to add to weapon attacks. Defaults to -1d4.",
        toChatMessage: function (value) { return _toChatMessage("reduce", "reduced, halving their size and hindering all attack damage by", "-1d4", "damage every turn", value); }
    },
    "tashas-caustic-brew": {
        name: "Tasha's Caustic Brew",
        icon: "icons/creatures/slimes/slime-movement-dripping-pseudopods-green.webp",
        commands: "tashas-caustic-brew | caustic-brew | tcb",
        changes: [{key: "flags.mae.causticbrew", value: "2d4", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the start of turn. Defaults to 2d4.",
        toChatMessage: function (value) { return _toChatMessage("tashascausticbrew", "suffering from acid burns and taking", "2d4", "acid damage every turn", value); }
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
function _toChatMessage(effectId, preText, effectValue, postText, value) {
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
    value = value || effectValue;
    // Define the apply button for other users
    const button = `<button class='morby-active-effects' data-effect-id=${effectId} data-effect-value=${value}><i class="fas fa-hand-holding-magic"></i>Apply Effect</button>`;
    // return the code
    return `${targets} ${targetVerb} now ${preText} ${value} ${postText}. ${button}`;
}

/**
 * Effect aliases to information mapping
 */
const EFFECTS = {
    "aid": _EFFECT_INFO["aid"],
    "bane": _EFFECT_INFO["bane"],
    "barkskin": _EFFECT_INFO["barkskin"],
    "bless": _EFFECT_INFO["bless"],
    "df": _EFFECT_INFO["divine-favor"],
    "divine-favor": _EFFECT_INFO["divine-favor"],
    "enlarge": _EFFECT_INFO["enlarge"],
    "ensnaring-strike": _EFFECT_INFO["ensnaring-strike"],
    "es": _EFFECT_INFO["ensnaring-strike"],
    "goa": _EFFECT_INFO["gift-of-alacrity"],
    "gift-of-alacrity": _EFFECT_INFO["gift-of-alacrity"],
    "guidance": _EFFECT_INFO["guidance"],
    "heroism": _EFFECT_INFO["heroism"],
    "ii": _EFFECT_INFO["id-insinuation"],
    "id-insinuation": _EFFECT_INFO["id-insinuation"],
    "ib": _EFFECT_INFO["initiative-bonus"],
    "init-bonus": _EFFECT_INFO["initiative-bonus"],
    "initiative-bonus": _EFFECT_INFO["initiative-bonus"],
    "lace": _EFFECT_INFO["lacerated"],
    "lacerated": _EFFECT_INFO["lacerated"],
    "maa": _EFFECT_INFO["melfs-acid-arrow"],
    "acid-arrow": _EFFECT_INFO["melfs-acid-arrow"],
    "melfs-acid-arrow": _EFFECT_INFO["melfs-acid-arrow"],
    "reduce": _EFFECT_INFO["reduce"],
    "tcb": _EFFECT_INFO["tashas-caustic-brew"],
    "caustic-brew": _EFFECT_INFO["tashas-caustic-brew"],
    "tashas-caustic-brew": _EFFECT_INFO["tashas-caustic-brew"],
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
        // For each token that is selected
        await applyEffectToAllTargets(parameters[0], parameters[1]);
        ChatLog.prototype.processMessage(effectInfo.toChatMessage(parameters[1]));
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
            if (!effect.locked) {
                change.value = value || change.value;
            }
            effect.changes.push(
                await handleDynamicChanges(effectId, token, change)
            );
        }
        // Add the effect to the token
        await effectsAPI.addEffectOnToken(token.id, effectInfo.name, effect);
    }
}

async function handleDynamicChanges(effectId, token, change) {
    const newChange = { key: change.key, value: change.value, mode: change.mode };

    switch (effectId) {
        case "reduce":
            if (change.key.includes("height")) {
                const currentHeight = Number(token.document.height);
                newChange.value = currentHeight <= 1 ? -currentHeight / 2 : -1;
            }
            if (change.key.includes("width")) {
                const currentWidth = Number(token.document.width);
                newChange.value = currentWidth <= 1 ? -currentWidth / 2 : -1;
            }
            break;
        case "enlarge":
            if (change.key.includes("height")) {
                const currentHeight = Number(token.document.height);
                newChange.value = currentHeight <= 1 ? -currentHeight * 2 : 1;
            }
            if (change.key.includes("width")) {
                const currentWidth = Number(token.document.width);
                newChange.value = currentWidth <= 1 ? -currentWidth * 2 : 1;
            }
            break;
    }

    return newChange;
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