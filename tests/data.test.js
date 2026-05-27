import { describe, it, expect, beforeEach } from "vitest";
import { EFFECTS } from "../src/effect-data.js";
import { targetedTokens } from "../src/morby-active-effects.js";

/* ---------- _toChatMessage output ---------- */

describe("toChatMessage formatting", () => {
    beforeEach(() => {
        Object.keys(targetedTokens).forEach(k => delete targetedTokens[k]);
    });

    it("formats single-target message with singular verb", () => {
        targetedTokens["t1"] = { name: "Goblin" };
        const msg = EFFECTS.bless.toChatMessage();
        expect(msg).toContain("Goblin");
        expect(msg).toContain("is");
        expect(msg).toContain("blessed");
        expect(msg).toContain("Apply Effect");
    });

    it("formats multi-target message with 'and' before last name and plural verb", () => {
        targetedTokens["t1"] = { name: "Goblin" };
        targetedTokens["t2"] = { name: "Orc" };
        targetedTokens["t3"] = { name: "Troll" };
        const msg = EFFECTS.bane.toChatMessage();
        expect(msg).toContain("Goblin, Orc and");
        expect(msg).toContain("Troll");
        expect(msg).toContain("are");
        expect(msg).toContain("baned");
    });

    it("includes user-supplied value in the text", () => {
        targetedTokens["t1"] = { name: "Fighter" };
        const msg = EFFECTS.aid.toChatMessage("15");
        expect(msg).toContain("15");
        expect(msg).toContain("aided");
    });

    it("falls back to default value when none provided", () => {
        targetedTokens["t1"] = { name: "Wizard" };
        const msg = EFFECTS.aid.toChatMessage();
        expect(msg).toContain("5");
    });

    it("escapes single quotes in the apply button data attributes", () => {
        targetedTokens["t1"] = { name: "Goblin" };
        const msg = EFFECTS.aid.toChatMessage("5'+3");
        expect(msg).toContain("&#39;");
        expect(msg).toContain("data-effect-value");
    });
});

describe("EFFECTS auto-generation", () => {
    it("contains every primary key from _EFFECT_INFO's commands field", () => {
        expect(EFFECTS.aid).toBeDefined();
        expect(EFFECTS.bane).toBeDefined();
        expect(EFFECTS.barkskin).toBeDefined();
        expect(EFFECTS.bless).toBeDefined();
        expect(EFFECTS.confusion).toBeDefined();
        expect(EFFECTS.weird).toBeDefined();
    });

    it("maps secondary aliases to the same info object as the primary key", () => {
        expect(EFFECTS.bark).toBe(EFFECTS.barkskin);
        expect(EFFECTS.bb).toBe(EFFECTS["blood-boil"]);
        expect(EFFECTS.df).toBe(EFFECTS["divine-favor"]);
        expect(EFFECTS.es).toBe(EFFECTS["ensnaring-strike"]);
        expect(EFFECTS.goa).toBe(EFFECTS["gift-of-alacrity"]);
        expect(EFFECTS.gm).toBe(EFFECTS["greater-malison"]);
        expect(EFFECTS.ii).toBe(EFFECTS["id-insinuation"]);
        expect(EFFECTS.im).toBe(EFFECTS.immolation);
        expect(EFFECTS.ib).toBe(EFFECTS["initiative-bonus"]);
        expect(EFFECTS["init-bonus"]).toBe(EFFECTS["initiative-bonus"]);
        expect(EFFECTS.kw).toBe(EFFECTS["killing-winds"]);
        expect(EFFECTS.lace).toBe(EFFECTS.lacerated);
        expect(EFFECTS.maa).toBe(EFFECTS["melfs-acid-arrow"]);
        expect(EFFECTS["acid-arrow"]).toBe(EFFECTS["melfs-acid-arrow"]);
        expect(EFFECTS.pk).toBe(EFFECTS["phantasmal-killer"]);
        expect(EFFECTS.pkiller).toBe(EFFECTS["phantasmal-killer"]);
        expect(EFFECTS.rb).toBe(EFFECTS["reality-break"]);
        expect(EFFECTS.rbreak).toBe(EFFECTS["reality-break"]);
        expect(EFFECTS.regen).toBe(EFFECTS.regenerate);
        expect(EFFECTS.sm).toBe(EFFECTS["searing-smite"]);
        expect(EFFECTS.ss).toBe(EFFECTS["synaptic-static"]);
        expect(EFFECTS.tcb).toBe(EFFECTS["tashas-caustic-brew"]);
        expect(EFFECTS["caustic-brew"]).toBe(EFFECTS["tashas-caustic-brew"]);
        expect(EFFECTS.vs).toBe(EFFECTS["vitriolic-sphere"]);
        expect(EFFECTS.vsphere).toBe(EFFECTS["vitriolic-sphere"]);
        expect(EFFECTS.vp).toBe(EFFECTS["voracious-poison"]);
        expect(EFFECTS.vpoison).toBe(EFFECTS["voracious-poison"]);
    });

    it("provides toChatMessage on every entry", () => {
        for (const key of Object.keys(EFFECTS)) {
            const info = EFFECTS[key];
            expect(info.toChatMessage).toBeInstanceOf(Function);
        }
    });

    it("every entry has required fields", () => {
        for (const key of Object.keys(EFFECTS)) {
            const info = EFFECTS[key];
            expect(info.id).toBeTypeOf("string");
            expect(info.name).toBeTypeOf("string");
            expect(info.icon).toBeTypeOf("string");
            expect(info.commands).toBeTypeOf("string");
            expect(Array.isArray(info.changes)).toBe(true);
            expect(typeof info.seconds).toBe("number");
        }
    });

    it("enlarge and reduce are distinct info objects", () => {
        expect(EFFECTS.enlarge).not.toBe(EFFECTS.reduce);
    });
});
