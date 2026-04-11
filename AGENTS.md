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