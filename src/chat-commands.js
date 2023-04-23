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
    if (parameters[0] == "lacerated") {
        const lacerated = await effectsAPI.buildDefault(null, "Lacerated", "icons/skills/wounds/injury-triple-slash-bleed.webp");
        lacerated.isTemporary = Boolean(60);
        lacerated.seconds = 60;
        lacerated.turns = null;
        lacerated.rounds = null;
        lacerated.changes.push({key: "flags.mae.lacerated", value: parameters[1], mode: EFFECT_MODE.ADD});
        await effectsAPI.addEffectOnToken(controlledToken.id, "Lacerated", lacerated);
        return {}; // Do nothing.
    } else {
        return; // Use core handling (this would fail because siege is not a core command).
    }
}