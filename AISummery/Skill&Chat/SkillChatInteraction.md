# Skill 与 Chat 交互机制

## 1. 概述

Skill 系统和 Chat 系统的交互主要体现在：Agent 在对话过程中通过工具调用加载技能、技能内容注入系统提示词、以及前端技能管理界面与对话的联动。

---

## 2. 交互链路总览

```
┌───────────────────────────────────────────────────────────────┐
│                         前端                                   │
│  ┌──────────────┐                      ┌───────────────────┐  │
│  │  SkillsView  │  独立管理界面         │    ChatView       │  │
│  │  (浏览/管理) │◄──启用/禁用/Pin──▶   │   (对话交互)     │  │
│  └──────┬───────┘                      └────────┬──────────┘  │
│         │                                       │             │
│  fetchSkills()                          startRunViaSocket()   │
│  toggleSkill()                                   │             │
│  fetchSkillContent()                             │             │
└─────────┼───────────────────────────────────────┼─────────────┘
          │                                       │
          ▼                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js 服务端                              │
│  ┌─────────────────┐              ┌─────────────────────┐   │
│  │  skills routes  │              │  ChatRunSocket      │   │
│  │  (CRUD API)     │              │  (Socket.IO)        │   │
│  └────────┬────────┘              └──────────┬──────────┘   │
│           │                                  │              │
│  ~/.hermes/skills/                 handleBridgeRun()        │
│  (文件系统读写)                    handleApiRun()           │
└───────────┼──────────────────────────────────┼──────────────┘
            │                                  │
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Python Agent                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              prompt_builder.py                       │   │
│  │  build_skills_system_prompt()                        │   │
│  │  ↓                                                   │   │
│  │  扫描 ~/.hermes/skills/ → 构建技能索引 → 写入系统提示词│   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           conversation_loop.py                       │   │
│  │  Agent 对话循环                                       │   │
│  │  ↓                                                   │   │
│  │  skills_list() → 发现可用技能                         │   │
│  │  skill_view("name") → 加载技能完整内容                │   │
│  │  skill_manage() → 创建/编辑/删除技能                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 三条核心交互路径

### 3.1 路径一：系统提示词注入（被动路径）

**触发时机**：每次 Chat Run 启动前

**流程**：
1. `ChatRunSocket.handleRun()` 调用 `getSystemPrompt()` 获取系统提示词
2. 或 `handleApiRun()` 中组装 `fullInstructions = getSystemPrompt() + customInstructions`
3. Python Agent 端：`run_agent.py` 调用 `build_skills_system_prompt()` 
4. `prompt_builder.py` 扫描 `~/.hermes/skills/` 目录下所有 SKILL.md
5. 解析 frontmatter，过滤禁用的技能和平台不兼容的技能
6. 构建紧凑的技能索引：`/skill-name: description` 格式
7. 索引写入系统提示词的技能部分

**关键代码**：
```python
# agent/prompt_builder.py
def build_skills_system_prompt(available_tools, available_toolsets) -> str:
    # 双层缓存：LRU 内存 + 磁盘快照
    # 扫描技能目录 → 过滤 → 按分类组织 → 格式化为紧凑索引
```

**效果**：Agent 在对话开始时就"知道"有哪些技能可用，但不会占用过多 token（只包含 name + description）。

### 3.2 路径二：工具调用加载（主动路径）

**触发时机**：Agent 在对话中决定使用某个技能

**流程**：
1. Agent 在系统提示词中看到技能索引
2. 用户请求需要特定技能 → Agent 调用 `skills_list()` 获取完整列表
3. Agent 调用 `skill_view("skill-name")` 加载技能的 SKILL.md 完整内容
4. `skills_tool.py` 读取文件、解析 frontmatter、执行预处理
5. 预处理包括：
   - 模板变量替换：`${HERMES_SKILL_DIR}` → 实际路径
   - 内联 Shell 执行：`!`date +%Y-%m-%d`` → 实际日期
   - 环境变量检查：缺失时触发 `setup` 流程
6. 技能内容作为 `skill_view` 工具的返回值，注入到 Agent 的上下文中
7. Agent 按照技能指令执行任务

**工具注册链**：
```python
# tools/skills_tool.py → registry.register()
# toolsets.py → "skills" 工具集
# model_tools.py → get_tool_definitions() → 包含在 Agent 可用工具列表中
```

### 3.3 路径三：斜杠命令快速加载

**触发时机**：用户在 Chat 输入框输入 `/skill-name`

**流程**：
1. 用户输入 `/research` 等斜杠命令
2. `skill_commands.py` 解析命令，查找匹配的技能或技能包
3. 加载技能内容（调用 `skill_view()`）
4. 内容作为用户消息注入对话
5. Agent 直接获得技能指令，无需先调用 `skills_list()` 再 `skill_view()`

**Bundle 优先级**：如果同名存在 Bundle 和 Skill，Bundle 优先（`/<bundle-name>` 一次加载多个技能）。

---

## 4. 前端技能管理与对话的联动

### 4.1 启用/禁用技能

```
SkillsView → toggleSkill() → PUT /api/hermes/skills/toggle
                                    ↓
                          更新 config.yaml 的 skills.disabled 列表
                                    ↓
                          下次 Chat Run 时 prompt_builder 读取最新配置
                                    ↓
                          禁用的技能不再出现在系统提示词索引中
```

### 4.2 Pin 技能

```
SkillsView → pinSkillApi() → PUT /api/hermes/skills/pin
                                    ↓
                          更新 .usage.json 的 pinned 字段
                                    ↓
                          Pinned 技能受保护：不可被 Agent 删除
                          （但可以编辑内容）
```

### 4.3 技能内容浏览

```
SkillsView → fetchSkillContent() → GET /api/hermes/skills/{path}
                                        ↓
                                  读取 SKILL.md 文件内容
                                  （只读，不影响 Agent 行为）
```

### 4.4 Agent 创建/修改技能 → 前端可见

```
Chat 对话中 → Agent 调用 skill_manage(action="create")
                    ↓
            创建 ~/.hermes/skills/<name>/SKILL.md
                    ↓
            下次 SkillsView 刷新 → 新技能出现在列表中
            下次 Chat Run → 新技能出现在系统提示词索引中
```

---

## 5. 数据流向图

```
                        ┌─────────────────────┐
                        │   ~/.hermes/skills/  │
                        │   (文件系统真相源)   │
                        └──────┬──────┬───────┘
                               │      │
              ┌────────────────┘      └─────────────────┐
              ▼                                          ▼
    ┌──────────────────┐                    ┌──────────────────────┐
    │ Node.js 服务端    │                    │ Python Agent          │
    │ (Web UI 管理)    │                    │ (对话执行)            │
    │                  │                    │                       │
    │ - 列表/浏览      │                    │ - 系统提示词索引      │
    │ - 启用/禁用      │                    │ - 工具调用加载        │
    │ - Pin/归档       │                    │ - 创建/编辑/删除      │
    │ - 使用统计       │                    │ - 斜杠命令            │
    └────────┬─────────┘                    └──────────────────────┘
             │                                         │
             ▼                                         ▼
    ┌──────────────────┐                    ┌──────────────────────┐
    │ SkillsView       │                    │ ChatView             │
    │ (技能管理界面)   │                    │ (对话界面)           │
    └──────────────────┘                    └──────────────────────┘
```

---

## 6. 缓存与性能策略

### 6.1 系统提示词缓存（Python 端）

| 层级 | 实现 | 触发失效 |
|------|------|----------|
| L1 内存缓存 | LRU dict，key=(skills_dir, tools, toolsets, platform, disabled) | 新会话/工具集变更 |
| L2 磁盘快照 | `.skills_prompt_snapshot.json`，mtime+size manifest 验证 | SKILL.md 文件变更 |

### 6.2 技能目录 Hash 缓存（Node.js 端）

| 实现 | TTL | 用途 |
|------|-----|------|
| `hashCache: Map<string, {hash, mtime}>` | 60 秒 | 判断内置技能是否被用户修改（`modified` 标记） |

### 6.3 前端数据缓存

| 实现 | 说明 |
|------|------|
| Pinia store | 技能列表在 SkillsView 挂载时加载，不跨页面共享 |
| Session 事件处理器 Map | `sessionEventHandlers` 隔离多会话的流式事件 |

---

## 7. 安全机制

### 7.1 注入检测

`skills_tool.py` 中的 `_INJECTION_PATTERNS` 检测 SKILL.md 中的提示注入攻击：
- "ignore previous instructions"
- "you are now"
- "system prompt:"
- `<system>`
- 等模式

### 7.2 安全扫描

`skill_manager_tool.py` 集成 `skills_guard` 模块：
- Hub 安装的技能：始终扫描
- Agent 创建的技能：默认不扫描（可通过 `skills.guard_agent_created` 配置开启）

### 7.3 Pin 保护

Pinned 技能不可被 Agent 的 `skill_manage(action="delete")` 删除，防止意外丢失。

### 7.4 路径安全

Node.js 控制器中使用 `isPathWithin()` 确保文件读取不超出技能目录范围。

---

## 8. Profile 多租户支持

```
~/.hermes/
├── skills/                    # 默认 Profile 的技能
├── profiles/
│   ├── work/
│   │   └── skills/            # work Profile 的独立技能
│   └── personal/
│       └── skills/            # personal Profile 的独立技能
└── skill-bundles/             # 所有 Profile 共享
```

- 每个 Profile 拥有独立的技能目录
- `skill-injector` 会在所有 Profile 目录中同步内置技能
- Chat 运行时根据当前 Profile 加载对应的技能
- 系统提示词索引按 Profile 隔离
