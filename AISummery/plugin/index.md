# Hermes 插件系统 (Plugin System) 全景梳理

---

## 一、架构总览

Hermes 插件系统是一个完整的 **发现-加载-注册-生命周期管理** 框架，允许第三方扩展在不修改核心代码的情况下接入 Agent 的工具、钩子、平台适配、模型提供者、LLM 调用等能力。

### 核心文件清单

| 层级 | 文件路径 | 职责 |
|------|---------|------|
| **核心引擎** | `hermes-agent/hermes_cli/plugins.py` | 插件发现、加载、PluginManager、PluginContext、生命周期钩子 |
| **CLI 命令** | `hermes-agent/hermes_cli/codex_runtime_plugin_migration.py` | `hermes plugins install/update/remove/enable/disable/list` 命令实现 |
| **LLM 门面** | `hermes-agent/agent/plugin_llm.py` | 插件可用的 host-owned LLM 调用能力（含信任门控） |
| **Codex 迁移** | `hermes-agent/hermes_cli/codex_runtime_plugin_migration.py` | 将 Hermes MCP 配置和 Codex 原生插件迁移到 `~/.codex/config.toml` |
| **后端 API** | `packages/server/src/services/hermes/plugins.ts` | Python Bridge 执行插件发现，返回结构化 JSON |
| | `packages/server/src/controllers/hermes/plugins.ts` | Koa Controller，调用 service |
| | `packages/server/src/routes/hermes/plugins.ts` | 路由注册 `GET /api/hermes/plugins` |
| **前端 API** | `packages/client/src/api/hermes/plugins.ts` | 前端 HTTP 请求封装，类型定义 |
| **前端视图** | `packages/client/src/views/hermes/PluginsView.vue` | 插件管理页面（列表、筛选、状态、CLI 命令提示） |
| **插件包** | `hermes-agent/plugins/` | 所有内置插件的根目录 |

---

## 二、插件来源与发现机制

### 2.1 四大来源（优先级从低到高，后者覆盖前者）

| 优先级 | 来源 | 路径 | 说明 |
|--------|------|------|------|
| 1 | **Bundled 插件** | `<repo>/plugins/<name>/` | 随 hermes-agent 仓库分发，只读 |
| 2 | **User 插件** | `~/.hermes/plugins/<name>/` | 用户通过 `hermes plugins install` 安装 |
| 3 | **Project 插件** | `./.hermes/plugins/<name>/` | 需 `HERMES_ENABLE_PROJECT_PLUGINS=1` 开启 |
| 4 | **Pip/Entrypoint 插件** | Python `hermes_agent.plugins` entry-point 组 | pip 安装的 Python 包 |

### 2.2 发现流程（`PluginManager.discover_and_load`）

```
discover_and_load()
  │
  ├── 1. 扫描 Bundled 插件
  │     ├── _scan_directory(repo_plugins, skip_names={"memory","context_engine","platforms","model-providers"})
  │     └── _scan_directory(repo_plugins / "platforms")   # 平台适配器单独扫描
  │
  ├── 2. 扫描 User 插件
  │     └── _scan_directory(~/.hermes/plugins/)
  │
  ├── 3. 扫描 Project 插件（条件开启）
  │     └── _scan_directory(./.hermes/plugins/)  # 仅当 HERMES_ENABLE_PROJECT_PLUGINS=1
  │
  ├── 4. 扫描 Pip Entrypoint 插件
  │     └── _scan_entry_points()  # importlib.metadata.entry_points()
  │
  ├── 5. 去重：同 key 的插件后者覆盖前者（user > bundled）
  │
  └── 6. 逐个判断加载策略
        ├── disabled 列表 → 跳过
        ├── kind=exclusive → 跳过（由 category 自己发现）
        ├── kind=model-provider → 记录但不加载（由 providers/ 自己发现）
        ├── bundled + kind=backend/platform → 自动加载
        └── 其他 → 需要 plugins.enabled 白名单才加载
```

### 2.3 目录扫描细节

支持两种布局，可混用：

- **扁平布局**: `<root>/disk-cleanup/plugin.yaml` → key = `disk-cleanup`
- **分类布局**: `<root>/image_gen/openai/plugin.yaml` → key = `image_gen/openai`（深度上限 2 层）

没有 `plugin.yaml` 的子目录会被当作分类命名空间，递归进入一层继续扫描。

---

## 三、插件清单与分类

### 3.1 插件 Kind 类型

| Kind | 说明 | 加载策略 |
|------|------|---------|
| `standalone` | 独立插件，注册自己的工具/钩子 | 需要 `plugins.enabled` 白名单 |
| `backend` | 某核心工具的可插拔后端（如 image_gen） | bundled 自动加载；user 安装的需要白名单 |
| `exclusive` | 同一分类只能有一个活跃提供者（如 memory） | 由 `<category>.provider` 配置选择，不由通用加载器加载 |
| `platform` | Gateway 消息平台适配器（如 IRC、Discord） | bundled 自动加载；user 安装的需要白名单 |
| `model-provider` | 模型提供者（如 Anthropic、OpenAI） | 由 `providers/__init__.py` 自己发现，通用加载器只记录 |

### 3.2 内置插件完整清单

#### Browser（浏览器后端）
| Key | 名称 | 说明 |
|-----|------|------|
| `browser/browser_use` | browser_use | Browser Use 自动化浏览器 |
| `browser/browserbase` | browserbase | BrowserBase 云浏览器 |
| `browser/firecrawl` | Firecrawl | Firecrawl 云浏览器（与 web/firecrawl 共享 API Key） |

#### Image Gen（图像生成后端）
| Key | 名称 | Kind | 需要 ENV |
|-----|------|------|---------|
| `image_gen/openai` | OpenAI | backend | `OPENAI_API_KEY` |
| `image_gen/openai-codex` | OpenAI Codex | backend | - |
| `image_gen/fal` | fal.ai | backend | - |
| `image_gen/xai` | xAI Grok | backend | - |

#### Video Gen（视频生成后端）
| Key | 名称 | Kind |
|-----|------|------|
| `video_gen/fal` | fal.ai | backend |
| `video_gen/xai` | xAI Grok | backend |

#### Memory（记忆提供者 — exclusive）
| Key | 名称 | 说明 |
|-----|------|------|
| `memory/mem0` | Mem0 | 服务端 LLM 事实提取 + 语义搜索 |
| `memory/byterover` | ByteRover | - |
| `memory/hindsight` | Hindsight | - |
| `memory/holographic` | Holographic | - |
| `memory/honcho` | Honcho | - |
| `memory/openviking` | OpenViking | - |
| `memory/retaindb` | RetainDB | - |
| `memory/supermemory` | SuperMemory | - |

#### Model Providers（模型提供者 — model-provider）
| Key | 名称 | 说明 |
|-----|------|------|
| `model-providers/anthropic` | Anthropic (Claude) | - |
| `model-providers/openai-codex` | OpenAI Codex | - |
| `model-providers/openrouter` | OpenRouter | - |
| `model-providers/gemini` | Google Gemini | - |
| `model-providers/deepseek` | DeepSeek | - |
| `model-providers/xai` | xAI | - |
| `model-providers/bedrock` | AWS Bedrock | - |
| `model-providers/azure-foundry` | Azure Foundry | - |
| `model-providers/alibaba` | Alibaba (通义) | - |
| `model-providers/alibaba-coding-plan` | Alibaba Coding Plan | - |
| `model-providers/kimi-coding` | Kimi Coding | - |
| `model-providers/qwen-oauth` | Qwen OAuth | - |
| `model-providers/xiaomi` | Xiaomi | - |
| `model-providers/minimax` | MiniMax | - |
| `model-providers/stepfun` | StepFun (阶跃) | - |
| `model-providers/nvidia` | NVIDIA | - |
| `model-providers/huggingface` | HuggingFace | - |
| `model-providers/arcee` | Arcee | - |
| `model-providers/nous` | Nous | - |
| `model-providers/novita` | Novita | - |
| `model-providers/gmi` | GMI | - |
| `model-providers/kilocode` | Kilocode | - |
| `model-providers/opencode-zen` | OpenCode Zen | - |
| `model-providers/copilot` | Copilot | - |
| `model-providers/copilot-acp` | Copilot ACP | - |
| `model-providers/custom` | Custom | - |
| `model-providers/ai-gateway` | AI Gateway | - |
| `model-providers/ollama-cloud` | Ollama Cloud | - |
| `model-providers/zai` | ZAI | - |

#### Web（搜索/提取后端）
| Key | 名称 | Kind | 说明 |
|-----|------|------|------|
| `web/tavily` | Tavily | backend | 搜索+提取+爬取 |
| `web/exa` | Exa | backend | - |
| `web/brave_free` | Brave (免费) | backend | - |
| `web/ddgs` | DuckDuckGo | backend | - |
| `web/firecrawl` | Firecrawl | backend | 搜索+爬取 |
| `web/parallel` | Parallel | backend | - |
| `web/searxng` | SearXNG | backend | - |
| `web/xai` | xAI | backend | - |

#### Platforms（Gateway 消息平台适配器）
| Key | 名称 | Kind | 需要 ENV |
|-----|------|------|---------|
| `platforms/discord` | Discord | platform | `DISCORD_BOT_TOKEN` |
| `platforms/teams` | Microsoft Teams | platform | - |
| `platforms/irc` | IRC | platform | - |
| `platforms/line` | LINE | platform | - |
| `platforms/ntfy` | ntfy | platform | - |
| `platforms/simplex` | SimpleX | platform | - |
| `platforms/google_chat` | Google Chat | platform | - |

#### Observability
| Key | 名称 | Kind | 说明 |
|-----|------|------|------|
| `observability/langfuse` | Langfuse | standalone | 追踪对话、LLM 调用、工具使用 |

#### 其他独立插件
| Key | 名称 | Kind | 说明 |
|-----|------|------|------|
| `disk-cleanup` | Disk Cleanup | standalone | 自动跟踪和清理临时文件 |
| `spotify` | Spotify | backend | 7 个 Spotify 工具（播放、设备、队列等） |
| `google_meet` | Google Meet | standalone | 加入 Meet 会议、转录、跟进 |
| `context_engine` | Context Engine | exclusive | 自定义上下文压缩引擎 |
| `teams_pipeline` | Teams Pipeline | standalone | - |

---

## 四、插件清单文件 plugin.yaml 规范

每个插件必须包含 `plugin.yaml` 清单文件和 `__init__.py` 入口。

### 4.1 核心字段

```yaml
name: disk-cleanup           # 插件名称（必填）
version: 2.0.0               # 版本号
description: "描述文本"       # 功能描述
author: "@author"            # 作者
kind: standalone             # 类型：standalone | backend | exclusive | platform | model-provider

# 环境变量依赖（简单列表格式）
requires_env:
  - OPENAI_API_KEY

# 环境变量依赖（富元数据格式）
requires_env:
  - name: DISCORD_BOT_TOKEN
    description: "Discord bot token"
    url: "https://discord.com/developers/applications"
    password: true            # 安装时使用 getpass 隐藏输入

# 可选环境变量
optional_env:
  - name: DISCORD_ALLOWED_USERS
    description: "允许的 Discord 用户 ID"

# 声明提供的工具
provides_tools:
  - spotify_playback
  - spotify_devices

# 声明注册的钩子
provides_hooks:
  - post_tool_call
  - on_session_end

# 声明提供的 Web 搜索提供者
provides_web_providers:
  - tavily

# pip 依赖（安装时自动安装）
pip_dependencies:
  - mem0ai
```

### 4.2 Kind 自动推断

当 `plugin.yaml` 未声明 `kind` 时，系统会扫描 `__init__.py` 源码自动推断：

- 检测到 `register_memory_provider` 或 `MemoryProvider` → `exclusive`
- 检测到 `register_provider` + `ProviderProfile` → `model-provider`
- 否则 → `standalone`

---

## 五、插件加载与注册机制

### 5.1 加载流程

```
_load_plugin(manifest)
  │
  ├── 根据来源选择加载方式：
  │   ├── user/project/bundled → _load_directory_module()
  │   │     └── importlib.util.spec_from_file_location()
  │   │         → 创建 hermes_plugins.<slug> 命名空间模块
  │   │         → slug = key.replace("/", "__").replace("-", "_")
  │   │
  │   └── entrypoint → _load_entrypoint_module()
  │         └── 通过 importlib.metadata 加载 entry point
  │
  └── 调用 module.register(ctx)  → ctx 是 PluginContext 实例
        └── 插件通过 ctx.register_*() 注册各种能力
```

### 5.2 PluginContext 注册能力一览

| 方法 | 说明 | 示例 |
|------|------|------|
| `ctx.register_tool()` | 注册工具到全局工具注册表 | `register_tool(name="meet_join", toolset="google_meet", schema=..., handler=...)` |
| `ctx.register_hook()` | 注册生命周期钩子回调 | `register_hook("post_tool_call", on_post_tool)` |
| `ctx.register_command()` | 注册斜杠命令 | `register_command("/disk-cleanup", handler, description=...)` |
| `ctx.register_cli_command()` | 注册 CLI 子命令 | `register_cli_command("meet", help="...", setup_fn=...)` |
| `ctx.register_platform()` | 注册 Gateway 平台适配器 | `register_platform(name="irc", label="IRC", adapter_factory=..., check_fn=...)` |
| `ctx.register_image_gen_provider()` | 注册图像生成后端 | 需继承 `ImageGenProvider` |
| `ctx.register_video_gen_provider()` | 注册视频生成后端 | 需继承 `VideoGenProvider` |
| `ctx.register_web_search_provider()` | 注册 Web 搜索/提取后端 | 需继承 `WebSearchProvider` |
| `ctx.register_browser_provider()` | 注册云浏览器后端 | 需继承 `BrowserProvider` |
| `ctx.register_context_engine()` | 注册上下文引擎（单例） | 需继承 `ContextEngine`，全局只允许一个 |
| `ctx.register_auxiliary_task()` | 注册辅助 LLM 任务 | `register_auxiliary_task(key="memory_retain_filter", display_name=..., defaults=...)` |
| `ctx.register_skill()` | 注册插件技能 | `register_skill(name="my-skill", path=Path("SKILL.md"))` → 可通过 `plugin_name:skill_name` 引用 |
| `ctx.inject_message()` | 向活跃会话注入消息 | `inject_message("hello", role="user")` |
| `ctx.dispatch_tool()` | 通过注册表分发工具调用 | `dispatch_tool("delegate_task", args={...})` |
| `ctx.llm` | 获取 host-owned LLM 门面 | `ctx.llm.complete(messages=[...])` |

---

## 六、生命周期钩子 (Lifecycle Hooks)

### 6.1 有效钩子列表

| 钩子名称 | 触发时机 | 用途 |
|----------|---------|------|
| `pre_tool_call` | 工具调用前 | 策略执行、速率限制、安全拦截（可返回 `{"action":"block","message":"..."}` 阻断） |
| `post_tool_call` | 工具调用后 | 结果后处理、日志追踪、文件自动跟踪 |
| `pre_llm_call` | LLM 调用前 | 注入上下文（返回 `{"context":"..."}` 插入到 user message） |
| `post_llm_call` | LLM 调用后 | 响应后处理 |
| `pre_api_request` | API 请求前 | 可观测性追踪（如 Langfuse） |
| `post_api_request` | API 请求后 | 可观测性追踪 |
| `transform_terminal_output` | 终端输出转换 | 输出重写 |
| `transform_tool_result` | 工具结果转换 | 结果重写 |
| `transform_llm_output` | LLM 输出转换 | 词汇/人格转换（首个非 None 返回值生效） |
| `on_session_start` | 会话开始 | 初始化 |
| `on_session_end` | 会话结束 | 清理资源（如 google_meet 退出会议） |
| `on_session_finalize` | 会话收尾 | 持久化 |
| `on_session_reset` | 会话重置 | 状态重置 |
| `subagent_stop` | 子代理停止 | 子代理清理 |
| `pre_gateway_dispatch` | Gateway 消息分发前 | 消息拦截/改写（返回 `{"action":"skip"|"rewrite"|"allow"}`） |
| `pre_approval_request` | 审批请求前 | 观察审批流程（不可否决） |
| `post_approval_response` | 审批响应后 | 观察审批结果 |

### 6.2 钩子调用流程

```python
# 核心调用方式
PluginManager.invoke_hook(hook_name, **kwargs) → List[Any]

# pre_tool_call 特殊处理：支持阻断
get_pre_tool_call_block_message(tool_name, args, ...) → Optional[str]
# 如果返回非 None 的 message，则工具调用被阻断

# pre_gateway_dispatch 特殊处理：支持消息拦截/改写
# 返回 {"action":"skip"} → 丢弃消息
# 返回 {"action":"rewrite","text":"..."} → 替换消息文本
# 返回 {"action":"allow"} / None → 正常分发
```

---

## 七、插件 LLM 门面 (PluginLlm)

插件可以通过 `ctx.llm` 获得宿主拥有的 LLM 调用能力，无需自带 API Key。

### 7.1 核心方法

| 方法 | 说明 |
|------|------|
| `complete(messages, ...)` | 聊天补全，使用用户活跃模型和认证 |
| `complete_structured(instructions, input, json_schema)` | 结构化推理，支持图像输入 + JSON Schema 验证 |
| `acomplete()` / `acomplete_structured()` | 异步版本 |

### 7.2 信任门控 (Trust Gate)

默认 **fail-close**：未配置的插件不能覆盖 provider/model/agent_id/profile。

```yaml
# config.yaml
plugins:
  entries:
    my-plugin:
      llm:
        allow_provider_override: true
        allow_model_override: true
        allowed_providers: [openrouter, anthropic]   # 可选白名单
        allowed_models: [openai/gpt-4o-mini]         # 可选白名单
        allow_agent_id_override: false
        allow_profile_override: false
```

### 7.3 返回结构

```python
PluginLlmCompleteResult:
  text: str           # 补全文本
  provider: str       # 实际使用的 provider
  model: str          # 实际使用的 model
  agent_id: str       # 代理 ID
  usage: PluginLlmUsage  # token 使用量 + 成本估算

PluginLlmStructuredResult:
  text: str
  parsed: Optional[Any]  # 解析后的 JSON（json_mode 时）
  content_type: str      # "json" | "text"
  usage: PluginLlmUsage
```

---

## 八、插件启用/禁用配置

### 8.1 配置方式

通过 `config.yaml` 管理：

```yaml
plugins:
  enabled:             # 白名单（opt-in），仅列表中的插件会被加载
    - disk-cleanup
    - observability/langfuse
  disabled:            # 黑名单，显式禁用（优先级高于 enabled）
    - spotify
  entries:             # 插件级配置
    my-plugin:
      llm:
        allow_provider_override: true
```

### 8.2 加载策略判定流程

```
插件发现后，按以下顺序判断是否加载：
  │
  ├── key/name 在 disabled 列表 → 不加载（标记 "disabled via config"）
  │
  ├── kind=exclusive → 不加载（标记 "exclusive plugin — activate via <category>.provider config"）
  │
  ├── kind=model-provider → 记录但不加载（由 providers/ 自己发现）
  │
  ├── source=bundled 且 kind=backend/platform → 自动加载
  │
  └── 其他（standalone、user 安装的 backend 等）
      └── key/name 在 enabled 白名单 → 加载
          └── 否则 → 不加载（标记 "not enabled in config"）
```

---

## 九、CLI 插件管理命令

### 9.1 命令清单

| 命令 | 说明 |
|------|------|
| `hermes plugins install <url\|owner/repo>` | 从 Git 仓库安装插件到 `~/.hermes/plugins/` |
| `hermes plugins update <name>` | 拉取最新代码更新已安装插件 |
| `hermes plugins remove <name>` | 删除已安装的插件 |
| `hermes plugins enable <key>` | 将插件加入 enabled 白名单 |
| `hermes plugins disable <key>` | 将插件加入 disabled 黑名单 |
| `hermes plugins list` | 列出所有已发现插件及其状态 |

### 9.2 Install 流程详解

```
hermes plugins install <identifier>
  │
  ├── 解析标识符 → Git URL
  │   ├── https://github.com/owner/repo.git → 直接使用
  │   ├── git@github.com:owner/repo.git → 直接使用
  │   └── owner/repo → https://github.com/owner/repo.git
  │
  ├── 安全检查：http:// / file:// 发出警告
  │
  ├── git clone --depth 1 到临时目录
  │
  ├── 读取 plugin.yaml → 获取插件名称
  │
  ├── 清理名称 + 验证路径安全性（防路径穿越）
  │
  ├── 检查 manifest_version 兼容性
  │
  ├── 移动到 ~/.hermes/plugins/<name>/
  │
  ├── 复制 .example 文件 → 生成实际配置文件
  │
  ├── 提示用户填写 requires_env 环境变量
  │   ├── 简单格式：直接输入
  │   └── 富元数据格式：显示描述 + URL + password 模式隐藏输入
  │
  ├── 显示 after-install.md（如有）
  │
  └── 提示 "Enable now? [y/N]"
      ├── Yes → 加入 enabled 集合 + 从 disabled 移除
      └── No → 提示用户手动 `hermes plugins enable <name>`
```

---

## 十、前端插件管理页面

### 10.1 数据流

```
PluginsView.vue
  │
  ├── fetchPlugins() → GET /api/hermes/plugins
  │     │
  │     └── packages/server/services/hermes/plugins.ts
  │           └── 执行 Python Bridge 脚本
  │                 └── 调用 PluginManager 发现所有插件
  │                       └── 返回 { plugins, warnings, metadata }
  │
  └── 渲染插件列表 + 筛选 + 状态标签
```

### 10.2 页面功能

| 功能 | 说明 |
|------|------|
| **统计面板** | 总数 / 活跃 / 未激活 / 禁用 / Provider 管理 |
| **搜索** | 按 key/name/description/path/source/kind 全文搜索 |
| **筛选** | 按来源 (source)、类型 (kind)、状态 (status) 下拉筛选 |
| **状态标签** | `enabled` / `auto-active` → 绿色；`disabled` → 红色；`inactive` → 黄色；`provider-managed` → 蓝色 |
| **CLI 命令提示** | 显示对应的 `hermes plugins enable/disable <key>` 命令，支持一键复制 |
| **刷新** | 手动刷新插件列表 |

### 10.3 插件状态映射

| 条件 | configStatus | effectiveStatus | 页面展示 |
|------|-------------|-----------------|---------|
| 在 disabled 列表 | `disabled` | `disabled` | 红色 |
| kind=exclusive | `provider-managed` | `provider-managed` | 蓝色 |
| kind=model-provider | `provider-managed` | `provider-managed` | 蓝色 |
| bundled + kind=backend/platform | `auto` | `auto-active` | 绿色 |
| 在 enabled 白名单 | `enabled` | `enabled` | 绿色 |
| 其他 | `not-enabled` | `inactive` | 黄色 |

---

## 十一、典型插件开发模式（以实际插件为例）

### 11.1 独立工具插件 — google_meet

```python
# __init__.py
def register(ctx):
    # 注册工具
    for name, schema, handler, emoji in _TOOLS:
        ctx.register_tool(name=name, toolset="google_meet", schema=schema,
                          handler=handler, check_fn=check_meet_requirements, emoji=emoji)
    # 注册 CLI 命令
    ctx.register_cli_command(name="meet", help="...", setup_fn=_register_meet_cli)
    # 注册生命周期钩子
    ctx.register_hook("on_session_end", _on_session_end)
```

### 11.2 后端提供者插件 — browser/firecrawl

```python
# __init__.py
def register(ctx):
    ctx.register_browser_provider(FirecrawlBrowserProvider())
```

### 11.3 钩子驱动插件 — disk-cleanup

```python
# __init__.py
def register(ctx):
    ctx.register_hook("post_tool_call", _on_post_tool_call)
    ctx.register_hook("on_session_end", _on_session_end)
    ctx.register_command("disk-cleanup", _handle_command, description="...")
```

### 11.4 可观测性插件 — langfuse

```yaml
# plugin.yaml
hooks:
  - pre_api_request
  - post_api_request
  - pre_llm_call
  - post_llm_call
  - pre_tool_call
  - post_tool_call
```

---

## 十二、用户操作主流程

### 12.1 查看已安装插件

```
用户 → 打开 Web UI → 点击插件管理页面
    → GET /api/hermes/plugins → Python Bridge 扫描所有插件
    → 返回插件列表 + 状态 + 统计信息
    → 页面展示表格（可搜索/筛选）
```

### 12.2 安装新插件

```
用户 → 终端执行 hermes plugins install owner/repo
    → 解析 Git URL → git clone → 安装到 ~/.hermes/plugins/
    → 提示填写环境变量 → 询问是否启用
    → 重启 gateway 生效
```

### 12.3 启用/禁用插件

```
用户 → Web UI 查看插件状态 → 复制 CLI 命令
    → 终端执行 hermes plugins enable <key>
      → 读取 config.yaml → 加入 plugins.enabled → 写回
    → 或执行 hermes plugins disable <key>
      → 读取 config.yaml → 移出 plugins.enabled + 加入 plugins.disabled → 写回
    → 重启 gateway 或新会话生效
```

### 12.4 插件生效路径（Agent 启动时）

```
Agent 启动
  → discover_plugins()
    → PluginManager.discover_and_load()
      → 扫描 4 个来源 → 去重 → 判断加载策略
      → 对每个可加载插件调用 _load_plugin()
        → import 模块 → 调用 register(ctx)
          → 插件注册工具/钩子/命令到全局注册表
  → Agent 运行中调用 invoke_hook() 触发插件钩子
  → 工具调用时检查 pre_tool_call 钩子（可能阻断）
```

### 12.5 插件 LLM 调用流程

```
插件代码 → ctx.llm.complete(messages=[...])
  → PluginLlm.complete()
    → 读取信任门控配置
    → 验证 override 权限（provider/model/agent_id/profile）
    → 调用 agent.auxiliary_client.call_llm()
      → 使用用户活跃模型和认证
    → 返回 PluginLlmCompleteResult
```

---

## 十三、安全机制

| 机制 | 说明 |
|------|------|
| **路径安全** | `_sanitize_plugin_name()` 防止路径穿越攻击，插件名不能包含 `/`、`\`、`..` |
| **来源区分** | bundled（可信）vs user/project/entrypoint（需白名单） |
| **LLM 信任门控** | fail-close 设计，未配置的插件不能覆盖 provider/model/认证信息 |
| **工具覆盖控制** | `register_tool(override=True)` 才能覆盖已有内置工具 |
| **斜杠命令冲突检测** | 插件注册命令时检查是否与内置命令冲突 |
| **环境变量安全** | `password: true` 的变量使用 `getpass` 隐藏输入，存入 `~/.hermes/.env` |
| **Git URL 安全** | `http://` / `file://` 协议触发安全警告 |
| **manifest 版本检查** | `manifest_version` 超过支持版本时拒绝安装 |
| **钩子异常隔离** | 每个钩子回调独立 try/except，单个插件异常不影响核心流程 |
| **辅助任务 key 保护** | 插件不能注册与内置任务 key 冲突的辅助任务 |
