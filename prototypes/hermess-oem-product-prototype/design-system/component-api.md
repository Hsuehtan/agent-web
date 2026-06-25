# Hermess OEM Component API

This document defines the first component API for the Figma library and the future Vue implementation. The same API should work in both themes:

- `enterprise-light`
- `agent-command-dark`

## Naming

Figma component names use PascalCase:

- `Button`
- `Input`
- `Badge`
- `Avatar`
- `Card`
- `Metric Card`
- `Table`
- `Tabs`
- `Sidebar`
- `Chat Message`
- `Tool Call`
- `Agent Chip`
- `Task Card`
- `Modal`
- `Empty State`

Variant property names use Title Case:

- `Style`
- `Size`
- `State`
- `Tone`
- `Role`
- `Density`

## Button

Variants:

- `Style`: `Primary`, `Secondary`, `Ghost`, `Danger`
- `Size`: `Sm`, `Md`, `Lg`
- `State`: `Default`, `Hover`, `Disabled`

Properties:

- `Label`: text
- `Show Icon`: boolean
- `Icon`: instance swap

Usage:

- Primary actions: create session, save settings, allow tool
- Secondary actions: export, refresh, configure
- Ghost actions: cancel, copy, filter
- Danger actions: delete, revoke, deny

## Input

Variants:

- `Size`: `Md`, `Lg`
- `State`: `Default`, `Focus`, `Error`, `Disabled`

Properties:

- `Placeholder`: text
- `Value`: text
- `Helper Text`: text
- `Show Helper`: boolean
- `Show Error`: boolean

Usage:

- Login form
- Search
- Provider base URL
- Token/API key fields

## Badge

Variants:

- `Tone`: `Neutral`, `Success`, `Warning`, `Danger`, `Info`, `Running`, `Waiting`
- `Style`: `Soft`, `Outline`

Properties:

- `Label`: text
- `Show Dot`: boolean

Usage:

- Online/offline
- Ready/action required
- Running/waiting
- Role and profile labels

## Avatar

Variants:

- `Type`: `Initial`, `Agent`, `User`
- `Size`: `Sm`, `Md`

Properties:

- `Initial`: text
- `Status`: optional nested Badge/indicator

## Card

Variants:

- `Type`: `Basic`, `Interactive`, `Alert`
- `State`: `Default`, `Hover`, `Selected`

Properties:

- Slot-like body frame
- Optional title
- Optional action

Usage:

- Profile cards
- Platform cards
- Skill/plugin cards
- Alert summaries

## Metric Card

Variants:

- `Trend`: `Positive`, `Neutral`, `Negative`
- `Density`: `Comfortable`, `Compact`

Properties:

- `Label`: text
- `Value`: text
- `Delta`: text

Usage:

- Usage dashboard
- Performance dashboard
- Session summary

## Table

Subcomponents:

- `Table/Header`
- `Table/Row`
- `Table/Cell`

Variants:

- Row `State`: `Default`, `Hover`, `Selected`
- Cell `Type`: `Text`, `Numeric`, `Badge`, `Action`

Usage:

- Provider list
- Cron history
- Logs/audit trail
- Model breakdown

## Tabs

Variants:

- `State`: `Default`, `Active`
- `Size`: `Md`

Usage:

- Settings sections
- Drawer panels: files / terminal / outline
- Usage period selector may use segmented controls separately

## Sidebar

Subcomponents:

- `Sidebar/Shell`
- `Sidebar/Group Label`
- `Sidebar/Nav Item`
- `Sidebar/Footer Status`

Variants:

- Shell `State`: `Expanded`, `Collapsed`
- Nav Item `State`: `Default`, `Hover`, `Active`

Usage:

- Main app navigation
- Profile/model footer controls

## Chat Message

Variants:

- `Role`: `User`, `Assistant`, `System`
- `Density`: `Default`, `Compact`
- `Attachment`: `None`, `File`, `Image`
- `Tool Call`: `None`, `Inline`

Properties:

- `Author`: text
- `Message`: text
- `Timestamp`: text

Usage:

- AI chat workspace
- Group chat room
- History detail

## Tool Call

Variants:

- `State`: `Pending Approval`, `Running`, `Success`, `Failed`

Properties:

- `Tool Name`: text
- `Description`: text
- `Show Actions`: boolean
- `Primary Action`: text
- `Secondary Action`: text

Usage:

- Tool call detail
- Approval card
- Execution trace

## Agent Chip

Variants:

- `State`: `Online`, `Running`, `Waiting`, `Offline`
- `Role`: `Design`, `Backend`, `QA`, `Custom`

Properties:

- `Name`: text
- `Show Status Dot`: boolean

Usage:

- Group chat members
- Agent assignment
- Task owners

## Task Card

Variants:

- `State`: `Todo`, `Doing`, `Done`, `Blocked`
- `Priority`: `Low`, `Medium`, `High`

Properties:

- `Title`: text
- `Meta`: text
- `Assignee`: instance swap / text

Usage:

- Kanban
- Agent-generated tasks
- Cron follow-ups

## Modal

Variants:

- `Size`: `Sm`, `Md`, `Lg`

Slots:

- Header
- Body
- Footer

Usage:

- New chat
- Provider form
- Confirm delete
- Contact us

## Empty State

Variants:

- `Type`: `No Data`, `No Search Result`, `Setup Required`

Properties:

- `Title`: text
- `Description`: text
- `Action Label`: text
- `Show Action`: boolean

Usage:

- No sessions
- No usage data
- Missing provider credentials

