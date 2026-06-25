# Skill 系统架构梳理

## 1. 概述

Skill 系统是 Hermes Agent 的核心能力扩展机制，允许 Agent 通过加载预定义的技能文档（SKILL.md）来获得特定领域的知识和操作指引。Skill 系统采用 **渐进式披露（Progressive Disclosure）** 架构，分为三层：

1. **元数据层**（name、description）— 通过 `skills_list` 工具获取，token 开销极小
2. **完整指令层**（SKILL.md 正文）— 通过 `skill_view` 工具按需加载
3. **关联文件层**（references、templates、scripts）— 按需加载，深度参考

---

## 2. 目录结构

### 2.1 后端 Skill 仓库

```
hermes-agent/skills/                     # 核心技能库（随项目分发）
├── creative/                            # 创意类
│   ├── DESCRIPTION.md                   # 分类描述
│   ├── excalidraw/SKILL.md              # 绘图技能
│   ├── pixel-art/SKILL.md               # 像素画技能
│   ├── popular-web-designs/SKILL.md     # 网页设计模板
│   ├── manim-video/SKILL.md             # 动画视频
│   └── ...                              # 更多子技能
├── productivity/                        # 生产力类
│   ├── google-workspace/SKILL.md
│   ├── notion/SKILL.md
│   └── ...
├── software-development/                # 软件开发类
│   ├── test-driven-development/SKILL.md
│   ├── systematic-debugging/SKILL.md
│   └── ...
├── mlops/                               # MLOps（含子分类）
│   ├── training/SKILL.md
│   ├── evaluation/lm-evaluation-harness/SKILL.md
│   └── ...
├── research/                            # 研究类
├── devops/                              # DevOps 类
├── email/                               # 邮件类
├── github/                              # GitHub 类
├── media/                               # 媒体类
└── ...（共 25+ 个分类）

hermes-agent/optional-skills/            # 可选技能库（需额外安装）
├── creative/
├── finance/
├── mlops/
├── security/
└── ...（共 18 个分类）
```

### 2.2 单个 Skill 的目录结构

```
skills/<category>/<skill-name>/
├── SKILL.md               # 主指令文件（必需）
├── references/            # 参考文档（可选）
│   ├── api.md
│   └── examples.md
├── templates/             # 输出模板（可选）
├── scripts/               # 辅助脚本（可选）
│   └── upload.py
└── assets/                # 补充资源（可选）
```

### 2.3 运行时 Skill 目录

```
~/.hermes/skills/          # 运行时唯一真相源
├── .bundled_manifest      # 内置技能 hash 清单
├── .hub/lock.json         # Hub 安装记录
├── .usage.json            # 使用统计
├── .archive/              # 已归档技能
├── <category>/<skill>/    # 各类技能
└── ...

~/.hermes/skill-bundles/   # 技能包（多技能组合）
├── backend-dev.yaml       # 示例：后端开发组合
└── ...
```

### 2.4 前端 Packages 中的 Skill

```
packages/skills/           # 随 Web UI 分发的轻量技能
├── apikey-image-gen/      # API Key 图片生成
├── grok-image-to-video/   # 图片转视频
├── hyperframes/           # 视频帧处理
├── markdown-viewer/       # Markdown 查看器
└── remotion/              # Remotion 视频制作
```

---

## 3. SKILL.md 文件格式

```yaml
---
name: skill-name              # 必需，最大 64 字符
description: Brief description # 必需，最大 1024 字符
version: 1.0.0                # 可选
license: MIT                  # 可选
platforms: [macos, linux]     # 可选，限制操作系统
prerequisites:                # 可选，运行时依赖
  env_vars: [API_KEY]         #   环境变量
  commands: [curl, jq]        #   命令行工具
setup:                        # 可选，安装引导
  help: "https://..."
  collect_secrets:
    - env_var: API_KEY
      prompt: "Enter your API key"
      secret: true
required_environment_variables:  # 可选，新格式
  - name: API_KEY
    prompt: "Enter API key"
    help: "https://..."
metadata:                     # 可选，任意键值
  hermes:
    tags: [fine-tuning, llm]
    related_skills: [peft, lora]
---

# Skill 标题

完整指令内容...
支持 ${HERMES_SKILL_DIR} 和 ${HERMES_SESSION_ID} 模板变量
支持 !`shell command` 内联 Shell 执行
```

---

## 4. 后端核心模块

### 4.1 Python 端（hermes-agent）

| 文件 | 职责 |
|------|------|
| `tools/skills_tool.py` | **技能查看工具** — 提供 `skills_list` 和 `skill_view` 两个 Agent 工具。`skills_list` 返回元数据列表；`skill_view` 加载完整 SKILL.md 内容。处理 frontmatter 解析、平台兼容性检查、环境变量捕获、注入检测 |
| `tools/skill_manager_tool.py` | **技能管理工具** — 提供 `skill_manage` Agent 工具，支持 create/edit/patch/delete/write_file/remove_file 操作。包含安全扫描、Pin 保护、archive 逻辑 |
| `agent/skill_utils.py` | **技能元数据工具集** — 共享的 frontmatter 解析、平台过滤、排除目录列表、YAML 加载、索引文件遍历。被 prompt_builder 和 skills_tool 共同依赖 |
| `agent/skill_preprocessing.py` | **SKILL.md 预处理** — 模板变量替换（`${HERMES_SKILL_DIR}`、`${HERMES_SESSION_ID}`）、内联 Shell 执行（`!`command``）|
| `agent/skill_commands.py` | **斜杠命令处理** — 将 `/skill-name` 形式的用户输入解析为技能加载请求，由 CLI 和 Gateway 共用 |
| `agent/skill_bundles.py` | **技能包管理** — YAML 定义的多技能组合，`/<bundle-name>` 一次加载多个技能。Bundle 优先级高于同名 Skill |
| `agent/prompt_builder.py` | **系统提示词构建** — `build_skills_system_prompt()` 将所有可用技能的索引写入系统提示词。使用双层缓存：LRU 内存缓存 + 磁盘快照 |
| `toolsets.py` | **工具集定义** — `skills` 工具集包含 `skills_list`/`skill_view`/`skill_manage` 三个工具，作为核心工具集的一部分 |
| `model_tools.py` | **工具注册与调度** — 触发工具发现、注册、分发。提供 `get_tool_definitions()` 和 `handle_function_call()` 接口 |

### 4.2 Node.js 端（packages/server）

| 文件 | 职责 |
|------|------|
| `services/hermes/skill-injector.ts` | **技能注入器** — 将 `packages/skills/` 下的内置技能同步到 `~/.hermes/skills/` 目录。支持多 Profile 注入，自动检测源目录 |
| `routes/hermes/skills.ts` | **HTTP 路由** — 定义技能相关 API 端点 |
| `controllers/hermes/skills.ts` | **控制器** — 实现技能列表、文件浏览、内容读取、启用/禁用切换、Pin 操作、使用统计等逻辑 |

---

## 5. 前端架构

### 5.1 页面与组件

| 文件 | 职责 |
|------|------|
| `views/hermes/SkillsView.vue` | **技能管理主页面** — 左侧分类+技能列表，右侧技能详情。支持搜索、来源过滤（builtin/hub/local/modified）、移动端响应式 |
| `views/hermes/SkillsUsageView.vue` | **技能使用统计页面** |
| `components/hermes/skills/SkillList.vue` | **技能列表组件** — 按分类展示，支持折叠、搜索、来源过滤、启用/禁用开关 |
| `components/hermes/skills/SkillDetail.vue` | **技能详情组件** — SKILL.md 内容渲染（MarkdownRenderer）、关联文件浏览与查看、Pin 操作 |

### 5.2 API 层

| 文件 | 职责 |
|------|------|
| `api/hermes/skills.ts` | **技能 API 客户端** — 定义 `SkillInfo`/`SkillCategory`/`SkillUsageStats` 等类型，封装 `fetchSkills()`/`fetchSkillContent()`/`fetchSkillFiles()`/`toggleSkill()`/`pinSkillApi()` 等接口 |

### 5.3 API 端点映射

| 前端方法 | HTTP 端点 | 说明 |
|----------|-----------|------|
| `fetchSkills()` | `GET /api/hermes/skills` | 获取技能分类列表 |
| `fetchSkillUsageStats()` | `GET /api/hermes/skills/usage/stats` | 获取使用统计 |
| `toggleSkill()` | `PUT /api/hermes/skills/toggle` | 启用/禁用技能 |
| `pinSkillApi()` | `PUT /api/hermes/skills/pin` | Pin/Unpin 技能 |
| `fetchSkillFiles()` | `GET /api/hermes/skills/:category/:skill/files` | 获取技能文件列表 |
| `fetchSkillContent()` | `GET /api/hermes/skills/{*path}` | 读取技能文件内容 |

---

## 6. Skill 来源与生命周期

```
                    ┌─────────────────┐
                    │  packages/skills │  (Web UI 分发包)
                    └────────┬────────┘
                             │ skill-injector 同步
                             ▼
┌──────────┐    ┌──────────────────────┐    ┌─────────────┐
│ Bundled  │───▶│  ~/.hermes/skills/   │◀───│  Hub 安装   │
│ (内置)   │    │  (运行时唯一真相源)  │    │  (远程下载)  │
└──────────┘    └──────────┬───────────┘    └─────────────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
           Agent 创建   Profile 隔离   归档
           (skill_manage) (各 profile   (.archive/)
                         独立 skills 目录)
```

**Skill 来源标识**：
- `builtin` — 来自内置分发（通过 `.bundled_manifest` 匹配）
- `hub` — 来自 Hub 安装（通过 `.hub/lock.json` 匹配）
- `local` — 本地创建/自定义

**技能状态流转**：
1. **注入**：`skill-injector` 将内置技能同步到 `~/.hermes/skills/`
2. **发现**：`prompt_builder` 扫描技能目录，构建系统提示词中的技能索引
3. **加载**：Agent 通过 `skills_list` → `skill_view` 渐进式加载
4. **管理**：Agent 通过 `skill_manage` 创建/编辑/删除技能
5. **归档**：不再需要的技能移入 `.archive/`
6. **使用统计**：`.usage.json` 记录 view_count/use_count/patch_count/pinned
