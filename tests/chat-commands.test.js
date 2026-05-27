import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleDynamicChanges, applyEffectToAllTargets } from "../src/chat-commands.js";
import { effectInfo, changeObj, mockToken } from "./helpers.js";
import { targetedTokens, effectsAPI } from "../src/morby-active-effects.js";

describe("handleDynamicChanges", () => {
    describe("locked / unlocked value override", () => {
        it("overrides change.value when unlocked and value is provided", async () => {
            const info = effectInfo({ locked: false });
            const change = changeObj({ value: "1d6" });
            const result = await handleDynamicChanges(info, mockToken(), change, "8d8");
            expect(result.value).toBe("8d8");
        });

        it("keeps change.value when unlocked and value is empty", async () => {
            const info = effectInfo({ locked: false });
            const change = changeObj({ value: "1d6" });
            const result = await handleDynamicChanges(info, mockToken(), change, "");
            expect(result.value).toBe("1d6");
        });

        it("keeps change.value when locked even if value is provided", async () => {
            const info = effectInfo({ locked: true });
            const change = changeObj({ value: "locked-val" });
            const result = await handleDynamicChanges(info, mockToken(), change, "user-val");
            expect(result.value).toBe("locked-val");
        });
    });

    describe("Reduce sizing", () => {
        it("reduces height by half when token is <= 1", async () => {
            const info = effectInfo({ id: "reduce" });
            const token = mockToken({ document: { height: 1, width: 2 } });
            const change = changeObj({ key: "ATL.height", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(-0.5);
        });

        it("reduces height by 1 when token is > 1", async () => {
            const info = effectInfo({ id: "reduce" });
            const token = mockToken({ document: { height: 3, width: 2 } });
            const change = changeObj({ key: "ATL.height", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(-1);
        });

        it("reduces width by half when token is <= 1", async () => {
            const info = effectInfo({ id: "reduce" });
            const token = mockToken({ document: { height: 2, width: 0.5 } });
            const change = changeObj({ key: "ATL.width", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(-0.25);
        });

        it("reduces width by 1 when token is > 1", async () => {
            const info = effectInfo({ id: "reduce" });
            const token = mockToken({ document: { height: 2, width: 3 } });
            const change = changeObj({ key: "ATL.width", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(-1);
        });
    });

    describe("Enlarge sizing", () => {
        it("sets height to current value when token is <= 1", async () => {
            const info = effectInfo({ id: "enlarge" });
            const token = mockToken({ document: { height: 0.5, width: 2 } });
            const change = changeObj({ key: "ATL.height", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(0.5);
        });

        it("sets height to 1 when token is > 1", async () => {
            const info = effectInfo({ id: "enlarge" });
            const token = mockToken({ document: { height: 3, width: 2 } });
            const change = changeObj({ key: "ATL.height", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(1);
        });

        it("sets width to current value when token is <= 1", async () => {
            const info = effectInfo({ id: "enlarge" });
            const token = mockToken({ document: { height: 2, width: 0.5 } });
            const change = changeObj({ key: "ATL.width", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(0.5);
        });

        it("sets width to 1 when token is > 1", async () => {
            const info = effectInfo({ id: "enlarge" });
            const token = mockToken({ document: { height: 2, width: 3 } });
            const change = changeObj({ key: "ATL.width", value: null });
            const result = await handleDynamicChanges(info, token, change, "");
            expect(result.value).toBe(1);
        });
    });

    it("does not mutate the original change object", async () => {
        const info = effectInfo({ id: "reduce", locked: false });
        const token = mockToken({ document: { height: 3, width: 3 } });
        const change = changeObj({ key: "ATL.height", value: "0" });
        const originalValue = change.value;
        await handleDynamicChanges(info, token, change, "99");
        expect(change.value).toBe(originalValue);
    });

    it("changes unrelated keys are not modified for reduce/enlarge", async () => {
        const info = effectInfo({ id: "reduce" });
        const token = mockToken({ document: { height: 3, width: 3 } });
        const change = changeObj({ key: "system.bonuses.weapon.damage", value: "-1d4" });
        const result = await handleDynamicChanges(info, token, change, "");
        expect(result.value).toBe("-1d4");
    });
});

/* ---------- applyEffectToAllTargets ---------- */

describe("applyEffectToAllTargets", () => {
    beforeEach(() => {
        Object.keys(targetedTokens).forEach(k => delete targetedTokens[k]);
    });

    it("no-ops when no tokens are targeted", async () => {
        await applyEffectToAllTargets("bless");
        expect(effectsAPI.removeEffectOnToken).not.toHaveBeenCalled();
        expect(effectsAPI.addEffectOnToken).not.toHaveBeenCalled();
    });

    it("returns early when effectId is unknown", async () => {
        const token = { id: "t1", name: "Goblin", document: { actorId: "a1" } };
        targetedTokens["t1"] = token;
        await expect(applyEffectToAllTargets("nonexistent")).resolves.toBeUndefined();
    });

    it("removes existing effect, builds default, adds it to all targeted tokens", async () => {
        const token = { id: "t1", name: "Goblin", document: { actorId: "a1", height: 1, width: 1 } };
        targetedTokens["t1"] = token;

        await applyEffectToAllTargets("bless");

        expect(effectsAPI.removeEffectOnToken).toHaveBeenCalledWith("t1", "Bless");
        expect(effectsAPI.buildDefault).toHaveBeenCalledWith(null, "Bless", expect.any(String));
        expect(effectsAPI.addEffectOnToken).toHaveBeenCalledWith("t1", "Bless", expect.objectContaining({
            origin: "Actor.a1",
        }));
    });

    it("sets effect duration from effectInfo.seconds", async () => {
        const token = { id: "t1", name: "Goblin", document: { actorId: "a1", height: 1, width: 1 } };
        targetedTokens["t1"] = token;

        await applyEffectToAllTargets("bless");

        expect(effectsAPI.addEffectOnToken).toHaveBeenCalledWith(
            "t1",
            "Bless",
            expect.objectContaining({ isTemporary: true, seconds: 60 }),
        );
    });

    it("applies Aid healing to each token", async () => {
        const token = { id: "t1", name: "Goblin", document: { actorId: "a1", height: 1, width: 1 }, actor: { applyDamage: vi.fn() } };
        targetedTokens["t1"] = token;

        await applyEffectToAllTargets("aid", "10");

        expect(token.actor.applyDamage).toHaveBeenCalledWith(-10);
    });

    it("processes multiple targeted tokens", async () => {
        const token1 = { id: "t1", name: "Goblin", document: { actorId: "a1", height: 1, width: 1 } };
        const token2 = { id: "t2", name: "Orc", document: { actorId: "a2", height: 1, width: 1 } };
        targetedTokens["t1"] = token1;
        targetedTokens["t2"] = token2;

        await applyEffectToAllTargets("bless");

        expect(effectsAPI.removeEffectOnToken).toHaveBeenCalledTimes(2);
        expect(effectsAPI.addEffectOnToken).toHaveBeenCalledTimes(2);
    });
});
