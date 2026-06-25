# Hermes Agent 连接 WebUI 操作指南

## 一、项目概述

**Hermes Agent** 是 Nous Research 开发的自进化 AI Agent，具备内置学习循环、多平台消息网关、技能系统、记忆管理等能力。它需要连接到 **Hermes Web UI**（基于 Vue 3 + Koa 的全功能 Web 管理面板）才能提供浏览器端的交互体验。

Hermes Agent 连接 WebUI 有 **两条核心路径**：

| 路径 | 模式 | 传输协议 | 适用场景 |
|------|------|----------|----------|
| **Agent Bridge** | Bridge 模式 | IPC Socket (Unix Socket / TCP) | 本地部署，WebUI 直接管理 Agent 子进程 |
| **API Server** | API 模式 | HTTP (OpenAI 兼容 REST) | 远程部署，第三方前端接入 |

---

## 二、架构全景

```
┌─────────────────────────────────────────────────────────────────────┐
│                      浏览器 (Vue 3 SPA)                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ ChatView │  │ Terminal  │  │ Files    │  │ Settings/Models   │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └────────┬──────────┘ │
│       │              │             │                  │             │
│  Socket.IO      WebSocket       REST API          REST API        │
│  (/chat-run)    (/terminal)     (/api/*)          (/api/*)        │
└───────┬──────────────┬─────────────┬──────────────────┬───────────┘
        │              │             │                  │
┌───────▼──────────────▼─────────────▼──────────────────▼───────────┐
│                    Koa Server (端口 5000/8648)                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    路由层 (routes/)                           │ │
│  │  chat-run.ts │ terminal.ts │ proxy.ts │ hermes/*.ts         │ │
│  └──────────────────────┬───────────────────────────────────────┘ │
│                         │                                          │
│  ┌──────────────────────▼───────────────────────────────────────┐ │
│  │                    服务层 (services/hermes/)                  │ │
│  │                                                              │ │
│  │  ┌─────────────────────┐    ┌─────────────────────────────┐ │ │
│  │  │   Agent Bridge      │    │     API Run Handler         │ │ │
│  │  │   (Bridge 模式)      │    │     (API Server 模式)       │ │ │
│  │  │                     │    │                             │ │ │
│  │  │  manager.ts         │    │  handle-api-run.ts          │ │ │
│  │  │    ↓ 启动/管理       │    │    ↓ /v1/responses 流式     │ │ │
│  │  │  client.ts          │    │  sse-utils.ts               │ │ │
│  │  │    ↓ IPC 通信        │    │    ↓ SSE 帧解析             │ │ │
│  │  │  hermes_bridge.py   │    │  response-stream.ts         │ │ │
│  │  │    ↓ Python Agent    │    │    ↓ 响应流处理             │ │ │
│  │  └─────────┬───────────┘    └──────────┬──────────────────┘ │ │
│  │            │                             │                   │ │
│  │            ▼                             ▼                   │ │
│  │     AIAgent (Python)           HTTP /v1/responses           │ │
│  │     (进程内调用)                (远程 API 调用)               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
        │                                             │
        ▼                                             ▼
┌───────────────────┐                    ┌─────────────────────────┐
│  hermes-agent     │                    │  hermes-agent           │
│  (本地 Bridge)    │                    │  (远程 API Server)      │
│                   │                    │                         │
│  run_agent.py     │                    │  gateway/platforms/     │
│  AIAgent 类       │                    │  api_server.py          │
│  tools/           │                    │  (OpenAI 兼容端点)       │
│  skills/          │                    │  端口 8642              │
└───────────────────┘                    └─────────────────────────┘
```

---

## 三、连接模式详解

### 3.1 Bridge 模式（本地嵌入式）

Bridge 模式是 WebUI 与 Hermes Agent 之间最紧密的集成方式。WebUI 的 Node.js 后端启动一个 Python 子进程（`hermes_bridge.py`），通过 IPC Socket 进行双向通信。

#### 工作流程

```
1. WebUI 启动 → AgentBridgeManager 启动 Python 子进程
2. Python 子进程加载 hermes-agent (run_agent.py)
3. 通过 Unix Socket (ipc:///tmp/hermes-agent-bridge.sock) 或
   TCP Socket (tcp://127.0.0.1:18765) 建立通信
4. Node.js 端 AgentBridgeClient 发送请求 (newline-delimited JSON)
5. Python 端创建 AIAgent 实例，执行对话，流式回传 delta
6. WebUI 前端通过 Socket.IO 接收流式消息
```

#### 关键文件

| 文件 | 作用 |
|------|------|
| `packages/server/src/services/hermes/agent-bridge/manager.ts` | Agent Bridge 生命周期管理：启动/重启/停止 Python 子进程 |
| `packages/server/src/services/hermes/agent-bridge/client.ts` | IPC Socket 客户端：发送请求、接收流式响应 |
| `dist/server/agent-bridge/hermes_bridge.py` | Python 侧桥接脚本：加载 Agent、管理会话、Socket 通信 |
| `packages/server/src/services/hermes/run-chat/handle-bridge-run.ts` | Bridge 模式聊天运行处理器 |

#### 通信协议

- **传输**: Newline-delimited JSON over IPC Socket
- **请求格式**:
  ```json
  {"action": "chat", "session_id": "xxx", "message": "...", "model": "...", "provider": "..."}
  ```
- **响应格式** (流式):
  ```json
  {"ok": true, "run_id": "xxx", "session_id": "xxx", "status": "running"}
  {"ok": true, "run_id": "xxx", "delta": "Hello", "cursor": 1, "done": false, "events": [...]}
  {"ok": true, "run_id": "xxx", "status": "complete", "output": "...", "done": true}
  ```

#### Bridge 支持的命令

| 命令 | 说明 |
|------|------|
| `chat` | 发送消息并获取流式响应 |
| `context_estimate` | 估算当前会话上下文 token 数 |
| `list_sessions` | 列出所有会话 |
| `resume_session` | 恢复已有会话 |
| `delete_session` | 删除会话 |
| `compress` | 手动触发上下文压缩 |
| `approval_respond` | 响应审批请求 |
| `interrupt` | 中断运行中的 Agent |
| `steer` | 在运行中的 Agent 注入指引 |
| `destroy` | 销毁会话 Agent 实例 |
| `destroy_all` | 销毁所有会话 |
| `ping` | 心跳检测 |

---

### 3.2 API Server 模式（远程 HTTP 接入）

API Server 模式是 Hermes Agent 内置的 OpenAI 兼容 HTTP API 服务器。任何支持 OpenAI API 的前端（Open WebUI、LobeChat、LibreChat 等）都可以直接接入。

#### 工作流程

```
1. 配置 API_SERVER_ENABLED=true 并运行 hermes gateway
2. API Server 在端口 8642 启动 (aiohttp)
3. 第三方前端发送 OpenAI 格式请求到 http://localhost:8642/v1
4. APIServerAdapter 创建 AIAgent 实例处理请求
5. 通过 SSE (Server-Sent Events) 流式返回响应
```

#### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/v1/chat/completions` | OpenAI Chat Completions 格式（支持流式/非流式） |
| `POST` | `/v1/responses` | OpenAI Responses API 格式（有状态） |
| `GET` | `/v1/responses/{id}` | 获取存储的响应 |
| `DELETE` | `/v1/responses/{id}` | 删除存储的响应 |
| `GET` | `/v1/models` | 列出可用模型 |
| `GET` | `/v1/capabilities` | API 能力声明 |
| `POST` | `/v1/runs` | 提交异步运行（返回 run_id） |
| `GET` | `/v1/runs/{id}` | 查询运行状态 |
| `GET` | `/v1/runs/{id}/events` | SSE 流式获取运行事件 |
| `POST` | `/v1/runs/{id}/approval` | 响应运行审批 |
| `POST` | `/v1/runs/{id}/stop` | 中断运行 |
| `GET` | `/health` | 健康检查 |
| `GET` | `/health/detailed` | 详细状态 |

#### 关键特性

- **会话连续性**: 通过 `X-Hermes-Session-Id` 请求头复用已有会话
- **长期记忆范围**: 通过 `X-Hermes-Session-Key` 请求头限定记忆范围（需 API Key 认证）
- **SSE 流式**: Chat Completions 支持 `stream: true`，返回标准 OpenAI SSE 格式
- **多模态**: 支持 `image_url` 类型的视觉输入
- **CORS**: 可配置跨域来源
- **认证**: Bearer Token（可选，配置 `API_SERVER_KEY`）

---

## 四、操作步骤：连接 WebUI

### 4.1 方式一：使用自带的 Hermes Web UI（Bridge 模式）

这是最直接的方式——Hermes Web UI 自带 Agent Bridge，自动管理 Hermes Agent 子进程。

**前提条件**:
- 已安装 Hermes Agent（`hermes` 命令可用）
- 已安装 Node.js >= 23.0.0

**步骤**:

```bash
# 1. 安装 Hermes Web UI
npm install -g hermes-web-ui

# 2. 启动 Web UI（默认端口 8648）
hermes-web-ui
# Web UI 会自动通过 Agent Bridge 连接到本地 hermes-agent

# 3. 浏览器访问
# http://localhost:8648
# 默认账户: admin / 123456
```

**环境变量配置**:

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `HERMES_WEB_UI_HOME` | WebUI 数据目录 | `~/.hermes-web-ui` |
| `HERMES_AGENT_ROOT` | Hermes Agent 安装路径 | 自动检测 |
| `HERMES_AGENT_BRIDGE_ENDPOINT` | Bridge Socket 地址 | `ipc:///tmp/hermes-agent-bridge.sock` (Linux/Mac) / `tcp://127.0.0.1:18765` (Windows) |
| `AUTH_DISABLED` | 禁用认证 | `0` |
| `PROFILE` | 初始 Profile | `default` |
| `PORT` | 服务端口 | `8648` (本地) / `5000` (沙箱) |

---

### 4.2 方式二：使用第三方前端（API Server 模式）

如果你使用 Open WebUI、LobeChat 等第三方前端，通过 API Server 模式连接。

**步骤**:

```bash
# 1. 配置 Hermes Agent 的 .env 文件
echo 'API_SERVER_ENABLED=true' >> ~/.hermes/.env
echo 'API_SERVER_KEY=your-secret-api-key' >> ~/.hermes/.env  # 可选但推荐
echo 'API_SERVER_PORT=8642' >> ~/.hermes/.env

# 2. 启动 Gateway（API Server 会随 Gateway 一起启动）
hermes gateway

# 3. 在第三方前端中配置
# API Base URL: http://localhost:8642/v1
# API Key: your-secret-api-key（如果设置了 API_SERVER_KEY）
# Model: hermes-agent
```

**Open WebUI 接入示例**:

```
Settings → Connections → OpenAI API URL: http://localhost:8642/v1
Settings → Connections → OpenAI API Key: your-secret-api-key
```

**LobeChat 接入示例**:

```
设置 → 语言模型 → OpenAI
  API 代理地址: http://localhost:8642/v1
  API Key: your-secret-api-key
  模型: hermes-agent
```

---

### 4.3 方式三：沙箱环境部署

当前项目在云端沙箱中运行，已有完整的 `.coze` 配置。

**当前沙箱配置** (`.coze`):

```toml
[dev]
build = ["bash", "-c", "cp scripts/hermes-mock.sh /usr/local/bin/hermes && chmod +x /usr/local/bin/hermes && pnpm install"]
run = ["bash", "-c", "AUTH_DISABLED=1 ... node dist/server/index.js"]

[deploy]
build = ["bash", "-c", "... pnpm install && npx vite build && node scripts/build-server.mjs"]
run = ["bash", "-c", "AUTH_DISABLED=1 ... node dist/server/index.js"]
```

**关键点**:
- 沙箱使用 mock hermes 脚本（`hermes-mock.sh`），因为真正的 Hermes Agent 需要 Python 环境
- 服务绑定在端口 5000
- 认证已禁用 (`AUTH_DISABLED=1`)
- 前端通过 Vite 构建后作为静态资源由 Koa 服务

---

## 五、核心代码路径分析

### 5.1 前端 → 后端聊天流程 (Bridge 模式)

```
1. ChatView.vue → Socket.IO emit('run', {input, session_id, ...})
2. ChatRunSocket.onConnection() → 收到 'run' 事件
3. this.handleRun() → 判断运行模式
4. handleBridgeRun() → 调用 AgentBridgeClient
5. AgentBridgeClient.chat() → 通过 IPC Socket 发送请求到 Python 进程
6. hermes_bridge.py → AgentPool.get_or_create() → AIAgent.run_conversation()
7. 流式回调: thinking_callback → delta_callback → tool_start_callback → tool_complete_callback
8. delta 通过 IPC Socket 回传 → AgentBridgeClient 接收 → Socket.IO emit('run.delta') → 前端渲染
```

### 5.2 前端 → 后端聊天流程 (API Server 模式)

```
1. ChatView.vue → Socket.IO emit('run', {input, session_id, ...})
2. ChatRunSocket.onConnection() → 收到 'run' 事件
3. this.handleRun() → 判断运行模式
4. handleApiRun() → 构造 /v1/responses 请求
5. fetch('/v1/responses', {stream: true}) → 发送到 Hermes API Server
6. APIServerAdapter → AIAgent.run_conversation()
7. SSE 事件流 → readSseFrames() 解析 → applyResponseStreamEvent() 处理
8. Socket.IO emit('run.delta') → 前端渲染
```

### 5.3 Agent 运行模式判断

WebUI 的 `ChatRunSocket` 在 `handleRun()` 中自动判断使用哪种模式：
- **Bridge 模式**: 当 `resolveRunSource()` 返回 `'cli'` 时（即本地有 Hermes Agent 可用且前端选择 CLI 来源）
- **API Server 模式**: 当 `resolveRunSource()` 返回非 `'cli'` 时，通过 HTTP 代理请求

---

## 六、Bridge 模式连接状态检查报告

### 6.1 当前沙箱环境 Bridge 连接状态

| 检查项 | 状态 | 详情 |
|--------|------|------|
| hermes 命令可用性 | ✅ 已就绪 | `/usr/local/bin/hermes` (Python CLI wrapper) |
| Python3 可用性 | ✅ 已就绪 | `/usr/bin/python3` |
| hermes-agent 源码 | ✅ 已就绪 | `/workspace/projects/hermes-agent/run_agent.py` 存在 |
| Bridge Socket 监听 | ✅ 已运行 | `ipc:///tmp/hermes-agent-bridge.sock` LISTEN |
| Bridge Broker 进程 | ✅ 已运行 | PID 10649, mode=broker |
| Bridge Worker 进程 | ✅ 已运行 | PID 10865, profile=default |
| WebUI 服务器 | ✅ 已运行 | 端口 5000, http://localhost:5000 |
| AgentBridgeManager 启动 | ✅ 已完成 | bootstrap 日志: `[agent-bridge] ready at ipc:///tmp/hermes-agent-bridge.sock` |
| Bridge ping 响应 | ✅ 正常 | `{"ok": true, "pong": true, "mode": "broker", "workers": {"default": true}}` |
| ChatRunSocket 初始化 | ✅ 已完成 | Socket.IO ready at `/chat-run` |
| LLM Provider 配置 | ❌ **未配置** | 无任何 API Key (OPENROUTER_API_KEY 等) |
| hermes config.yaml | ❌ **不存在** | `/root/.hermes/config.yaml` 缺失 |
| Chat 请求响应 | ❌ **失败** | "No inference provider configured. Run 'hermes model' to choose a provider" |

### 6.2 Bridge 连接架构验证

```
┌──────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Web UI (Koa)    │     │  Agent Bridge Broker  │     │  Bridge Worker     │
│  PID 10549       │     │  PID 10649            │     │  PID 10865         │
│  Port 5000       │────▶│  Unix Socket .sock    │────▶│  Worker Socket     │
│  Socket.IO       │     │  mode: broker         │     │  profile: default  │
│  /chat-run       │     │  auto-restart: on     │     │  status: ready     │
└──────────────────┘     └──────────────────────┘     └────────┬───────────┘
                                                                │
                                                                ▼
                                                        ┌───────────────┐
                                                        │  AIAgent      │
                                                        │  run_agent.py │
                                                        │               │
                                                        │  ❌ 无 LLM    │
                                                        │  Provider     │
                                                        └───────────────┘
```

**结论**: Bridge 模式的 **传输层已完全打通**（Socket 连接、Broker/Worker 进程、请求路由均正常），但 **业务层被阻塞**——缺少 LLM Provider 配置导致 Agent 无法执行推理。

### 6.3 未完成项清单

| # | 缺失项 | 严重程度 | 说明 |
|---|--------|----------|------|
| 1 | LLM API Key | **P0-阻塞** | 至少需要配置一个 Provider (OpenRouter/Novita/Google/OpenAI 等) |
| 2 | config.yaml | **P1-重要** | 需要配置默认模型 (`model.default`) |
| 3 | hermes model 初始化 | **P1-重要** | 运行 `hermes model` 或 `hermes setup` 完成模型选择 |

### 6.4 修复步骤

```bash
# Step 1: 配置 LLM Provider API Key (至少选一个)
# 方式 A: OpenRouter (推荐，一个 Key 访问多个模型)
echo 'OPENROUTER_API_KEY=sk-or-v1-xxxxx' >> ~/.hermes/.env

# 方式 B: NovitaAI
echo 'NOVITA_API_KEY=xxxxx' >> ~/.hermes/.env

# 方式 C: Google AI Studio / Gemini
echo 'GOOGLE_API_KEY=xxxxx' >> ~/.hermes/.env

# Step 2: 创建 config.yaml 并配置默认模型
mkdir -p ~/.hermes
cat > ~/.hermes/config.yaml << 'EOF'
model:
  default: "anthropic/claude-opus-4.6"  # 或其他你选择的模型
EOF

# Step 3: 验证 Bridge Chat 功能
# 通过 Bridge Socket 发送 ping 测试
python3 -c "
import socket, json
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/tmp/hermes-agent-bridge.sock')
sock.settimeout(5)
sock.sendall((json.dumps({'action': 'ping'}) + '\n').encode())
data = b''
while True:
    chunk = sock.recv(4096)
    if not chunk: break
    data += chunk
    if b'\n' in data: break
print(data.decode().strip())
sock.close()
"

# Step 4: 在 Web UI 中发起聊天测试
# 浏览器打开 Web UI，发送一条消息
# 如果配置正确，应能看到 Agent 的流式响应
```

### 6.5 Bridge 模式完整数据流验证清单

以下是从 Web UI 前端发起聊天到 Agent 响应的完整链路，逐层验证：

| 层次 | 路径 | 当前状态 |
|------|------|----------|
| L1: 浏览器 → Koa | HTTP/Socket.IO → `localhost:5000` | ✅ 正常 |
| L2: Koa → ChatRunSocket | Socket.IO `/chat-run` namespace | ✅ 已初始化 |
| L3: ChatRunSocket → handleBridgeRun | `resolveRunSource() === 'cli'` → Bridge path | ✅ 代码就绪 |
| L4: AgentBridgeClient → Broker Socket | `ipc:///tmp/hermes-agent-bridge.sock` | ✅ 连通 |
| L5: Broker → Worker | Worker Socket (per-profile) | ✅ Worker ready |
| L6: Worker → AIAgent | `run_agent.py` → LLM API 调用 | ❌ **API Key 缺失** |
| L7: AIAgent → 流式响应 | delta/event 回传 | ❌ **上游阻塞** |
| L8: Bridge → Socket.IO → 浏览器 | run.delta/run.complete 事件 | ❌ **上游阻塞** |

---

## 七、配置要点

### 7.1 Hermes Agent 侧配置 (`~/.hermes/config.yaml`)

```yaml
# 模型配置
model:
  default: "anthropic/claude-opus-4.6"  # 或其他模型

# 网关配置
gateway:
  api_server:
    enabled: true
    host: "127.0.0.1"
    port: 8642
    key: "your-api-key"           # API 认证密钥
    cors_origins: "*"             # CORS 来源
    model_name: "hermes-agent"    # 对外暴露的模型名称

# 工具集配置
platform_toolsets:
  api_server:
    - core
    - web_search
    - file_operations
```

### 7.2 Hermes Agent 侧环境变量 (`~/.hermes/.env`)

```bash
# LLM Provider（至少配置一个）
OPENROUTER_API_KEY=sk-or-...
# 或其他 Provider 密钥

# API Server
API_SERVER_ENABLED=true
API_SERVER_KEY=your-secret-api-key
API_SERVER_PORT=8642
API_SERVER_HOST=127.0.0.1
API_SERVER_CORS_ORIGINS=*
API_SERVER_MODEL_NAME=hermes-agent
```

### 7.3 Web UI 侧环境变量

```bash
PORT=5000                    # 服务端口
BIND_HOST=0.0.0.0           # 绑定地址
CORS_ORIGINS=*              # CORS
AUTH_DISABLED=1             # 禁用认证（开发环境）
HERMES_WEB_UI_HOME=~/.hermes-web-ui  # 数据目录
PROFILE=default              # 默认 Profile
GATEWAY_HOST=127.0.0.1      # Gateway 地址
```

---

## 八、启动与验证

### 8.1 完整启动流程（Bridge 模式 + 自带 Web UI）

```bash
# Step 1: 确保 Hermes Agent 已安装
hermes --version

# Step 2: 确保 Hermes Agent 已配置模型
hermes model  # 选择模型和 Provider

# Step 3: 启动 Web UI
hermes-web-ui

# Step 4: 验证
# 浏览器打开 http://localhost:8648
# 登录后在 Chat 页面发送消息
# 应能看到 Agent 的流式响应
```

### 8.2 完整启动流程（API Server 模式 + 第三方前端）

```bash
# Step 1: 配置 API Server
echo 'API_SERVER_ENABLED=true' >> ~/.hermes/.env
echo 'API_SERVER_KEY=my-secret-key' >> ~/.hermes/.env

# Step 2: 启动 Gateway
hermes gateway

# Step 3: 验证 API Server
curl http://localhost:8642/health
# 期望: {"status":"ok","platform":"hermes-agent"}

curl http://localhost:8642/v1/models -H "Authorization: Bearer my-secret-key"
# 期望: {"object":"list","data":[{"id":"hermes-agent",...}]}

# Step 4: 在第三方前端中配置并使用
# 参考 4.2 节的接入示例
```

### 8.3 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Bridge 连接失败 | hermes_bridge.py 找不到 run_agent.py | 设置 `HERMES_AGENT_ROOT` 指向 hermes-agent 目录 |
| API Server 403 | 未配置 CORS | 设置 `API_SERVER_CORS_ORIGINS=*` 或指定来源 |
| 聊天无响应 / "No inference provider" | 模型 API Key 未配置 | 运行 `hermes model` 或手动编辑 `~/.hermes/.env` 添加 API Key |
| 会话丢失 | 未传 Session ID | 在请求头中加 `X-Hermes-Session-Id` |
| 工具不可用 | 工具集未启用 | 检查 `config.yaml` 中 `platform_toolsets` 配置 |
| Bridge 自动重启循环 | Python 依赖缺失 | 检查 `hermes-agent/venv` 或安装 uv 运行器 |
| Worker 无法启动 | API Key 缺失导致 Agent 初始化失败 | 配置 LLM Provider 后重启 |

---

## 九、Bridge 模式内部机制详解

### 9.1 Broker + Worker 多进程架构

Bridge 采用 **Broker-Worker** 架构，而非简单的单进程模型：

```
AgentBridgeManager (Node.js)
  │
  ├── spawn → hermes_bridge.py (Broker, PID 10649)
  │            ├── 监听 ipc:///tmp/hermes-agent-bridge.sock
  │            ├── 管理连接路由
  │            └── fork → Worker 进程 (PID 10865)
  │                     ├── 监听 ipc:///tmp/hermes-agent-bridge-workers/<hash>.sock
  │                     ├── 按 profile 隔离
  │                     └── 加载 AIAgent 实例
  │
  └── AgentBridgeClient (Node.js)
       ├── connectSocket() → 连接到 Broker Socket
       ├── request() → 发送 newline-delimited JSON
       ├── readResponse() → 接收完整 JSON 响应
       └── streamOutput() → 轮询 get_output 获取流式 delta
```

**关键设计**:
- **Broker** 是路由层，接收所有请求并分发到对应 profile 的 Worker
- **Worker** 按 profile 隔离，每个 profile 一个 Worker 子进程
- 当前环境只有 `default` profile，因此只有一个 Worker
- Worker 通过父进程看门狗（parent watchdog）监控 Broker 存活

### 9.2 请求/响应生命周期

```
1. Client → Broker: {"action": "chat", "session_id": "xxx", "message": "..."}
2. Broker → Worker: 转发请求到对应 profile Worker
3. Worker → AIAgent: 创建或复用 AIAgent 实例，调用 run_conversation()
4. Worker → Broker: {"ok": true, "run_id": "yyy", "status": "running"}
5. Client 轮询: {"action": "get_output", "run_id": "yyy", "cursor": 0}
6. Worker → Broker → Client: {"ok": true, "delta": "Hello", "cursor": 5, "done": false}
7. Client 轮询: {"action": "get_output", "run_id": "yyy", "cursor": 5}
8. Worker → Broker → Client: {"ok": true, "delta": " world", "cursor": 11, "done": true}
```

### 9.3 流式输出机制 (chatStream)

`AgentBridgeClient.chatStream()` 是前端使用的核心流式方法：

```typescript
async *chatStream(runId, options): AsyncGenerator<AgentBridgeOutput> {
  // 1. 发送 chat 请求获取 run_id
  const started = await this.chat(sessionId, message, ...)
  // 2. 循环轮询 get_output
  for await (const chunk of this.streamOutput(started.run_id, options)) {
    // 3. 每次拿到 delta，yield 给调用方
    if (chunk.delta) await onDelta(chunk.delta, chunk)
  }
}
```

**注意**: 这不是真正的服务端推送，而是 **轮询模式**（默认 100ms 间隔），Worker 端缓冲输出，Client 端定期拉取增量。

### 9.4 自动重启机制

AgentBridgeManager 内置了自动重启逻辑：

- 当 Bridge 进程异常退出时（非 `stop()` 主动停止），触发重启
- 重启延迟指数退避：`delayMs * restartAttempts`，最大 30s
- 环境变量控制：`HERMES_AGENT_BRIDGE_AUTO_RESTART` (默认 true)
- 启动超时：`HERMES_AGENT_BRIDGE_STARTUP_TIMEOUT_MS` (默认 120s)
- 就绪判断：等待 Python 端输出 `{"event": "ready"}` JSON 行

---

## 十、扩展与集成

### 10.1 接入新的第三方前端

任何支持 OpenAI API 的前端都可接入，核心配置：

1. **API Base URL**: `http://<hermes-host>:8642/v1`
2. **API Key**: 配置的 `API_SERVER_KEY` 值
3. **Model Name**: `hermes-agent`（或自定义的 `API_SERVER_MODEL_NAME`）
4. **流式**: 支持 SSE streaming

### 10.2 多 Profile 支持

Hermes Agent 支持多 Profile（每个 Profile 有独立的模型、工具集、记忆），Web UI 通过 Profile 选择器切换：

- Profile 配置位于 `~/.hermes/profiles/<name>/`
- 每个 Profile 有独立的 `config.yaml` 和 `.env`
- Bridge Worker 按 profile 隔离，每个 profile 独立子进程
- API Server 模式下，Profile 名称会作为模型 ID 广告

### 10.3 Gateway 集成

Hermes Agent 的 Gateway 支持 15+ 平台（Telegram/Discord/Slack/微信/飞书等），API Server 是其中一个平台适配器，与其他平台共享：

- Agent 缓存与生命周期管理
- 会话持久化 (SQLite)
- 上下文压缩
- 工具调用审批流
- 用量统计

---

## 十一、关键依赖关系

```
hermes-web-ui (Node.js)
  └── packages/server/
      ├── agent-bridge/          ← Bridge 模式核心
      │   ├── manager.ts         ← 管理 Python 子进程 (Broker)
      │   ├── client.ts          ← IPC Socket 通信 + 流式轮询
      │   └── hermes_bridge.py   ← Python 侧桥接 (Broker + Worker)
      └── run-chat/              ← 聊天运行引擎
          ├── handle-bridge-run.ts  ← Bridge 模式处理
          ├── handle-api-run.ts     ← API Server 模式处理
          ├── compression.ts        ← 上下文压缩
          ├── bridge-message.ts     ← Bridge 消息持久化
          ├── bridge-delta.ts       ← Delta 过滤/处理
          ├── model-config.ts       ← 模型配置解析
          └── session-command.ts    ← 会话命令处理

hermes-agent (Python)
  ├── run_agent.py               ← AIAgent 核心类
  ├── gateway/
  │   ├── run.py                 ← Gateway 主运行器
  │   └── platforms/
  │       └── api_server.py      ← OpenAI 兼容 API 服务器
  ├── tools/                     ← 工具系统
  ├── skills/                    ← 技能系统
  └── plugins/                   ← 插件系统
```

---

## 十二、总结

### Bridge 模式连接状态：传输层 ✅ | 业务层 ❌

| 维度 | 状态 | 说明 |
|------|------|------|
| 进程管理 | ✅ 完成 | Broker + Worker 进程正常启动和监控 |
| Socket 通信 | ✅ 完成 | Unix Socket 连通，ping/pong 正常 |
| 请求路由 | ✅ 完成 | Broker → Worker 路由正常 |
| 流式输出框架 | ✅ 完成 | chatStream/streamOutput 代码完备 |
| Socket.IO 集成 | ✅ 完成 | ChatRunSocket → handleBridgeRun → AgentBridgeClient 链路完整 |
| 自动重启 | ✅ 完成 | Broker 异常退出自动重启，指数退避 |
| LLM Provider | ❌ 阻塞 | 无 API Key，Agent 无法推理 |
| 模型配置 | ❌ 缺失 | 无 config.yaml，无法确定默认模型 |
| 端到端聊天 | ❌ 阻塞 | 依赖 LLM Provider 配置 |

**一句话总结**：Bridge 模式的 **基础设施已完全搭建并运行**，唯一阻塞点是 **LLM Provider API Key 未配置**。配置好 API Key 和默认模型后，端到端聊天即可正常工作。
