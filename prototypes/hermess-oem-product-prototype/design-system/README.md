# Hermess OEM Design System A+C

This is the local source of truth for the planned Figma design system while the current Figma Starter plan blocks multi-mode variables and further MCP calls.

Chosen direction:

- Default light theme: **Enterprise Blue Ops**
- Dark theme: **Agent Command Center**
- Product type: enterprise AI operations console
- Scope source: `../index.html`, `../app.js`, `../styles.css`, and the approved `../design-system-scope-ac.md`

## Files

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

Created file:

https://www.figma.com/design/R7WB3DdYyUOTDK3B9eTSZD

Blocked by:

- Starter plan allows only 1 variable mode per collection.
- Figma MCP call limit has been reached on the Starter plan.

## Recommended Next Step

When Figma MCP access is available again:

1. Re-load `figma-generate-library` and `figma-use`.
2. Inspect the Figma file.
3. If still on Starter, run the starter-compatible Phase 1 script.
4. If upgraded, run the multi-mode Phase 1 script.
5. Validate foundations before creating any components.

