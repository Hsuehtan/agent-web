# Hermess OEM Design System A+C

This is the local source of truth for the Hermess OEM A/C Figma design system and its frontend implementation contract.

Chosen direction:

- Default light theme: **Enterprise Blue Ops**
- Dark theme: **Agent Command Center**
- Product type: enterprise AI operations console
- Scope source: `../index.html`, `../app.js`, `../styles.css`, and the approved `../design-system-scope-ac.md`

## Files

- `design.md`  
  Frontend-facing design implementation guide. This is the recommended starting point for applying the Figma design system in product code.

- `tokens/hermess-ac.tokens.json`  
  Design-token source in a DTCG-inspired JSON shape.

- `tokens/hermess-ac.css`  
  CSS custom properties for previewing the two themes in web prototypes.

- `component-api.md`  
  Component API contract for the Figma library and future Vue implementation.

- `figma-build-plan.md`  
  Phase-by-phase Figma build plan, including the Starter-plan workaround.

- `figma-scripts/phase1-foundations-starter-compatible.js`  
  Figma Plugin API script draft for creating starter-compatible foundations using separate light/dark color collections.

- `figma-scripts/phase1-foundations-multimode.js`  
  Figma Plugin API script draft for a proper multi-mode Color collection once the file is on a paid plan.

## Current Figma Status

Current working Figma files:

- A Light / Enterprise Ops: https://www.figma.com/design/7JtKYbKWWk7LMQaBuT9vom
- C Dark / Agent Command: https://www.figma.com/design/ivdDrT9yZDmnoinKxPGzy0

Both files have reached Phase 4 QA review. The local state ledger is:

- `dsb-state-hermess-oem-ac-v1.json`

## Recommended Next Step

Use `design.md` and `tokens/hermess-ac.css` to implement the frontend component library, then map finished code components back to Figma with Code Connect.
