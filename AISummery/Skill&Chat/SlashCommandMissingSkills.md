# 斜杠命令不显示技能列表 — 根因分析与修复

## 问题描述

用户在 Chat 输入框输入 `/` 后，弹出的斜杠命令列表只显示 6 个系统命令（`/usage`、`/status`、`/abort`、`/queue`、`/clear`、`/clear --history`），而已启用的 87+ 个技能一个都没有出现。

## 根因

**前端 `ChatInput.vue` 的斜杠命令列表是硬编码的，从未从后端 API 获取技能数据。**

### 证据链

#### 1. 前端硬编码命令列表

**文件**：`packages/client/src/components/hermes/chat/ChatInput.vue` 第 26-37 行

```typescript
const bridgeCommands = computed(() => [
  { name: 'usage', args: '', description: t('chat.slashCommands.usage') },
  { name: 'status', args: '', description: t('chat.slashCommands.status') },
  { name: 'abort', args: '', description: t('chat.slashCommands.abort') },
  { name: 'queue', args: t('chat.slashCommandArgs.message'), description: t('chat.slashCommands.queue') },
  { name: 'clear', args: '', description: t('chat.slashCommands.clear') },
  { name: 'clear', args: '--history', insertText: 'clear --history', description: t('chat.slashCommands.clearHistory') },
  { name: 'title', args: t('chat.slashCommandArgs.title'), description: t('chat.slashCommands.title') },
  { name: 'compress', args: '', description: t('chat.slashCommands.compress') },
  { name: 'steer', args: t('chat.slashCommandArgs.text'), description: t('chat.slashCommands.steer') },
  { name: 'destroy', args: '', description: t('chat.slashCommands.destroy') },
])
```

`bridgeCommands` 是一个纯静态数组，只包含 10 个系统级命令。没有任何逻辑从 API 获取技能列表并合并进来。

#### 2. 仅 Bridge 会话显示斜杠命令

**文件**：`ChatInput.vue` 第 42 行、第 111-115 行

```typescript
const isBridgeSession = computed(() => chatStore.activeSession?.source === 'cli')

function updateSlashState() {
  if (!isBridgeSession.value) {
    slashActive.value = false   // ← 非 Bridge 会话直接关闭斜杠菜单
    return
  }
  // ...
}
```

只有在 `session.source === 'cli'` 的 Bridge 会话中，斜杠命令菜单才会激活。Web UI 直接创建的会话（source 为 `'web'`）输入 `/` 不会触发任何下拉。

#### 3. 过滤逻辑仅搜索硬编码列表

**文件**：`ChatInput.vue` 第 43-48 行

```typescript
const filteredBridgeCommands = computed(() => {
  const query = slashQuery.value.toLowerCase()
  return bridgeCommands.value.filter(command =>
    command.name.includes(query) || command.insertText?.includes(query),
  )
})
```

过滤的是 `bridgeCommands`（纯系统命令），不包含任何技能。

#### 4. 后端已有完整的技能列表 API

**文件**：`packages/server/src/controllers/hermes/skills.ts` → `list()` 函数
**路由**：`GET /api/hermes/skills`

后端 API 已经能返回完整的技能列表（含分类、名称、描述、启用状态等）：

```typescript
ctx.body = { categories, archived }
// 每个技能含: name, description, enabled, source, ...
```

**前端 API 层也已定义**：`packages/client/src/api/hermes/skills.ts` → `fetchSkills()`

但 `ChatInput.vue` **从未调用** `fetchSkills()` 来获取技能数据。

#### 5. Python Agent 侧有完整的斜杠命令发现机制（但未暴露给 Web）

**文件**：`hermes-agent/agent/skill_commands.py` → `scan_skill_commands()`

Python 侧的 `scan_skill_commands()` 会扫描 `~/.hermes/skills/` 下的所有 `SKILL.md`，构建 `/skill-name → skill info` 的映射。但这套机制只在 TUI / Discord / Telegram / Webhook 等平台使用，**没有通过任何 API 暴露给 Web 前端**。

---

## 架构层面的断裂点

```
Python Agent 侧（已实现）                    Web 前端侧（缺失）
─────────────────────                    ──────────────────
scan_skill_commands()                    
    ↓ 扫描 ~/.hermes/skills/             
    ↓ 生成 /skill-name 映射              
    ↓                                   
用于 TUI/Discord/Telegram/Webhook        ChatInput.vue ← 硬编码 10 个系统命令
    ↓                                    ↓
get_skill_commands()                     fetchSkills() 已定义但未在 ChatInput 中使用
    ↓                                    ↓
斜杠命令菜单 ✅                            斜杠命令菜单 ❌（只有系统命令）
```

---

## 修复方案

### 方案 A：前端获取技能列表合并到斜杠菜单（推荐，改动最小）

**核心思路**：在 `ChatInput.vue` 中调用已有的 `fetchSkills()` API，将技能名转换为斜杠命令格式，合并到 `bridgeCommands` 中。

**改动范围**：

1. **`ChatInput.vue`**：
   - 引入 `fetchSkills` 和 `SkillInfo` 类型
   - 新增 `skillCommands` ref，在 `onMounted` 中调用 `fetchSkills()` 获取技能列表
   - 修改 `bridgeCommands` computed，合并系统命令 + 技能命令
   - 放宽 `isBridgeSession` 限制（或为 Web 会话也启用斜杠技能菜单）
   - 选中技能命令时，输入 `/skill-name` 发送给 Agent

**示意代码**：
```typescript
import { fetchSkills, type SkillInfo, type SkillCategory } from '@/api/hermes/skills'

const skillCommands = ref<{ name: string; description: string }[]>([])

onMounted(async () => {
  try {
    const data = await fetchSkills()
    const cmds: { name: string; description: string }[] = []
    for (const cat of data.categories) {
      for (const skill of cat.skills) {
        if (skill.enabled !== false) {
          cmds.push({
            name: skill.name,
            description: skill.description,
          })
        }
      }
    }
    skillCommands.value = cmds
  } catch { /* ignore */ }
})

const bridgeCommands = computed(() => [
  // 系统命令（保持原样）
  { name: 'usage', args: '', description: t('chat.slashCommands.usage'), isSystem: true },
  // ...其他系统命令...
  // 技能命令
  ...skillCommands.value.map(s => ({
    name: s.name,
    args: '',
    description: s.description,
    isSystem: false,
  })),
])
```

2. **修改 `updateSlashState()`**：移除 `isBridgeSession` 限制，或改为所有会话类型都支持技能斜杠菜单

3. **修改 `selectBridgeCommand()`**：技能命令选中后，填入 `/skill-name`，用户按发送即可

### 方案 B：后端新增技能斜杠命令专用 API

新增一个轻量 API `GET /api/hermes/skills/slash-commands`，专门返回斜杠命令格式的技能列表（与 Python 侧 `get_skill_commands()` 对齐），前端调用此 API。

**优点**：职责分离，API 更精确
**缺点**：多一个 API 端点，改动更大

### 方案 C：通过 Socket 事件动态获取

在 Chat 会话建立时，通过 Socket 事件从 Python Agent 获取 `get_skill_commands()` 的结果。

**优点**：与 Python 侧完全一致
**缺点**：需要修改 Socket 协议和 Python Agent 代码，改动面更大

---

## 推荐：方案 A

理由：
1. **零后端改动**：`GET /api/hermes/skills` API 和 `fetchSkills()` 前端函数均已就绪
2. **改动集中**：只需修改 `ChatInput.vue` 一个文件
3. **一致性**：技能管理页（SkillsView）已使用同一 API 展示技能列表，斜杠菜单复用相同数据源
4. **需要注意**：
   - 技能列表可能较长（87+），需要在 UI 上做好分组（系统命令 vs 技能命令）和滚动
   - 当前 `isBridgeSession` 限制需要放宽，否则 Web 会话无法使用斜杠技能
   - 选中技能后发送 `/skill-name`，Python Agent 侧的 `skill_commands.py` 已能识别并处理

---

## 关键源文件索引

| 文件 | 问题点 |
|------|--------|
| `packages/client/src/components/hermes/chat/ChatInput.vue:26-37` | ~~硬编码命令列表，未获取技能~~ 已修复：改为 systemCommands + skillCommands 合并 |
| `packages/client/src/components/hermes/chat/ChatInput.vue:42` | ~~`isBridgeSession` 限制~~ 已修复：移除限制，所有会话类型均可使用斜杠菜单 |
| `packages/client/src/components/hermes/chat/ChatInput.vue:111-115` | ~~非 Bridge 会话直接关闭斜杠菜单~~ 已修复 |
| `packages/client/src/api/hermes/skills.ts:84-87` | `fetchSkills()` 已在 ChatInput 中使用 |
| `packages/server/src/controllers/hermes/skills.ts:251-292` | 后端 `list()` 已返回完整技能数据 |
| `hermes-agent/agent/skill_commands.py:263-326` | Python 侧完整的技能命令扫描（未暴露给 Web，但不影响修复） |

---

## 修复记录（方案 A 已实施）

### 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `packages/client/src/components/hermes/chat/ChatInput.vue` | 引入 fetchSkills API，合并技能到斜杠菜单；移除 isBridgeSession 限制；添加分组 UI 和分类标签 |
| `packages/client/src/i18n/locales/en.ts` | 添加 `skillSection: 'Skills'` |
| `packages/client/src/i18n/locales/zh.ts` | 添加 `skillSection: '技能'` |
| `packages/client/src/i18n/locales/zh-TW.ts` | 添加 `skillSection: '技能'` |
| `packages/client/src/i18n/locales/ja.ts` | 添加 `skillSection: 'スキル'` |
| `packages/client/src/i18n/locales/ko.ts` | 添加 `skillSection: '스킬'` |
| `packages/client/src/i18n/locales/de.ts` | 添加 `skillSection: 'Fähigkeiten'` |
| `packages/client/src/i18n/locales/es.ts` | 添加 `skillSection: 'Habilidades'` |
| `packages/client/src/i18n/locales/fr.ts` | 添加 `skillSection: 'Compétences'` |
| `packages/client/src/i18n/locales/pt.ts` | 添加 `skillSection: 'Habilidades'` |

### 修复后效果

- 输入 `/` 后弹出菜单包含：10 个系统命令 + 所有已启用技能（87+ 个）
- 系统命令与技能命令之间有分隔线 + "Skills/技能"分组标题
- 技能命令显示分类标签（如 `creative`、`productivity`）
- 搜索过滤支持技能名、描述、分类名
- Web 会话和 Bridge 会话均可使用斜杠菜单

---

## 修复记录 2 — 技能斜杠命令 "Unknown bridge command" 报错

### 问题描述

用户在 Chat 中输入 `/remotion`（技能库中已启用的技能），报错：
```
Unknown bridge command: /remotion
```

### 根因

**Node.js 端 `session-command.ts` 拦截了所有 `/xxx` 格式的命令，未识别的直接返回错误，消息从未到达 Python Agent。**

完整调用链：

1. 用户发送 `/remotion` → Socket `chat-run` 事件
2. `index.ts:125` — `parseSessionCommand(data.input)` 匹配到 `/remotion`，返回 `ParsedSessionCommand`
3. `index.ts:126` — `command && source === 'cli'` 为 true（`resolveRunSource()` 硬编码返回 `'cli'`）
4. `index.ts:128` — 调用 `handleSessionCommand()`
5. `session-command.ts:91` — `COMMAND_ALIASES` 中没有 `remotion`，进入 `if (!COMMAND_ALIASES[command.rawName])`
6. `session-command.ts:92-98` — 直接返回 `Unknown bridge command: /remotion` 错误
7. `index.ts:147` — `return` 退出，消息永远不会转发到 Python Agent

而 Python Agent 的 `gateway/run.py:7524-7553` 才有完整的技能命令解析逻辑（`get_skill_commands()` → `resolve_skill_command_key()` → `build_skill_invocation_message()`），但消息根本到不了那里。

### 修复方案

**让 `handleSessionCommand()` 对非内置命令返回 `{ handled: false }`，调用方据此决定是否透传到 Agent。**

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/server/src/services/hermes/run-chat/session-command.ts` | 1. 新增 `SessionCommandResult` 接口（`{ handled: boolean }`）；2. 函数返回类型改为 `Promise<SessionCommandResult>`；3. 非内置命令返回 `{ handled: false }` 而非报错；4. switch 内 `return` 改为 `break`，末尾统一 `return { handled: true }`；5. 导出 `COMMAND_ALIASES` |
| `packages/server/src/services/hermes/run-chat/index.ts` | 1. 导入 `COMMAND_ALIASES`；2. Socket 处理：检查 `result.handled`，未处理则继续到 agent 运行流程；3. `handleApiRun` 入口：仅对内置命令（`COMMAND_ALIASES` 中的）短路返回，技能命令透传 |

### 修复后行为

- `/usage`、`/abort` 等内置命令 → Node.js 本地处理，返回结果
- `/remotion`、`/excalidraw` 等技能命令 → `handleSessionCommand` 返回 `{ handled: false }` → 消息透传到 Python Agent → `skill_commands.py` 解析并执行技能

---

## 问题三：技能生成的图片/视频素材在对话中无法展示

### 问题描述

使用 remotion 技能生成视频素材后，Agent 在对话中返回了 `<img src="/api/hermes/download?path=/workspace/projects/product-demo/out/product-demo.png&profile=default&token=...">` 标签，但图片无法在聊天界面中正常渲染展示。

### 根因

**下载 API 返回 `Content-Disposition: attachment`，浏览器不会内联渲染 `<img>` 标签引用的资源。**

关键代码链路：

1. **Agent 输出** — Python Agent 生成文件后，在 Markdown 中输出 `<img src="/workspace/projects/product-demo/out/product-demo.png">`
2. **MarkdownRenderer 转换** — `packages/client/src/components/hermes/chat/MarkdownRenderer.vue:155-160` 将本地路径转换为 download API URL：
   ```js
   html = html.replace(/\bsrc=(["'])([^"']+)\1/g, (match, quote, path) => {
     if (!isLocalFilePath(path)) return match
     const downloadUrl = getDownloadUrl(normalizeLocalFilePath(path))
     return `src=${quote}${downloadUrl}${quote}`
   })
   ```
3. **download API 响应** — `packages/server/src/routes/hermes/download.ts:101` 设置：
   ```js
   ctx.set('Content-Disposition', `attachment; filename="..."`)
   ```
4. **浏览器行为** — 收到 `Content-Disposition: attachment` 头后，浏览器**不会**将响应当作内联资源渲染，`<img>` 标签显示为裂图

### 修复方案

**对可内联查看的 MIME 类型（image/video/audio/text/PDF）使用 `Content-Disposition: inline`，其余类型保持 `attachment`。**

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/server/src/routes/hermes/download.ts:99-105` | 根据 MIME 类型判断 `inline`/`attachment`：`image/`、`video/`、`audio/`、`text/`、`application/pdf` 前缀使用 `inline`，其余保持 `attachment` |

### 修复后行为

- PNG/JPG/MP4/WebM 等可查看资源 → `Content-Disposition: inline` → `<img>`/`<video>` 正常内联渲染
- ZIP/TAR/GZ 等不可查看资源 → `Content-Disposition: attachment` → 触发浏览器下载
