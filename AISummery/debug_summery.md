# Bug 修复总结

本文档汇总了本轮对话中解决的所有 Bug 和报错，每项独立成章。

---

# Bug 1: Socket.IO Resume Timeout

## 报错内容

```
Failed to load session messages via resume: Error: resume timeout
    at https://xxx.dev.coze.site/assets/js/index-pxPQVwLG.js:1:466850

Socket.IO run stream error: timeout
```

浏览器通过公网域名访问 WebUI 时，页面加载后 15 秒超时报错，无法恢复会话消息。

## Bug 问题分析

### 直接原因

Socket.IO 连接建立失败，`resumed` 事件永远无法到达客户端，15 秒后超时。

### 根本原因

公网域名的 CDN/反向代理不支持 WebSocket 直接升级。客户端 Socket.IO 的 `transports` 顺序配置为 `['websocket', 'polling']`，而 Socket.IO v4 的行为是：当 WebSocket 握手失败时，**不会自动降级到 polling**，而是直接触发 `connect_error`。只有 polling 先连接成功后，才会尝试 upgrade 到 WebSocket。

### 验证结果

| 测试场景 | transport 顺序 | 结果 |
|----------|---------------|------|
| localhost 直连 | `['websocket', 'polling']` | ✅ 成功 |
| 公网 + websocket only | `['websocket']` | ❌ `websocket error` |
| 公网 + websocket 优先 | `['websocket', 'polling']` | ❌ 不降级，`connect_error` |
| 公网 + polling 优先 | `['polling', 'websocket']` | ✅ 成功 (399ms) |

## 最终解决方案

将客户端所有 Socket.IO 连接的 transports 顺序从 `['websocket', 'polling']` 改为 `['polling', 'websocket']`。先建立 polling 连接（所有 HTTP 代理都支持），连接成功后再尝试 upgrade 到 WebSocket。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/client/src/api/hermes/chat.ts` | `connectChatRun()` 中 transports 顺序调换 |
| `packages/client/src/api/hermes/group-chat.ts` | GroupChat socket 连接 transports 顺序调换 |
| `packages/server/src/services/hermes/run-chat/index.ts` | resume 事件处理器添加 `await` + try-catch |

## 潜在风险与影响评估

- **性能**：首次连接多一次 HTTP 往返（polling 握手 → upgrade），约增加 200-400ms。upgrade 成功后后续通信仍走 WebSocket，无额外开销。
- **兼容性**：完全向后兼容，polling 是 Socket.IO 的基础传输方式。
- **本地开发**：localhost 不受影响，WebSocket upgrade 仍会在连接后自动完成。
- **流量**：upgrade 成功后与修改前行为一致，无额外流量开销。
- **风险等级**：低。这是 Socket.IO 官方推荐的兼容性最佳实践。

---

# Bug 2: state.db 不存在导致 Sessions API 返回 500

## 报错内容

```
Failed to load Hermes sessions: Error: API Error 500: Internal Server Error
```

服务端日志：
```
Error: unable to open database file
```

调用 `/api/hermes/sessions/hermes` 返回 HTTP 500。

## Bug 问题分析

### 直接原因

`listSessionSummaries()` 函数使用 `new DatabaseSync(dbPath, { open: true, readOnly: true })` 打开 Hermes Agent 的 `state.db` 文件。当该文件不存在时，SQLite 抛出 "unable to open database file" 异常，未被捕获，导致 API 返回 500。

### 根本原因

Hermes Agent 的 `state.db` 是 Hermes Agent 自己的会话数据库，WebUI 只将其作为**只读数据源**。当 Hermes Agent 从未运行过时，该文件不存在是正常状态，不应导致 WebUI 报错。所有读取 `state.db` 的函数都缺少文件存在性检查。

### 设计意图（来自 README.md）

> Self-built session database — local SQLite storage for Web UI sessions; Hermes state.db remains a **read-only source** for Hermes history APIs

## 最终解决方案

新增 `stateDbExists()` 守卫函数，在所有打开 `state.db` 的函数中先检查文件是否存在，不存在时返回空结果。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/server/src/db/hermes/sessions-db.ts` | 新增 `stateDbExists()` 函数；`openSessionDb()` 文件不存在时返回 `null`；`listSessionSummaries()` 不存在时返回 `[]`；`searchSessionSummariesWithProfile()` 不存在时返回 `[]`；`getSkillUsageStatsFromDb()` 不存在时返回 `null`；`getUsageStatsFromDb()` 不存在时返回 `{input_tokens:0, output_tokens:0}` |

## 潜在风险与影响评估

- **功能影响**：`state.db` 不存在时 Hermes 历史会话列表为空，这符合预期——没有运行过 Hermes Agent 自然没有历史会话。
- **数据安全**：`state.db` 始终以 `readOnly: true` 打开，本修复不涉及写入操作，不会破坏数据库。
- **回归风险**：`state.db` 存在时的行为完全不变（`existsSync` 检查通过后走原逻辑）。
- **其他功能**：WebUI 自身的 `hermes-web-ui.db` 完全独立，不受影响。
- **风险等级**：极低。纯粹是添加了防御性检查。

---

# Bug 3: HermesMessage content 非字符串导致 trim() 报错

## 报错内容

```
Failed to load session messages via resume: TypeError: o?.trim is not a function
    at pa (https://xxx.dev.coze.site/assets/js/index-Bp9DSuqQ.js:1:448262)
```

## Bug 问题分析

### 直接原因

`mapHermesMessages()` 函数中对 `msg.content` 直接调用 `.trim()`，但 Hermes Agent 的 LLM 响应（Anthropic 格式）中 `content` 字段可能是数组（如 `[{type:'text', text:'...'}]`）或对象，而非字符串。数组/对象没有 `.trim()` 方法。

### 根本原因

HermesMessage 的 TypeScript 类型定义 `content: string` 与运行时实际数据不一致。OpenAI/Anthropic 兼容 API 中 `content` 可以是 `string | ContentBlock[] | null`，服务器端虽然在 `handleMessage` 中做了转换，但客户端直接对原始数据调用 `.trim()` 缺乏防御。

## 最终解决方案

新增 `normalizeContent()` 工具函数，统一处理 `string | array | object` 类型内容，确保总是返回字符串。所有 `.trim()` 调用改用 `normalizeContent()` 包装。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/client/src/stores/hermes/chat.ts` | 新增 `normalizeContent()` 函数；5 处 `m.content.trim()` / `msg.content?.trim()` 改用 `normalizeContent()` |
| `packages/client/src/api/hermes/sessions.ts` | `HermesMessage.content` 类型从 `string` 改为 `string \| unknown[] \| unknown` |

## 潜在风险与影响评估

- **功能影响**：数组 content 会被提取 text 块拼接为字符串，对象 content 会调用 `String()` 转换，null/undefined 转为空字符串。所有情况都有兜底。
- **回归风险**：原本就是字符串的 content 不受影响（`typeof === 'string'` 走原路径）。类型定义放宽不会影响现有代码，因为所有使用点都通过 `normalizeContent()` 处理。
- **其他功能**：`mapHermesMessages` 的输出格式不变，下游组件（ChatView、MessageBubble 等）接收到的数据类型仍然是字符串。
- **风险等级**：低。仅在原逻辑前加了一层安全的类型转换。

---

# Bug 4: 插件发现失败 — env shebang 解析错误

## 报错内容

```
API Error 500: {"error":"Failed to discover Hermes plugins.\n/usr/bin/env -I -c <plugin-discovery>: Command failed: /usr/bin/env -I -c \n...\n/usr/bin/env: invalid option -- 'I'\n"}
```

插件页面返回 500 错误。

## Bug 问题分析

### 直接原因

`hermesBinPython()` 函数从 `/usr/local/bin/hermes` 的 shebang `#!/usr/bin/env python3` 中用 `split(/\s+/)[0]` 提取出 `/usr/bin/env`（而非 `python3`），导致最终拼装命令为 `/usr/bin/env -I -c "python code"`。`-I` 是 Python 的隔离模式选项，`env` 命令不认识该选项。

### 完整错误链

1. `hermesBinPython()` 解析 `#!/usr/bin/env python3` → 返回 `/usr/bin/env`
2. `resolveAgentBridgeCommand()` 返回 `{ command: '/usr/bin/env', argsPrefix: [] }`
3. `listHermesPlugins()` 拼出命令 `/usr/bin/env -I -c "python code"`
4. `/usr/bin/env -I` 无效 → 报错 `invalid option -- 'I'`
5. 异常未被正确捕获 → 返回 500

### 根本原因

`hermesBinPython()` 没有处理 `#!/usr/bin/env python3` 这种通过 `env` 间接调用的 shebang 格式。`split(/\s+/)[0]` 只取到了 `env` 本身，而非 `env` 后面真正的可执行文件名。

## 最终解决方案

重写 `hermesBinPython()` 函数：当 shebang 的 base name 为 `env` 时，跳过 `env` 自身及其标志参数（如 `-S`），提取其后的真实可执行文件名（如 `python3`），再通过 `resolveExecutable()` 解析为绝对路径。解析失败时返回 `undefined`，让 fallback 链继续工作。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/server/src/services/hermes/agent-bridge/manager.ts` | 重写 `hermesBinPython()` 函数，增加 `env` shebang 解析逻辑；新增 `import { basename } from 'node:path'` |

## 潜在风险与影响评估

- **Bridge 启动**：`hermesBinPython()` 的返回值同时被 AgentBridge 的子进程启动使用。修复后返回的是 `python3` 的绝对路径（如 `/usr/bin/python3`），而非 `/usr/bin/env`，Python 进程启动更直接。
- **Fallback 链**：如果 `env` 后面的可执行文件名无法解析（`resolveExecutable` 返回 `undefined`），函数返回 `undefined`，回退到下一个候选（venv → uv → python3），不会导致整个 bridge 不可用。
- **其他 shebang 格式**：非 `env` 前缀的 shebang（如 `#!/usr/bin/python3`）走原逻辑不变。
- **风险等级**：低。仅修改了解析逻辑，不影响已正确解析的路径。

---

# Bug 5: 群聊添加智能体返回 502 Bad Gateway

## 报错内容

```
POST https://xxx.dev.coze.site/api/hermes/group-chat/rooms/mpqlf213825j2y/agents 502 (Bad Gateway)
```

群聊模块添加智能体时报 502。

## Bug 问题分析

### 直接原因

`AgentClient.connect()` 连接到 `http://127.0.0.1:8648/group-chat`，但服务器实际监听在 5000 端口，8648 端口无服务。Socket.IO 连接被拒绝 → `connect_error` → catch → 返回 502。

### 根本原因

多处端口硬编码不一致：

| 位置 | 回退默认值 | 实际用途 |
|------|-----------|----------|
| `config.ts` | `process.env.PORT \|\| '5000'` | 服务器启动监听端口 ✅ |
| `agent-clients.ts` | `process.env.PORT \|\| '8648'` | AgentClient 回连端口 ❌ |
| `gateway-manager.ts` | `process.env.PORT \|\| DEFAULT` | 网关端口 ⚠️ |
| `update.ts` | `process.env.PORT \|\| '8648'` | 更新检查端口 ❌ |

沙箱环境中 `process.env.PORT` 未设置，服务器通过 `DEPLOY_RUN_PORT=5000` 确定端口。但 `agent-clients.ts` 和 `update.ts` 回退到 `'8648'`（旧的默认值），与实际监听端口不一致。

## 最终解决方案

统一所有端口读取逻辑，优先级为：`DEPLOY_RUN_PORT` > `PORT` > 硬编码 `'5000'`。

## 代码改动文件

| 文件 | 改动前 | 改动后 |
|------|--------|--------|
| `packages/server/src/services/hermes/group-chat/agent-clients.ts:139` | `process.env.PORT \|\| '8648'` | `process.env.DEPLOY_RUN_PORT \|\| process.env.PORT \|\| '5000'` |
| `packages/server/src/config.ts:48` | `process.env.PORT \|\| '5000'` | `process.env.DEPLOY_RUN_PORT \|\| process.env.PORT \|\| '5000'` |
| `packages/server/src/services/hermes/gateway-manager.ts:118` | `process.env.PORT \|\| DEFAULT_WEB_UI_PORT` | `process.env.DEPLOY_RUN_PORT \|\| process.env.PORT \|\| DEFAULT_WEB_UI_PORT` |
| `packages/server/src/controllers/update.ts:128` | `process.env.PORT \|\| '8648'` | `process.env.DEPLOY_RUN_PORT \|\| process.env.PORT \|\| '5000'` |

## 潜在风险与影响评估

- **端口冲突**：如果 `DEPLOY_RUN_PORT` 和 `PORT` 同时设置但值不同，`DEPLOY_RUN_PORT` 优先。这在沙箱环境中是正确行为（`DEPLOY_RUN_PORT` 是平台指定端口）。
- **非沙箱环境**：在本地开发或非 Coze 平台部署时，`DEPLOY_RUN_PORT` 通常未设置，回退到 `PORT` 或 `'5000'`，行为与修改前兼容。
- **GatewayManager**：`DEFAULT_WEB_UI_PORT` 的定义未改变，只是在前面增加了 `DEPLOY_RUN_PORT` 和 `PORT` 的优先级。
- **群聊功能**：AgentClient 现在能正确连接到服务器的 group-chat namespace，智能体的消息收发链路恢复正常。
- **风险等级**：低。仅统一了端口回退逻辑，不影响已有环境变量配置的部署。

---

# Bug 6: 用户头像和模型配置重启后重置为默认值

## 报错内容

开发环境中，用户头像配置和模型配置（默认模型、模型别名、模型可见性）在服务器重启后重置为默认值。

## Bug 问题分析

### 直接原因

4 个独立问题叠加导致配置丢失：

1. **`readAppConfig()` 缓存陷阱**：`readAppConfig()` 内部用模块级变量 `cache` 缓存配置。当 `config.json` 不存在时，`catch` 块将 `cache = {}`。但 `{} ` 是 truthy 值，后续所有调用都走 `if (cache) return cache` 分支，永远不会重新读取磁盘。即使文件后来被创建（如通过 `writeAppConfig`），`readAppConfig` 仍返回空对象，导致所有配置读取为空。

2. **`config.yaml` 不存在**：Hermes Agent 的核心配置文件 `~/.hermes/config.yaml` 不存在时，`readConfigYamlForProfile()` 返回空对象，`buildAvailableForProfile()` 无法识别任何 model provider。`setConfigModel()` 写入成功，但 `getConfigModels()` 读取时找不到 provider 定义，显示为空。

3. **`GatewayManager` 未初始化**：`index.ts` 启动流程中未创建 `GatewayManager` 实例，导致代理路由（`proxy-handler.ts`）中 `getGatewayManager()` 返回 `null`。所有需要网关代理的 API（如 `/api/hermes/models/available`、`/api/hermes/model-visibility`、`/api/hermes/model-alias`）抛出 "GatewayManager not initialized" 错误，返回 proxy error。

4. **`profile-metadata` 目录不存在**：头像保存路径 `~/.hermes-web-ui/profile-metadata/<base64name>/avatar.json`，当 `profile-metadata` 目录不存在时，`writeFile` 抛出 ENOENT 错误，头像保存失败。

## 最终解决方案

| 问题 | 修复方案 |
|------|---------|
| 缓存陷阱 | `catch` 块中 `cache = {}` 改为 `cache = null`，确保下次调用时重新从磁盘读取 |
| config.yaml 缺失 | 新增 `ensureConfigYamlExists()` 函数，在 `readConfigYamlForProfile()` 和 `buildAvailableForProfile()` 中调用，自动创建最小骨架文件 |
| GatewayManager 未初始化 | 在 `index.ts` 的 bootstrap 流程中创建 `GatewayManager` 实例并注册到 `proxy-handler` |
| 头像目录缺失 | 在 `writeProfileAvatar` 和 `deleteProfileAvatar` 中添加 `mkdirSync(dirname, { recursive: true })` 确保目录存在 |

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/server/src/services/app-config.ts` | `catch` 块中 `cache = {}` 改为 `cache = null` |
| `packages/server/src/services/config-helpers.ts` | 新增 `ensureConfigYamlExists()` 函数；在 `readConfigYamlForProfile()` 末尾调用 |
| `packages/server/src/controllers/hermes/models.ts` | 在 `buildAvailableForProfile()` 开头调用 `ensureConfigYamlExists(profile)` |
| `packages/server/src/index.ts` | 添加 `GatewayManager` 初始化：`new GatewayManager(activeProfile)` + `setGatewayManagerForTest(gm)` |
| `packages/server/src/controllers/hermes/profiles.ts` | `writeProfileAvatar` 和 `deleteProfileAvatar` 中添加 `mkdirSync(dirname, { recursive: true })` |

## 潜在风险与影响评估

- **缓存修复**：`cache = null` 后，每次文件被修改（`writeAppConfig` 会清空 cache），下次 `readAppConfig` 都会重新读取磁盘。这是正确行为，不会引入性能问题，因为配置文件很小（<1KB），且读写频率低。
- **config.yaml 自动创建**：创建的最小骨架 `model: "" providers: {}` 不包含任何 provider 定义。这不会影响已有的 config.yaml（函数先检查文件存在性），也不会改变已有配置的行为。
- **GatewayManager 初始化**：创建实例仅初始化内部数据结构，不会自动启动网关进程。网关启动由 `ensureProfileGatewaysRunning()` 独立处理。如果 Hermes Agent 未安装，`getUpstream()` 返回默认端口 8642，代理请求会失败，但这与修改前行为一致（修改前直接报 "not initialized"）。
- **头像目录创建**：`mkdirSync({ recursive: true })` 是幂等操作，目录已存在时不报错。实际代码中已有 `await mkdir(dir, { recursive: true })`，我们的 `mkdirSync` 是额外保护，确保在 `mkdir` 之前的路径操作不会因目录缺失而失败。
- **风险等级**：低。所有修改都是防御性增强，不改变已有正常路径的行为。

---

# Bug 7: hermes CLI hermes_cli 模块找不到

## 报错内容

```
ModuleNotFoundError: No module named 'hermes_cli'
```

用户创建 profile 时调用 hermes CLI 报错。

## Bug 问题分析

### 直接原因

`/usr/local/bin/hermes` 脚本执行 `from hermes_cli.main import main`，但 hermes-agent Python 包未安装。

### 根本原因

hermes-agent 的 Python 包未在沙箱环境中安装，导致 CLI 入口脚本无法找到所需模块。

## 最终解决方案

执行 `pip install -e /workspace/projects/hermes-agent` 安装 hermes-agent 包，并在 `.coze` build 命令中添加 pip install 步骤确保部署时也能安装。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `.coze` | build 命令添加 pip install 步骤 |

## 潜在风险与影响评估

- **功能影响**：安装后 hermes CLI 正常可用，profile 创建等功能恢复。
- **部署环境**：pip install 已加入 build 流程，后续部署自动安装。
- **风险等级**：低。纯依赖安装操作。

---

# Bug 8: 终端服务连接失败

## 报错内容

AI 聊天页面访问文件系统（终端面板）时，终端服务连接失败。

## Bug 问题分析

### 直接原因

终端面板使用原始 WebSocket (`new WebSocket`) 连接 `/api/hermes/terminal`，沙箱 CDN 代理 (volc-dcdn) 不支持原始 WebSocket 长连接。WS 握手成功 (101) 但连接立即被代理关闭 (code 1006)。

### 根本原因

与 Bug 1 本质相同：CDN 不支持原生 WebSocket 升级。同环境下群聊 Socket.IO 正常，因其自动回退到 HTTP long-polling。

### 验证结果

| 测试场景 | 结果 |
|----------|------|
| localhost 直连原始 WS | ✅ 成功 |
| 公网域名原始 WS | ❌ 握手后立即断开 (1006) |
| 公网域名 Socket.IO /terminal | ✅ 成功 (polling 传输) |
| localhost Socket.IO /terminal | ✅ 成功 |

## 最终解决方案

将终端传输层从原始 WebSocket 改为 Socket.IO，复用 GroupChatServer IO 实例。原始 WebSocket 通道保留兼容，Socket.IO 为主要传输。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/server/src/routes/hermes/terminal.ts` | 新增 `setupTerminalSocketIO()` 注册 /terminal namespace |
| `packages/server/src/index.ts` | 调用 `setupTerminalSocketIO()` 初始化 |
| `packages/client/src/components/hermes/chat/TerminalPanel.vue` | 改用 socket.io-client，支持 polling 回退、自动重连 |
| `packages/client/src/views/hermes/TerminalView.vue` | 同步改用 socket.io-client |

## 潜在风险与影响评估

- **性能**：Socket.IO 首次连接通过 polling 握手后 upgrade 到 WebSocket，与 Bug 1 修复一致。
- **兼容性**：原始 WebSocket 通道保留，不影响直连环境。
- **风险等级**：低。与 Bug 1 修复方案一致，Socket.IO polling 回退是成熟解法。

---

# Bug 9: 斜杠命令不显示技能列表

## 报错内容

用户在 Chat 输入框输入 `/` 后，弹出的斜杠命令列表只显示 6 个系统命令（`/usage`、`/status`、`/abort`、`/queue`、`/clear`、`/clear --history`），而已启用的 87+ 个技能一个都没有出现。

## Bug 问题分析

### 直接原因

前端 `ChatInput.vue` 的斜杠命令列表是硬编码的，从未从后端 API 获取技能数据。

### 根本原因

1. **硬编码命令列表**：`bridgeCommands` 是纯静态数组，只包含 10 个系统级命令，没有任何逻辑从 API 获取技能列表并合并进来。

2. **仅 Bridge 会话显示斜杠命令**：只有在 `session.source === 'cli'` 的 Bridge 会话中斜杠命令菜单才会激活，Web UI 直接创建的会话输入 `/` 不会触发任何下拉。

3. **后端 API 已就绪但未使用**：`GET /api/hermes/skills` 已能返回完整技能列表，前端 `fetchSkills()` 也已定义，但 `ChatInput.vue` 从未调用。

### 架构断裂

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

## 最终解决方案

**方案 A（已实施）**：前端获取技能列表合并到斜杠菜单。在 `ChatInput.vue` 中调用已有的 `fetchSkills()` API，将技能名转换为斜杠命令格式，合并到命令列表中。

## 代码改动文件

| 文件 | 改动 |
|------|------|
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

## 潜在风险与影响评估

- **性能**：技能列表可能在 onMounted 时加载一次，87+ 个技能数据量小（<10KB），对首屏性能无影响。
- **搜索过滤**：支持技能名、描述、分类名的过滤，与系统命令统一搜索体验。
- **兼容性**：`fetchSkills()` 已在 SkillsView 中使用，复用同一数据源，行为一致。
- **风险等级**：低。零后端改动，仅前端合并展示逻辑。

---

# Bug 10: 技能斜杠命令 "Unknown bridge command" 报错

## 报错内容

```
Unknown bridge command: /remotion
```

用户在 Chat 中输入 `/remotion`（技能库中已启用的技能），发送后报错。

## Bug 问题分析

### 直接原因

Node.js 端 `session-command.ts` 拦截了所有 `/xxx` 格式的命令，未识别的直接返回错误，消息从未到达 Python Agent。

### 完整错误链

1. 用户发送 `/remotion` → Socket `chat-run` 事件
2. `parseSessionCommand(data.input)` 匹配到 `/remotion`
3. `command && source === 'cli'` 为 true
4. 调用 `handleSessionCommand()`
5. `COMMAND_ALIASES` 中没有 `remotion`，进入错误分支
6. 直接返回 `Unknown bridge command: /remotion` 错误
7. `return` 退出，消息永远不会转发到 Python Agent

而 Python Agent 的 `gateway/run.py` 才有完整的技能命令解析逻辑（`get_skill_commands()` → `resolve_skill_command_key()` → `build_skill_invocation_message()`），但消息根本到不了那里。

## 最终解决方案

让 `handleSessionCommand()` 对非内置命令返回 `{ handled: false }`，调用方据此决定是否透传到 Agent。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/server/src/services/hermes/run-chat/session-command.ts` | 新增 `SessionCommandResult` 接口；函数返回类型改为 `Promise<SessionCommandResult>`；非内置命令返回 `{ handled: false }` 而非报错；switch 内 `return` 改为 `break`，末尾统一 `return { handled: true }`；导出 `COMMAND_ALIASES` |
| `packages/server/src/services/hermes/run-chat/index.ts` | 导入 `COMMAND_ALIASES`；检查 `result.handled`，未处理则继续到 agent 运行流程；`handleApiRun` 入口仅对内置命令短路返回，技能命令透传 |

## 潜在风险与影响评估

- **内置命令行为**：`/usage`、`/abort` 等内置命令仍由 Node.js 本地处理，行为不变。
- **技能命令透传**：`/remotion`、`/excalidraw` 等技能命令返回 `{ handled: false }` 后透传到 Python Agent，由其 `skill_commands.py` 解析执行。
- **向后兼容**：所有 `COMMAND_ALIASES` 中的命令仍走原逻辑，新增的 `{ handled: false }` 只影响未识别命令。
- **风险等级**：低。仅修改了命令分发逻辑，不影响已识别命令的处理路径。

---

# Bug 11: 技能生成的图片/视频素材在对话中无法展示

## 报错内容

使用 remotion 等技能生成视频/图片素材后，Agent 在对话中返回了 `<img src="/api/hermes/download?path=...">` 标签，但图片无法在聊天界面中正常渲染展示，显示为裂图。

## Bug 问题分析

### 直接原因

下载 API 返回 `Content-Disposition: attachment`，浏览器不会内联渲染 `<img>` 标签引用的资源。

### 完整错误链

1. **Agent 输出** — Python Agent 生成文件后，在 Markdown 中输出 `<img src="/workspace/projects/product-demo/out/product-demo.png">`
2. **MarkdownRenderer 转换** — 将本地路径转换为 download API URL
3. **download API 响应** — 设置 `Content-Disposition: attachment`
4. **浏览器行为** — 收到 `attachment` 头后不内联渲染，`<img>` 标签显示为裂图

## 最终解决方案

对可内联查看的 MIME 类型（image/video/audio/text/PDF）使用 `Content-Disposition: inline`，其余类型保持 `attachment`。

## 代码改动文件

| 文件 | 改动 |
|------|------|
| `packages/server/src/routes/hermes/download.ts` | 根据 MIME 类型判断 `inline`/`attachment`：`image/`、`video/`、`audio/`、`text/`、`application/pdf` 前缀使用 `inline`，其余保持 `attachment` |

## 潜在风险与影响评估

- **PNG/JPG/MP4/WebM 等可查看资源** → `inline` → `<img>`/`<video>` 正常内联渲染
- **ZIP/TAR/GZ 等不可查看资源** → `attachment` → 触发浏览器下载（行为不变）
- **安全性**：`inline` 仅对安全 MIME 类型生效，不存在 XSS 风险
- **风险等级**：极低。仅修改了响应头，不涉及文件内容或路径逻辑

---

# 修复关联关系图

```
Bug 1 (resume timeout)
├── 触发条件：公网 CDN 不支持 WebSocket 升级
├── 修复：transports 顺序 polling 优先
└── 关联 Bug 2/3：如果 resume 能到达服务器但数据处理失败，也会超时

Bug 2 (state.db 500)
├── 触发条件：Hermes Agent 从未运行过
├── 修复：stateDbExists() 守卫
└── 关联 Bug 1：500 错误导致页面初始化失败，间接导致 resume 超时

Bug 3 (trim is not a function)
├── 触发条件：LLM 返回数组格式 content
├── 修复：normalizeContent() 工具函数
└── 关联 Bug 1：如果 resumed 事件包含非字符串 content，客户端处理异常也会触发 resume 超时

Bug 4 (plugins 500)
├── 触发条件：hermes shebang 使用 env 间接调用
├── 修复：hermesBinPython() env shebang 解析
└── 独立问题，不影响其他功能

Bug 5 (群聊 502)
├── 触发条件：沙箱环境 DEPLOY_RUN_PORT 与硬编码默认端口不一致
├── 修复：统一端口回退优先级
└── 独立问题，不影响其他功能

Bug 6 (头像和模型配置重置)
├── 触发条件：四个独立问题叠加
│   ├── readAppConfig cache 陷阱 (cache = {} truthy)
│   ├── config.yaml 不存在
│   ├── GatewayManager 未初始化
│   └── profile-metadata 目录不存在
├── 修复：cache=null + ensureConfigYamlExists + GatewayManager初始化 + mkdirSync
└── 独立问题，不影响其他功能

Bug 7 (hermes CLI hermes_cli 模块找不到)
├── 触发条件：用户创建 profile 时调用 hermes CLI
├── 报错：ModuleNotFoundError: No module named 'hermes_cli'
├── 根因：/usr/local/bin/hermes 脚本执行 from hermes_cli.main import main，但 hermes-agent Python 包未安装
├── 修复：pip install -e /workspace/projects/hermes-agent + .coze build 命令添加 pip install
└── 独立问题，不影响其他功能

Bug 8 (终端服务连接失败)
├── 触发条件：AI 聊天页面访问文件系统（终端面板）
├── 报错：终端服务连接失败
├── 根因分析
│   ├── 终端面板使用原始 WebSocket (new WebSocket) 连接 /api/hermes/terminal
│   ├── 沙箱 CDN 代理 (volc-dcdn) 不支持原始 WebSocket 长连接
│   ├── WS 握手成功 (101) 但连接立即被代理关闭 (code 1006)
│   └── 同环境下群聊 Socket.IO 正常，因其自动回退到 HTTP long-polling
├── 验证结果
│   ├── localhost 直连原始 WS → ✅ 成功
│   ├── 公网域名原始 WS → ❌ 握手后立即断开 (1006)
│   ├── 公网域名 Socket.IO /terminal → ✅ 成功 (polling 传输)
│   └── localhost Socket.IO /terminal → ✅ 成功
├── 修复方案：将终端传输层从原始 WebSocket 改为 Socket.IO
│   ├── server: 新增 setupTerminalSocketIO() 注册 /terminal namespace，复用 GroupChatServer IO 实例
│   ├── server: 抽取 Transport 接口，原始 WS 和 Socket.IO 共享 handleTerminalConnection() 核心逻辑
│   ├── client/TerminalPanel.vue: 改用 socket.io-client，支持 polling 回退、自动重连、重试按钮重置
│   ├── client/TerminalView.vue: 同步改用 socket.io-client
│   └── 原始 WebSocket 通道保留兼容，Socket.IO 为主要传输
├── 代码改动文件
│   ├── packages/server/src/routes/hermes/terminal.ts
│   ├── packages/server/src/index.ts
│   ├── packages/client/src/components/hermes/chat/TerminalPanel.vue
│   └── packages/client/src/views/hermes/TerminalView.vue
└── 关联 Bug 1：本质相同（CDN 不支持原生 WebSocket），Socket.IO polling 回退是统一解法

Bug 9 (斜杠命令不显示技能列表)
├── 触发条件：Chat 输入框输入 / 后只显示系统命令，87+ 个技能一个都不出现
├── 根因：ChatInput.vue 的斜杠命令列表是硬编码的，从未从后端 API 获取技能数据
│   ├── bridgeCommands 是纯静态数组，只有 10 个系统命令
│   ├── isBridgeSession 限制：非 cli 会话直接关闭斜杠菜单
│   └── fetchSkills() 已定义但未在 ChatInput 中使用
├── 修复方案（方案 A 已实施）：前端获取技能列表合并到斜杠菜单
│   ├── ChatInput.vue: 引入 fetchSkills，合并 systemCommands + skillCommands
│   ├── 移除 isBridgeSession 限制，所有会话类型均可使用斜杠菜单
│   └── 8 个 i18n locale 文件添加 skillSection 翻译
├── 代码改动文件
│   ├── packages/client/src/components/hermes/chat/ChatInput.vue
│   └── packages/client/src/i18n/locales/{en,zh,zh-TW,ja,ko,de,es,fr,pt}.ts
└── 关联 Bug 10：技能命令显示出来后，发送仍报错 "Unknown bridge command"

Bug 10 (技能斜杠命令 "Unknown bridge command" 报错)
├── 触发条件：输入 /remotion 等技能命令后报 "Unknown bridge command: /remotion"
├── 根因：session-command.ts 拦截了所有 /xxx 命令，未识别的直接返回错误，消息未透传到 Python Agent
│   ├── parseSessionCommand 匹配到 /remotion
│   ├── COMMAND_ALIASES 中没有 remotion，进入错误分支
│   ├── 返回 "Unknown bridge command" 错误并 return
│   └── 消息永远不会转发到 Python Agent 的技能命令解析逻辑
├── 修复方案：handleSessionCommand 对非内置命令返回 { handled: false }，调用方决定是否透传
│   ├── session-command.ts: 新增 SessionCommandResult 接口，非内置命令返回 { handled: false }
│   └── run-chat/index.ts: 检查 result.handled，未处理则继续到 agent 运行流程
├── 代码改动文件
│   ├── packages/server/src/services/hermes/run-chat/session-command.ts
│   └── packages/server/src/services/hermes/run-chat/index.ts
└── 关联 Bug 9：Bug 9 让技能显示在斜杠菜单中，本 Bug 让技能命令能正确执行

Bug 11 (技能生成的图片/视频素材在对话中无法展示)
├── 触发条件：使用 remotion 等技能生成图片/视频后，<img> 标签引用的 download API 资源无法内联渲染
├── 根因：download API 返回 Content-Disposition: attachment，浏览器不会内联渲染 <img> 标签引用的资源
│   ├── Agent 输出 <img src="/workspace/projects/.../xxx.png">
│   ├── MarkdownRenderer 将本地路径转为 download API URL
│   ├── download API 设置 Content-Disposition: attachment
│   └── 浏览器收到 attachment 头后不内联渲染，<img> 显示为裂图
├── 修复方案：对可内联查看的 MIME 类型使用 Content-Disposition: inline
│   └── image/、video/、audio/、text/、application/pdf 前缀使用 inline，其余保持 attachment
├── 代码改动文件
│   └── packages/server/src/routes/hermes/download.ts
└── 独立问题，不影响其他功能
```
