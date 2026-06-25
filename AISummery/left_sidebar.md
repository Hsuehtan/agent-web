# 左侧边栏架构与定制指南

## 核心文件清单

| 文件 | 作用 |
|------|------|
| `packages/client/src/components/layout/AppSidebar.vue` | **侧边栏主组件**，所有菜单项定义、分组、样式都在此文件 |
| `packages/client/src/router/index.ts` | 路由定义，侧边栏 `handleNav()` 通过路由 name 跳转 |
| `packages/client/src/stores/hermes/app.ts` | 全局状态，管理侧边栏展开/收起（`sidebarOpen` / `sidebarCollapsed`） |
| `packages/client/src/components/layout/ProfileSelector.vue` | 侧边栏中的 Profile 选择器（独立子组件） |
| `packages/client/src/components/layout/ModelSelector.vue` | 侧边栏中的模型选择器（独立子组件） |
| `packages/client/src/components/layout/LanguageSwitch.vue` | 侧边栏底部语言切换（独立子组件） |
| `packages/client/src/components/layout/ThemeSwitch.vue` | 侧边栏底部主题切换（独立子组件） |
| `packages/client/src/i18n/locales/zh.ts` (及其他语言文件) | 侧边栏所有文案的 i18n key |
| `packages/client/src/styles/variables.scss` | 侧边栏宽度变量：`$sidebar-width: 240px`、`$sidebar-collapsed-width: 64px` |

---

## 侧边栏结构总览

```
AppSidebar.vue
├── sidebar-logo          ← 顶部 Logo + 名称（点击跳转 /hermes/chat）
├── collapse-btn          ← 收起/展开按钮
├── sidebar-nav           ← 导航区域（4 个分组）
│   ├── nav-group "Conversation"   ← 对话分组
│   │   ├── 对话 (hermes.chat)
│   │   ├── 历史 (hermes.history)
│   │   ├── 群聊(beta) (hermes.groupChat)
│   │   ├── 搜索 (openSessionSearch)
│   │   └── 中转站 (外链)
│   ├── nav-group "Agent"          ← 代理分组
│   │   ├── 任务 (hermes.jobs)
│   │   ├── 看板 (hermes.kanban)
│   │   ├── 频道 (hermes.channels)
│   │   ├── 技能 (hermes.skills)
│   │   ├── 插件 (hermes.plugins)
│   │   ├── 记忆 (hermes.memory)
│   │   └── 模型 (hermes.models)
│   ├── nav-group "Monitoring"     ← 监控分组
│   │   ├── 日志 (hermes.logs)
│   │   ├── 用量 (hermes.usage)
│   │   ├── 性能监控 (hermes.performance)  ← 仅超级管理员可见
│   │   └── 技能用量 (hermes.skillsUsage)
│   └── nav-group "System"        ← 系统分组
│       ├── 用户 (hermes.profiles)  ← 仅超级管理员可见
│       └── 设置 (hermes.settings)
├── ProfileSelector        ← Profile 选择器
├── ModelSelector          ← 模型选择器
└── sidebar-footer         ← 底部区域
    ├── 退出登录
    ├── 连接状态 + 语言切换
    ├── 版本号 + GitHub 链接 + 主题切换
    └── 升级按钮（条件显示）
```

---

## 侧边栏菜单项的数据流

```
用户点击按钮
    │
    ▼
handleNav('hermes.chat')        ← AppSidebar.vue L46-48
    │
    ▼
router.push({ name: key })      ← 跳转到 Vue Router 定义的路由
    │
    ▼
selectedKey computed            ← L21-26，根据 route.name 高亮当前项
    │   - 'hermes.session' → 映射为 'hermes.chat'
    │   - 'hermes.historySession' → 映射为 'hermes.history'
    │   - 'hermes.groupChatRoom' → 映射为 'hermes.groupChat'
    │   - 其余直接用 route.name
    ▼
.nav-item.active CSS 类        ← 高亮选中项
```

---

## 场景一：新增侧边栏 Item

### 步骤

#### 1. 创建页面视图

在 `packages/client/src/views/hermes/` 下创建 `NewFeatureView.vue`。

#### 2. 注册路由

编辑 `packages/client/src/router/index.ts`，在 `routes` 数组中添加：

```typescript
{
  path: '/hermes/new-feature',
  name: 'hermes.newFeature',        // 这个 name 就是侧边栏的 key
  component: () => import('@/views/hermes/NewFeatureView.vue'),
},
```

如有权限要求，添加 `meta`：
```typescript
meta: { requiresSuperAdmin: true },
```

#### 3. 添加侧边栏按钮

编辑 `packages/client/src/components/layout/AppSidebar.vue`，在目标分组的 `<div class="nav-group-items">` 内添加：

```html
<button class="nav-item" :class="{ active: selectedKey === 'hermes.newFeature' }" @click="handleNav('hermes.newFeature')">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- 替换为你的图标 SVG path -->
    <circle cx="12" cy="12" r="10" />
  </svg>
  <span>{{ t("sidebar.newFeature") }}</span>
</button>
```

**放在哪个分组**：
| 分组 key | 分组名 | 对应模板位置 |
|----------|--------|-------------|
| `conversation` | 对话 | L93-135 |
| `agent` | 代理 | L138-207 |
| `monitoring` | 监控 | L210-250 |
| `system` | 系统 | L253-276 |

如果需要新建分组，复制一个 `<div class="nav-group">` 块，修改 `toggleGroup('yourGroupKey')` 即可。

#### 4. 添加 i18n 文案

编辑所有语言文件，在 `sidebar` 对象中添加 key：

- `packages/client/src/i18n/locales/zh.ts` → `sidebar.newFeature: '新功能'`
- `packages/client/src/i18n/locales/en.ts` → `sidebar.newFeature: 'New Feature'`
- 其余语言文件同理

如果新建了分组，还需添加分组名：
```typescript
sidebar.groupYourGroup: '你的分组',
sidebar.groupYourGroupShort: '分组',  // 收起状态下的短名
```

#### 5. （可选）处理 selectedKey 映射

如果新路由有子路由（如 `/hermes/new-feature/:id`），需要在 `selectedKey` computed 中添加映射：

```typescript
const selectedKey = computed(() => {
  if (route.name === "hermes.newFeatureDetail") return "hermes.newFeature";
  // ...原有映射
  return route.name as string;
});
```

---

## 场景二：隐藏侧边栏 Item

### 方式一：直接删除/注释 DOM 节点（彻底移除）

在 `AppSidebar.vue` 中注释或删除对应的 `<button class="nav-item">` 节点。

例如隐藏"中转站"：
```html
<!-- <a class="nav-item fun-link" href="https://apikey.fun/register?aff=LIBAPI" target="_blank" rel="noopener noreferrer">
  ...
</a> -->
```

### 方式二：条件渲染（按角色/配置动态隐藏）

使用 `v-if` 控制，参考现有的权限控制模式：

```html
<!-- 仅超级管理员可见 -->
<button v-if="isSuperAdmin" class="nav-item" ...>
```

也可以自定义条件，比如按配置项控制：
```html
<button v-if="someFeatureEnabled" class="nav-item" ...>
```

需要在 `<script setup>` 中定义该条件变量。

### 方式三：CSS 隐藏（不改模板，仅隐藏显示）

在 `AppSidebar.vue` 的 `<style>` 中添加：
```scss
.nav-item[data-key="hermes.memory"] {
  display: none;
}
```
但当前模板未使用 `data-key` 属性，需要先给按钮添加该属性，或改用其他选择器。

---

## 场景三：修改侧边栏布局

### 3.1 修改侧边栏宽度

编辑 `packages/client/src/styles/variables.scss`：

```scss
$sidebar-width: 240px;           // 展开宽度
$sidebar-collapsed-width: 64px;  // 收起（icon-rail）宽度
```

### 3.2 修改分组结构

分组由 `toggleGroup(key)` 和 `isGroupCollapsed(key)` 控制，key 是字符串标识。

**添加新分组**：在 `<nav class="sidebar-nav">` 内复制一个 `nav-group` 块，修改：
- `toggleGroup('yourKey')` / `isGroupCollapsed('yourKey')`
- `groupLabel("YourKey")` — 对应 i18n key `sidebar.groupYourKey` / `sidebar.groupYourKeyShort`

**删除分组**：移除对应 `nav-group` 的 `<div>` 块，将其中的 `nav-item` 按钮移到其他分组。

**调整分组顺序**：直接在模板中调换 `nav-group` 的 DOM 顺序。

### 3.3 修改菜单项样式

所有菜单项样式定义在 `AppSidebar.vue` 的 `<style scoped>` 中：

| CSS 类 | 作用 | 关键属性 |
|--------|------|----------|
| `.sidebar` | 侧边栏容器 | `width`, `background-color`, `padding`, `transition` |
| `.sidebar-logo` | Logo 区域 | `padding`, `background-color`, `box-shadow` |
| `.sidebar-nav` | 导航滚动区域 | `flex: 1`, `overflow-y: auto`, `gap` |
| `.nav-group` | 分组容器 | `gap: 2px` |
| `.nav-group-label` | 分组标题 | `font-size: 10px`, `text-transform: uppercase`, `padding` |
| `.nav-group-items` | 分组内按钮容器 | `gap: 2px` |
| `.nav-item` | 菜单按钮 | `padding: 12px`, `font-size: 14px`, `border-radius`, hover/active 背景色 |
| `.nav-item.active` | 选中状态 | `background-color: rgba(accent, 0.12)`, `color: accent` |
| `.sidebar.collapsed .nav-item` | 收起模式 | `justify-content: center`, 文字 `display: none` |
| `.sidebar-footer` | 底部区域 | `border-top`, `padding-top` |
| `.logout-item` | 退出按钮 | `color: $text-muted`, hover 变红 |
| `.status-row` | 连接状态行 | `display: flex`, `justify-content: space-between` |
| `.version-info` | 版本信息行 | `font-size: 11px` |

### 3.4 修改收起/展开行为

收起状态由 `appStore.sidebarCollapsed` 控制（持久化到 `localStorage` key `hermes_sidebar_collapsed`）。

收起模式的样式全部在 `.sidebar.collapsed { }` 块内（L665-792），包括：
- Logo 区域只显示图片，文字隐藏
- 菜单项只显示图标，文字隐藏
- 模型选择器隐藏，Profile 选择器只显示头像
- 底部只显示状态点和主题图标

---

## 完整改动清单模板

以"新增一个侧边栏 Item"为例，需要改动的文件清单：

```
1. packages/client/src/views/hermes/NewFeatureView.vue    ← 新建页面组件
2. packages/client/src/router/index.ts                     ← 注册路由
3. packages/client/src/components/layout/AppSidebar.vue    ← 添加 nav-item 按钮
4. packages/client/src/i18n/locales/zh.ts                  ← 中文文案
5. packages/client/src/i18n/locales/en.ts                  ← 英文文案
6. packages/client/src/i18n/locales/ja.ts                  ← 日文文案
7. packages/client/src/i18n/locales/ko.ts                  ← 韩文文案
8. packages/client/src/i18n/locales/fr.ts                  ← 法文文案
9. packages/client/src/i18n/locales/de.ts                  ← 德文文案
10. packages/client/src/i18n/locales/es.ts                 ← 西班牙文文案
11. packages/client/src/i18n/locales/pt.ts                 ← 葡萄牙文文案
12. packages/client/src/i18n/locales/zh-TW.ts              ← 繁体中文文案
```

---

## 关键代码位置速查

| 需求 | 文件 | 行号范围 |
|------|------|----------|
| 对话分组菜单 | `AppSidebar.vue` | L93-135 |
| 代理分组菜单 | `AppSidebar.vue` | L138-207 |
| 监控分组菜单 | `AppSidebar.vue` | L210-250 |
| 系统分组菜单 | `AppSidebar.vue` | L253-276 |
| Profile/模型选择器 | `AppSidebar.vue` | L279-280 |
| 底部区域 | `AppSidebar.vue` | L282-326 |
| 路由定义 | `router/index.ts` | L6-121 |
| 路由守卫(权限) | `router/index.ts` | L123-148 |
| selectedKey 高亮逻辑 | `AppSidebar.vue` | L21-26 |
| 分组折叠逻辑 | `AppSidebar.vue` | L30-44 |
| handleNav 跳转 | `AppSidebar.vue` | L46-48 |
| 侧边栏宽度变量 | `variables.scss` | L175-176 |
| 收起模式样式 | `AppSidebar.vue` | L665-792 |
| 展开/收起状态管理 | `stores/hermes/app.ts` | L27-29 |
| 超级管理员判断 | `AppSidebar.vue` | L27 |
| i18n 侧边栏文案 | `i18n/locales/zh.ts` | L107-153 |
