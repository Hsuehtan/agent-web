# Debug: Socket.IO Resume Timeout

## 现象

浏览器控制台持续报错：
```
Failed to load session messages via resume: Error: resume timeout
Socket.IO run stream error: timeout
```

## 根因分析

### 直接原因

Socket.IO 连接建立失败，`resumed` 事件永远无法到达客户端，15 秒后超时。

### 根本原因

**公网域名的 CDN/反向代理不支持 WebSocket 直接升级**，而客户端 Socket.IO 的 transports 顺序配置为 `['websocket', 'polling']`。

Socket.IO v4 的连接行为：
- 当 `transports: ['websocket', 'polling']` 时，**先尝试 WebSocket 连接**
- 如果 WebSocket 握手失败（如 CDN 不支持），Socket.IO **不会自动降级到 polling**，而是直接触发 `connect_error`
- 只有 **polling 先连接成功后**，Socket.IO 才会尝试 upgrade 到 WebSocket

### 验证过程

| 测试场景 | transport 顺序 | 连接方式 | 结果 |
|----------|---------------|---------|------|
| `localhost` 直连 | `['websocket', 'polling']` | WebSocket | ✅ 成功 |
| 公网域名 + polling only | `['polling']` | Polling | ✅ 成功 |
| 公网域名 + websocket only | `['websocket']` | WebSocket | ❌ `websocket error` |
| 公网域名 + websocket 优先 | `['websocket', 'polling']` | WebSocket(失败) → **不降级** | ❌ `connect_error` |
| 公网域名 + polling 优先 | `['polling', 'websocket']` | Polling → 可能 upgrade | ✅ 成功 (399ms) |

### 影响范围

所有通过公网域名 `https://xxx.dev.coze.site` 访问的浏览器，只要 CDN/代理不支持 WebSocket 升级，就会触发此问题。本地开发环境（localhost 直连）不受影响。

## 修复方案

### 方案：调换 transports 顺序为 `['polling', 'websocket']`

这是 Socket.IO 官方推荐的兼容性最佳实践：
- **先建立 polling 连接**（所有 HTTP 代理都支持）
- **连接成功后尝试 upgrade 到 WebSocket**（如果代理支持则升级，不支持则保持 polling）

### 需要修改的文件

1. `packages/client/src/api/hermes/chat.ts` — `connectChatRun()` 函数
2. `packages/client/src/api/hermes/group-chat.ts` — Group Chat socket 连接

### 修改内容

```diff
- transports: ['websocket', 'polling'],
+ transports: ['polling', 'websocket'],
```

### 副作用评估

- **性能**：首次连接多一次 HTTP 往返（polling 握手 → upgrade），约增加 200-400ms
- **兼容性**：完全向后兼容，polling 是 Socket.IO 的基础传输
- **本地开发**：localhost 不受影响，WebSocket upgrade 仍会在连接后自动完成
- **流量**：upgrade 成功后后续通信仍走 WebSocket，无额外开销

## 其他已修复的相关问题

1. **state.db 不存在 → 500 错误** — 已通过 `stateDbExists()` 守卫修复
2. **content 非字符串 → trim() 报错** — 已通过 `normalizeContent()` 修复
3. **resumeSession 参数顺序错误** — 已修复 onError/profile 参数位置
4. **resume 事件处理器缺少 await** — `this.resumeSession(socket, sid)` 返回的 Promise 被忽略，需要 `await` 并 catch 错误

## 时间线

- 2025-05-23: 发现 resume timeout 根因（WebSocket transport 在 CDN 代理下不降级）
