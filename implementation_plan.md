# Security Enhancement Plan

## Goal Description
Direct user request to ensure "high security" before web publication.
Current state is a client-side static application.

## Security Analysis
| Category | Status | Risk | Notes |
| :--- | :--- | :--- | :--- |
| **Server Attacks** | N/A | None | No backend code exists to be hacked. |
| **User Safety (XSS)** | Good | Low | No user input rendered. Vanilla JS used. |
| **Network Security** | Pending | Med | Requires HTTPS upon deployment. |
| **Game Integrity** | **Zero** | **High** | Logic is client-side. Users can trivially cheat (modify medals/stats). |

> [!WARNING]
> **Game Integrity Issue**: Since the game runs entirely in the browser, it is impossible to prevent a user from modifying their medal count or boss HP using browser developer tools. For "High Security" against cheating, the game logic must be moved to a server (Authoritative Server architecture), which is a complete rewrite.

### User Interface
#### [MODIFY] [index.html](file:///Users/SSS/.gemini/game/index.html)
- Add "Return to Title" button to HUD.

### Character Mechanics
#### [MODIFY] [src/game.js](file:///Users/SSS/.gemini/game/src/game.js)
- **Mage**: Update aiming logic to rotate shots towards cursor/touch.
- **Boss Cycle Logic**:
    - **Trigger Phase**: Trigger cycles visuals (1-5). Background does *not* change yet.
    - **Trigger Death**: When Trigger dies, capture its current `visualIndex`.
    - **Boss Spawn**: Spawn Boss. Change Background to the stage corresponding to the captured `visualIndex`.
    - **Boss Stats**: HP 50. Time Limit 30s.
    - **Boss Defeat**: Reward 250 Medals. Return to Normal Stage (Reset BG to Stage 1 or designated "Normal" BG? Revert to previous?). Despawn Boss.
    - **Boss Timeout (30s)**: Boss disappears. Return to Normal Stage.
    - **Reset**: When returning to Normal Stage (after Defeat or Timeout), respawn Boss Trigger (HP 100).
    - **Cycle**: This loop repeats indefinitely. Boss Trigger -> Select Stage Boss -> Boss Battle -> Normal Stage -> Boss Trigger.

### UI & Assets
#### [MODIFY] [src/game.js](file:///Users/SSS/.gemini/game/src/game.js)
- **Play Stop Button**:
    - Move to **Bottom-Left**.
    - Style as **Round Icon** (likely 'X' or 'Stop' symbol).
- **Background**:
    - Change Normal Stage BG (Stage 1 or specific Normal BG?) to "Sanpouzan Castle" in Konan City Noichi-cho. 
    - *Action*: Generate/Search for "Sanpouzan Castle" image or use placeholder if generation restricted? I will use `generate_image` for "Sanpouzan Castle (Shingyoji) in Konan City".

### Verification Plan
- Check Button position (bottom-left) and shape (round).
- Check BG image is updated.

## Proposed Changes

### 1. Content Security Policy (CSP)
Hardening the frontend against potential script injection or asset loading attacks.

#### [MODIFY] [index.html](file:///Users/SSS/.gemini/antigravity/brain/46791868-e271-4aaa-aa5e-ec0ad1d797a7/index.html)
- Add `<meta http-equiv="Content-Security-Policy" ...>` tag.
- Restrict sources to `'self'` and trusted domains (if any).

### 2. Deployment Security Documentation
Create a guide on safe hosting.

#### [NEW] [security_guide.md](file:///Users/SSS/.gemini/antigravity/brain/46791868-e271-4aaa-aa5e-ec0ad1d797a7/security_guide.md)
- HTTPS requirements.
- Explanation of Client-side vs Server-side security.

## Verification
- W3C Validator check (manual step description).
- Browser console check for CSP errors.
