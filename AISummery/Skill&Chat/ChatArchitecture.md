# Chat 系统架构梳理

## 1. 概述

Chat 系统是 Hermes Agent 的核心交互界面，基于 **Socket.IO** 实现实时双向通信。支持流式输出、会话管理、上下文压缩、运行队列、工具审批等复杂功能。

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                       │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ ChatView │─▶│  ChatPanel    │─▶│   ChatInput      │  │
│  │ (路由)   │  │  (消息渲染)   │  │   (用户输入)     │  │
│  └──────────┘  └───────────────┘  └──────────────────┘  │
│        │              │                    │             │
│        ▼              ▼                    ▼             │
│  ┌──────────────────────────────────────────────────┐   │
│  │            chat store (Pinia)                    │   │
│  │  - 会话管理  - 消息状态  - 流式累加  - 工具展示 │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼───────────────────────────┐   │
│  │       api/hermes/chat.ts (Socket.IO Client)      │   │
│  │  - startRunViaSocket()  - registerSessionHandlers│   │
│  │  - resumeSession()      - respondToolApproval()  │   │
│  └──────────────────────┬───────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ Socket.IO /chat-run namespace
┌─────────────────────────▼───────────────────────────────┐
│                后端 (packages/server)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │         ChatRunSocket (Socket.IO Server)          │   │
│  │  - 连接认证  - 运行调度  - 会话恢复  - 队列管理 │   │
│  └───────┬───────────────────────────┬───────────────┘   │
│          │                           │                   │
│          ▼                           ▼                   │
│  ┌───────────────┐          ┌──────────────────┐        │
│  │ handle-api-run│          │handle-bridge-run │        │
│  │ (上游 API 流) │          │ (CLI Bridge 运行)│        │
│  └───────────────┘          └──────────────────┘        │
│                                                          │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │ compression│  │  abort   │  │  session-command    │  │
│  │ (上下文压缩)│  │ (取消运行)│  │  (会话命令处理)    │  │
│  └────────────┘  └──────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Python Agent (hermes-agent)                  │
│  ┌─────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │ run_agent.py│  │conversation_  │  │  tool_executor│  │
│  │ (Agent 主循环)│  │loop.py       │  │  (工具调度)   │  │
│  └─────────────┘  │(对话循环)     │  └───────────────┘  │
│                   └───────────────┘                      │
│  ┌──────────────────────────────────────────────────────┐│
│  │ prompt_builder.py → 系统提示词构建（含 Skill 索引） ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## 3. 前端模块

### 3.1 页面与组件

| 文件 | 职责 |
|------|------|
| `views/hermes/ChatView.vue` | **聊天主页面** — 路由入口，加载 Profile/Settings，管理 Session 切换 |
| `components/hermes/chat/ChatPanel.vue` | **聊天面板** — 消息列表渲染、流式输出展示、工具调用展示 |
| `components/hermes/chat/ChatInput.vue` | **聊天输入框** — 用户输入、附件上传、模型选择 |
| `components/hermes/chat/MarkdownRenderer.vue` | **Markdown 渲染器** — 渲染 AI 回复中的 Markdown 内容，支持图片/视频/文件链接 |

### 3.2 状态管理

| 文件 | 职责 |
|------|------|
| `stores/hermes/chat.ts` | **Chat Store (Pinia)** — 核心状态管理，包含：|

**Chat Store 核心数据结构**：

```typescript
interface Session {
  id: string
  profile?: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  model?: string
  provider?: string
  inputTokens?: number
  outputTokens?: number
  contextTokens?: number
  workspace?: string | null
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool' | 'command'
  content: string
  timestamp: number
  toolName?: string
  toolCallId?: string
  toolPreview?: string
  toolArgs?: string
  toolResult?: string
  toolStatus?: 'running' | 'done' | 'error'
  toolDuration?: number
  isStreaming?: boolean
  attachments?: Attachment[]
  reasoning?: string        // 思考/推理文本
  queued?: boolean
  systemType?: 'command' | 'error'
  commandAction?: string
  commandData?: Record<string, unknown>
}

interface PendingApproval {
  sessionId: string
  approvalId: string
  command: string
  description: string
  choices: Array<'once' | 'session' | 'always' | 'deny'>
  allowPermanent: boolean
  requestedAt: number
}
```

### 3.3 API 通信层

| 文件 | 职责 |
|------|------|
| `api/hermes/chat.ts` | **Socket.IO 客户端** — 管理与后端 `/chat-run` 命名空间的实时连接 |

**核心 API**：
- `startRunViaSocket()` — 发起一次新的 Chat Run
- `resumeSession()` — 恢复已有会话
- `registerSessionHandlers()` — 注册会话级事件处理器
- `respondToolApproval()` — 响应工具审批请求
- `onPeerUserMessage()` — 监听跨窗口用户消息

**SSE/Socket 事件类型**：

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `run` | Client → Server | 发起一次 Agent 运行 |
| `message.delta` | Server → Client | 流式文本增量 |
| `reasoning.delta` | Server → Client | 推理/思考文本增量 |
| `thinking.delta` | Server → Client | 思考文本增量（别名） |
| `tool.started` | Server → Client | 工具调用开始 |
| `tool.completed` | Server → Client | 工具调用完成 |
| `run.completed` | Server → Client | 运行完成（含最终输出） |
| `run.failed` | Server → Client | 运行失败 |
| `run.queued` | Server → Client | 运行排队 |
| `abort` | Client → Server | 取消运行 |
| `resume` | Client → Server | 恢复会话 |
| `approval.requested` | Server → Client | 工具审批请求 |
| `approval.respond` | Client → Server | 审批响应 |
| `session.command` | Server → Client | 会话命令（如 /clear） |

---

## 4. 后端模块

### 4.1 Socket.IO 服务端

| 文件 | 职责 |
|------|------|
| `services/hermes/run-chat/index.ts` | **ChatRunSocket 主类** — Socket.IO `/chat-run` 命名空间管理。认证中间件、连接处理、运行调度、队列管理、会话恢复 |
| `services/hermes/run-chat/handle-api-run.ts` | **API 运行处理器** — 处理上游 `/v1/responses` 流式响应 |
| `services/hermes/run-chat/handle-bridge-run.ts` | **Bridge 运行处理器** — 处理 CLI Bridge 运行 |
| `services/hermes/run-chat/abort.ts` | **运行取消** — 处理 abort 请求，清理状态 |
| `services/hermes/run-chat/compression.ts` | **上下文压缩** — 管理会话上下文窗口，自动压缩历史消息 |
| `services/hermes/run-chat/session-command.ts` | **会话命令** — 解析和执行 /clear、/model 等斜杠命令 |
| `services/hermes/run-chat/sse-utils.ts` | **SSE 工具** — 读取 SSE 帧 |
| `services/hermes/run-chat/response-stream.ts` | **响应流处理** — 将上游流式事件应用到会话状态 |
| `services/hermes/run-chat/bridge-delta.ts` | **Bridge 增量处理** |
| `services/hermes/run-chat/bridge-message.ts` | **Bridge 消息处理** |
| `services/hermes/run-chat/content-blocks.ts` | **内容块转换** — ContentBlock 数组与字符串互转 |
| `services/hermes/run-chat/message-format.ts` | **消息格式转换** — 历史消息格式化 |
| `services/hermes/run-chat/model-config.ts` | **模型配置** |
| `services/hermes/run-chat/usage.ts` | **用量统计** |
| `services/hermes/run-chat/types.ts` | **类型定义** — SessionState、ContentBlock、QueuedRun 等 |
| `routes/hermes/chat-run.ts` | **路由注册** — ChatRunSocket 单例管理 |
| `lib/llm-prompt.ts` | **系统提示词** — AI 输出格式规范（图片/视频/文件引用语法） |

### 4.2 Python Agent 端

| 文件 | 职责 |
|------|------|
| `run_agent.py` | **Agent 主入口** — 188KB 的核心文件，包含 Agent 完整运行循环 |
| `agent/conversation_loop.py` | **对话循环** — 236KB，管理多轮对话、工具调用、流式响应 |
| `agent/tool_executor.py` | **工具执行器** — 分发和执行工具调用，处理结果 |
| `agent/prompt_builder.py` | **系统提示词构建** — 组装身份、平台提示、技能索引、上下文文件 |
| `agent/context_compressor.py` | **上下文压缩器** — 当上下文超出窗口时自动摘要压缩 |
| `agent/curator.py` | **技能策展器** — 自动归档不活跃技能、管理技能生命周期 |

---

## 5. 运行流程

### 5.1 一次完整的 Chat Run 流程

```
1. 用户输入 → ChatInput 组件
2. chat store.sendMessage() → startRunViaSocket()
3. Socket.IO 'run' 事件 → ChatRunSocket.onConnection → handleRun()
4. handleRun() 判断运行来源：
   ├── CLI Bridge → handleBridgeRun()
   │   └── 通过 AgentBridgeClient 与 Python Agent 通信
   └── API Server → handleApiRun()
       └── 调用上游 /v1/responses API 流式响应
5. 流式事件通过 Socket.IO 推送到前端：
   ├── message.delta → 增量文本追加
   ├── reasoning.delta → 推理文本追加
   ├── tool.started → 显示工具调用
   ├── tool.completed → 显示工具结果
   └── run.completed → 标记运行完成
6. 前端 chat store 累加消息，渲染到 ChatPanel
```

### 5.2 会话恢复流程

```
1. 新 Socket 连接 → 'resume' 事件
2. ChatRunSocket.resumeSession()
3. 从 DB 加载会话历史 → 组装消息
4. 通过 'resumed' 事件发送历史消息
5. 前端恢复消息列表和工作状态
```

### 5.3 运行队列

```
当 Session 正在工作时，新消息进入队列：
1. 新 'run' 事件 → state.isWorking === true
2. 消息加入 state.queue
3. 广播 'run.queued' 事件（含队列长度）
4. 前端显示排队状态
5. 当前运行完成后 → dequeueNextQueuedRun()
6. 自动执行队列中的下一个消息
```

---

## 6. 关键设计决策

### 6.1 Socket.IO 而非纯 HTTP SSE

- **双向通信**：需要支持 abort、approval.respond 等客户端主动事件
- **会话隔离**：通过 `session:{id}` room 实现多会话并行
- **跨窗口同步**：同一会话的多个浏览器标签页共享事件

### 6.2 双运行模式

| 模式 | 说明 |
|------|------|
| **CLI Bridge** | 与本地 Python Agent 进程通信，支持所有工具 |
| **API Server** | 调用上游 API（如 OpenAI Responses API），流式获取结果 |

### 6.3 上下文压缩

当对话历史超出模型上下文窗口时：
1. 自动将旧消息压缩为摘要
2. 保留最近的消息不变
3. 压缩快照存入 DB，恢复时使用

### 6.4 Profile 隔离

- 每个 Profile 有独立的 skills 目录、配置、凭证
- Socket 连接通过 query 参数指定 Profile
- 运行时根据 Profile 加载对应的系统提示词和技能
