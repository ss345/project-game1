# Background Update Plan

## Goal Description
Set `bg_sanposan.png` as the main background image for the game, replacing the current default `bg1.png`.

## Proposed Changes
### [src/game.js](file:///Users/SSS/.gemini/game/src/game.js)
- Update `this.normalBg` to use `assets/bg_sanposan.png`.
- Update the Stage 1 configuration ("のいち動物公園（三宝山）") to use `assets/bg_sanposan.png`.

## Verification Plan
### Manual Verification
1. Start the game.
2. Verify the title screen/initial background shows the new Sanposan image.
3. Start the battle.
4. Verify Stage 1 background is the Sanposan image.
