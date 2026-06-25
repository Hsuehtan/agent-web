# Hermess OEM 设计系统候选方案

> 阶段：Figma Design System Builder / Phase 0 Discovery  
> 状态：仅制定方案，尚未写入 Figma  
> 来源：基于最初原型 `index.html`、`app.js`、`styles.css`、当前 Web UI token 和页面覆盖范围

## 0. 当前原型抽象

当前原型覆盖 18 个产品页面：

- 登录与首次进入
- AI 聊天工作台
- 历史与搜索
- 群聊房间
- 定时任务
- 任务看板
- 平台渠道
- 技能与插件
- 记忆管理
- 模型与 Provider
- 用量分析
- 日志与性能
- Profile 管理
- 文件浏览器
- Web 终端
- 设置中心
- 移动端主流程
- 产品总览

当前信息架构适合沉淀为“企业 AI 运维控制台”设计系统，而不是单纯聊天产品。

核心对象：

- Profile
- Session
- Model / Provider
- Channel
- Tool Call
- Skill / Plugin
- Job
- Usage / Cost
- File
- Log / Audit

当前原型已有基础 token：

- 背景：`--bg-primary`、`--bg-secondary`、`--bg-sidebar`、`--bg-card`
- 文本：`--text`、`--text-muted`、`--text-soft`
- 边框：`--border`、`--border-strong`
- 语义状态：`--success`、`--warning`、`--danger`、`--info`
- 形状：`--radius-sm`、`--radius`
- 阴影：`--shadow`
- 模式：Light / Dark

---

## 1. 方案 A：Enterprise Blue Ops

### 定位

稳重、企业化、可交付。适合私有化部署、B 端客户、管理员控制台、商业 OEM。

### 视觉关键词

企业蓝、深色侧栏、浅色工作区、高信息密度、状态清晰、审计感。

### 色彩方向

Primitives:

- `blue/50 #EFF6FF`
- `blue/100 #DBEAFE`
- `blue/500 #3B82F6`
- `blue/600 #2563EB`
- `blue/700 #1D4ED8`
- `navy/900 #111827`
- `navy/950 #0B1220`
- `slate/50 #F8FAFC`
- `slate/100 #F1F5F9`
- `slate/200 #E2E8F0`
- `slate/500 #64748B`
- `slate/700 #334155`
- `slate/900 #0F172A`

Semantic:

- `color/bg/app`
- `color/bg/sidebar`
- `color/bg/surface`
- `color/bg/surface-subtle`
- `color/bg/selected`
- `color/text/primary`
- `color/text/secondary`
- `color/text/inverse`
- `color/border/default`
- `color/border/strong`
- `color/action/primary`
- `color/action/primary-hover`
- `color/status/success`
- `color/status/warning`
- `color/status/danger`
- `color/status/info`

### 组件风格

- 左侧深色主导航
- 内容区以卡片、表格、状态标签、图表和运行面板为主
- 按钮边角 6-8px，避免过度圆润
- 状态标签使用浅底色 + 彩色圆点
- 表格密度中高，适合扫描

### 适合的关键页面

- 运营总览
- 会话运行
- 模型 Provider
- 平台渠道
- 用量成本
- 日志审计
- Profile 权限

### 优点

- 最适合商业化 OEM
- 客户容易理解为“企业级管理台”
- 与当前功能结构高度匹配
- 后续落地到现有 Vue/Naive UI 成本较低

### 风险

- 如果处理不好，容易变成普通蓝色后台
- 需要通过 AI 运行态、工具审批、Profile 权限等组件体现产品差异

---

## 2. 方案 B：Pure Ink Console

### 定位

延续当前项目气质：克制、黑白灰、开发者友好、偏开源工具。

### 视觉关键词

水墨灰阶、低干扰、专注会话、轻量控制台、极简。

### 色彩方向

Primitives:

- `ink/950 #111111`
- `ink/900 #1A1A1A`
- `ink/700 #333333`
- `gray/50 #FAFAFA`
- `gray/100 #F5F5F5`
- `gray/200 #E5E5E5`
- `gray/400 #A3A3A3`
- `gray/600 #666666`
- `white #FFFFFF`

Semantic:

- `color/bg/app`
- `color/bg/sidebar`
- `color/bg/surface`
- `color/bg/elevated`
- `color/text/primary`
- `color/text/secondary`
- `color/text/muted`
- `color/border/default`
- `color/border/subtle`
- `color/action/primary`
- `color/action/secondary`
- `color/status/success`
- `color/status/warning`
- `color/status/danger`

### 组件风格

- 细边框
- 低饱和状态色
- 轻阴影甚至无阴影
- 组件层级靠边框、留白、字体重量区分
- 适合 Light/Dark 双模式

### 适合的关键页面

- 聊天工作台
- 文件浏览器
- Web 终端
- 技能与插件
- 设置中心

### 优点

- 与当前代码 token 最一致
- 工程落地最快
- 有开源工具气质

### 风险

- 商业客户可能觉得不够“企业级”
- 如果所有页面都灰阶，监控和告警信息不够突出

---

## 3. 方案 C：Agent Command Center

### 定位

突出“多 Agent 协同 + 任务编排 + 技能调用”的产品差异。更像 AI 工作空间，而不是传统后台。

### 视觉关键词

智能体编排、运行流、协同房间、工具调用轨迹、任务联动。

### 色彩方向

Primitives:

- `indigo/50 #EEF2FF`
- `indigo/600 #4F46E5`
- `violet/600 #7C3AED`
- `cyan/500 #06B6D4`
- `slate/50 #F8FAFC`
- `slate/900 #0F172A`
- `amber/500 #F59E0B`
- `green/600 #16A34A`

Semantic:

- `color/bg/app`
- `color/bg/workspace`
- `color/bg/agent-card`
- `color/bg/tool-call`
- `color/bg/task-generated`
- `color/action/primary`
- `color/action/agent`
- `color/status/running`
- `color/status/waiting`
- `color/status/generated`

### 组件风格

- 会话与任务并列
- Agent 成员胶囊、运行状态、工具调用轨迹更突出
- 适合用时间线、节点流、任务卡表达 AI 过程
- 比 Enterprise Blue 更有产品个性

### 适合的关键页面

- 群聊房间
- AI 聊天工作台
- 任务看板
- 技能与插件
- 定时任务

### 优点

- 最能讲出“智能体平台”的差异
- 页面更有记忆点
- 适合 Demo、官网截图、产品宣传

### 风险

- 企业运维场景可能显得偏年轻或偏产品化
- 需要控制颜色，不然容易不够稳重

---

## 4. 方案 D：Terminal Operations

### 定位

面向开发者和高级运维用户。强调命令、日志、终端、运行态。

### 视觉关键词

深色优先、命令面板、日志流、终端感、可观测性。

### 色彩方向

Primitives:

- `terminal/950 #050608`
- `terminal/900 #0B1115`
- `terminal/800 #111827`
- `green/400 #4ADE80`
- `green/600 #16A34A`
- `cyan/400 #22D3EE`
- `amber/400 #FBBF24`
- `red/400 #F87171`

Semantic:

- `color/bg/app`
- `color/bg/terminal`
- `color/bg/panel`
- `color/text/terminal`
- `color/text-muted`
- `color/action/primary`
- `color/log/info`
- `color/log/warn`
- `color/log/error`
- `color/log/success`

### 组件风格

- 深色主界面
- JetBrains Mono 用于日志、命令、文件路径
- 命令面板和键盘快捷键更强
- 表格、日志、终端同屏

### 适合的关键页面

- Web 终端
- 日志与性能
- 文件浏览器
- 模型 Provider
- 会话运行

### 优点

- 对开发者很有吸引力
- 与 Agent/CLI/日志场景天然契合
- 可以成为高级模式或暗色主题

### 风险

- 普通企业管理员学习成本更高
- 不宜作为唯一默认主题，适合作为高级主题

---

## 5. 推荐选择

我建议采用“两层设计系统”：

### 主系统：方案 A Enterprise Blue Ops

作为默认商业化 UI，服务私有化部署和企业客户。

### 扩展主题：方案 B Pure Ink Console 或方案 D Terminal Operations

保留开源/开发者气质，作为可选主题。

如果只选一套推进到 Figma，我建议选：

> **方案 A：Enterprise Blue Ops**

理由：它最适合作为 OEM 交付的默认设计系统，也最容易覆盖当前全部功能模块。

---

## 6. Figma v1 建库建议范围

### Phase 1：Foundations

变量集合：

1. `Primitives`
   - Blue
   - Navy
   - Slate
   - Green
   - Amber
   - Red
   - White / Black

2. `Color`
   - Light mode
   - Dark mode
   - 语义变量全部 alias 到 primitives

3. `Spacing`
   - `spacing/0 = 0`
   - `spacing/1 = 4`
   - `spacing/2 = 8`
   - `spacing/3 = 12`
   - `spacing/4 = 16`
   - `spacing/5 = 20`
   - `spacing/6 = 24`
   - `spacing/8 = 32`
   - `spacing/10 = 40`

4. `Radius`
   - `radius/none = 0`
   - `radius/sm = 4`
   - `radius/md = 6`
   - `radius/lg = 8`
   - `radius/xl = 12`
   - `radius/full = 999`

5. `Size`
   - `size/control/sm = 32`
   - `size/control/md = 38`
   - `size/control/lg = 44`
   - `size/sidebar/expanded = 248`
   - `size/sidebar/collapsed = 64`

Text styles:

- `Display/Page Title`
- `Heading/Section`
- `Heading/Card`
- `Body/Default`
- `Body/Small`
- `Label/Default`
- `Label/Strong`
- `Code/Default`

Effect styles:

- `Shadow/Card`
- `Shadow/Popover`
- `Shadow/Modal`

### Phase 2：File Structure

建议 Figma 页面：

- `Cover`
- `Getting Started`
- `Foundations / Color`
- `Foundations / Typography`
- `Foundations / Spacing`
- `--- Components ---`
- `Component / Button`
- `Component / Input`
- `Component / Select`
- `Component / Badge`
- `Component / Card`
- `Component / Sidebar`
- `Component / Table`
- `Component / Tabs`
- `Component / Modal`
- `Component / Chat Message`
- `Component / Tool Call`
- `Component / Metric Card`
- `Component / Empty State`
- `--- Patterns ---`
- `Pattern / App Shell`
- `Pattern / Chat Workspace`
- `Pattern / Monitoring Dashboard`
- `Pattern / Provider Settings`

### Phase 3：v1 组件清单

按依赖顺序：

1. `Button`
   - Variant: Primary / Secondary / Ghost / Danger
   - Size: Sm / Md / Lg
   - State: Default / Hover / Disabled
   - Properties: Label、Show Icon、Icon Swap

2. `Input`
   - Size: Md / Lg
   - State: Default / Focus / Error / Disabled
   - Properties: Placeholder、Value、Helper Text、Show Error

3. `Badge`
   - Tone: Neutral / Success / Warning / Danger / Info
   - Style: Soft / Outline
   - Properties: Label、Show Dot

4. `Metric Card`
   - Trend: Positive / Neutral / Negative
   - Density: Comfortable / Compact
   - Properties: Label、Value、Delta

5. `Table`
   - Header
   - Row
   - Row selected / hover
   - Cell with status badge

6. `Sidebar`
   - Expanded / Collapsed
   - Active / Default item
   - Group label
   - Footer environment block

7. `Chat Message`
   - Role: User / Assistant / System
   - Density: Default / Compact
   - With Attachment / With Tool Call

8. `Tool Call`
   - State: Pending Approval / Running / Success / Failed
   - Properties: Tool Name、Description、Show Actions

9. `Card`
   - Basic / Interactive / Alert
   - State: Default / Hover / Selected

10. `Tabs`
    - Horizontal
    - Active / Default

11. `Modal`
    - Dialog shell
    - Header / Body / Footer

12. `Empty State`
    - No Data / No Search Result / Setup Required

### Phase 4：高阶 Pattern

先不直接建为组件，建议作为 Pattern 页面：

- `App Shell`
- `Chat Workspace`
- `Operations Overview`
- `Provider Management`
- `Channel Configuration`
- `File Browser`
- `Terminal Panel`

---

## 7. 决策问题

请先选择一个方向作为 Figma v1 主系统：

1. `A` Enterprise Blue Ops：企业蓝运维台，推荐默认
2. `B` Pure Ink Console：黑白灰工具台，最贴近当前原型
3. `C` Agent Command Center：智能体工作室，更有产品差异
4. `D` Terminal Operations：深色开发者运维台，适合高级主题
5. `A+B`：主系统 Enterprise Blue，保留 Pure Ink 为轻量主题
6. `A+D`：主系统 Enterprise Blue，保留 Terminal 为暗色高级主题

选择后，下一步进入正式 Figma 前还需要：

- 你提供一个目标 Figma design file URL，或确认让我创建一个新 Figma design 文件。
- 如果创建新文件，需要确认使用哪个 Figma team/plan。
- 我会先进入 Phase 1，只创建 Foundations，不会一次性创建所有组件。
