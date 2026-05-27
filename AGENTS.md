# Morby Active Effects

FoundryVTT module (D&D 5e) that automates active effects via chat commands.

## Dev Commands

```bash
make lint          # Run eslint on src/ (warnings expected, see .eslintrc.json)
make compress      # Build module.zip from src/
make install      # Install to ~/.local/share/FoundryVTT/Data/modules/
```

## Architecture

- Entry point: `src/morby-active-effects.js`
- Dependencies: active-effect-manager-lib, _chatcommands, smarttarget, ATL, bettercombatdamage
- System: dnd5e >= 2.4.4
- FoundryVTT: >= 10.291

## Code Flow

### 1. Initialization (`morby-active-effects.js`)
```
Hooks.once("ready")
  ├── Guard: active-effect-manager-lib found? → return early with error if not
  ├── Grab active-effect-manager-lib API → effectsAPI
  ├── Init flags.mae {} on all owned actors
  ├── Bind namespaced jQuery events (.mae) with .off() for hot-reload safety:
  │   ├── .mae-apply-effect click → applyEffectToAllTargets(effectId, value)
  │   ├── .mae-save-roll click → actor.rollAbilitySave(abilityId)
  │   ├── .mae-save-success click → remove effect? → applyDamage half? → handleResolvedSaveRequest → delete msg
  │   └── .mae-save-failure click → applyDamage → handleResolvedSaveRequest → delete msg
  └── All handlers guard combatant/actor null checks
```

### 2. Chat Command Registration
```
Hooks.on("chatCommandsReady")
  └── cm_register(commands)
       └── /mae cmd with autocomplete
            ├── handleAutoComplete: O(N) with Set dedup, supports "clear" sub-command
            └── handleCommand:
                 ├── /mae <effect> [value] → applyEffectToAllTargets + ChatMessage
                 └── /mae clear <effect> → effectsAPI.removeEffectOnToken per target
```

### 3. Effect Application (`chat-commands.js`)
```
applyEffectToAllTargets(effectId, value)
  ├── Guard: effectsAPI? effectInfo? → return if missing (stale button safety)
  └── For each targetedToken:
       ├── effectsAPI.removeEffectOnToken(token.id, effectName)
       ├── effectsAPI.buildDefault(name, icon)
       ├── Set origin, duration (isTemporary, seconds)
       ├── For each change:
       │    └── handleDynamicChanges()
       │         ├── If unlockable effect: override change.value with user value
       │         ├── Enlarge/Reduce: compute ±1 or ±half based on current token dims
       │         └── Return modified change object
       ├── effectsAPI.addEffectOnToken(token.id, effectName, effect)
       └── Special: Aid → token.actor.applyDamage(-value) (heal on apply)
```

### 4. Per-Turn Processing (`effects.js`)
```
Hooks.on("updateCombat") — GM only
  └── handleTurnEndEffects(combat.previous)
       ├── Guard: combat.previous null? (round 1) → return
       ├── Init per-combatant accumulator: damageByCombatant[combatant._id] = 0
       ├── TURN_END_EFFECTS registry (in order):
       │   ├── Id Insinuation → applyDamage
       │   ├── Melf's Acid Arrow → applyDamage + removeEffect
       │   ├── Vitriolic Sphere → applyDamage + removeEffect
       │   ├── Lacerated → requestSave(CON, removeOnSave=true)
       │   ├── Gashed → requestSave(CON, removeOnSave=true)
       │   ├── Greater Malison → requestSave(CHA, removeOnSave=true)
       │   ├── Blood Boil → requestSave(CON, 7d6)
       │   ├── Immolation → requestSave(DEX, 6d6)
       │   ├── Killing Winds → requestSave(CON, 4d12)
       │   ├── Phantasmal Killer → requestSave(WIS, 6d10)
       │   ├── Voracious Poison → requestSave(CON, 16d8)
       │   ├── Weird → requestSave(WIS, 11d10)
       │   ├── Synaptic Static → requestSave(INT, removeOnSave=true)
       │   ├── Reality Break → requestSave(WIS, removeOnSave=true)
       │   └── Confusion → requestSave(WIS, removeOnSave=true)
       └── Flush accumulator: actor.applyDamage(netDamage)

  └── handleTurnStartEffects(combat.current)
       ├── Guard: combat.current null? → return
       ├── Init per-combatant accumulator: damageByCombatant[combatant._id] = 0
       ├── TURN_START_EFFECTS registry (in order):
       │   ├── Heroism → applyHP(temp)
       │   ├── Lacerated → applyDamage
       │   ├── Gashed → applyDamage
       │   ├── Ensnaring Strike → applyDamage
       │   ├── Tasha's Caustic Brew → applyDamage
       │   ├── Reality Break → handleRealityBreak() [d10 table]
       │   │   ├── 1-2: Stunned + 6d12 damage
       │   │   ├── 3-5: DEX save vs 8d12 (half on success)
       │   │   ├── 6-8: Prone + 10d12 damage
       │   │   └── 9-10: Blinded + 10d12 damage
       │   ├── Confusion → handleConfusion() [d10 table]
       │   │   ├── 1: Random direction movement, no action
       │   │   ├── 2-6: No movement or action
       │   │   ├── 7-8: Random melee attack
       │   │   └── 9-10: Acts normally
       │   ├── Searing Smite → requestSave(CON, 1d6)
       │   └── Regenerate → applyHP(heal) + remove Lacerated
       │        └── (DELAYED via pendingTriggers if saves pending)
       └── Flush accumulator: actor.applyDamage(netDamage)
```

### 5. Damage/HP System (`effects.js`)
```
applyDamage(combatantId, formula, effectName, halfDamage=false, direct=false)
  ├── Skip if no formula
  ├── try/catch: Roll formula → console.error + return on invalid formula
  ├── Roll the formula (new Roll)
  ├── direct=true → actor.applyDamage(amount) (save-click path)
  ├── direct=false → damageByCombatant[combatantId] += amount (turn-processing path, flushed later)
  └── ChatMessage: "{name} suffers {total} points of damage from {effectName}!"

applyHP(combatantId, isTemporary, formula, effectName, direct=false)
  ├── try/catch: Roll formula → console.error + return on invalid formula
  ├── If temporary: actor.applyTempHP(total) — notes if existing tempHP > total
  ├── If healing:
  │   ├── direct=true → actor.applyDamage(-total) (save-click path)
  │   └── direct=false → damageByCombatant[combatantId] -= total (turn-processing path)
  └── ChatMessage: "{name} gains/recovers {total} HP from {effectName}!"
```

### 6. Save Request & Resolution
```
requestSave(combatantId, formula, save, effectName, timestamp, removeOnSave, halfDamage)
  └── ChatMessage whispered to GM (HTML-escaped to prevent XSS):
       └── [Roll {save} Save button] [Success button] [Failure button]

Save Success (.mae-save-success click):
  ├── combatant/actor null guard
  ├── removeEffect? → effectsAPI.removeEffectOnToken
  ├── halfDamage? → applyDamage(halfDamage=true, direct=true)
  ├── handleResolvedSaveRequest(timestamp)
  └── delete chat message

Save Failure (.mae-save-failure click):
  ├── combatant null guard
  ├── applyDamage(direct=true)
  ├── handleResolvedSaveRequest(timestamp)
  └── delete chat message

handleResolvedSaveRequest(timestamp):
  └── pendingTriggers[timestamp].saveRequests—
       └── Floor check: counter > 0 before decrement (prevents double-click orphaning)
       └── If 0: await pendingTriggers[timestamp].trigger() + cleanup
```

### 7. Target Tracking & Initiative
```
Hooks.on("targetToken") → targetedTokens[token.id] = token (add/remove)

Hooks.on("dnd5e.preRollInitiative") → roll._formula += flags.mae.initBonus
```

### 8. Data Layer (`effect-data.js`)
```
_EFFECT_INFO: 30 effect definitions (id, name, icon, commands, changes[], locked, seconds, help, toChatMessage)
  ├── changes: [{key: dnd5e/ATL/flag path, value: formula, mode: ADD|UPGRADE|OVERRIDE}]
  │   ├── dnd5e paths → system.bonuses.*, system.attributes.*
  │   ├── ATL paths → ATL.width, ATL.height (token sizing)
  │   └── Flag paths → flags.mae.* (custom tracking for turn-processing)
  ├── locked: true = fixed value, false = accepts user override
  └── seconds: effect duration

EFFECTS: auto-generated from _EFFECT_INFO.commands field
  └── Splits "barkskin | bark" → EFFECTS.barkskin + EFFECTS.bark (no manual alias map)
```

### Key Functions

```
resetCombatState() — exported from effects.js
  ├── Clears pendingTriggers
  └── Clears damageByCombatant
  Called from: Hooks.on("deleteCombat") — GM only
```

### Error Handling

- try/catch on all `new Roll(formula).evaluate()` calls — invalid formulas log to console and return early
- All handlers guard on null combatant/actor before accessing properties
- `effectsAPI` readiness guards in all entry points (updateCombat, handleCommand, applyEffectToAllTargets)
- Input validation: stale button effectId → no-op via `if (!effectInfo) return`
- XSS prevention: `esc()` helper escapes `'` and `"` in all HTML attribute interpolations
