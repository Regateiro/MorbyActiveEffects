import { vi } from "vitest";

/**
 * Build a minimal combatant stub accepted by applyDamage / applyHP / handleRealityBreak.
 * @param {Object} overrides
 * @returns {Object} combatant stub
 */
export function mockCombatant(overrides = {}) {
    return {
        _id: "c1",
        actorId: "actor1",
        tokenId: "token1",
        name: "Test Combatant",
        ...overrides,
    };
}

/**
 * Build a minimal token stub accepted by handleDynamicChanges.
 * @param {Object} overrides
 * @returns {Object} token stub
 */
export function mockToken(overrides = {}) {
    return {
        document: {
            height: 1,
            width: 1,
            actorId: "actor1",
            ...(overrides.document || {}),
        },
        actor: { applyDamage: vi.fn() },
        ...overrides,
    };
}

/**
 * Build a minimal actor stub.
 * @param {Object} overrides
 * @returns {Object} actor stub
 */
export function mockActor(overrides = {}) {
    return {
        applyDamage: vi.fn(),
        applyTempHP: vi.fn(),
        system: {
            attributes: {
                hp: { value: 10, temp: 0, tempmax: 20 },
            },
        },
        ...overrides,
    };
}

/**
 * Populate game.combat with a combat that returns a specific combatant.
 * @param {Object} combatantStub
 * @param {"current"|"previous"} position
 */
export function setCombatCombatant(combatantStub, position = "current") {
    const combat = {
        [position]: { combatantId: combatantStub._id },
        combatants: {
            get: vi.fn((id) => (id === combatantStub._id ? combatantStub : null)),
        },
    };
    game.combat = combat;
}

/**
 * Populate game.actors.tokens so actor lookups work.
 * @param {string} tokenId
 * @param {Object} actorStub
 */
export function setActorForToken(tokenId, actorStub) {
    game.actors.tokens[tokenId] = actorStub;
    game.actors.get = vi.fn((id) => (id === actorStub.id ? actorStub : null));
}

/**
 * Create an EFFECTS-style effectInfo for handleDynamicChanges tests.
 */
export function effectInfo(overrides = {}) {
    return {
        id: "test",
        locked: true,
        changes: [],
        ...overrides,
    };
}

/**
 * Create a change object as found in _EFFECT_INFO entries.
 */
export function changeObj(overrides = {}) {
    return {
        key: "system.bonuses.All-Attacks",
        value: "1d4",
        mode: 2,
        ...overrides,
    };
}
