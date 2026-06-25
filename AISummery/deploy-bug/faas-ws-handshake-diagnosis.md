# FaaS 生产环境 WebSocket 握手失败诊断报告

> 诊断日期: 2025-06-03
> 当前部署 commit: 5de0d14ac2
> 诊断方法: 使用 doctor 技能收集生产日志 + 源码分析

---

## 一、生产环境现状

### 服务启动状态: 正常

生产日志确认以下组件均正常启动:

```
[bootstrap] all stores initialized
[bootstrap] cors + bodyParser registered
[bootstrap] routes registered
[bootstrap] SPA fallback registered
[bootstrap] terminal + kanban websocket setup
[bootstrap] app.listen called
[bootstrap] GatewayManager initialized, profile=default
[bootstrap] session deleter started, profile=default
[bootstrap] profile gateways checked
[bootstrap] agent bridge started
[bootstrap] listening on 0.0.0.0:5000
```

FaaS 运行命令（含环境变量修复）:
```bash
HERMES_AGENT_ROOT=$(pwd)/dist/hermes-agent \
PYTHONPATH=$(pwd)/dist/pylibs:$(pwd)/dist/hermes-agent \
PATH=$(pwd)/dist/bin:$PATH \
node dist/server/index.js
```

### WebSocket 连接状态: 全部失败

生产日志中大量重复的 WebSocket 握手失败:

```
[FaaS System] [wsConnProxy] Dial failed,
  URL: ws://9.100.181.67:5000/api/hermes/kanban/events?board=default&token=...&profile=default,
  err: websocket: bad handshake
```

**关键观察**:
- 失败的 WebSocket 路径仅有 `/api/hermes/kanban/events`
- 每隔约 4 秒重试一次，100% 失败
- token 参数有值（JWT 格式正确），说明前端认证流程正常
- 无 terminal WebSocket 连接尝试日志
- 无 Socket.IO (EIO) 连接尝试日志
- 无 Python 模块错误日志（当前部署）

---

## 二、Bug D-5: FaaS WebSocket 代理层握手失败

### 现象

所有依赖 WebSocket 的实时功能均不可用:
- Kanban 看板事件推送: WebSocket 握手失败
- Terminal 终端: 无连接尝试（前端可能因 kanban 失败而放弃）
- Group Chat 群聊: Socket.IO 连接未尝试
- Chat 对话: 可能受下游 WebSocket 失败影响

### FaaS WebSocket 代理架构

```
浏览器 --[WSS]--> FaaS Gateway --[wsConnProxy]--> ws://9.100.181.67:5000/api/hermes/kanban/events
                                                    ↑
                                           用户函数 HTTP Server
```

1. 浏览器发起 WebSocket 升级请求到 FaaS 外部网关
2. FaaS 网关接受升级，`wsConnProxy` 组件作为中间代理
3. `wsConnProxy` 向用户函数的内部地址 `ws://9.100.181.67:5000` 发起新的 WebSocket 连接
4. 如果用户函数返回 101 Switching Protocols，代理建立双向数据管道
5. 如果用户函数返回非 101 响应，`wsConnProxy` 报告 "bad handshake"

### 根因分析

"bad handshake" (gorilla/websocket Go 库) 表示服务端返回了非 101 Switching Protocols 响应。可能的原因（按可能性排序）:

#### 可能性 1: Node.js 的 Koa 中间件拦截了 WebSocket 升级请求

**机制**: Node.js HTTP Server 在收到包含 `Upgrade: websocket` 头的请求时，应触发 `upgrade` 事件而非走普通 HTTP 请求处理流程。如果 FaaS `wsConnProxy` 发送的请求不包含正确的 WebSocket 升级头，Node.js 不会触发 `upgrade` 事件，请求会走 Koa 中间件处理，最终返回 SPA fallback HTML (200) 或 404，都不是 101。

**证据**:
- 仅 `/api/hermes/kanban/events` 路径出现握手失败，说明 FaaS 代理确实在尝试连接此路径
- 所有连接 100% 失败，说明不是偶发的认证问题，而是协议层面的不兼容
- 生产日志中无任何 Socket.IO (EIO) 相关日志，说明前端的 WebSocket 连接根本无法建立

**验证方法**: 在 kanban-events.ts 的 `upgrade` 处理器中添加日志，观察是否被触发

#### 可能性 2: 异步 upgrade 处理器中的认证函数异常

**机制**: `kanban-events.ts` 的 `upgrade` 事件处理器使用了 `async/await`:

```typescript
httpServer.on('upgrade', async (req, socket, head) => {
  // Node.js 不等待 async 函数完成
  if (await isAuthEnabled()) {
    const token = url.searchParams.get('token') || ''
    const user = await authenticateUserToken(token)
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
    // ...
  }
})
```

如果 `authenticateUserToken()` 抛出异常（而非返回 null），async 函数的 Promise 会被 reject，但没有 `.catch()` 处理。此时:
- socket 不会收到任何 HTTP 响应
- Node.js 不会崩溃（unhandled rejection）
- FaaS 代理等待超时或 socket 被 close

**但此可能性较低**，因为:
- 有 token 的请求和**无 token** 的请求都失败
- 如果是认证失败，应返回 401，gorilla/websocket 应该报 "unexpected HTTP status 401" 而非笼统的 "bad handshake"

#### 可能性 3: Socket.IO 与 raw ws 的 upgrade 处理器冲突

**机制**: Socket.IO 绑定到 HTTP Server 时会注册自己的 `upgrade` 事件监听器。如果 Socket.IO 的处理器在 kanban 处理器之前被调用，且对非 Socket.IO 路径的请求做了干扰（如写入错误响应或销毁 socket），会导致 raw ws 无法完成握手。

**验证方法**: 检查 Node.js HTTP Server 上注册的所有 `upgrade` 事件监听器的执行顺序

#### 可能性 4: FaaS 运行时环境对 HTTP Server 的 upgrade 事件支持不完整

**机制**: FaaS 运行时可能对 HTTP Server 进行了封装或代理，导致 `upgrade` 事件无法正常触发。某些 FaaS 平台需要特殊配置才能支持 WebSocket。

**证据**:
- 开发沙箱中 WebSocket 完全正常
- FaaS 环境中 100% 失败
- 这是开发与生产环境的核心差异

### 为什么开发环境不复现

- 开发环境中浏览器直接连接 Node.js HTTP Server，无 FaaS 代理层
- WebSocket 升级请求包含正确的 `Upgrade: websocket` 和 `Connection: Upgrade` 头
- Node.js 正确触发 `upgrade` 事件，raw ws 和 Socket.IO 正常握手

### 修复方向建议

1. **添加调试日志**: 在 `kanban-events.ts` 的 `upgrade` 处理器开头添加日志，确认是否被触发
2. **将 async 认证改为同步预处理**: 在 `upgrade` 事件中先同步完成 `handleUpgrade`，再在 `connection` 事件中进行异步认证
3. **添加 raw HTTP 日志**: 在 Koa 中间件最前面拦截所有请求，记录是否收到了 WebSocket 升级请求
4. **Socket.IO 兼容性测试**: 尝试通过 Socket.IO 而非 raw ws 实现 kanban 事件推送，验证 FaaS 代理层对 Socket.IO 协议的支持情况
5. **FaaS 平台 WebSocket 文档**: 确认 FaaS 平台对 WebSocket 的支持方式和配置要求

---

## 三、Bug D-6: pip install 在 FaaS 构建环境静默失败

### 现象

用户报告生产环境中 plugins 接口仍返回 500，错误为 `No module named 'yaml'`。尽管 `.coze` 的 `deploy.build` 已添加 `pip install --target=dist/pylibs` 命令，但 Python 第三方依赖实际未安装。

### 根因分析

#### 1. FaaS 构建日志显示 pip 命令输出 "Usage:"

```
[build] [runtime] 
[build] [runtime] Usage:
[build] [runtime]   pip <command> [options]
[build] [runtime] 
[build] [runtime] Commands:
[build] [runtime]   install                     Install packages.
```

这是 `pip` 无参数或参数无效时的帮助输出，说明 `pip install --target=dist/pylibs /workspace/projects/hermes-agent` 命令未正确执行。

可能的原因:
- FaaS 构建环境的 Python/pip 版本不支持 `--target` 选项
- FaaS 构建环境中 `/workspace/projects/hermes-agent` 路径不存在（代码推送可能仅包含主仓库）
- FaaS 构建系统的 shell 命令解析方式与预期不同

#### 2. 管道掩盖了 pip 的失败退出码

```bash
pip install --target=dist/pylibs /workspace/projects/hermes-agent 2>&1 | tail -5 && ...
```

`2>&1 | tail -5` 管道将 pip 的 stdout/stderr 重定向到 `tail`，但管道的退出码是**最后一个命令**（tail）的退出码。即使 pip 失败（退出码 1），`tail` 仍然成功（退出码 0），所以 `&&` 链继续执行后续的 `pnpm install`、`vite build` 等。

#### 3. dist/pylibs 目录从未创建

由于 pip install 失败:
- `dist/pylibs/` 目录不存在
- FaaS 运行时 `PYTHONPATH=$(pwd)/dist/pylibs:...` 中的路径无效
- Python 子进程无法找到 PyYAML 等第三方依赖
- `import yaml` 失败

### 为什么开发环境不复现

开发环境的 `.coze` `dev.build` 使用 `pip install -e /workspace/projects/hermes-agent`，在完整的开发沙箱中 hermes-agent 目录存在，pip 可正常执行。

### 修复方向建议

1. **修复管道掩盖退出码问题**:
   ```bash
   set -o pipefail && pip install --target=dist/pylibs /workspace/projects/hermes-agent 2>&1 | tail -5 && ...
   ```
   或改用:
   ```bash
   pip install --target=dist/pylibs /workspace/projects/hermes-agent && ...
   ```
   （不使用管道，直接检查退出码）

2. **验证 FaaS 构建环境中的路径和 pip 版本**:
   - 在构建命令中添加 `ls /workspace/projects/hermes-agent/` 确认目录存在
   - 添加 `pip --version` 确认 pip 版本支持 `--target`

3. **考虑替代方案**:
   - 在开发沙箱中预执行 `pip install --target=dist/pylibs`，将 pylibs 作为构建产物提交
   - 使用 `requirements.txt` 而非 `-e` 路径: `pip install --target=dist/pylibs -r requirements.txt`
   - 在 `build-server.mjs` 中执行 pip install（Node.js 脚本有更好的错误处理）

---

## 四、问题影响链分析

```
Bug D-6 (pip install 失败)
  → dist/pylibs 不存在
  → Python 第三方依赖缺失
  → plugins 接口返回 500
  → chat 功能报错 "No module named ..."
  → 部分核心功能不可用

Bug D-5 (WebSocket 握手失败)
  → 所有实时功能不可用 (kanban/terminal/group-chat)
  → 前端持续重试连接 (每 4 秒)
  → 用户体验: 看板不更新、终端无法连接、群聊不可用
  → 与 D-6 独立: 即使 Python 依赖修复，WebSocket 仍会失败
```

两个 Bug 相互独立但共同导致生产环境不可用:
- D-6 影响服务端逻辑（plugins/chat）
- D-5 影响实时通信层（WebSocket）

---

## 五、当前部署各功能可用性评估

| 功能 | 状态 | 原因 |
|------|------|------|
| HTTP API (非 WebSocket) | 可能可用 | 服务正常启动、监听 5000 端口 |
| 前端页面加载 | 可能可用 | SPA fallback 正常注册 |
| Agent Bridge | 正常 | 日志确认 `[bootstrap] agent bridge started` |
| Gateway Manager | 正常 | 日志确认 `GatewayManager initialized` |
| Plugins API | 可能 500 | Python 依赖可能缺失 (D-6) |
| Chat 对话 | 可能失败 | Python 依赖 + WebSocket 双重影响 |
| Kanban 看板 | 不可用 | WebSocket 握手失败 (D-5) |
| Terminal 终端 | 不可用 | WebSocket 握手失败 (D-5) + node-pty 可能未编译 (D-2) |
| Group Chat 群聊 | 不可用 | WebSocket 握手失败 (D-5) |

---

## 六、下一步行动建议

### 优先级 1: WebSocket 握手问题 (D-5)

1. 在 `kanban-events.ts` 的 `upgrade` 处理器添加调试日志:
   ```typescript
   httpServer.on('upgrade', async (req, socket, head) => {
     console.log('[kanban-ws] upgrade event received:', req.url, req.headers.upgrade, req.headers.connection)
     // ... 原有逻辑
   })
   ```

2. 在 Koa 中间件最前面添加日志:
   ```typescript
   app.use(async (ctx, next) => {
     if (ctx.path.includes('kanban')) {
       console.log('[koa] request received:', ctx.method, ctx.path, ctx.headers.upgrade)
     }
     await next()
   })
   ```

3. 部署后检查生产日志，确认:
   - `upgrade` 事件是否被触发
   - Koa 是否拦截了 WebSocket 请求
   - 请求头中是否包含 `Upgrade: websocket`

### 优先级 2: pip install 失败问题 (D-6)

1. 修复 `.coze` deploy.build 中管道掩盖退出码的问题
2. 添加路径和版本检查命令
3. 考虑将 pip install 移到 `build-server.mjs` 中执行，获得更好的错误处理
