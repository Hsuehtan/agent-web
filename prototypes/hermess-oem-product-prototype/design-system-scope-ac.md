# Hermess OEM Design System Scope Lock

> Figma Design System Builder / Phase 0 Scope Lock  
> 选择结果：`A+C`  
> 默认主题：Enterprise Blue Ops / Light  
> 暗色主题：Agent Command Center / Dark  
> 状态：等待用户批准后进入 Phase 1 Foundations

## 1. 设计系统定位

Hermess OEM 设计系统将围绕“企业 AI 运维控制台”建立。

默认 Light 主题采用 **Enterprise Blue Ops**：

- 面向企业客户、私有化部署、管理员和运维人员
- 重点是状态清晰、权限明确、审计友好、信息密度适中
- 视觉上使用稳重蓝色、深浅蓝灰、清晰表格与状态标签

Dark 主题采用 **Agent Command Center**：

- 面向多 Agent 协同、技能调用、任务编排和运行监控
- 重点是突出 Agent 运行态、工具调用、协作房间和任务生成
- 视觉上使用深色工作台、靛蓝/紫色主动作、青色运行态提示

这不是两套完全独立组件，而是一套组件 API + 两组 theme modes。

## 2. Figma 变量模式

### Collections

建议创建 5 个变量集合：

1. `Primitives`
   - 单模式：`Value`
   - 原始颜色、基础尺寸、基础数值

2. `Color`
   - 双模式：`Light / Enterprise Blue`
   - 双模式：`Dark / Agent Command`
   - 所有语义色 alias 到 `Primitives`

3. `Spacing`
   - 单模式：`Value`

4. `Radius`
   - 单模式：`Value`

5. `Size`
   - 单模式：`Value`

Typography 使用 Text Styles，不放入第一轮变量。

## 3. Color Tokens

### Primitive Colors

Blue:

- `blue/50 #EFF6FF`
- `blue/100 #DBEAFE`
- `blue/500 #3B82F6`
- `blue/600 #2563EB`
- `blue/700 #1D4ED8`

Indigo / Violet:

- `indigo/50 #EEF2FF`
- `indigo/500 #6366F1`
- `indigo/600 #4F46E5`
- `violet/500 #8B5CF6`
- `violet/600 #7C3AED`

Cyan:

- `cyan/400 #22D3EE`
- `cyan/500 #06B6D4`

Navy / Slate:

- `navy/950 #0B1220`
- `navy/900 #111827`
- `navy/800 #172033`
- `slate/50 #F8FAFC`
- `slate/100 #F1F5F9`
- `slate/200 #E2E8F0`
- `slate/300 #CBD5E1`
- `slate/500 #64748B`
- `slate/700 #334155`
- `slate/900 #0F172A`

Neutral:

- `white #FFFFFF`
- `black #000000`

Status:

- `green/50 #ECFDF3`
- `green/600 #16A34A`
- `amber/50 #FFFBEB`
- `amber/500 #F59E0B`
- `red/50 #FEF3F2`
- `red/600 #DC2626`

### Semantic Color Variables

Background:

- `color/bg/app`
- `color/bg/sidebar`
- `color/bg/surface`
- `color/bg/surface-subtle`
- `color/bg/elevated`
- `color/bg/selected`
- `color/bg/tool-call`
- `color/bg/agent-card`

Text:

- `color/text/primary`
- `color/text/secondary`
- `color/text/muted`
- `color/text/inverse`
- `color/text/accent`

Border:

- `color/border/default`
- `color/border/subtle`
- `color/border/strong`
- `color/border/focus`

Action:

- `color/action/primary`
- `color/action/primary-hover`
- `color/action/secondary`
- `color/action/danger`

Status:

- `color/status/success`
- `color/status/success-bg`
- `color/status/warning`
- `color/status/warning-bg`
- `color/status/danger`
- `color/status/danger-bg`
- `color/status/info`
- `color/status/info-bg`
- `color/status/running`
- `color/status/waiting`

### Theme Mapping Summary

Light / Enterprise Blue:

- App background: `slate/50`
- Sidebar: `navy/950`
- Surface: `white`
- Selected: `blue/50`
- Primary action: `blue/600`
- Focus: `blue/600`

Dark / Agent Command:

- App background: `navy/950`
- Sidebar: `navy/900`
- Surface: `navy/800`
- Selected: `indigo/600`
- Primary action: `violet/600`
- Running: `cyan/500`

## 4. Spacing, Radius, Size

Spacing:

- `spacing/0 = 0`
- `spacing/1 = 4`
- `spacing/2 = 8`
- `spacing/3 = 12`
- `spacing/4 = 16`
- `spacing/5 = 20`
- `spacing/6 = 24`
- `spacing/8 = 32`
- `spacing/10 = 40`
- `spacing/12 = 48`

Radius:

- `radius/none = 0`
- `radius/sm = 4`
- `radius/md = 6`
- `radius/lg = 8`
- `radius/xl = 12`
- `radius/full = 999`

Size:

- `size/control/sm = 32`
- `size/control/md = 38`
- `size/control/lg = 44`
- `size/sidebar/expanded = 248`
- `size/sidebar/collapsed = 64`
- `size/panel/right = 288`
- `size/avatar/sm = 24`
- `size/avatar/md = 32`

## 5. Typography

Font family:

- UI: Inter or system fallback
- Code / terminal / logs: JetBrains Mono or system monospace

Text Styles:

- `Display/Page Title` — 24 / 32 / 700
- `Heading/Page` — 22 / 30 / 700
- `Heading/Section` — 16 / 24 / 700
- `Heading/Card` — 14 / 20 / 700
- `Body/Default` — 14 / 22 / 400
- `Body/Small` — 12 / 18 / 400
- `Label/Default` — 12 / 16 / 500
- `Label/Strong` — 12 / 16 / 700
- `Code/Default` — 13 / 20 / 400

## 6. Effect Styles

- `Shadow/Card` — subtle 0 1 2 rgba
- `Shadow/Popover` — 0 12 32 rgba
- `Shadow/Modal` — 0 24 64 rgba
- `Shadow/Focus Ring` is not an effect style; use border/focus tokens

## 7. Component Scope v1

The first component library should include production UI atoms and AI-specific components.

### Atoms

1. `Button`
   - Style: Primary / Secondary / Ghost / Danger
   - Size: Sm / Md / Lg
   - State: Default / Hover / Disabled
   - Properties: Label, Show Icon, Icon Swap

2. `Input`
   - Size: Md / Lg
   - State: Default / Focus / Error / Disabled
   - Properties: Placeholder, Value, Helper Text, Show Error

3. `Badge`
   - Tone: Neutral / Success / Warning / Danger / Info / Running / Waiting
   - Style: Soft / Outline
   - Properties: Label, Show Dot

4. `Avatar`
   - Type: Initial / Agent / User
   - Size: Sm / Md

### Data + Layout

5. `Card`
   - Type: Basic / Interactive / Alert
   - State: Default / Hover / Selected

6. `Metric Card`
   - Trend: Positive / Neutral / Negative
   - Density: Comfortable / Compact
   - Properties: Label, Value, Delta

7. `Table`
   - Header
   - Row
   - Row selected / hover
   - Cell with Badge

8. `Tabs`
   - Active / Default
   - Horizontal only for v1

9. `Sidebar`
   - Expanded / Collapsed
   - Nav item Active / Default
   - Group label
   - Footer environment block

### AI / Agent Specific

10. `Chat Message`
    - Role: User / Assistant / System
    - Density: Default / Compact
    - With Tool Call / Without Tool Call

11. `Tool Call`
    - State: Pending Approval / Running / Success / Failed
    - Properties: Tool Name, Description, Show Actions

12. `Agent Chip`
    - State: Online / Running / Waiting / Offline
    - Role: Design / Backend / QA / Custom

13. `Task Card`
    - State: Todo / Doing / Done / Blocked
    - Priority: Low / Medium / High

### Overlays

14. `Modal`
    - Size: Sm / Md / Lg
    - Header / Body / Footer

15. `Empty State`
    - Type: No Data / No Search Result / Setup Required

## 8. Pattern Pages

Patterns are not necessarily published components in v1. They are reference compositions.

- `Pattern / App Shell`
- `Pattern / Operations Overview`
- `Pattern / Chat Workspace`
- `Pattern / Group Chat Room`
- `Pattern / Provider Management`
- `Pattern / Channel Configuration`
- `Pattern / File Browser`
- `Pattern / Logs & Audit`

## 9. Figma Page Structure

Recommended pages:

- `Cover`
- `Getting Started`
- `Foundations / Color`
- `Foundations / Typography`
- `Foundations / Spacing`
- `--- Components ---`
- `Component / Button`
- `Component / Input`
- `Component / Badge`
- `Component / Avatar`
- `Component / Card`
- `Component / Metric Card`
- `Component / Table`
- `Component / Tabs`
- `Component / Sidebar`
- `Component / Chat Message`
- `Component / Tool Call`
- `Component / Agent Chip`
- `Component / Task Card`
- `Component / Modal`
- `Component / Empty State`
- `--- Patterns ---`
- `Pattern / App Shell`
- `Pattern / Operations Overview`
- `Pattern / Chat Workspace`
- `Pattern / Provider Management`

## 10. Phase 1 Approval Checklist

Before entering Figma write operations, confirm:

- Default theme is `Light / Enterprise Blue`
- Dark theme is `Dark / Agent Command`
- We create one component API that works across both themes
- Phase 1 creates variables and styles only
- Components wait until Phase 3

## 11. Next Step

After approval:

1. Provide an existing Figma design file URL, or ask Codex to create a new Figma design file.
2. If creating a new file, choose the Figma team/plan if more than one is available.
3. Codex will inspect the file first, then create Phase 1 Foundations in small validated steps.
