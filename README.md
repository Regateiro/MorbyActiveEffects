# Morby Active Effects

This module is being designed to automate some inconvenient effects and conditions that require constant attention from both the players and the DM, as well as automating some effects that can be automated in FoundryVTT.

This includes adding bonuses to attack/damage rolls, dealing damage/healing at the start or end of the turn, add bonuses to initiative, etc.

## Supported Effects

The list of supported effects/conditions is shown in the table below.

| Effect Name          | Description                        | Custom Value (Default) | Command                        | Aliases           |
| -------------------- | ---------------------------------- | ---------------------- | ------------------------------ | ----------------- |
| Aid                  | +X to current and maximum HP       | Yes (5)                | /mae aid \<X\>                 |                   |
| Bane                 | -1d4 to attacks and saving throws  | No                     | /mae bane                      |                   |
| Barkskin             | 16 minimum to AC                   | No                     | /mae barkskin                  |                   |
| Bless                | +1d4 to attacks and saving throws  | No                     | /mae bless                     |                   |
| Divine Favor         | +1d4 to weapon damage              | No                     | /mae divine-favor              | df                |
| Enlarge              | +1d4 to weapon damage + token size | No                     | /mae enlarge                   |                   |
| Ensnaring Strike     | +X damage at the start of turn     | Yes (1d6)              | /mae ensnaring-strike \<X\>    | es                |
| Gift of Alacrity     | +1d8 to initiative rolls           | No                     | /mae gift-of-alacrity          | goa               |
| Guidance             | +1d4 to skill checks               | No                     | /mae guidance                  |                   |
| Heroism              | X temp HP at the start of turn     | Yes (0)                | /mae heroism \<X\>             |                   |
| Id Insinuation       | +1d12 damage at the end of turn    | No                     | /mae id-insinuation            | ii                |
| Initiative Bonus     | +X to the next initiative roll     | Yes (1d8)              | /mae initiative-bonus \<X\>    | init-bonus, ib    |
| Lacerated            | +X damage at the start of turn     | Yes (0)                | /mae lacerated  \<X\>          | lace              |
| Melf's Acid Arrow    | +X damage at the end of turn       | Yes (2d4)              | /mae melfs-acid-arrow  \<X\>   | acid-arrow, maa   |
| Reduce               | -1d4 to weapon damage - token size | No                     | /mae reduce                    |                   |
| Regenerate           | +X healing at the start of turn    | Yes (10)               | /mae regenerate  \<X\>         | regen             |
| Tasha's Caustic Brew | +X damage at the start of turn     | Yes (2d4)              | /mae tashas-caustic-brew \<X\> | caustic-brew, tcb |

To use one of the effects in the table, just target the tokens that you wish to apply the effect to and write the command in chat as shown. If the command includes an  \<X\>, replace it with the value you wish the effect to use. For example, if you wish to apply an Heroism effect that gives 4 temporary HP each turn, you need to target the tokens and write `/mae heroism 4` into the chat.

### Token Ownership and Applying Effects

Upon executing a command to apply an effect, the effect will only be automatically applied on token you have ownership over, as a player will usually lack the permissions to access another player's character token.

However, upon executing a command, a chat message will also appear which indicates on whom the effect is being placed and contains a button that allows the affected players to target their own tokens and apply the effect themselves.

### Clearing Effects

To clear effects applied by the Morby Active Effects module, you can just delete the effect from the token using the character sheet, or by using the clear command while targeting the desired token as follows: `/mae clear <effect name>`

## Targeting Players / Enemies for Effects

This module uses [Smart Target](https://foundryvtt.com/packages/smarttarget) to help with the task of targeting tokens with your juicy effects.

In short, to target a token you just need to hold the `alt` key while clicking on the token. To target multiple tokens, hold `shift + alt` while clicking on the tokens. However, make sure you click on the canvas before pressing `alt` if you've just used the chat or it won't work (yey for foundry).

Look into the Smart Target configuration options if you'd rather use sticky targeting (you just need to press `alt` to target multiple tokens but you need to click on token again to untarget), or to change other settings.

## Future Module Features

In the future, support for effects similar to the ones already supported but that only trigger on a failed save each turn will be implemented. This will most likely require the player to roll the saving throw and then click on a button in chat indicating if the saving throw was a success or a failure.

Furthermore, a GUI to apply the effects on targeted token is being considered so that players are not required to use the chat commands.
