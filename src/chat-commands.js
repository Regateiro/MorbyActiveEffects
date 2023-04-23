import { EFFECT_MODE } from "./effects.js";
import { controlledTokens, effectsAPI } from "./morby-active-effects.js";

const SUPPORTED_EFFECTS = [
    "lacerated",
    "heroism",
    "initiativeBonus"
]

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
        case "lacerated":
            const lacerated = await effectsAPI.buildDefault(null, "Lacerated", "icons/skills/wounds/injury-triple-slash-bleed.webp");
            lacerated.isTemporary = true;
            lacerated.seconds = 60;
            lacerated.turns = null;
            lacerated.rounds = null;
            lacerated.changes.push({key: "flags.mae.lacerated", value: parameters[1], mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, "Lacerated", lacerated);
            }
            break;
        case "heroism":
            const heroism = await effectsAPI.buildDefault(null, "Heroism", "icons/magic/life/heart-cross-strong-blue.webp");
            heroism.isTemporary = true;
            heroism.seconds = 60;
            heroism.turns = null;
            heroism.rounds = null;
            heroism.changes.push({key: "flags.mae.heroismTempHP", value: parameters[1], mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, "Heroism", heroism);
            }
            break;
        case "initiativeBonus":
            const initiativeBonus = await effectsAPI.buildDefault(null, "Initiative Bonus", "icons/skills/movement/arrows-up-trio-red.webp");
            initiativeBonus.isTemporary = true;
            initiativeBonus.seconds = 28800;
            initiativeBonus.turns = null;
            initiativeBonus.rounds = null;
            initiativeBonus.changes.push({key: "flags.mae.initBonus", value: parameters[1], mode: EFFECT_MODE.ADD});
            for (const token of Object.values(controlledTokens)) {
                await effectsAPI.addEffectOnToken(token.id, "Initiative Bonus", initiativeBonus);
            }
            break;
    }
    return {};
};

function handleAutoComplete(menu, alias, parameters) {
    parameters = parameters.toLowerCase().split(" ");
    let entries = [];
    if(parameters.length == 1) {
        SUPPORTED_EFFECTS.filter(effect => effect.startsWith(parameters[0])).forEach(effect => {
            entries.push(game.chatCommands.createInfoElement(effect));
        });
    } else if(parameters.length == 2) {
        entries.push(game.chatCommands.createInfoElement("Value to apply when triggered (e.g. 5, 1d4, etc.)"));
    }
    entries.length = Math.min(entries.length, menu.maxEntries);
    return entries;
};