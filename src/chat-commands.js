import { EFFECT_MODE } from "./effects.js";
import { controlledToken, effectsAPI } from "./morby-active-effects.js";

export function cm_register(commands) {
    commands.register({
        name: "/mae",
        module: "morby-active-effects",
        description: "/mae &lt;condition&gt; &lt;value&gt;",
        icon: "<i class='fas fa-dice-d20'></i>",
        requiredRole: "NONE",
        callback: handleCommand,
        closeOnComplete: true
    });
}

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
            await effectsAPI.addEffectOnToken(controlledToken.id, "Lacerated", lacerated);
            break;
        case "heroism":
            const heroism = await effectsAPI.buildDefault(null, "Heroism", "icons/magic/life/heart-cross-strong-blue.webp");
            lacerated.isTemporary = true;
            lacerated.seconds = 60;
            lacerated.turns = null;
            lacerated.rounds = null;
            lacerated.changes.push({key: "flags.mae.heroismTempHP", value: parameters[1], mode: EFFECT_MODE.ADD});
            await effectsAPI.addEffectOnToken(controlledToken.id, "Heroism", heroism);
            break;
        case "initiativeBonus":
            const initiativeBonus = await effectsAPI.buildDefault(null, "Initiative Bonus", "icons/skills/movement/arrows-up-trio-red.webp");
            lacerated.isTemporary = true;
            lacerated.seconds = 28800;
            lacerated.turns = null;
            lacerated.rounds = null;
            lacerated.changes.push({key: "flags.mae.initBonus", value: parameters[1], mode: EFFECT_MODE.ADD});
            await effectsAPI.addEffectOnToken(controlledToken.id, "Initiative Bonus", initiativeBonus);
            break;
    }
    return {};
}