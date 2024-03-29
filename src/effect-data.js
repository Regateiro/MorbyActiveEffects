import { targetedTokens } from "./morby-active-effects.js";

/**
 * List of effect modes
 */
const EFFECT_MODE = {
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
        id: "aid",
        name: "Aid",
        icon: "https://assets.forge-vtt.com/bazaar/systems/dnd5e/assets/icons/spells/heal-sky-1.jpg",
        commands: "aid",
        changes: [
            {key: "system.attributes.hp.tempmax", value: "+5", mode: EFFECT_MODE.ADD}
        ],
        locked: false,
        seconds: 60,
        help: "Bonus to be applied by aid. Defaults to 5.",
        toChatMessage: function (value) { return _toChatMessage("aid", `aided with an extra ${value || "5"} current and maximum HP`, value); }
    },
    "bane": {
        id: "bane",
        name: "Bane",
        icon: "icons/svg/cowled.svg",
        commands: "bane",
        changes: [
            {key: "system.bonuses.All-Attacks", value: "-1d4", mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.abilities.save", value: "-1d4", mode: EFFECT_MODE.ADD}
        ],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("bane", "baned, hindering attack rolls and saving throws by -1d4"); }
    },
    "barkskin": {
        id: "barkskin",
        name: "Barkskin",
        icon: "icons/svg/aura.svg",
        commands: "barkskin | bark",
        changes: [{key: "system.attributes.ac.value", value: "16", mode: EFFECT_MODE.UPGRADE}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("barkskin", "protected, setting their AC to a minimum of 16"); }
    },
    "bless": {
        id: "bless",
        name: "Bless",
        icon: "icons/svg/angel.svg",
        commands: "bless",
        changes: [
            {key: "system.bonuses.All-Attacks", value: "+1d4", mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.abilities.save", value: "+1d4", mode: EFFECT_MODE.ADD}
        ],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("bless", "blessed with an extra 1d4 to attack rolls and saving throws"); }
    },
    "blood-boil": {
        id: "blood-boil",
        name: "Blood Boil",
        icon: "icons/svg/fire.svg",
        commands: "blood-boil | bb",
        changes: [{key: "flags.mae.bloodboil", value: "7d6", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("blood-boil", "agonized with superheated blood, taking 7d6 fire damage on a failed CON save each turn"); }
    },
    "confusion": {
        id: "confusion",
        name: "Confusion",
        icon: "icons/svg/stoned.svg",
        commands: "confusion",
        changes: [{key: "flags.mae.confusion", value: "1", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("confusion", "confused, taking random actions each turn"); }
    },
    "divine-favor": {
        id: "divine-favor",
        name: "Divine Favor",
        icon: "icons/magic/fire/dagger-rune-enchant-blue-gray.webp",
        commands: "divine-favor | df",
        changes: [{key: "system.bonuses.weapon.damage", value: "+1d4", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("divine-favor", "empowered, enhancing weapon attacks with an extra 1d4 radiant damage"); }
    },
    "enlarge": {
        id: "enlarge",
        name: "Enlarge/Reduce",
        icon: "icons/svg/upgrade.svg",
        commands: "enlarge",
        changes: [
            {key: "ATL.width", value: null, mode: EFFECT_MODE.ADD},
            {key: "ATL.height", value: null, mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.weapon.damage", value: "+1d4", mode: EFFECT_MODE.ADD},
        ],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("enlarge", "enlarged, doubling their size and enhancing all attack damage by 1d4"); }
    },
    "ensnaring-strike": {
        id: "ensnaring-strike",
        name: "Ensnaring Strike",
        icon: "icons/magic/nature/root-vine-hand-strike.webp",
        commands: "ensnaring-strike | es",
        changes: [{key: "flags.mae.estrike", value: "1d6", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the start of turn. Defaults to 1d6.",
        toChatMessage: function (value) { return _toChatMessage("ensnaring-strike", `being pierced by thorns and taking ${value || "1d6"} piercing damage every turn`, value); }
    },
    "gift-of-alacrity": {
        id: "gift-of-alacrity",
        name: "Gift of Alacrity",
        icon: "icons/skills/movement/figure-running-gray.webp",
        commands: "gift-of-alacrity | goa",
        changes: [{key: "flags.mae.initBonus", value: "1d8", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60*60*8,
        toChatMessage: function () { return _toChatMessage("gift-of-alacrity", "gifted with alacrity, granting a 1d8 bonus to initiative"); }
    },
    "guidance": {
        id: "guidance",
        name: "Guidance",
        icon: "icons/svg/stone-path.svg",
        commands: "guidance",
        changes: [{key: "system.bonuses.abilities.check", value: "+1d4", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("guidance", "guided, gaining a 1d4 to skill checks"); }
    },
    "heroism": {
        id: "heroism",
        name: "Heroism",
        icon: "icons/magic/life/heart-cross-strong-blue.webp",
        commands: "heroism",
        changes: [{key: "flags.mae.heroismTempHP", value: "0", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Temporary HP to apply at the start of turn. Defaults to 0.",
        toChatMessage: function (value) { return _toChatMessage("heroism", `imbued with bravery, receiving ${value || "0"} temporary HP every turn`, value); }
    },
    "id-insinuation": {
        id: "id-insinuation",
        name: "Id Insinuation",
        icon: "icons/magic/control/hypnosis-mesmerism-pendulum.webp",
        commands: "id-insinuation | ii",
        changes: [{key: "flags.mae.idinsinuation", value: "1d12", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("id-insinuation", "suffering from conflicting desires, taking 1d12 psychic damage every turn"); }
    },
    "immolation": {
        id: "immolation",
        name: "Immolation",
        icon: "icons/svg/fire.svg",
        commands: "immolation | im",
        changes: [{key: "flags.mae.immolation", value: "6d6", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("immolation", "wreathed in flames, taking 6d6 fire damage on a failed DEX save each turn"); }
    },
    "initiative-bonus": {
        id: "initiative-bonus",
        name: "Initiative Bonus",
        icon: "icons/svg/upgrade.svg",
        commands: "initiative-bonus | init-bonus | ib",
        changes: [{key: "flags.mae.initBonus", value: "1d8", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60*60*8,
        help: "Bonus to be applied to initiative. Defaults to 1d8.",
        toChatMessage: function (value) { return _toChatMessage("initiative-bonus", `more alert, granting a ${value || "1d8"} bonus to initiative`, value); }
    },
    "killing-winds": {
        id: "killing-winds",
        name: "Killing Winds",
        icon: "icons/svg/acid.svg",
        commands: "killing-winds | kw",
        changes: [{key: "flags.mae.killingwinds", value: "4d12", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("killing-winds", "corroding rapidly, taking 4d12 acid damage on a failed CON save each turn"); }
    },
    "lacerated": {
        id: "lacerated",
        name: "Lacerated",
        icon: "icons/svg/blood.svg",
        commands: "lacerated | lace",
        changes: [{key: "flags.mae.lacerated", value: "0", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the start of turn. Defaults to 0.",
        toChatMessage: function (value) { return _toChatMessage("lacerated", `lacerated, bleeding for ${value || "0"} damage every turn`, value); }
    },
    "melfs-acid-arrow": {
        id: "melfs-acid-arrow",
        name: "Melf's Acid Arrow",
        icon: "icons/svg/acid.svg",
        commands: "melfs-acid-arrow | acid-arrow | maa",
        changes: [{key: "flags.mae.acidarrow", value: "2d4", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the end of turn. Defaults to 2d4.",
        toChatMessage: function (value) { return _toChatMessage("melfs-acid-arrow", `suffering from acid burns and taking ${value || "2d4"} damage next turn`, value); }
    },
    "phantasmal-killer": {
        id: "phantasmal-killer",
        name: "Phantasmal Killer",
        icon: "icons/svg/eye.svg",
        commands: "phantasmal-killer | pkiller | pk",
        changes: [{key: "flags.mae.pkiller", value: "6d10", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the end of turn. Defaults to 6d10.",
        toChatMessage: function (value) { return _toChatMessage("phantasmal-killer", `facing their deepest fears, taking ${value || "6d10"} psychic damage on a failed WIS save each turn`, value); }
    },
    "reduce": {
        id: "reduce",
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
        toChatMessage: function () { return _toChatMessage("reduce", "reduced, halving their size and hindering all attack damage by -1d4"); }
    },
    "reality-break": {
        id: "reality-break",
        name: "Reality Break",
        icon: "icons/svg/explosion.svg",
        commands: "reality-break | rbreak | rb",
        changes: [
            {key: "flags.mae.rbreak", value: "1", mode: EFFECT_MODE.ADD}
        ],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("reality-break", "in turmoil and madness, sufferin 6d12, 8d12, or 10d12 damage every turn"); }
    },
    "regenerate": {
        id: "regenerate",
        name: "Regenerate",
        icon: "icons/svg/regen.svg",
        commands: "regenerate | regen",
        changes: [
            {key: "flags.mae.regenerate", value: "10", mode: EFFECT_MODE.ADD}
        ],
        locked: false,
        seconds: 3600,
        help: "Health to be regenerated. Defaults to 10.",
        toChatMessage: function (value) { return _toChatMessage("regenerate", `regenerating ${value || "10"} HP every turn`, value); }
    },
    "searing-smite": {
        id: "searing-smite",
        name: "Searing Smite",
        icon: "icons/svg/fire.svg",
        commands: "searing-smite | sm",
        changes: [{key: "flags.mae.searingsmite", value: "1d6", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("searing-smite", `engulfed in flames, taking 1d6 fire damage on a failed CON save each turn`); }
    },
    "synaptic-static": {
        id: "synaptic-static",
        name: "Synaptic Static",
        icon: "icons/svg/cowled.svg",
        commands: "synaptic-static | ss",
        changes: [
            {key: "flags.mae.synapticstatic", value: "1", mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.All-Attacks", value: "-1d6", mode: EFFECT_MODE.ADD},
            {key: "system.bonuses.abilities.check", value: "-1d6", mode: EFFECT_MODE.ADD}
        ],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("synaptic-static", `suffering from muddled thoughts, hindering attack rolls and ability checks by -1d6 (concentration saving throws must be handled manually)`); }
    },
    "tashas-caustic-brew": {
        id: "tashas-caustic-brew",
        name: "Tasha's Caustic Brew",
        icon: "icons/svg/acid.svg",
        commands: "tashas-caustic-brew | caustic-brew | tcb",
        changes: [{key: "flags.mae.causticbrew", value: "2d4", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the start of turn. Defaults to 2d4.",
        toChatMessage: function (value) { return _toChatMessage("tashas-caustic-brew", `suffering from acid burns, taking ${value || "2d4"} acid damage every turn`, value); }
    },
    "vitriolic-sphere": {
        id: "vitriolic-sphere",
        name: "Vitriolic Sphere",
        icon: "icons/svg/acid.svg",
        commands: "vitriolic-sphere | vsphere | vs",
        changes: [{key: "flags.mae.vsphere", value: "5d4", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: 60,
        help: "Damage to apply at the end of turn. Defaults to 5d4.",
        toChatMessage: function (value) { return _toChatMessage("vitriolic-sphere", `suffering from acid burns and taking ${value || "5d4"} acid damage next turn`, value); }
    },
    "voracious-poison": {
        id: "voracious-poison",
        name: "Voracious Poison",
        icon: "icons/svg/poison.svg",
        commands: "voracious-poison | vpoison | vp",
        changes: [{key: "flags.mae.vpoison", value: "16d8", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("voracious-poison", "poisoned, taking 16d8 poison on a failed CON save each turn"); }
    },
    "weird": {
        id: "weird",
        name: "Weird",
        icon: "icons/svg/eye.svg",
        commands: "weird",
        changes: [{key: "flags.mae.weird", value: "11d10", mode: EFFECT_MODE.ADD}],
        locked: true,
        seconds: 60,
        toChatMessage: function () { return _toChatMessage("weird", "facing their deepest fears, taking 11d10 psychic damage on a failed WIS save each turn"); }
    },
    /******* Armor Mastery *******/
    "armor-mastery": {
        id: "armor-mastery",
        name: "Armor Mastery",
        icon: "icons/skills/melee/shield-block-gray-yellow.webp",
        commands: "armor-mastery | am",
        changes: [{key: "flags.mae.armorMastery", value: "0", mode: EFFECT_MODE.ADD}],
        locked: false,
        seconds: null,
        help: "Temporary HP to add after a rest. Defaults to 0.",
        toChatMessage: function () {}
    }
};

/**
 * Effect aliases to information mapping
 */
export const EFFECTS = {
    "aid": _EFFECT_INFO["aid"],
    "am": _EFFECT_INFO["armor-mastery"],
    "armor-mastery": _EFFECT_INFO["armor-mastery"],
    "bane": _EFFECT_INFO["bane"],
    "bark": _EFFECT_INFO["barkskin"],
    "barkskin": _EFFECT_INFO["barkskin"],
    "bless": _EFFECT_INFO["bless"],
    "bb": _EFFECT_INFO["blood-boil"],
    "blood-boil": _EFFECT_INFO["blood-boil"],
    "confusion": _EFFECT_INFO["confusion"],
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
    "im": _EFFECT_INFO["immolation"],
    "immolation": _EFFECT_INFO["immolation"],
    "ib": _EFFECT_INFO["initiative-bonus"],
    "init-bonus": _EFFECT_INFO["initiative-bonus"],
    "initiative-bonus": _EFFECT_INFO["initiative-bonus"],
    "kw": _EFFECT_INFO["killing-winds"],
    "killing-winds": _EFFECT_INFO["killing-winds"],
    "lace": _EFFECT_INFO["lacerated"],
    "lacerated": _EFFECT_INFO["lacerated"],
    "maa": _EFFECT_INFO["melfs-acid-arrow"],
    "acid-arrow": _EFFECT_INFO["melfs-acid-arrow"],
    "melfs-acid-arrow": _EFFECT_INFO["melfs-acid-arrow"],
    "pk": _EFFECT_INFO["phantasmal-killer"],
    "pkiller": _EFFECT_INFO["phantasmal-killer"],
    "phantasmal-killer": _EFFECT_INFO["phantasmal-killer"],
    "reduce": _EFFECT_INFO["reduce"],
    "rb": _EFFECT_INFO["reality-break"],
    "rbreak": _EFFECT_INFO["reality-break"],
    "reality-break": _EFFECT_INFO["reality-break"],
    "regen": _EFFECT_INFO["regenerate"],
    "regenerate": _EFFECT_INFO["regenerate"],
    "sm": _EFFECT_INFO["searing-smite"],
    "searing-smite": _EFFECT_INFO["searing-smite"],
    "ss": _EFFECT_INFO["synaptic-static"],
    "synaptic-static": _EFFECT_INFO["synaptic-static"],
    "tcb": _EFFECT_INFO["tashas-caustic-brew"],
    "caustic-brew": _EFFECT_INFO["tashas-caustic-brew"],
    "tashas-caustic-brew": _EFFECT_INFO["tashas-caustic-brew"],
    "vs": _EFFECT_INFO["vitriolic-sphere"],
    "vsphere": _EFFECT_INFO["vitriolic-sphere"],
    "vitriolic-sphere": _EFFECT_INFO["vitriolic-sphere"],
    "vp": _EFFECT_INFO["voracious-poison"],
    "vpoison": _EFFECT_INFO["voracious-poison"],
    "voracious-poison": _EFFECT_INFO["voracious-poison"],
    "weird": _EFFECT_INFO["weird"],
};

/**
 * Converts an effect to a chat message upon application.
 * @param {String} effectId The id of the effect to convert
 * @param {String} preText Prefix for what the effect does
 * @param {String} effectValue How much damage/healing/other is the effect doing
 * @param {String} postText The suffix for what the effect does
 * @param {String} value The value associated with the effect to pass to the callback
 * @returns A string with the effect data to be put into chat.
 */
function _toChatMessage(effectId, text, userValue) {
    // Join the token names and select the target verb
    let targets = Object.values(targetedTokens).map(t => t.name).join(", ");
    let targetVerb = "is";
    // Fix the last comma into an 'and' if there are more than 1 token and update the verb
    if(Object.values(targetedTokens).length > 1) {
        var pos = targets.lastIndexOf(',');
        targets = targets.substring(0, pos) + " and " + targets.substring(pos + 1);
        targetVerb = "are";
    };
    // Use the default value if the other value is not given
    const value = userValue || "";
    // Define the apply button for other users
    const button = `<button class='mae-apply-effect' data-effect-id=${effectId} data-effect-value=${value}><i class="fas fa-hand-holding-magic"></i>Apply Effect</button>`;
    // return the code
    return `${targets} ${targetVerb} now ${text}. ${button}`;
};