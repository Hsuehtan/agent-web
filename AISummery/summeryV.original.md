# Hermes Web UI - 项目架构梳理

## 项目概述

**Hermes Web UI** 是 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的全功能 Web 管理面板，提供 AI 聊天、多平台渠道管理、用量分析、定时任务、看板、文件浏览、群聊、技能与记忆管理等功能。项目采用前后端分离的 Monorepo 架构。

- **版本**: 0.6.0
- **协议**: BSL-1.1
- **Node 要求**: >= 23.0.0
- **仓库**: https://github.com/EKKOLearnAI/hermes-web-ui

---

## 顶层目录结构

```
/workspace/projects/
├── packages/              # 核心代码（client + server）
├── hermes-agent/          # Hermes Agent Python 子项目（独立仓库）
├── dist/                  # 构建产物（client 静态资源 + server 编译后 JS）
├── bin/                   # CLI 入口 (hermes-web-ui.mjs)
├── scripts/               # 构建/部署/工具脚本
├── tests/                 # 测试（client 单测 + server 单测 + e2e）
├── docs/                  # 文档（OpenAPI、Docker、计划）
├── node_modules/          # 依赖
├── package.json           # 根 Monorepo 配置
├── vite.config.ts         # 前端构建配置（client）
├── vite.config.website.ts # 官网构建配置
├── tsconfig.json          # TypeScript 根配置（references）
├── vitest.config.ts       # 单元测试配置
├── playwright.config.ts   # E2E 测试配置
├── nodemon.json           # 后端开发热重载配置
├── .coze                  # 沙箱部署配置
└── Dockerfile             # Docker 构建文件
```

---

## 核心架构：packages/

### packages/client/ — 前端 (Vue 3 + Vite)

**技术栈**: Vue 3 + Pinia + Naive UI + Vue Router + vue-i18n + Socket.IO Client

```
packages/client/
├── index.html                 # SPA 入口
├── public/                    # 静态资源（字体、图标、Logo、技能推荐文档）
└── src/
    ├── App.vue                # 根组件（主题、侧边栏、认证监听）
    ├── api/                   # API 层
    │   ├── client.ts          # Axios 实例 + 认证头注入
    │   ├── auth.ts            # 登录/登出 API
    │   └── hermes/            # 按功能域拆分的 API 模块（22 个）
    │       ├── chat.ts        # 聊天（Socket.IO 流式）
    │       ├── sessions.ts    # 会话 CRUD
    │       ├── conversations.ts # 对话历史
    │       ├── models.ts      # 模型管理
    │       ├── profiles.ts    # Profile 管理
    │       ├── skills.ts      # 技能查询
    │       ├── plugins.ts     # 插件管理
    │       ├── kanban.ts      # 看板
    │       ├── jobs.ts        # 定时任务
    │       ├── files.ts       # 文件操作
    │       ├── group-chat.ts  # 群聊
    │       ├── tts.ts         # 语音合成
    │       └── ...            # 其余功能 API
    ├── components/
    │   ├── auth/              # 认证组件（监听、默认凭证提示）
    │   ├── layout/            # 布局组件（侧边栏、模型选择器、Profile 选择器、主题切换、语言切换）
    │   └── hermes/            # 功能组件
    │       ├── chat/          # 聊天（输入框、消息列表、Markdown 渲染、会话搜索、终端面板、大纲面板）
    │       ├── files/         # 文件浏览器（树形、列表、编辑器、上传、右键菜单）
    │       ├── group-chat/    # 群聊（创建房间、消息列表、@提及）
    │       ├── jobs/          # 定时任务（卡片、表单、执行历史）
    │       └── kanban/        # 看板（列、卡片、创建表单、抽屉详情）
    ├── composables/           # 组合式函数
    │   ├── useTheme.ts        # 主题切换（亮/暗/漫画）
    │   ├── useKeyboard.ts     # 全局快捷键
    │   ├── useSessionSearch.ts # 会话搜索
    │   ├── useSpeech.ts       # 语音输入
    │   ├── useToolTraceVisibility.ts # 工具调用展示控制
    │   └── useVoiceSettings.ts # 语音设置
    ├── stores/                # Pinia 状态管理
    │   └── hermes/
    │       ├── app.ts         # 全局状态（侧边栏、节点版本、健康检查）
    │       ├── chat.ts        # 聊天状态（消息、流式响应、会话）
    │       ├── models.ts      # 模型列表与选择
    │       ├── profiles.ts    # Profile 管理
    │       ├── files.ts       # 文件浏览状态
    │       ├── group-chat.ts  # 群聊状态
    │       ├── jobs.ts        # 任务状态
    │       ├── kanban.ts      # 看板状态
    │       ├── usage.ts       # 用量统计
    │       ├── settings.ts    # 设置偏好
    │       └── session-browser-prefs.ts # 会话浏览器偏好
    ├── views/                 # 页面视图
    │   ├── LoginView.vue      # 登录页
    │   └── hermes/            # 功能页面（18 个视图）
    │       ├── ChatView.vue        # AI 聊天
    │       ├── HistoryView.vue     # 会话历史
    │       ├── ModelsView.vue      # 模型管理
    │       ├── ProfilesView.vue    # Profile 管理
    │       ├── ChannelsView.vue    # 平台渠道
    │       ├── FilesView.vue       # 文件浏览
    │       ├── GroupChatView.vue   # 群聊
    │       ├── JobsView.vue        # 定时任务
    │       ├── KanbanView.vue      # 看板
    │       ├── SkillsView.vue      # 技能
    │       ├── SkillsUsageView.vue # 技能用量
    │       ├── PluginsView.vue     # 插件
    │       ├── MemoryView.vue      # 记忆
    │       ├── LogsView.vue        # 日志
    │       ├── UsageView.vue       # 用量分析
    │       ├── PerformanceView.vue # 性能监控
    │       ├── SettingsView.vue    # 设置
    │       └── TerminalView.vue    # Web 终端
    ├── router/                # Vue Router（Hash 模式，路由守卫认证）
    ├── i18n/                  # 国际化（10 种语言：中/英/日/韩/法/德/西/葡/繁中）
    ├── styles/                # 全局样式（SCSS 变量、代码块、主题覆盖）
    └── assets/                # 静态资源（Logo、思考动画 MP4）
```

**前端构建配置要点** (vite.config.ts):
- 开发代理: `/api` → `http://127.0.0.1:8648`
- 手动分包: monaco-editor / mermaid / xterm / vue-vendor / ui-vendor / vendor
- CSS 代码分割
- esbuild 压缩，target ES2020

---

### packages/server/ — 后端 (Koa + SQLite)

**技术栈**: Koa + @koa/router + better-sqlite3 + Socket.IO + node-pty + esbuild

```
packages/server/
├── data/                     # SQLite 数据库文件
│   └── hermes-web-ui.db
└── src/
    ├── index.ts              # 服务启动入口（Koa 应用、路由注册、SPA fallback、WebSocket）
    ├── config.ts             # 环境变量与配置（端口/主机/CORS/上传目录/数据目录）
    ├── controllers/          # 控制器层（请求处理逻辑）
    │   ├── auth.ts           # 认证控制器
    │   ├── health.ts         # 健康检查
    │   ├── upload.ts         # 文件上传
    │   ├── webhook.ts        # Webhook 回调
    │   ├── update.ts         # 更新检查
    │   └── hermes/           # 功能控制器（16 个）
    │       ├── config.ts         # Hermes 配置
    │       ├── sessions.ts       # 会话管理
    │       ├── models.ts         # 模型管理
    │       ├── profiles.ts       # Profile 管理
    │       ├── providers.ts      # Provider CRUD
    │       ├── skills.ts         # 技能查询
    │       ├── plugins.ts        # 插件管理
    │       ├── memory.ts         # 记忆管理
    │       ├── kanban.ts         # 看板
    │       ├── jobs.ts           # 定时任务
    │       ├── logs.ts           # 日志查询
    │       ├── media.ts          # 媒体处理
    │       ├── tts.ts            # TTS 代理
    │       ├── performance-monitor.ts # 性能监控
    │       ├── codex-auth.ts / copilot-auth.ts / nous-auth.ts / xai-auth.ts / weixin.ts # 平台 OAuth
    │       └── cron-history.ts   # Cron 执行历史
    ├── routes/                # 路由注册层
    │   ├── index.ts           # 统一路由注册（公共路由 → 认证中间件 → 受保护路由 → 代理兜底）
    │   ├── health.ts / auth.ts / upload.ts / webhook.ts / update.ts
    │   └── hermes/            # 功能路由（25 个模块，一一对应控制器）
    │       ├── chat-run.ts        # 聊天流式运行（Socket.IO）
    │       ├── terminal.ts        # Web 终端（WebSocket）
    │       ├── kanban-events.ts   # 看板事件（WebSocket）
    │       ├── group-chat.ts      # 群聊（Socket.IO）
    │       ├── proxy.ts           # AI 模型代理转发
    │       ├── files.ts / download.ts # 文件浏览与下载
    │       └── ...
    ├── services/              # 业务逻辑层
    │   ├── auth.ts            # 认证服务（JWT、登录限流）
    │   ├── app-config.ts      # 应用配置
    │   ├── config-helpers.ts  # 配置辅助
    │   ├── credentials.ts     # 凭证管理
    │   ├── logger.ts          # 日志服务（pino）
    │   ├── login-limiter.ts   # 登录限流
    │   ├── safe-file-store.ts # 安全文件存储
    │   ├── shutdown.ts        # 优雅关闭
    │   └── hermes/            # 核心业务服务
    │       ├── agent-bridge/     # Agent 桥接（Node ↔ Python Hermes Agent）
    │       │   ├── manager.ts       # Agent 生命周期管理
    │       │   ├── client.ts        # Python 子进程通信
    │       │   ├── hermes_bridge.py # Python 侧桥接脚本
    │       │   └── index.ts
    │       ├── run-chat/         # 聊天运行引擎（核心）
    │       │   ├── index.ts         # 入口
    │       │   ├── handle-api-run.ts    # API 模式运行
    │       │   ├── handle-bridge-run.ts # Bridge 模式运行
    │       │   ├── response-stream.ts   # SSE 流式响应
    │       │   ├── sse-utils.ts        # SSE 工具
    │       │   ├── bridge-delta.ts     # 增量消息处理
    │       │   ├── bridge-message.ts   # 消息格式化
    │       │   ├── message-format.ts   # 消息格式
    │       │   ├── content-blocks.ts   # 内容块解析
    │       │   ├── compression.ts      # 上下文压缩
    │       │   ├── model-config.ts     # 模型配置
    │       │   ├── session-command.ts  # 会话命令处理
    │       │   ├── usage.ts            # Token 用量统计
    │       │   ├── abort.ts            # 中断控制
    │       │   └── types.ts
    │       ├── context-engine/   # 上下文引擎（压缩/摘要/网关客户端）
    │       ├── gateway-manager.ts    # Gateway 管理器
    │       ├── gateway-runner.ts     # Gateway 运行器
    │       ├── gateway-autostart.ts  # Gateway 自动启动
    │       ├── group-chat/       # 群聊服务（Agent 客户端、@提及路由）
    │       ├── conversations.ts  # 对话服务
    │       ├── hermes-cli.ts     # Hermes CLI 交互
    │       ├── hermes-kanban.ts  # 看板服务
    │       ├── hermes-path.ts    # 路径工具
    │       ├── hermes-profile.ts # Profile 管理
    │       ├── model-context.ts  # 模型上下文
    │       ├── skill-injector.ts # 技能注入
    │       ├── session-sync.ts   # 会话同步
    │       ├── session-deleter.ts # 会话删除
    │       ├── plugins.ts        # 插件管理
    │       ├── profile-credentials.ts # Profile 凭证
    │       ├── profile-list-parser.ts  # Profile 列表解析
    │       ├── file-provider.ts  # 文件提供者（多后端：local/Docker/SSH/Singularity）
    │       ├── upload-paths.ts   # 上传路径管理
    │       ├── copilot-device-flow.ts # Copilot 设备流认证
    │       ├── copilot-models.ts # Copilot 模型列表
    │       ├── tts.ts            # TTS 服务（node-edge-tts）
    │       └── ops-monitor.ts    # 运维监控
    ├── middleware/
    │   └── user-auth.ts       # 用户认证中间件（JWT 验证 + Profile 解析）
    ├── db/                    # 数据库层（SQLite）
    │   ├── index.ts           # 数据库连接
    │   └── hermes/
    │       ├── init.ts            # 表初始化
    │       ├── schemas.ts         # 表结构定义
    │       ├── sessions-db.ts     # 会话表
    │       ├── conversations-db.ts # 对话表
    │       ├── session-store.ts   # 会话存储
    │       ├── message-content.ts # 消息内容
    │       ├── compression-snapshot.ts # 压缩快照
    │       ├── usage-store.ts     # 用量统计表
    │       └── users-store.ts     # 用户表
    └── lib/
        ├── context-compressor/ # 上下文压缩器
        ├── llm-json.ts        # LLM JSON 解析
        └── llm-prompt.ts      # LLM Prompt 构建
```

---

## 通信架构

```
浏览器 (Vue 3 SPA)
  │
  ├── REST API ──────────────► Koa Router (/api/*)
  │   (Axios + JWT Auth)         │
  │                               ├── Controllers → Services → DB (SQLite)
  │                               └── Proxy → AI Provider APIs
  │
  ├── Socket.IO ────────────► Chat Run (/chat-run)
  │   (聊天流式响应)             ├── Group Chat
  │                               └── Kanban Events
  │
  └── WebSocket ────────────► Terminal (/terminal)
      (xterm ↔ node-pty)        └── Kanban Events
```

**关键通信路径**:
1. **聊天流式**: 前端 Socket.IO → `chat-run` 路由 → `run-chat` 服务 → Agent Bridge (Python) → SSE/Socket 流式回传
2. **Web 终端**: 前端 xterm → WebSocket → `terminal` 路由 → node-pty → PTY 输出回传
3. **模型代理**: 前端请求 → `proxy` 路由 → 转发至 AI Provider API
4. **文件操作**: 前端 API → `files` 路由 → `file-provider` 服务 → local/Docker/SSH/Singularity 后端

---

## 数据库设计 (SQLite)

- **位置**: `packages/server/data/hermes-web-ui.db`
- **核心表**:
  - `sessions` — 聊天会话
  - `conversations` — 对话消息
  - `messages` — 消息内容
  - `usage` — Token 用量统计
  - `users` — 用户账户
  - `compression_snapshots` — 上下文压缩快照
  - `kanban_*` — 看板相关表
  - `cron_history` — 定时任务执行历史

---

## 认证体系

- **方式**: JWT Token（Bearer Auth）
- **默认账户**: admin / 123456
- **中间件**: `middleware/user-auth.ts`（验证 JWT + 解析 Profile）
- **角色**: 超级管理员（全量 Profile 访问）/ 普通管理员（绑定 Profile 访问）
- **可禁用**: `AUTH_DISABLED=1`

---

## Hermes Agent 子项目

`hermes-agent/` 是一个独立的 Python AI Agent 项目，通过 Agent Bridge 与 Web UI 交互：

- **核心**: `run_agent.py` (AIAgent 类) + `cli.py` (CLI 交互)
- **工具系统**: `tools/` 目录，通过 `registry.py` 自动发现
- **网关**: `gateway/` — 多平台消息适配器（Telegram/Discord/Slack/WhatsApp/微信/飞书等 15+ 平台）
- **插件**: `plugins/` — 内存、上下文引擎、模型提供者、看板、图片生成等
- **技能**: `skills/` + `optional-skills/` — 内置与可选技能
- **ACP 适配器**: `acp_adapter/` — VS Code/Zed/JetBrains 集成
- **Cron**: `cron/` — 定时任务调度
- **TUI**: `ui-tui/` — Ink (React) 终端 UI

---

## 构建 & 运行

### 开发环境
```bash
# 前后端并发启动
pnpm dev
# 等同于:
#   pnpm dev:client  → vite --host (前端 HMR)
#   pnpm dev:server  → nodemon (后端热重载)
```

### 生产构建
```bash
pnpm build  # vue-tsc + vite build + tsc server + esbuild server
```

### 沙箱环境 (.coze)
```toml
[dev]
build = ["bash", "-c", "cp scripts/hermes-mock.sh /usr/local/bin/hermes && chmod +x /usr/local/bin/hermes && pnpm install"]
run = ["bash", "-c", "AUTH_DISABLED=1 ... node dist/server/index.js"]

[deploy]
build = ["bash", "-c", "... pnpm install && npx vite build && node scripts/build-server.mjs"]
run = ["bash", "-c", "AUTH_DISABLED=1 ... node dist/server/index.js"]
```

### 端口
- **开发**: 前端 Vite 默认端口 + 后端 8648（代理转发）
- **生产/沙箱**: 统一 5000 端口（Koa 服务 + SPA 静态资源）

---

## 测试体系

```
tests/
├── client/          # 前端单元测试 (Vitest + @vue/test-utils)
│   ├── api.test.ts
│   ├── chat-store-thinking.test.ts
│   ├── kanban-store.test.ts
│   ├── markdown-rendering.test.ts
│   └── ... (30+ 测试文件)
├── server/          # 后端单元测试 (Vitest)
│   ├── auth.test.ts
│   ├── conversations-db.test.ts
│   ├── gateway-manager.test.ts
│   ├── run-chat-bridge-delta.test.ts
│   └── ... (40+ 测试文件)
└── e2e/             # E2E 测试 (Playwright)
    ├── auth.spec.ts
    ├── chat-streaming.spec.ts
    ├── terminal.spec.ts
    └── ... (8 个测试场景)
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务监听端口 | 5000 (沙箱) / 8648 (本地) |
| `BIND_HOST` | 绑定地址 | 0.0.0.0 |
| `CORS_ORIGINS` | CORS 来源 | * |
| `HERMES_WEB_UI_HOME` | 数据主目录 | ~/.hermes-web-ui |
| `UPLOAD_DIR` | 上传目录 | {HOME}/upload |
| `AUTH_DISABLED` | 禁用认证 | - |
| `AUTH_TOKEN` | 指定认证 Token | 自动生成 |
| `PROFILE` | 初始 Hermes Profile | default |
| `GATEWAY_HOST` | 网关主机 | 127.0.0.1 |
| `WORKSPACE_BASE` | 工作区根目录 | /opt/data/workspace |
| `LOG_LEVEL` | 日志级别 | info |
| `MAX_DOWNLOAD_SIZE` | 最大下载文件大小 | 200MB |
| `MAX_EDIT_SIZE` | 最大可编辑文件大小 | 10MB |

---

## 国际化

支持 10 种语言：中文 (zh)、英文 (en)、日文 (ja)、韩文 (ko)、法文 (fr)、德文 (de)、西班牙文 (es)、葡萄牙文 (pt)、繁体中文 (zh-TW)

语言文件位于 `packages/client/src/i18n/locales/`。

---

## 核心依赖

| 分类 | 依赖 |
|------|------|
| **前端框架** | Vue 3, Vue Router, Pinia |
| **UI 库** | Naive UI |
| **Markdown** | markdown-it, highlight.js, @vscode/markdown-it-katex, mermaid |
| **编辑器** | monaco-editor |
| **终端** | @xterm/xterm, @xterm/addon-fit, @xterm/addon-web-links |
| **HTTP** | Axios |
| **实时通信** | socket.io-client |
| **后端框架** | Koa, @koa/router, @koa/cors, @koa/bodyparser |
| **数据库** | better-sqlite3 |
| **实时通信** | socket.io |
| **终端** | node-pty |
| **TTS** | node-edge-tts |
| **构建** | Vite, esbuild, vue-tsc |
| **测试** | Vitest, Playwright |