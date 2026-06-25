# Hermess OEM Design Implementation Guide

This document is the frontend-facing design contract for the Hermess OEM A/C design system. It translates the current Figma work into implementation rules, component APIs, token usage, and recommended ways to apply Figma elements in product code.

## Status

Current phase: `phase4`

Next implementation step: `product-screen-refinement`

Source files:

- A Light Figma file: https://www.figma.com/design/7JtKYbKWWk7LMQaBuT9vom
- C Dark Figma file: https://www.figma.com/design/ivdDrT9yZDmnoinKxPGzy0
- Local token CSS: `tokens/hermess-ac.css`
- Local token JSON: `tokens/hermess-ac.tokens.json`
- Component state ledger: `dsb-state-hermess-oem-ac-v1.json`
- Component API draft: `component-api.md`

## Product Direction

Hermess OEM is an enterprise AI operations console. The UI should feel calm, precise, and work-focused:

- Dense but readable operational data.
- Clear hierarchy for dashboards, tables, task queues, and audit trails.
- Low-noise blue system tone for the default theme.
- Dark command-center theme for monitoring and high-attention workflows.
- Chinese-first interface copy, with English component and code naming.

Avoid marketing-page composition, oversized hero sections, decorative gradients, and visually heavy card stacking. This product should feel like a real operations workstation.

## Theme Model

The design system has two themes with the same component API.

| Theme | Usage | Data attribute |
| --- | --- | --- |
| A Light / Enterprise Ops | Default enterprise operations console | `data-theme="enterprise-light"` |
| C Dark / Agent Command | Dark monitoring and command-center mode | `data-theme="agent-command-dark"` |

Frontend should switch themes by setting the theme attribute at the app root:

```html
<html data-theme="enterprise-light">
```

or:

```html
<html data-theme="agent-command-dark">
```

All colors should come from CSS custom properties in `tokens/hermess-ac.css`.

## Token Usage

Use semantic tokens in product code. Do not hardcode Figma hex values in components unless there is a deliberate one-off visual asset.

Core token groups:

- Background: `--hds-color-bg-*`
- Text: `--hds-color-text-*`
- Border: `--hds-color-border-*`
- Actions: `--hds-color-action-*`
- Status: `--hds-color-status-*`
- Spacing: `--hds-spacing-*`
- Radius: `--hds-radius-*`
- Sizes: `--hds-size-*`

Example:

```css
.hds-card {
  background: var(--hds-color-bg-surface);
  color: var(--hds-color-text-primary);
  border: 1px solid var(--hds-color-border-default);
  border-radius: var(--hds-radius-xl);
  padding: var(--hds-spacing-6);
}
```

## Component Inventory

The current Figma libraries contain the following production-facing components in both A Light and C Dark.

| Component | Variants | Core axes | Main props |
| --- | ---: | --- | --- |
| Button | 27 | `Size`, `Style`, `State` | `Label`, `Show Prefix` |
| Input | 12 | `Size`, `State` | `Label`, `Placeholder`, `Helper Text`, `Show Prefix`, `Show Helper` |
| Badge | 30 | `Size`, `Tone`, `Style` | `Label`, `Show Dot` |
| Table | 12 | `Density`, `Selection`, `State` | `Title`, `Primary Text`, `Status Text`, `Show Actions` |
| FilterBar | 12 | `Density`, `Mode`, `State` | `Query`, `Show Batch` |
| MetricCard | 10 | `Tone`, `Trend` | `Label`, `Value`, `Trend Text` |
| AppShell Navigation | 6 | `Layout`, `Active` | `Brand` |
| DetailDrawer | 6 | `Size`, `State` | `Title`, `Subtitle` |

The frontend implementation should keep these APIs stable. If a component needs extra behavior, add props without renaming the existing axes.

## Suggested Frontend Component Mapping

Use framework-native components, backed by CSS variables and typed props. For Vue, React, or Web Components, the contract is the same.

Recommended file shape:

```text
src/
  design-system/
    tokens.css
    theme.ts
    components/
      Button.vue
      Input.vue
      Badge.vue
      Table.vue
      FilterBar.vue
      MetricCard.vue
      AppShellNavigation.vue
      DetailDrawer.vue
```

Example TypeScript prop model:

```ts
export type HdsTheme = "enterprise-light" | "agent-command-dark";

export type ButtonSize = "Small" | "Medium" | "Large";
export type ButtonStyle = "Primary" | "Secondary" | "Ghost";
export type ButtonState = "Default" | "Hover" | "Disabled";

export interface ButtonProps {
  size?: ButtonSize;
  styleType?: ButtonStyle;
  state?: ButtonState;
  label: string;
  showPrefix?: boolean;
}
```

For HTML/CSS implementation, prefer data attributes:

```html
<button
  class="hds-button"
  data-size="Medium"
  data-style="Primary"
  data-state="Default"
>
  保存配置
</button>
```

```css
.hds-button {
  height: var(--hds-size-control-md);
  border-radius: var(--hds-radius-lg);
  padding: 0 var(--hds-spacing-4);
}

.hds-button[data-style="Primary"] {
  color: var(--hds-color-text-inverse);
  background: var(--hds-color-action-primary);
}
```

## Layout Rules

Enterprise operations UI should prioritize scanability and repeated use.

- Use a persistent app shell with left navigation and top context controls.
- Keep dashboards information-dense, but leave enough row and column spacing for Chinese labels.
- Use `MetricCard` for top-level operational metrics only.
- Use `FilterBar` directly above dense tables.
- Use `Table` for Agent lists, task queues, audit trails, model/provider lists, and execution logs.
- Use `DetailDrawer` for side inspection, remediation, approval, and audit context.
- Avoid nesting cards inside cards.
- Keep component radius moderate. Existing Figma components use mostly 8-16px radius; product surfaces should generally stay at 8-12px unless matching the component.

## Screen Composition Pattern

A standard Hermess OEM operations screen should be composed like this:

```text
AppShell Navigation
└── Main Work Area
    ├── Page Header
    ├── MetricCard row
    ├── FilterBar
    ├── Table
    └── DetailDrawer / Modal when inspecting or resolving an item
```

For the default dashboard:

- Header: current workspace, environment, last sync time.
- Metric row: online agents, running tasks, success rate, exceptions.
- Main table: Agent or task list.
- Drawer: selected Agent or task details.

## Applying Figma To Frontend

There are four realistic options.

### Option 1: Token + Component Contract

Use Figma as the source of visual truth, but implement components manually in code using tokens and this API contract.

Best when:

- You want maintainable production code.
- You need Vue/React state, routing, real data, permissions, and accessibility.
- You want clean component APIs rather than generated markup.

Recommended for this project.

### Option 2: Figma Dev Mode Inspection

Use Figma Dev Mode to inspect spacing, typography, color, and component props while coding.

Best when:

- Designers continue refining components in Figma.
- Developers need exact visual references.
- Code remains hand-authored.

Use this together with Option 1.

### Option 3: Code Connect

Map Figma components to real frontend components with Figma Code Connect.

Best when:

- The component library is already implemented in code.
- You want designers to inspect the exact code component from Figma.
- You need design-to-code alignment over time.

Recommended after the first frontend component pass exists. Code Connect is more useful once `Button`, `Input`, `Badge`, and `Table` are real code components.

### Option 4: Generated UI From Figma

Use export/generation tools to create a starting HTML/CSS layout from Figma frames.

Best when:

- You need a quick static prototype.
- The screen will be rewritten or heavily cleaned up later.

Not recommended as the main production path. Generated output often creates brittle absolute layouts and excessive wrapper elements.

## Recommended Implementation Plan

1. Import `tokens/hermess-ac.css` into the frontend entry.
2. Add theme switching through `data-theme`.
3. Implement atoms first: `Button`, `Input`, `Badge`.
4. Implement data-display components: `MetricCard`, `Table`.
5. Implement composition components: `FilterBar`, `AppShellNavigation`, `DetailDrawer`.
6. Build the dashboard screen using the same composition as the Figma QA pages.
7. Add visual regression screenshots for A Light and C Dark.
8. Add Code Connect mappings once the code components are stable.

## Accessibility Baseline

Minimum implementation requirements:

- Keyboard focus must be visible for buttons, inputs, filter controls, table rows, and drawer actions.
- Disabled states must block interaction and expose `aria-disabled` or native `disabled`.
- Tables should use semantic table markup when possible.
- Drawer should trap focus when modal-like, or clearly behave as a non-modal complementary panel.
- Badge colors must not be the only source of meaning; include label text.
- Use at least 44px hit area for primary touch/click actions where space allows; compact table controls may be smaller only in dense desktop contexts.

## Figma Page References

A Light:

- QA Review: `99 QA / Review A Light`
- Button: `05 Component / Button A Light`
- Input: `06 Component / Input A Light`
- Badge: `07 Component / Badge A Light`
- Table: `08 Component / Table A Light`
- FilterBar: `09 Component / FilterBar A Light`
- MetricCard: `10 Component / MetricCard A Light`
- AppShell Navigation: `11 Component / AppShell Navigation A Light`
- DetailDrawer: `12 Component / DetailDrawer A Light`

C Dark:

- QA Review: `99 QA / Review C Dark`
- Button: `05 Component / Button C Dark`
- Input: `06 Component / Input C Dark`
- Badge: `07 Component / Badge C Dark`
- Table: `08 Component / Table C Dark`
- FilterBar: `09 Component / FilterBar C Dark`
- MetricCard: `10 Component / MetricCard C Dark`
- AppShell Navigation: `11 Component / AppShell Navigation C Dark`
- DetailDrawer: `12 Component / DetailDrawer C Dark`

## Development Definition Of Done

A frontend implementation can be considered aligned with the Figma design when:

- Both themes render from the same components.
- No component hardcodes theme-specific colors.
- All core components expose the props listed in this document.
- Dashboard layout can be assembled from the shared components.
- A Light and C Dark screenshots are captured for review.
- Any deliberate deviation from Figma is recorded in this document or in component docs.

