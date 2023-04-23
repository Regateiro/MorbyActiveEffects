import { EFFECT_MODE } from "./effects.js";
import { controlledTokens, effectsAPI } from "./morby-active-effects.js";

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

async function handleCommand(chat, parameters, messageData) {
    parameters = parameters.toLowerCase().split(" ");
    if(Object.keys(EFFECTS).includes(parameters[0])) {
        const effectInfo = EFFECTS[parameters[0]];
        if (Boolean(effectInfo.default) || Boolean(parameters[1])) {
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
                const effect = await effectsAPI.buildDefault(null, effectInfo.name, effectInfo.icon);
                effect.isTemporary = true;
                effect.seconds = effectInfo.seconds;
                effect.turns = null;
                effect.rounds = null;
                effect.changes.length = 0;
                for (const change of effectInfo.changes) {
                    effect.changes.push({key: change, value: parameters[1] || effectInfo.default, mode: EFFECT_MODE.ADD});
                }
                await effectsAPI.addEffectOnToken(token.id, effectInfo.name, effect);
            }
        }
    } else if (parameters[0] == "clear") {
        if(Object.keys(EFFECTS).includes(parameters[1])) {
            const effectInfo = EFFECTS[parameters[1]];
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.removeEffectOnToken(token.id, effectInfo.name);
            }
        }
    }
    return {};
};

function handleAutoComplete(menu, alias, parameters) {
    parameters = parameters.toLowerCase().split(" ");
    let entries = [];
    if(parameters.length == 1) {
        Object.keys(EFFECTS).filter(effect => effect.startsWith(parameters[0])).forEach(effect => {
            entries.push(game.chatCommands.createInfoElement(EFFECTS[effect].commands));
        });
        if("clear".startsWith(parameters[0])) {
            if(entries.length > 0) entries.push(game.chatCommands.createSeparatorElement());
            entries.push(game.chatCommands.createInfoElement("clear"));
        }
    } else if(parameters.length == 2) {
        switch(parameters[0]) {
            case "clear":
                Object.keys(EFFECTS).filter(effect => effect.startsWith(parameters[1])).forEach(effect => {
                    entries.push(game.chatCommands.createInfoElement(EFFECTS[effect].commands));
                });
                break;
            default:
                if(Object.keys(EFFECTS).includes(parameters[0])) {
                    entries.push(game.chatCommands.createInfoElement(EFFECTS[parameters[0]].help));
                }
                break;
        }
    }
    entries.length = Math.min(entries.length, menu.maxEntries);
    return entries;
};