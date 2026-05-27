import { vi, beforeEach } from "vitest";

/**
 * Mock the Foundry module so chat-commands.js and effects.js
 * get a clean effectsAPI + targetedTokens per test file.
 */
vi.mock("../src/morby-active-effects.js", async () => {
    const actual = await vi.importActual("../src/morby-active-effects.js");
    return {
        effectsAPI: {
            removeEffectOnToken: vi.fn(),
            buildDefault: vi.fn().mockResolvedValue({ changes: [] }),
            addEffectOnToken: vi.fn(),
        },
        targetedTokens: actual.targetedTokens,
    };
});

/* ---------- Foundry global mocks ---------- */

/** Mock Hooks: tracks registered callbacks for test-level firing (e.g. "ready") */
let hookRegistry = {};
let onceRegistry = {};

globalThis.Hooks = {
    on: vi.fn((event, fn) => {
        (hookRegistry[event] ??= []).push(fn);
    }),
    once: vi.fn((event, fn) => {
        onceRegistry[event] = fn;
    }),
    callAll: vi.fn((event, ...args) => {
        (hookRegistry[event] ?? []).forEach((fn) => fn(...args));
        if (onceRegistry[event]) {
            onceRegistry[event](...args);
            delete onceRegistry[event];
        }
    }),
    /** Test helper: fire all callbacks for an event */
    _fire(event, ...args) {
        return Hooks.callAll(event, ...args);
    },
    /** Test helper: reset registry between tests */
    _reset() {
        hookRegistry = {};
        onceRegistry = {};
    },
};

/** Mock game object — reset per test via beforeEach */
const freshGame = () => ({
    user: { isGM: true, _id: "test-gm" },
    modules: {
        get: vi.fn((id) => {
            if (id === "active-effect-manager-lib") {
                return {
                    api: {
                        removeEffectOnToken: vi.fn(),
                        buildDefault: vi.fn().mockResolvedValue({ changes: [] }),
                        addEffectOnToken: vi.fn(),
                    },
                };
            }
            return null;
        }),
    },
    combat: null,
    actors: {
        tokens: {},
        filter: vi.fn().mockReturnValue([]),
        get: vi.fn(),
    },
    messages: {
        get: vi.fn().mockReturnValue({ delete: vi.fn() }),
    },
});

globalThis.game = Object.defineProperties(freshGame(), {
    userId: { get() { return this.user._id; }, configurable: true },
});

/** Mock Roll — evaluates to a fixed total unless overridden via mockRollTotal */
let mockRollTotal = 10;
let mockRollShouldThrow = false;

globalThis.Roll = class MockRoll {
    constructor(formula) {
        if (mockRollShouldThrow) throw new Error("Invalid formula");
        this._formula = String(formula);
        this.total = mockRollTotal;
    }
    async evaluate() {
        return this;
    }
    async toMessage(..._args) {
        // no-op in tests
    }
};

/** Convenience: set the total the next Roll will produce */
globalThis.setRollTotal = (n) => {
    mockRollTotal = n;
};

/** Convenience: make the next Roll throw on construction */
globalThis.setRollThrow = (shouldThrow = true) => {
    mockRollShouldThrow = shouldThrow;
};

globalThis.ChatMessage = {
    create: vi.fn(),
};

globalThis.$ = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    data: vi.fn(),
    closest: vi.fn(() => ({ data: vi.fn() })),
}));

/** Minimal Token stubs */
globalThis.Token = class MockToken {};

/* ---------- Reset per test ---------- */

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset game to a fresh copy
    Object.assign(globalThis.game, freshGame());
    // Reset mock roll helpers
    mockRollTotal = 10;
    mockRollShouldThrow = false;
    Hooks._reset();
});
