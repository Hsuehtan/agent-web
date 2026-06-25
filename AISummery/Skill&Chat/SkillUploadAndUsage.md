# 技能上传与使用指南

## 一、技能来源概览

技能有三种来源（`source` 字段标识）：

| 来源 | 标识 | 说明 |
|------|------|------|
| 内置技能 | `builtin` | 随项目分发，位于 `hermes-agent/skills/`，启动时同步到 `~/.hermes/skills/` |
| Hub 安装技能 | `hub` | 从 Skills Hub（GitHub/官方仓库等）远程安装 |
| 本地技能 | `local` | 用户手动创建或 Agent 代为创建的技能 |

---

## 二、技能上传（安装）方式

### 方式 1：CLI 命令 — `hermes skills install`

**最核心的安装方式**，支持多种标识符格式：

```bash
# 从官方 Hub 安装
hermes skills install official/creative/blender-mcp

# 从 GitHub 仓库安装
hermes skills install github.com/user/repo/skill-name

# 从 URL 直接安装
hermes skills install https://example.com/skills/my-skill/SKILL.md

# 指定分类目录安装
hermes skills install official/creative/blender-mcp --category creative

# 强制重新安装
hermes skills install official/creative/blender-mcp --force

# 非 TTY 环境跳过确认（TUI/网关调用）
hermes skills install <url> --name my-skill --skip-confirm
```

**安装流程**（源码位于 `hermes_cli/skills_hub.py :: do_install`）：

```
1. 解析标识符 → 匹配来源适配器（GitHubSource / OptionalSkillSource / WellKnownSkillSource / HermesIndexSource）
2. 下载技能包（SkillBundle：SKILL.md + 支持文件）
3. 隔离到 quarantine 目录（~/.hermes/skills/.hub/quarantine/）
4. 安全扫描（skills_guard.py :: scan_skill）
5. 安装策略判定（should_allow_install → allow / ask / block）
6. 用户确认（TTY 环境交互确认；--skip-confirm 跳过）
7. 从 quarantine 移入正式目录
8. 记录到 lock.json（HubLockFile :: record_install）
9. 写入审计日志（.hub/audit.log）
```

### 方式 2：CLI 命令 — `hermes skills search` + `hermes skills browse`

先搜索/浏览再安装：

```bash
# 搜索技能
hermes skills search "image generation"

# 浏览可用技能列表（分页）
hermes skills browse --page 1 --page-size 20

# 查看技能详情
hermes skills info <identifier>
```

搜索会并行查询多个来源：
- **official**：官方 optional-skills 仓库
- **github**：GitHub 仓库中的技能
- **browse-sh**：skills.sh 索引
- **lobehub**：LobeHub 插件市场
- **claude-marketplace**：Claude 技能市场

### 方式 3：Agent 工具 — `skill_manage(action="create")`

由 Agent 在对话中直接创建技能：

```python
skill_manage(
    action="create",
    name="my-workflow",
    category="productivity",       # 可选分类
    content="""---
name: my-workflow
description: "A custom workflow for ..."
---

# My Workflow

## Steps
1. ...
2. ...
"""
)
```

**创建位置**：`~/.hermes/skills/<category>/<name>/SKILL.md`（无分类则为 `~/.hermes/skills/<name>/SKILL.md`）

**验证规则**：
- 名称：小写字母+数字+连字符+点+下划线，最长 64 字符，必须以字母/数字开头
- 内容：必须有 YAML frontmatter（`---` 包裹），包含 `name` 和 `description` 字段
- 大小限制：SKILL.md 最大 100,000 字符；支持文件最大 1 MiB
- 唯一性：不能与已有技能重名

### 方式 4：Agent 工具 — 添加支持文件

为已有技能添加参考文档、模板、脚本或资源：

```python
skill_manage(
    action="write_file",
    name="my-workflow",
    file_path="references/api-guide.md",   # 必须在 references/ templates/ scripts/ assets/ 下
    file_content="# API Guide\n..."
)
```

### 方式 5：斜杠命令 — `/skills install`

在对话中直接使用斜杠命令安装：

```
/skills install official/creative/blender-mcp
```

等同于 CLI 的 `hermes skills install`，但以非交互模式运行（自动跳过确认）。

### 方式 6：手动放置

直接在 `~/.hermes/skills/` 目录下创建技能目录和 `SKILL.md` 文件：

```
~/.hermes/skills/
└── my-custom-skill/
    ├── SKILL.md
    ├── references/
    ├── templates/
    ├── scripts/
    └── assets/
```

### 方式 7：`hermes skills tap` — 添加第三方源

```bash
# 添加 tap（第三方 GitHub 仓库作为技能源）
hermes skills tap add user/skill-repo

# 查看已添加的 taps
hermes skills tap list

# 移除 tap
hermes skills tap remove user/skill-repo
```

tap 信息存储在 `~/.hermes/skills/.hub/taps.json`。

---

## 三、技能使用方式

### 方式 1：系统提示词自动注入（被动）

**核心机制**：Agent 启动时，`prompt_builder.py` 会扫描所有已启用的技能，将其元信息注入系统提示词。当用户的问题与某技能匹配时，Agent 自动加载该技能的完整指令。

**流程**：
```
用户提问 → LLM 判断需要某技能 → 调用 skills_tool(name="xxx") → 加载完整 SKILL.md → 注入上下文 → 执行
```

**源码**：`hermes-agent/agent/prompt_builder.py` 第 997+ 行

### 方式 2：工具调用 — `skills_tool(name="xxx")`

Agent 主动查看技能内容：

```python
# 查看技能完整内容
skills_tool(name="excalidraw")

# 查看技能中的特定文件
skills_tool(name="excalidraw", file_path="references/api-examples.md")
```

**源码**：`hermes-agent/tools/skills_tool.py`

### 方式 3：斜杠命令快速加载

用户在对话中输入 `/技能名` 直接激活：

```
/excalidraw        → 加载 excalidraw 技能
/plan              → 加载 plan 技能
/skills install xxx → 安装新技能
```

**斜杠命令发现机制**（`agent/skill_commands.py :: scan_skill_commands`）：
1. 扫描 `~/.hermes/skills/` 下所有 SKILL.md
2. 解析 frontmatter 中的 `name` 字段
3. 生成 `/name` 形式的命令映射
4. 过滤掉被禁用的技能（`config.yaml :: skills.disabled`）
5. 过滤掉不兼容当前平台的技能（`frontmatter :: platforms`）

### 方式 4：Web UI 管理

前端提供技能管理页面（`SkillsView.vue`）：

| 操作 | 前端组件 | 后端 API |
|------|----------|----------|
| 浏览技能列表 | SkillList.vue | `GET /api/hermes/skills` |
| 查看技能详情 | SkillDetail.vue | `GET /api/hermes/skills/{path}` |
| 启用/禁用技能 | SkillList.vue | `PUT /api/hermes/skills/toggle` |
| 固定技能（防删除） | SkillDetail.vue | `PUT /api/hermes/skills/pin` |
| 查看支持文件 | SkillDetail.vue | `GET /api/hermes/skills/{category}/{skill}/files` |
| 查看使用统计 | SkillsUsageView.vue | `GET /api/hermes/skills/usage/stats` |

---

## 四、技能管理操作

### CLI 管理命令

```bash
# 列出已安装技能
hermes skills list

# 搜索
hermes skills search <query>

# 浏览
hermes skills browse

# 安装
hermes skills install <identifier>

# 卸载
hermes skills uninstall <name>

# 更新
hermes skills update [<name>]       # 不指定名称则更新所有

# 审计（重新安全扫描）
hermes skills audit [<name>] [--deep]

# Tap 管理
hermes skills tap add <repo>
hermes skills tap list
hermes skills tap remove <repo>
```

### Agent 管理操作

```python
skill_manage(action="create",    name="xxx", content="...", category="yyy")
skill_manage(action="edit",      name="xxx", content="...")
skill_manage(action="patch",     name="xxx", old_string="...", new_string="...")
skill_manage(action="delete",    name="xxx", absorbed_into="umbrella-skill")
skill_manage(action="write_file", name="xxx", file_path="references/guide.md", file_content="...")
skill_manage(action="remove_file", name="xxx", file_path="references/guide.md")
```

---

## 五、技能目录结构

```
~/.hermes/skills/                          # 技能根目录
├── .bundled_manifest                      # 内置技能指纹（name:hash）
├── .usage.json                            # 使用统计（view/use/patch/pinned）
├── .archive/                              # 已归档的技能
│   └── old-skill/SKILL.md
├── .hub/                                  # Hub 管理目录
│   ├── lock.json                          # 安装记录（来源/版本/路径）
│   ├── audit.log                          # 安装/卸载审计日志
│   ├── quarantine/                        # 隔离区（安装前暂存）
│   ├── taps.json                          # 第三方 tap 源
│   └── index-cache/                       # 远程索引缓存
├── creative/                              # 分类目录
│   ├── excalidraw/
│   │   ├── SKILL.md                       # 技能定义文件（必须）
│   │   ├── references/                    # 参考文档
│   │   ├── templates/                     # 模板文件
│   │   ├── scripts/                       # 可执行脚本
│   │   └── assets/                        # 静态资源
│   └── manim-video/SKILL.md
├── productivity/                          # 另一个分类
│   └── notion/SKILL.md
└── my-custom-skill/                       # 无分类的扁平技能
    └── SKILL.md
```

---

## 六、SKILL.md 文件格式

```markdown
---
name: my-skill
description: "简短描述技能的功能"
platforms: [macos, linux]          # 可选：限制运行平台
metadata:
  hermes:
    config:                        # 可选：声明需要的配置项
      - key: MY_API_KEY
        default: ""
---

# 技能标题

## 触发条件
何时使用此技能...

## 步骤
1. 第一步...
2. 第二步...

## 陷阱与注意事项
- 常见问题...

## 验证
如何确认执行成功...
```

**frontmatter 必需字段**：`name`、`description`
**frontmatter 可选字段**：`platforms`、`metadata`

---

## 七、安全机制

| 机制 | 说明 |
|------|------|
| 隔离扫描 | Hub 安装的技能先进入 quarantine，经安全扫描后才能安装 |
| 安全扫描器 | `skills_guard.py :: scan_skill` 检测危险命令、注入攻击等 |
| 安装策略 | `should_allow_install` → allow / ask / block 三级判定 |
| Agent 创建扫描 | `skills.guard_agent_created` 配置项（默认关闭）|
| 路径保护 | `isPathWithin` 防止目录穿越 |
| Pin 保护 | 被固定的技能不可被 Agent 删除（需用户手动 unpin）|
| 审计日志 | 所有 Hub 安装/卸载操作记录在 `.hub/audit.log` |
| 文件大小限制 | SKILL.md ≤ 100K 字符，支持文件 ≤ 1 MiB |
| 内容大小限制 | 单次写入内容不超过 `MAX_SKILL_CONTENT_CHARS` |

---

## 八、完整数据流

```
┌─────────────────────────────────────────────────────────────┐
│                      技能上传流程                              │
│                                                             │
│  CLI: hermes skills install <id>                            │
│  斜杠命令: /skills install <id>                              │
│  Agent: skill_manage(action="create")                       │
│  手动: 直接放入 ~/.hermes/skills/                            │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    │
│  │ 下载/创建    │───→│ 隔离扫描     │───→│ 安装到正式目录 │    │
│  └─────────────┘    └─────────────┘    └──────────────┘    │
│                            │                    │           │
│                     扫描不通过 → 拒绝安装     记录 lock.json  │
│                                              写入 audit.log │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      技能使用流程                              │
│                                                             │
│  方式1: 系统提示词自动注入                                      │
│    用户提问 → LLM 判断需要技能 → skills_tool() → 加载 → 执行   │
│                                                             │
│  方式2: 斜杠命令                                              │
│    /skill-name → scan_skill_commands() → 加载 → 执行         │
│                                                             │
│  方式3: Agent 主动查看                                        │
│    Agent 调用 skills_tool(name="xxx") → 读取 SKILL.md        │
│                                                             │
│  方式4: Web UI                                               │
│    SkillsView → GET /api/hermes/skills → 展示/切换启用        │
└─────────────────────────────────────────────────────────────┘
```

---

## 九、关键源文件索引

| 功能模块 | 文件路径 |
|----------|----------|
| CLI 安装/搜索/卸载 | `hermes-agent/hermes_cli/skills_hub.py` |
| Hub 核心库（来源适配器/锁文件/tap） | `hermes-agent/tools/skills_hub.py` |
| 安全扫描 | `hermes-agent/tools/skills_guard.py` |
| Agent 技能查看工具 | `hermes-agent/tools/skills_tool.py` |
| Agent 技能管理工具 | `hermes-agent/tools/skill_manager_tool.py` |
| 斜杠命令发现 | `hermes-agent/agent/skill_commands.py` |
| 系统提示词构建 | `hermes-agent/agent/prompt_builder.py` |
| 技能预处理 | `hermes-agent/agent/skill_preprocessing.py` |
| 技能工具集 | `hermes-agent/agent/skill_utils.py` |
| 使用统计 | `hermes-agent/tools/skill_usage.py` |
| 技能同步 | `hermes-agent/tools/skills_sync.py` |
| 后端 API 路由 | `packages/server/src/routes/hermes/skills.ts` |
| 后端 API 控制器 | `packages/server/src/controllers/hermes/skills.ts` |
| 技能注入器 | `packages/server/src/services/hermes/skill-injector.ts` |
| 前端 API 层 | `packages/client/src/api/hermes/skills.ts` |
| 前端技能列表页 | `packages/client/src/views/hermes/SkillsView.vue` |
| 前端技能统计页 | `packages/client/src/views/hermes/SkillsUsageView.vue` |
| 前端技能列表组件 | `packages/client/src/components/hermes/skills/SkillList.vue` |
| 前端技能详情组件 | `packages/client/src/components/hermes/skills/SkillDetail.vue` |
