# Group Chat 代码梳理

## 一、功能概述

群聊（Group Chat）是一个多用户 + 多 AI Agent 的实时聊天系统。核心特性包括：
- 房间（Room）管理：创建、删除、克隆、邀请码加入
- 多 Agent 协作：不同 Profile 的 AI Agent 可被邀请进房间，通过 @mention 触发回复
- 上下文压缩（Context Compression）：当对话 token 超过阈值时自动压缩历史，保持长对话可用
- 实时通信：基于 Socket.IO 的双向实时消息推送，支持流式输出（Streaming）
- 审批机制（Approval）：Agent 执行敏感操作时需用户审批
- 工具调用展示：Agent 调用工具（Tool Calls）时前端可折叠查看参数和结果
- 语音播报（TTS）：支持自动播放 Agent 回复的语音

---

## 二、架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Vue 3)                      │
│  GroupChatView → GroupChatPanel → GroupMessageList          │
│                                → GroupChatInput              │
│                                → CreateRoomForm              │
│  Store: useGroupChatStore (Pinia)                           │
│  API:   api/hermes/group-chat.ts                            │
│  Socket: socket.io-client → /group-chat namespace           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST + Socket.IO
┌────────────────────────▼────────────────────────────────────┐
│                     Backend (Koa + Socket.IO)                │
│  Routes:    routes/hermes/group-chat.ts                      │
│  Service:   services/hermes/group-chat/index.ts              │
│  Agent:     services/hermes/group-chat/agent-clients.ts      │
│  Routing:   services/hermes/group-chat/mention-routing.ts    │
│  Context:   services/hermes/context-engine/compressor.ts     │
│  Bridge:    services/hermes/agent-bridge.ts                  │
│  Storage:   ChatStorage (SQLite via better-sqlite3)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、文件清单与职责

### 3.1 前端文件

| 文件路径 | 职责 |
|---------|------|
| `packages/client/src/views/hermes/GroupChatView.vue` | 页面入口，处理路由参数（roomId），连接/断开 Socket，加载房间列表 |
| `packages/client/src/components/hermes/group-chat/GroupChatPanel.vue` | 主面板，包含侧边栏房间列表、消息区、输入框、各种弹窗（创建/克隆/添加Agent/压缩配置） |
| `packages/client/src/components/hermes/group-chat/GroupMessageList.vue` | 消息列表，负责虚拟滚动、自动滚底、过滤 tool 消息 |
| `packages/client/src/components/hermes/group-chat/GroupMessageItem.vue` | 单条消息渲染：用户消息、Agent 回复（Markdown）、工具调用/结果、Thinking/Reasoning 展示、语音播放、附件/图片渲染 |
| `packages/client/src/components/hermes/group-chat/GroupChatInput.vue` | 输入框组件，支持 @mention 弹窗选择、文件拖拽/上传、自动高度拖拽、IME 兼容、语音开关 |
| `packages/client/src/components/hermes/group-chat/CreateRoomForm.vue` | 创建房间表单：用户名、描述、房间名、邀请码、压缩配置 |
| `packages/client/src/components/hermes/group-chat/mention-options.ts` | 构造 @mention 下拉选项（@all + 各 Agent），支持搜索过滤 |
| `packages/client/src/stores/hermes/group-chat.ts` | Pinia Store，全局状态管理：房间/消息/成员/Agent/连接/typing/审批/流式消息合并 |
| `packages/client/src/api/hermes/group-chat.ts` | API 客户端：REST 接口封装 + Socket.IO 连接管理 |

### 3.2 后端文件

| 文件路径 | 职责 |
|---------|------|
| `packages/server/src/routes/hermes/group-chat.ts` | Koa 路由：房间的 CRUD、Agent 管理、压缩配置、强制压缩等 REST 接口 |
| `packages/server/src/services/hermes/group-chat/index.ts` | **核心服务**：`GroupChatServer` 类 + `ChatStorage` 类 + `ChatRoom` 类，处理 Socket.IO 连接/事件、消息持久化、成员管理、Token 统计、Agent 恢复 |
| `packages/server/src/services/hermes/group-chat/agent-clients.ts` | **Agent 客户端**：`AgentClient`（单 Agent 连接）+ `AgentClients`（房间级管理），负责 Agent Socket 连接、@mention 路由、上下文构建、流式回复、工具调用记录、审批转发 |
| `packages/server/src/services/hermes/group-chat/mention-routing.ts` | **@mention 路由**：解析消息中的 `@agentName` / `@all`，确定哪些 Agent 被提及，去除路由标记 |
| `packages/server/src/services/hermes/context-engine/compressor.ts` | **上下文压缩引擎**：根据 token 阈值决定是否压缩历史，增量/全量压缩，生成摘要快照 |

### 3.3 数据库 Schema

| 表名 | 用途 |
|------|------|
| `gc_rooms` | 房间信息（id, name, inviteCode, 压缩配置, totalTokens, sessionSeed） |
| `gc_messages` | 聊天消息（id, roomId, senderId, senderName, content, role, tool_calls, reasoning 等） |
| `gc_room_agents` | 房间内 Agent 绑定（id, roomId, agentId, profile, name, description, invited） |
| `gc_room_members` | 房间人类成员（id, roomId, userId, userName, description, joinedAt） |
| `gc_context_snapshots` | 上下文压缩快照（roomId, summary, lastMessageId, lastMessageTimestamp） |
| `gc_pending_session_deletes` | 待删除的压缩 session 队列（session_id, profile_name, status, 重试信息） |
| `gc_session_profiles` | Session 与 Profile 映射（session_id, room_id, agent_id, profile_name） |

### 3.4 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/hermes/group-chat` | `GroupChatView` | 群聊首页（无房间选中） |
| `/hermes/group-chat/room/:roomId` | `GroupChatView` | 进入指定房间 |

---

## 四、核心流程

### 4.1 创建房间

1. 前端 `CreateRoomForm` 收集：房间名、邀请码、用户名/描述、压缩配置
2. 调用 `POST /api/hermes/group-chat/rooms`，可附带初始 Agent 列表
3. 后端生成 roomId，保存到 `gc_rooms`
4. 对每个 Agent：创建 `AgentClient` → Socket 连接 → 加入房间 → 保存到 `gc_room_agents`
5. Agent 连接失败时返回 `agentResults` 中的错误，不影响房间创建

### 4.2 发送消息 & @mention 触发

1. 用户在 `GroupChatInput` 输入消息（支持 @mention 选择），点击发送
2. 如有附件，先通过 `POST /upload` 上传文件，构造 ContentBlock 数组
3. 通过 Socket.IO `message` 事件发送到服务端
4. 服务端 `handleMessage`：
   - 持久化到 `gc_messages`，更新 `gc_rooms.totalTokens`
   - 广播给房间内所有 Socket 客户端
   - 如果 `role === 'user'`，调用 `agentClients.processMentions()`
5. `processMentions` 解析 @mention，确定被提及的 Agent 列表
6. 对每个被提及的 Agent，调用 `agent.replyToMention()`

### 4.3 Agent 回复（流式）

1. `replyToMention` 流程：
   - 发送 `typing` 事件 → 显示 Agent 正在输入
   - 构建上下文：调用 `ContextEngine.buildContext()`（可能触发压缩）
   - 压缩过程发送 `context_status: compressing` → 前端显示压缩状态
   - 压缩完成发送 `context_status: replying`
   - 调用 `AgentBridgeClient.chat()` 发起对话
   - 流式输出：
     - `message_stream_start` → 开始消息气泡
     - `message_stream_delta` → 增量文本（打字机效果）
     - `message_reasoning_delta` → 增量推理内容
     - 工具调用事件 → 记录 `tool.started` / `tool.completed`
     - 审批事件 → 转发 `approval.requested`
   - 完成后发送最终消息 + `message_stream_end` + `context_status: ready`
2. 前端 Store 处理流式事件：
   - `message_stream_start`：创建/更新流式消息气泡
   - `message_stream_delta`：增量拼接 content
   - `message_reasoning_delta`：增量拼接 reasoning
   - `message_stream_end`：标记流式结束，必要时恢复遗漏的 final content

### 4.4 上下文压缩

1. 每个 Agent 被触发回复时，`replyToMention` 调用 `ContextEngine.buildContext()`
2. 压缩策略：
   - 读取 `gc_context_snapshots` 获取已有摘要
   - 有快照：收集快照之后的新消息，估算 token = 摘要 + 新消息
   - 无快照：估算全部消息的 token
   - 低于阈值 → 直接返回原始消息
   - 超过阈值 → 调用摘要模型压缩，保存快照，返回压缩后上下文
3. 前端可通过 `POST /api/hermes/group-chat/rooms/:roomId/compress` 手动触发压缩
4. 前端可通过 `PUT /api/hermes/group-chat/rooms/:roomId/config` 调整压缩参数：
   - `triggerTokens`：触发压缩的 token 阈值（默认 100000）
   - `maxHistoryTokens`：压缩后最大历史 token（默认 32000）
   - `tailMessageCount`：压缩后保留的最近消息数（默认 10）

### 4.5 审批机制

1. Agent 在执行工具调用时，如果工具需要审批，Bridge 会发送 `approval.requested` 事件
2. `AgentClient` 通过 Socket 转发 `approval.requested` 到房间
3. 前端 `GroupChatPanel` 显示审批栏，包含：命令、描述、选项（once/session/always/deny）
4. 用户选择后，前端发送 `approval.respond`，后端转发给 `AgentBridgeClient.approvalRespond()`
5. 审批结果通过 `approval.resolved` 事件通知房间

### 4.6 房间克隆

1. 右键房间 → 克隆，或通过 `POST /api/hermes/group-chat/rooms/:roomId/clone`
2. 克隆逻辑：复制源房间的配置（名称+Copy、压缩参数、Agent 列表），**不复制对话消息**
3. 对每个源 Agent，重新创建 `AgentClient` 并连接

### 4.7 Agent 中断

1. 前端点击 Agent 状态栏的停止按钮
2. 发送 `interrupt_agent` Socket 事件
3. 后端调用 `AgentClient.interrupt()`，通过 `AgentBridgeClient.interrupt()` 中断正在运行的 session
4. 发送 `stop_typing` + `context_status: ready`

---

## 五、Socket.IO 事件协议

### 5.1 客户端 → 服务端

| 事件 | 数据 | 说明 |
|------|------|------|
| `join` | `{ roomId, name, description }` | 加入房间 |
| `message` | `{ roomId, content, id, mentionDepth, ... }` | 发送消息 |
| `message_stream_start` | `{ roomId, id, senderId, senderName, timestamp }` | 开始流式消息 |
| `message_stream_delta` | `{ roomId, id, delta }` | 流式增量文本 |
| `message_reasoning_delta` | `{ roomId, id, delta }` | 推理增量 |
| `message_stream_end` | `{ roomId, id }` | 结束流式消息 |
| `typing` | `{ roomId }` | 正在输入 |
| `stop_typing` | `{ roomId }` | 停止输入 |
| `context_status` | `{ roomId, agentName, status }` | Agent 状态更新 |
| `interrupt_agent` | `{ roomId, agentName }` | 中断 Agent |
| `approval.requested` | `{ roomId, agentName, approval_id, command, description, choices, allow_permanent }` | 请求审批 |
| `approval.resolved` | `{ roomId, agentName, approval_id, choice }` | 审批已解决 |
| `approval.respond` | `{ roomId, approval_id, choice }` | 用户审批回应 |

### 5.2 服务端 → 客户端

| 事件 | 数据 | 说明 |
|------|------|------|
| `message` | `ChatMessage` | 新消息/消息更新 |
| `message_stream_start` | `ChatMessage` (partial) | 流式消息开始 |
| `message_stream_delta` | `{ roomId, id, delta }` | 流式增量文本 |
| `message_reasoning_delta` | `{ roomId, id, delta }` | 推理增量 |
| `message_stream_end` | `{ roomId, id }` | 流式消息结束 |
| `member_joined` | `{ roomId, memberId, memberName, members }` | 成员加入 |
| `member_left` | `{ roomId, memberId, memberName, members }` | 成员离开 |
| `typing` | `{ roomId, userId, userName }` | 正在输入 |
| `stop_typing` | `{ roomId, userId }` | 停止输入 |
| `context_status` | `{ roomId, agentName, status }` | Agent 状态 |
| `room_updated` | `{ roomId, totalTokens }` | 房间 token 更新 |
| `room_cleared` | `{ roomId, totalTokens }` | 房间上下文已清除 |
| `approval.requested` | `{ roomId, agentName, approval_id, command, description, choices, allow_permanent }` | 请求审批 |
| `approval.resolved` | `{ approval_id }` | 审批已解决 |

---

## 六、REST API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/hermes/group-chat/rooms` | 创建房间（可同时添加 Agent） |
| `GET` | `/api/hermes/group-chat/rooms` | 列出所有房间（根据用户权限过滤） |
| `GET` | `/api/hermes/group-chat/rooms/:roomId` | 获取房间详情（消息 + Agent + 成员） |
| `GET` | `/api/hermes/group-chat/rooms/join/:code` | 通过邀请码查找房间 |
| `POST` | `/api/hermes/group-chat/rooms/:roomId/clone` | 克隆房间（复制配置和 Agent，不复制消息） |
| `DELETE` | `/api/hermes/group-chat/rooms/:roomId` | 删除房间 |
| `PUT` | `/api/hermes/group-chat/rooms/:roomId/invite-code` | 更新邀请码 |
| `POST` | `/api/hermes/group-chat/rooms/:roomId/agents` | 添加 Agent |
| `GET` | `/api/hermes/group-chat/rooms/:roomId/agents` | 列出房间内 Agent |
| `DELETE` | `/api/hermes/group-chat/rooms/:roomId/agents/:agentId` | 移除 Agent |
| `POST` | `/api/hermes/group-chat/rooms/:roomId/clear-context` | 清除房间上下文（保留成员和配置） |
| `PUT` | `/api/hermes/group-chat/rooms/:roomId/config` | 更新压缩配置 |
| `POST` | `/api/hermes/group-chat/rooms/:roomId/compress` | 手动触发压缩 |

---

## 七、关键设计细节

### 7.1 Agent 连接机制

- Agent 通过 Socket.IO **以客户端身份**连接到 `/group-chat` namespace
- 认证方式：携带 `source: 'agent'` + `agentSocketSecret`（服务端启动时随机生成的 32 字节密钥）
- 每个 `AgentClient` 实例维护自己的 Socket 连接、已加入房间集合、上下文缓存、待处理工具调用队列
- 服务重启时 `GroupChatServer.restoreAgents()` 从 SQLite 重建所有 Agent 连接

### 7.2 消息排序

- `sortGroupMessages()` 按 `groupRunOrder` 排序：同一 Agent 回复的消息（可能有多 part + tool_call + tool_result）按 baseId 分组，组内按 phase 排序
- 前端 `mapGroupMessages()` 将 tool_calls 展开为独立气泡，与后续 tool_result 消息合并

### 7.3 流式消息容错

- `needsFinalContentRecovery()`：当流式结束但只有 reasoning 没有 content 时，延迟 300ms 尝试从 REST 接口恢复
- `mergeFinalMessage()`：合并新旧消息，优先保留非空字段
- 空流式消息（无 content/reasoning/tool_calls）在 `stream_end` 时被移除

### 7.4 Mention 路由

- `@all` 是保留名，不可作为 Agent 名
- `resolveMentionTargets()` 解析消息中被 @ 的 Agent，排除发送者自身
- `@all` 等同于提及所有 Agent
- `stripMentionRoutingTokens()` 在发送给 Agent 前去除 `@agentName` / `@all` 标记，避免 Agent 误解为需要再次路由
- Agent 收到的消息前缀添加路由提示，指导 Agent 直接回复

### 7.5 成员管理

- 人类成员：加入房间时持久化到 `gc_room_members`，断开连接时标记 offline
- Agent 成员：仅运行时在内存 `ChatRoom.members` 中追踪，不持久化到 `gc_room_members`
- Agent 的成员身份通过 `gc_room_agents` 表管理

### 7.6 Mention 队列 & 并发控制

- 每个 Agent 在每个房间有独立的处理锁（`_processingRooms`）
- 当 Agent 正在处理消息时，新的 @mention 会被排入 `_mentionQueue`
- 处理完成后，队列只取最后一条执行（丢弃中间过时的）

### 7.7 权限模型

- REST 接口支持用户认证（`user-auth` middleware）
- `super_admin` 可看到所有房间
- 普通用户只能看到其 Profile 关联的房间（通过 `gc_room_agents.profile` 关联查询）
- Socket.IO 连接区分 `human` 和 `agent` 来源

### 7.8 Token 统计

- 每次消息保存后，`ChatStorage.saveMessageAndRefreshRoom()` 重新估算房间 totalTokens
- 估算考虑上下文快照（摘要 token）+ 新消息 token
- Agent 回复完成后，通过 `estimateGroupContextTokens()` 精确估算并更新
- 前端在房间列表和房间 header 中展示 token 用量

---

## 八、测试覆盖

| 测试文件 | 覆盖内容 |
|---------|---------|
| `tests/server/group-chat-context-cache.test.ts` | 上下文压缩缓存逻辑 |
| `tests/server/group-chat-member-sync.test.ts` | 成员同步逻辑 |
| `tests/server/group-chat-mention-routing.test.ts` | @mention 路由解析 |
| `tests/client/group-chat-mention-options.test.ts` | 前端 mention 选项构建 |
| `tests/client/group-chat-store-streaming.test.ts` | Store 流式消息处理 |
| `tests/client/markdown-special-mentions.test.ts` | Markdown 中特殊 mention 渲染 |
| `tests/e2e/group-chat-room-deeplink.spec.ts` | 房间深链接 E2E 测试 |
