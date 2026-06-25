# Figma Build Plan

## Current Constraint

The user's Figma team is on Starter:

- Only 1 mode per variable collection.
- MCP call limit currently reached.

Created design file:

https://www.figma.com/design/R7WB3DdYyUOTDK3B9eTSZD

## Target Architecture

Preferred paid-plan architecture:

- `Primitives`: 1 mode, `Value`
- `Color`: 2 modes, `Light / Enterprise Blue`, `Dark / Agent Command`
- `Spacing`: 1 mode, `Value`
- `Radius`: 1 mode, `Value`
- `Size`: 1 mode, `Value`

Starter-compatible architecture:

- `Primitives`: 1 mode, `Value`
- `Color / Light Enterprise`: 1 mode, `Value`
- `Color / Dark Agent`: 1 mode, `Value`
- `Spacing`: 1 mode, `Value`
- `Radius`: 1 mode, `Value`
- `Size`: 1 mode, `Value`

The Starter-compatible architecture is a downgrade. It lets designers inspect both themes, but it does not support switching a frame's variable mode to toggle themes.

## Phase 1 Foundations

1. Create/reuse collections.
2. Create primitive variables.
3. Create semantic color variables.
4. Create spacing/radius/size variables.
5. Create text styles.
6. Create effect styles.
7. Validate counts and code syntax.

Exit criteria:

- Every variable has explicit scopes.
- Every variable has WEB code syntax.
- Primitives have empty scopes.
- Semantic colors have appropriate fill/text/stroke scopes.
- No components are created yet.

## Phase 2 File Structure

Create pages:

- `Cover`
- `Getting Started`
- `Foundations / Color`
- `Foundations / Typography`
- `Foundations / Spacing`
- `--- Components ---`
- Component pages
- `--- Patterns ---`
- Pattern pages

Exit criteria:

- Page skeleton exists.
- Foundation docs show both themes.
- Screenshots reviewed.

## Phase 3 Components

Create components one at a time:

1. `Button`
2. `Input`
3. `Badge`
4. `Avatar`
5. `Card`
6. `Metric Card`
7. `Table`
8. `Tabs`
9. `Sidebar`
10. `Chat Message`
11. `Tool Call`
12. `Agent Chip`
13. `Task Card`
14. `Modal`
15. `Empty State`

Each component requires:

- Dedicated page.
- Auto-layout.
- Variable bindings.
- Variant set.
- Component properties.
- Screenshot validation.
- User checkpoint.

## Phase 4 Patterns + QA

Create reference patterns:

- App Shell
- Operations Overview
- Chat Workspace
- Group Chat Room
- Provider Management
- Channel Configuration
- Logs & Audit

Audit:

- Contrast
- Touch targets
- Naming
- Hardcoded fills/strokes
- Duplicate nodes

