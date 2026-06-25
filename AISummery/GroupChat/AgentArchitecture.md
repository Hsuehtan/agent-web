# Group Chat — Agent 架构深度分析

## 一、Agent 描述（description）在架构中的作用

### 1.1 数据来源与存储

Agent 的 `description` 字段在创建房间 Agent 时写入 `gc_room_agents` 表：

```
AgentConfig = { agentId, profile, name, description, invited }
→ 存入 gc_room_agents (id, roomId, agentId, profile, name, description, invited)
```

连接时通过 Socket.IO auth 传递：
```ts
// agent-clients.ts — AgentClient.connect()
this.socket = io(`http://127.0.0.1:${port}/group-chat`, {
    auth: {
        userId: this.agentId,
        name: this.name,
        description: this.description,  // ← 描述在连接握手时传递
        source: 'agent',
        agentSocketSecret: GROUP_CHAT_AGENT_SOCKET_SECRET,
    }
})
```

服务端接收后存入内存成员表：
```ts
// index.ts — onConnection()
const description = auth.description || ''
room.addOrUpdateMember(socketId, userId, userName, description, 'agent')
```

### 1.2 description 的三大作用

#### 作用一：构建 Agent 身份 System Prompt（最核心）

在 `context-engine/prompt.ts` 的 `buildAgentInstructions()` 中，description 成为 Agent 角色定义的核心内容：

```ts
const roleDescription = params.agentDescription?.trim()
    ? params.agentDescription
    : '专业的 AI 助手，随时准备协助解决问题。'

const basePrompt = `你是"${params.agentName}"，群聊房间"${params.roomName}"中的 AI 助手。

你的角色：${roleDescription}
...`
```

**传递链路**：
```
AgentClient.description
  → ContextEngine.buildContext({ agentDescription: this.description })
    → buildAgentInstructions({ agentDescription: ... })
      → "你的角色：${roleDescription}" 写入 instructions
        → AgentBridgeClient.chat(sessionId, input, history, instructions, profile)
          → 发送给底层 LLM 作为 system prompt 的一部分
```

#### 作用二：房间成员列表展示

description 存入 `gc_room_members` 表，前端获取房间信息时展示给用户，让用户了解每个 Agent 的定位。

#### 作用三：上下文压缩时的成员信息保留

在 `buildAgentInstructions()` 中，所有成员的 description 也会写入 instructions 的成员列表：
```ts
memberSection = uniqueMembers
    .map(m => m.description ? `- ${m.name}: ${m.description}` : `- ${m.name}`)
    .join('\n')
```

这确保 Agent 即使没有看到早期消息，也能通过 instructions 知道房间中有哪些成员及其角色。

---

## 二、多 Agent 上下文记忆机制

### 2.1 记忆架构总览

```
┌───────────────────────────────────────────────────────┐
│                    ContextEngine                       │
│  (房间级共享，非 Agent 独立)                              │
│                                                       │
│  ┌─────────────────┐   ┌──────────────────────────┐   │
│  │ gc_context_      │   │ gc_messages              │   │
│  │ snapshots        │   │ (全部房间消息)              │   │
│  │ (房间级摘要)      │   │                          │   │
│  └─────────────────┘   └──────────────────────────┘   │
│                                                       │
│  buildContext() → { conversationHistory, instructions }│
└──────────────────────┬────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
  ┌──────────────┐          ┌──────────────┐
  │ Agent A      │          │ Agent B      │
  │ sessionId:   │          │ sessionId:   │
  │ gc_roomId_   │          │ gc_roomId_   │
  │  profile_A   │          │  profile_B   │
  │  nameA_seed  │          │  nameB_seed  │
  └──────┬───────┘          └──────┬───────┘
         │                         │
         ▼                         ▼
  ┌──────────────────────────────────────┐
  │     AgentBridge (hermes_bridge.py)    │
  │  每个 sessionId 对应独立的            │
  │  LangGraph session，拥有独立的        │
  │  消息历史和检查点                     │
  └──────────────────────────────────────┘
```

### 2.2 房间级共享上下文（ContextEngine）

**关键发现：上下文压缩是房间级的，不是 Agent 级的。**

- `gc_context_snapshots` 表以 `roomId` 为主键，一个房间只有一份摘要
- `gc_messages` 表存储房间所有消息（不区分 Agent）
- `ContextEngine.buildContext()` 为所有 Agent 读取同一份 snapshot 和同一批消息

**这意味着**：所有被 @mention 的 Agent 共享相同的历史消息池和压缩摘要。

### 2.3 Agent 级独立上下文（AgentBridge Session）

虽然消息池是共享的，但每个 Agent 通过 `sessionId` 在 AgentBridge 中拥有**独立的会话状态**：

```ts
// agent-clients.ts
function groupBridgeSessionId(roomId: string, profile: string, name: string, sessionSeed: string): string {
    const raw = `gc_${roomId}_${profile}_${name}_${sessionSeed || '0'}`
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
}
```

**sessionId 的构成**：`gc_{roomId}_{profile}_{agentName}_{sessionSeed}`

- `roomId`：房间 ID
- `profile`：Hermes 配置 profile 名
- `agentName`：Agent 名称（确保不同 Agent 不同 session）
- `sessionSeed`：房间级的种子值，**清除上下文时会变更**，使旧 session 失效

**sessionSeed 变更时机**：
```ts
// 清除房间上下文时
clearRoomContext(roomId) → sessionSeed = 新随机值
// 旧 session 不再被引用，AgentBridge 中的历史成为孤儿数据
```

### 2.4 上下文构建流程（buildContext）

当 Agent 被 @mention 后，`replyToMention()` 调用 `ContextEngine.buildContext()`：

```
1. 读取 gc_context_snapshots（房间级摘要）
   ├─ 有 snapshot（Path A）：
   │   ├─ 取 snapshot 之后的新消息
   │   ├─ 估算 tokens = 摘要 tokens + 新消息 tokens
   │   ├─ 未超阈值 → 直接返回 (摘要 + 新消息)
   │   └─ 超过阈值 → 增量压缩，更新 snapshot
   └─ 无 snapshot（Path B）：
       ├─ 取全部消息
       ├─ 未超阈值 → 原样返回
       └─ 超过阈值 → 全量压缩，创建 snapshot

2. buildAgentInstructions() 生成 instructions
   - 包含 Agent 名称、角色描述、房间成员列表、群聊行为规则

3. 返回 { conversationHistory, instructions }
   - conversationHistory: [{ role, content }] 格式
   - instructions: System prompt 字符串
```

### 2.5 消息归属映射（Attribution）

所有房间消息在送入 LLM 时会做归属映射——区分"自己说的"和"别人说的"：

```ts
// agent-clients.ts — mapRoomMessageForEstimate()
private mapRoomMessageForEstimate(message: any): { role: 'user' | 'assistant'; content: string } {
    const isOwnAgent = message?.senderId === this.socket?.id || senderName === this.name
    
    // 自己发的消息 → role: 'assistant'
    // 其他人发的消息 → role: 'user'，内容前加 [发送者]: 前缀
    return {
        role: isOwnAgent ? 'assistant' : 'user',
        content: this.formatAttributedContent(senderName, String(message?.content || '')),
    }
}
```

**效果**：Agent 看到的对话历史中，自己的回复是 `assistant` 角色，其他所有人（包括用户和其他 Agent）的消息都是 `user` 角色，但通过 `[发送者]: ` 前缀区分谁说了什么。

### 2.6 Agent 是否有单独的记忆模块？

**结论：有，但是间接的、有限的。**

| 维度 | 共享（房间级） | 独立（Agent 级） |
|------|---------------|-----------------|
| 消息历史 | ✅ gc_messages 房间共享 | ❌ |
| 压缩摘要 | ✅ gc_context_snapshots 房间共享 | ❌ |
| System Prompt | ❌ 每个 Agent 不同（name + description + profile 差异） | ✅ |
| LLM Session | ❌ | ✅ 通过 sessionId 隔离 |
| 工具调用历史 | ❌ | ✅ 在 AgentBridge session 内维护 |
| Bridge 上下文缓存 | ❌ | ✅ bridgeContextCache per sessionId |
| 触发阈值/配置 | ✅ 房间级统一 | ❌ |

**核心区别**：
- **短期记忆**：共享的。所有 Agent 每次回复时都从 `gc_messages` 重建上下文，不保留各自的上一次对话状态
- **长期记忆**：隐式的。通过 `AgentBridge session` 的检查点机制，每个 Agent 的 LLM 调用链可能有内部状态积累，但这不受群聊代码直接管理
- **清除上下文**：通过 `rotateRoomSessionSeed()` 使所有 Agent 的旧 session 同时失效，**不存在单独清除某个 Agent 记忆的机制**

---

## 三、Agent 回复触发机制

### 3.1 触发入口：@mention 解析

用户或 Agent 发送消息时，服务端在 `handleMessage()` 中判断是否需要路由 mentions：

```ts
// index.ts — handleMessage()
const shouldRouteMentions = savedMsg.role === 'user'

if (shouldRouteMentions) {
    this.agentClients.processMentions(roomId, {
        content: contentToText(savedMsg.content),
        input: Array.isArray(data.content) ? data.content : undefined,
        senderName: savedMsg.senderName,
        senderId: savedMsg.senderId,
        timestamp: savedMsg.timestamp,
        mentionDepth,
    })
}
```

**注意**：只有 `role === 'user'` 的消息才会触发 mention 路由。Agent 自己的消息（`role === 'assistant'`）不会自动触发其他 Agent。但 Agent 可以在回复中写 `@某个成员`，该回复会被存入 gc_messages，用户看到后如果手动转发或引用，才会再次触发。

### 3.2 Mention 解析算法（mention-routing.ts）

```ts
// 解析 @名字 或 @all
resolveMentionTargets(agents, content, senderId)
  ├─ @all → 返回房间内所有 Agent（排除发送者自身）
  └─ @AgentName → 返回名字匹配的 Agent（排除发送者自身）
```

**匹配规则**：
- 大小写不敏感
- 需满足边界条件：`@` 前必须是空白/括号/行首，名字后必须是空白/标点/行尾
- 自动排除发送者自己（防止 Agent 自己 @自己 导致循环）

### 3.3 提及队列与并发控制

```ts
// agent-clients.ts — AgentClients
private _processingRooms = new Set<string>()  // 正在处理的 agentKey
private _mentionQueue = new Map<string, Array<{ agent: AgentClient; msg: MentionMessage }>>()

// agentKey 格式：`${roomId}:${agent.name}`
```

**并发策略**：
1. 同一个 Agent 同一时间只能处理一个 mention
2. 如果 Agent 正在回复中，新的 mention 会进入该 Agent 的专属队列
3. 队列排空时**只处理最后一条**（丢弃中间过时的 mention）
4. **不同 Agent 之间是并行处理的**——@all 时所有 Agent 同时开始回复

```
时间线示例：
  t0: 用户发送 "@A @B 帮我分析一下"
  t1: A 和 B 同时开始回复（并行）
  t2: 用户又发 "@A 再补充一下"  → A 正在处理，入队
  t3: A 回复完成 → 排空队列，处理最新的 "@A 再补充一下"
```

### 3.4 Agent 间接力机制

Agent 可以在回复中 `@另一个Agent`，但这个 @mention **不会自动触发路由**（因为 Agent 回复的 role 是 `assistant`，`shouldRouteMentions` 为 false）。

那 Agent 间如何接力？**通过群聊 instructions 中的规则引导**：

```
instructions 中的规则：
- 群聊系统支持 agent 之间通过 @名字 接力：
  当你在回复中写出 @某个成员，系统会把消息路由给对应成员。
- 如果用户明确要求你叫、让、请某个 agent 执行任务，
  请直接用 @名字 转交任务。
```

但实际上，当前的 `shouldRouteMentions` 逻辑只对 `role === 'user'` 的消息触发路由。**Agent 回复中的 @mention 并不会自动触发接力**。这是当前架构的一个设计限制。

### 3.5 mentionDepth 防循环

每次 Agent 回复会递增 `mentionDepth`：

```ts
function nextMentionDepth(msg: MentionMessage): number {
    return Math.max(0, msg.mentionDepth || 0) + 1
}
```

虽然代码中记录了 depth，但当前**没有基于 depth 的硬性截断逻辑**。防循环主要依赖：
1. Agent 只处理 `role === 'user'` 的消息
2. `resolveMentionTargets()` 排除发送者自身
3. Instructions 中明确要求"不要主动 @ 任何人"

---

## 四、Agent 生命周期

### 4.1 创建与加入

```
1. 用户通过 CreateRoomForm 添加 Agent
   → POST /api/hermes/group-chat/rooms/:roomId/agents
   → ChatStorage.addRoomAgent(roomId, agentId, profile, name, description, invited)

2. 服务端创建 AgentClient 并连接
   → AgentClients.createAgent(config)
     → new AgentClient(config)
     → client.connect(port) — 建立 Socket.IO 连接
     → client.setContextEngine(engine)
     → client.setStorage(storage)

3. 加入房间
   → AgentClients.addAgentToRoom(roomId, client)
     → client.joinRoom(roomId) — Socket.IO join
     → rooms Map 中注册
```

### 4.2 恢复机制

服务启动时，`GroupChatServer.restoreAgents()` 从数据库恢复所有 Agent：

```ts
for (const room of rooms) {
    const agents = this.storage.getRoomAgents(room.id)
    for (const agent of agents) {
        const client = await this.agentClients.createAgent({
            agentId: agent.agentId,
            profile: agent.profile,
            name: agent.name,
            description: agent.description,
            invited: agent.invited,
        })
        await this.agentClients.addAgentToRoom(room.id, client)
    }
}
```

Agent Socket.IO 配置了自动重连：
```ts
reconnection: true,
reconnectionAttempts: Infinity,
reconnectionDelay: 1000,
reconnectionDelayMax: 30000,
```

重连后自动重新加入所有房间：
```ts
s.io.on('reconnect', async () => {
    for (const roomId of this.joinedRooms) {
        await this.joinRoom(roomId)
    }
})
```

### 4.3 中断

用户可以中断正在回复的 Agent：
```ts
AgentClients.interruptAgent(roomId, agentName)
  → AgentClient.interrupt(roomId)
    → AgentBridgeClient.interrupt(sessionId, reason, profile)
    → stopTyping(roomId)
    → emitContextStatus(roomId, 'ready')
  → 清空该 Agent 的 mention 队列
```

---

## 五、关键设计总结

| 设计决策 | 现状 | 影响 |
|---------|------|------|
| 上下文是房间级共享 | ✅ 单一 snapshot，单一消息池 | 所有 Agent 看到相同的历史上下文 |
| Agent 通过 sessionId 隔离 LLM 会话 | ✅ `gc_{room}_{profile}_{name}_{seed}` | 不同 Agent 在 AgentBridge 中有独立状态 |
| 只有 user 角色消息触发 mention 路由 | ✅ `shouldRouteMentions = role === 'user'` | Agent 回复中的 @不会自动触发接力 |
| mention 队列只保留最新一条 | ✅ 丢弃中间过时消息 | 避免重复回复，但可能丢失中间意图 |
| 清除上下文使所有 Agent session 失效 | ✅ rotateRoomSessionSeed() | 无法单独清除某个 Agent 的记忆 |
| Agent description 写入 System Prompt | ✅ "你的角色：${description}" | description 直接影响 Agent 的行为定位 |
| 成员描述也写入 instructions | ✅ memberSection 带 description | Agent 能感知其他成员的角色 |

### 潜在改进方向

1. **Agent 间自动接力**：当前 `shouldRouteMentions` 限制了只有 user 消息触发路由，如果允许 assistant 消息也触发，可以实现真正的 Agent 间协作链
2. **Agent 级独立上下文**：当前 snapshot 是房间级的，如果为每个 Agent 维护独立的 snapshot，可以实现差异化上下文窗口
3. **基于 mentionDepth 的硬截断**：防止极端情况下 Agent 间 @链无限延伸
4. **单独清除 Agent 记忆**：当前清除是全局的，缺少针对单个 Agent 的记忆重置
