import { EFFECT_MODE } from "./effects.js";
import { controlledTokens, effectsAPI } from "./morby-active-effects.js";

const EFFECTS = {
    "bless": { name: "Bless", icon: "icons/svg/angel.svg", commands: "bless" },
    "gift": { name: "Guidance", icon: "icons/svg/stone-path.svg", commands: "guidance" },
    "giftofalacrity": { name: "Gift of Alacrity", icon: "icons/skills/movement/figure-running-gray.webp", commands: "giftofalacrity | goa" },
    "guidance": { name: "Guidance", icon: "icons/svg/stone-path.svg", commands: "guidance" },
    "heroism": { name: "Heroism", icon: "icons/magic/life/heart-cross-strong-blue.webp", commands: "heroism" },
    "initiativebonus": { name: "Initiative Bonus", icon: "icons/skills/movement/arrows-up-trio-red.webp", commands: "initiativebonus | initbonus | ib" },
    "lacerated": { name: "Lacerated", icon: "icons/skills/wounds/injury-triple-slash-bleed.webp", commands: "lacerated | lace" },
}

export function cm_register(commands) {
    commands.register({
        name: "/mae",
        module: "morby-active-effects",
        description: "Apply active effects to selected tokens",
        icon: "<i class='fas fa-dice-d20'></i>",
        requiredRole: "NONE",
        callback: handleCommand,
        autocompleteCallback: handleAutoComplete,
        closeOnComplete: true
    });
};

async function handleCommand(chat, parameters, messageData) {
    parameters = parameters.toLowerCase().split(" ");
    switch(parameters[0]) {
        case "lace":
        case "lacerated":
            if(!Boolean(parameters[1])) break; // Require a value
            const lacerated = await effectsAPI.buildDefault(null, EFFECTS["lacerated"].name, EFFECTS["lacerated"].icon);
            lacerated.isTemporary = true;
            lacerated.seconds = 60;
            lacerated.turns = null;
            lacerated.rounds = null;
            lacerated.changes.push({key: "flags.mae.lacerated", value: parameters[1], mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, EFFECTS["lacerated"].name, lacerated);
            }
            break;
        case "heroism":
            if(!Boolean(parameters[1])) break; // Require a value
            const heroism = await effectsAPI.buildDefault(null, EFFECTS["heroism"].name, EFFECTS["heroism"].icon);
            heroism.isTemporary = true;
            heroism.seconds = 60;
            heroism.turns = null;
            heroism.rounds = null;
            heroism.changes.push({key: "flags.mae.heroismTempHP", value: parameters[1], mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, EFFECTS["heroism"].name, heroism);
            }
            break;
        case "ib":
        case "initbonus":
        case "initiativebonus":
            const initiativeBonus = await effectsAPI.buildDefault(null, EFFECTS["initiativebonus"].name, EFFECTS["initiativebonus"].icon);
            initiativeBonus.isTemporary = true;
            initiativeBonus.seconds = 28800;
            initiativeBonus.turns = null;
            initiativeBonus.rounds = null;
            initiativeBonus.changes.push({key: "flags.mae.initBonus", value: parameters[1] || "1d8", mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, EFFECTS["initiativebonus"].name, initiativeBonus);
            }
            break;
        case "goa":
        case "giftofalacrity":
            const giftOfAlacrity = await effectsAPI.buildDefault(null, EFFECTS["giftofalacrity"].name, EFFECTS["giftofalacrity"].icon);
            giftOfAlacrity.isTemporary = true;
            giftOfAlacrity.seconds = 28800;
            giftOfAlacrity.turns = null;
            giftOfAlacrity.rounds = null;
            giftOfAlacrity.changes.push({key: "flags.mae.initBonus", value: parameters[1] || "1d8", mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, EFFECTS["giftofalacrity"].name, giftOfAlacrity);
            }
            break;
        case "bless":
            const bless = await effectsAPI.buildDefault(null, EFFECTS["bless"].name, EFFECTS["bless"].icon);
            bless.isTemporary = true;
            bless.seconds = 60;
            bless.turns = null;
            bless.rounds = null;
            bless.changes.push({key: "system.bonuses.All-Attacks", value: parameters[1] || "1d4", mode: EFFECT_MODE.ADD});
            bless.changes.push({key: "system.bonuses.abilities.save", value: parameters[1] || "1d4", mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, EFFECTS["bless"].name, bless);
            }
            break;
        case "guidance":
            const guidance = await effectsAPI.buildDefault(null, EFFECTS["guidance"].name, EFFECTS["guidance"].icon);
            guidance.isTemporary = true;
            guidance.seconds = 60;
            guidance.turns = null;
            guidance.rounds = null;
            guidance.changes.push({key: "system.bonuses.abilities.check", value: parameters[1] || "1d4", mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, "Guidance", guidance);
            }
            break;
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
    } else if(parameters.length == 2) {
        switch(parameters[0]) {
            case "heroism":
                entries.push(game.chatCommands.createInfoElement("Temporary HP to apply at the start of turn."));
                break;
            case "lace":
            case "lacerated":
                entries.push(game.chatCommands.createInfoElement("Damage to apply at the start of turn."));
                break;
            case "guidance":
                entries.push(game.chatCommands.createInfoElement("Bonus to be applied by guidance. Defaults to 1d4."));
                break;
            case "bless":
                entries.push(game.chatCommands.createInfoElement("Bonus to be applied by bless. Defaults to 1d4."));
                break;
            case "goa":
            case "giftofalacrity":
            case "ib":
            case "initbonus":
            case "initiativebonus":
                entries.push(game.chatCommands.createInfoElement("Bonus to be applied to initiative. Defaults to 1d8."));
                break;
        }
    }
    entries.length = Math.min(entries.length, menu.maxEntries);
    return entries;
};