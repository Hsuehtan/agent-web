# 服务器完整目录结构

> 沙箱服务器为单台机器、单棵文件树，DEV 和 PROD 共用同一文件系统，区别在于写入权限。

## 服务器硬件资源

| 项目 | 值 |
|------|------|
| 磁盘 | 9.8 GB 总量，约 8.8 GB 可用 |
| 内存 | 7.9 GB 总量，约 7.1 GB 可用 |
| Swap | 无，纯内存运行 |

---

## 完整目录树

```
/                                    ← 容器 overlay 根文件系统
│
├── package.json                     ← 全局依赖声明（coze-coding-dev-sdk）
├── pnpm-lock.yaml                   ← 全局锁定文件
│
├── /workspace/ ───────────────────── ★ 工作空间（项目代码在这里）
│   ├── projects/                    ← 项目根目录
│   │   ├── .coze                    ← 项目配置（build/run 定义）
│   │   ├── .git/                    ← Git 仓库
│   │   ├── .gitignore
│   │   ├── .dockerignore
│   │   ├── package.json             ← 项目依赖
│   │   ├── pnpm-lock.yaml
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── nodemon.json
│   │   ├── oem.config.ts
│   │   ├── vite.config.ts
│   │   ├── vite.config.website.ts
│   │   ├── vitest.config.ts
│   │   ├── playwright.config.ts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.node.json
│   │   ├── tsconfig.website.json
│   │   │
│   │   ├── packages/               ← 项目子包
│   │   │   ├── client/             ← 前端客户端
│   │   │   ├── server/             ← 后端服务
│   │   │   ├── skills/             ← 技能模块
│   │   │   └── website/            ← 网站模块
│   │   │
│   │   ├── bin/                    ← 可执行
│   │   │   └── hermes-web-ui.mjs
│   │   │
│   │   ├── assets/                 ← 静态资源（生成的图片）
│   │   │   ├── image.png
│   │   │   └── image_*.png
│   │   │
│   │   ├── data/                   ← 运行时数据
│   │   │   ├── hermes/
│   │   │   │   └── config.yaml
│   │   │   └── hermes-web-ui/
│   │   │       ├── logs/
│   │   │       └── upload/
│   │   │
│   │   ├── dist/                   ← 构建产物
│   │   │   ├── client/             ← 前端构建输出
│   │   │   │   ├── index.html
│   │   │   │   ├── assets/
│   │   │   │   └── fonts/
│   │   │   ├── server/             ← 后端构建输出
│   │   │   │   ├── index.js
│   │   │   │   └── agent-bridge/
│   │   │   └── skills/             ← 技能构建输出
│   │   │       ├── apikey-image-gen/
│   │   │       ├── grok-image-to-video/
│   │   │       ├── hyperframes/
│   │   │       ├── markdown-viewer/
│   │   │       └── remotion/
│   │   │
│   │   ├── scripts/                ← 工具脚本
│   │   │   ├── build-server.mjs
│   │   │   ├── generate-openapi.mjs
│   │   │   ├── hermes-mock.sh
│   │   │   └── setup.sh
│   │   │
│   │   ├── tests/                  ← 测试
│   │   │   ├── client/
│   │   │   ├── server/
│   │   │   ├── e2e/
│   │   │   ├── shared/
│   │   │   └── setup.ts
│   │   │
│   │   ├── docs/                   ← 文档
│   │   │   ├── cli-chat-sessions.md
│   │   │   ├── docker.md
│   │   │   ├── openapi.json
│   │   │   └── plans/
│   │   │
│   │   ├── AISummery/              ← AI 摘要笔记
│   │   ├── hermes-agent/           ← Hermes Agent 源码
│   │   ├── product-demo/           ← 产品演示项目
│   │   │
│   │   ├── node_modules/           ← 依赖（省略内部）
│   │   ├── node-compile-cache/     ← Node 编译缓存
│   │   ├── DEVELOPMENT.md
│   │   ├── README.md / README_zh.md
│   │   └── TODAY_TEST_CASES.md
│   │
│   ├── logs/                       ← 工作空间日志（空）
│   ├── pkg_temp/                   ← 包临时目录（空）
│   └── tmp/                        ← 工作空间临时目录
│
├── /app/ ─────────────────────────── 日志输出
│   └── work/logs/bypass/
│       ├── app.log                 ← 主流程 + 错误日志
│       ├── dev.log                 ← 开发调试日志
│       └── console.log             ← 控制台日志
│
├── /root/ ────────────────────────── root 用户主目录
│   ├── .hermes/                    ← ★ Hermes Agent 运行时
│   │   ├── config.yaml             ← Agent 核心配置
│   │   ├── SOUL.md                 ← Agent 人格定义
│   │   ├── state.db                ← 状态数据库
│   │   ├── kanban.db               ← 看板数据库
│   │   ├── gateway.pid             ← 网关进程 PID
│   │   ├── gateway_state.json      ← 网关状态
│   │   ├── gateway.lock            ← 网关锁
│   │   ├── channel_directory.json  ← 通道目录
│   │   ├── bin/tirith              ← 内置工具
│   │   ├── sessions/               ← 会话数据
│   │   ├── memories/               ← 记忆存储
│   │   ├── cache/documents/        ← 文档缓存
│   │   ├── image_cache/            ← 图片缓存
│   │   ├── audio_cache/            ← 音频缓存
│   │   ├── hooks/                  ← 钩子
│   │   ├── pairing/                ← 配对
│   │   ├── cron/                   ← 定时任务
│   │   │   ├── .tick.lock
│   │   │   └── output/
│   │   ├── skills/                 ← Agent 技能集（29 个）
│   │   │   ├── github/
│   │   │   ├── gaming/
│   │   │   ├── devops/
│   │   │   ├── email/
│   │   │   ├── research/
│   │   │   ├── creative/
│   │   │   ├── mcp/
│   │   │   ├── apple/
│   │   │   ├── autonomous-ai-agents/
│   │   │   ├── data-science/
│   │   │   ├── diagramming/
│   │   │   ├── dogfood/
│   │   │   ├── domain/
│   │   │   ├── gifs/
│   │   │   ├── grok-image-to-video/
│   │   │   ├── hyperframes/
│   │   │   ├── inference-sh/
│   │   │   ├── markdown-viewer/
│   │   │   ├── media/
│   │   │   ├── mlops/
│   │   │   ├── note-taking/
│   │   │   ├── productivity/
│   │   │   ├── red-teaming/
│   │   │   ├── remotion/
│   │   │   ├── smart-home/
│   │   │   ├── social-media/
│   │   │   ├── software-development/
│   │   │   └── yuanbao/
│   │   └── logs/                   ← Agent 日志
│   │       ├── agent.log
│   │       ├── gateway.log
│   │       ├── errors.log
│   │       ├── gateway-exit-diag.log
│   │       └── curator/
│   │
│   ├── .hermes-web-ui/             ← Web UI 运行时
│   │   ├── .token                  ← 认证令牌
│   │   ├── .login-lock.json
│   │   ├── logs/
│   │   │   ├── bridge.log
│   │   │   └── server.log
│   │   └── upload/                 ← 上传目录
│   │
│   ├── .bun/                       ← Bun 运行时
│   │   └── bin/{bun, bunx}
│   ├── .cache/                     ← 缓存（大目录）
│   │   ├── ms-playwright/          ← Playwright 浏览器（Chromium/Firefox）
│   │   ├── node-gyp/               ← Node 编译缓存
│   │   ├── pnpm/                   ← pnpm 元数据
│   │   ├── pip/                    ← Python 缓存
│   │   ├── Nuitka/                 ← Python 编译缓存
│   │   └── mozilla/                ← Firefox 缓存
│   ├── .config/pip/pip.conf        ← pip 配置
│   ├── .local/                     ← pnpm 全局
│   │   ├── share/pnpm/
│   │   └── state/pnpm/
│   ├── .npm/                       ← npm 缓存
│   │   ├── _cacache/
│   │   ├── _libvips/
│   │   ├── _logs/
│   │   └── _prebuilds/
│   ├── .ssh/                       ← SSH 密钥
│   ├── .mozilla/                   ← Firefox 配置
│   ├── .gitconfig                  ← Git 全局配置
│   ├── .npmrc                      ← npm 配置
│   ├── .bashrc / .profile          ← Shell 配置
│   └── .bash_history               ← 命令历史
│
├── /source/ ──────────────────────── 平台底层服务
│   ├── app/services/custom_setup/  ← 各类型项目初始化脚本
│   │   ├── agent/async_setup.sh
│   │   ├── app/async_setup.sh
│   │   ├── miniapp/async_setup.sh
│   │   ├── openclaw/async_setup.sh
│   │   ├── skill/async_setup.sh
│   │   ├── web/async_setup.sh
│   │   └── workflow/async_setup.sh
│   ├── storage_skill/              ← 存储技能（S3 + DB）
│   │   ├── drizzle/                ← 数据库迁移
│   │   │   ├── generate.sh
│   │   │   ├── load_env.py
│   │   │   └── upgrade.sh
│   │   └── storage/
│   │       ├── database/           ← Supabase DB
│   │       │   ├── db.ts
│   │       │   ├── drizzle.config.ts
│   │       │   ├── index.ts
│   │       │   └── shared/schema.ts
│   │       ├── ensureLoadEnv.ts
│   │       ├── index.ts
│   │       └── s3/                 ← S3 对象存储
│   │           ├── index.ts
│   │           └── s3Storage.ts
│   ├── vibe_coding/                ← Vibe Coding 核心
│   ├── git-hooks/post-commit       ← Git 钩子
│   ├── coze-git-askpass.sh         ← Git 认证
│   ├── access_token.pem            ← 访问令牌
│   ├── run_web.sh                  ← Web 启动脚本
│   ├── web_supervisord.conf        ← 进程管理配置
│   ├── requirements.txt            ← Python 依赖
│   ├── requirements_web.txt        ← Web Python 依赖
│   └── app.cpython-312-x86_64-linux-gnu.so  ← 编译后的平台服务
│
├── /skills/ ──────────────────────── 技能（Skill）定义
│   ├── public/prod/                ← 公共技能
│   └── user/                       ← 用户自定义技能
│
├── /space/ ───────────────────────── 项目打包与截图
│   ├── pack_projects/              ← 构建打包归档
│   │   ├── pack_latest.txt
│   │   └── pack_project_*.tar.gz   ← 每次部署的快照
│   ├── release_pkg/                ← 发布包
│   └── screenshots/                ← 页面截图（60+ 张）
│
├── /node_modules/ ────────────────── 全局 Node 模块
│   └── coze-coding-dev-sdk/        ← SDK
│
├── /tmp/ ─────────────────────────── 系统临时目录
│
├── /home/ ────────────────────────── 用户目录
│   └── ubuntu/
│       ├── .bashrc
│       ├── .bash_logout
│       └── .profile
│
├── /opt/ ─────────────────────────── 可选软件
│   └── tiger/bytefaas/binary/      ← 平台运行时代理
│       ├── dumb-init
│       ├── health-tool
│       ├── o11yagent
│       └── runtime-agent
│
├── /usr/ ─────────────────────────── 系统程序
│   ├── bin/                        ← Node.js, Python, curl, Xvfb 等
│   ├── lib/                        ← 系统库
│   ├── local/                      ← 本地安装
│   └── share/                      ← 共享数据
│
├── /etc/ ─────────────────────────── 系统配置
│   ├── hostname
│   ├── hosts
│   ├── resolv.conf
│   ├── apt/                        ← 包管理配置
│   ├── ssl/                        ← SSL 证书
│   ├── ca-certificates/
│   ├── fonts/                      ← 字体配置
│   ├── X11/                        ← X11 配置
│   └── ...
│
├── /var/ ─────────────────────────── 系统可变数据
│   ├── log/                        ← 系统日志
│   ├── cache/                      ← 系统缓存
│   │   ├── apt/
│   │   ├── fontconfig/
│   │   └── ldconfig/
│   ├── lib/                        ← 系统库数据
│   ├── local/
│   ├── lock/
│   ├── mail/
│   ├── opt/
│   ├── run/
│   ├── spool/
│   └── tmp/
│
├── /bin/, /sbin/, /lib/, /lib64/ ─── 系统二进制和库（符号链接到 /usr）
├── /boot/ ────────────────────────── 启动文件（最小化）
├── /dev/ ─────────────────────────── 设备文件（虚拟文件系统）
├── /proc/ ────────────────────────── 进程/内核信息（虚拟文件系统）
├── /sys/ ─────────────────────────── 内核参数（虚拟文件系统）
├── /run/ ─────────────────────────── 运行时数据
├── /srv/ ─────────────────────────── 服务数据（空）
└── /media/, /mnt/ ────────────────── 挂载点（空）
```

---

## 两环境读写权限对比

| 路径 | DEV(开发) | PROD(生产) | 说明 |
|------|-----------|------------|------|
| `/workspace/projects/*` | ✅ 读写 | ❌ 只读 | 项目代码，生产环境不可修改 |
| `/workspace/projects/public/` | ✅ 读写 | ❌ 只读 | 静态资源 |
| `/workspace/tmp/` | ✅ 读写 | ✅ 读写 | 工作空间临时目录 |
| `/workspace/logs/` | ✅ 读写 | ✅ 读写 | 工作空间日志 |
| `/tmp/` | ✅ 读写 | ✅ 读写 | 系统临时（⚠️ 会被定期清理，不可持久化） |
| `/app/work/logs/bypass/` | ✅ 读写 | ✅ 读写 | 运行时日志 |
| `/root/.hermes/*` | ✅ 读写 | ❌ 只读 | Agent 运行时 |
| `/root/.hermes-web-ui/*` | ✅ 读写 | ❌ 只读 | Web UI 运行时 |
| `/root/.cache/*` | ✅ 读写 | ❌ 只读 | 各种缓存 |
| `/root/.npm/*` | ✅ 读写 | ❌ 只读 | npm 缓存 |
| `/root/.ssh/` | ✅ 读写 | ❌ 只读 | SSH 密钥 |
| `/source/*` | ✅ 读写 | ❌ 只读 | 平台底层服务 |
| `/skills/*` | ✅ 读写 | ❌ 只读 | 技能定义 |
| `/space/*` | ✅ 读写 | ❌ 只读 | 打包归档 |
| `/node_modules/*` | ✅ 读写 | ❌ 只读 | 全局依赖 |
| `/opt/*` | ✅ 读写 | ❌ 只读 | 可选软件 |
| `/home/*` | ✅ 读写 | ❌ 只读 | 用户目录 |
| `/etc/*` | ✅ 读 | ❌ 只读 | 系统配置 |
| `/usr/*` | ✅ 读 | ❌ 只读 | 系统程序 |
| `/var/*` | ✅ 读写 | ❌ 只读 | 系统数据 |
| `/bin/, /sbin/, /lib/` | ✅ 读 | ❌ 只读 | 系统二进制 |
| `/proc/, /sys/, /dev/` | ✅ 读 | ✅ 读 | 虚拟文件系统（只读） |

### 权限总结

- **DEV 环境**：几乎全盘可写，可在任意目录创建/修改文件
- **PROD 环境**：只有 3 个目录可写：
  - `/tmp/` — 临时文件（⚠️ 会被定期清理）
  - `/app/work/logs/bypass/` — 日志输出
  - `/workspace/tmp/` — 工作空间临时目录
- **生产环境生成文件应存储到对象存储（S3）**，而非本地文件系统

---

## 两个环境的关系

localhost 和 sandbox 域名指向**同一台沙箱服务器**的同一个进程（端口 5000），区别仅在于访问入口：

| 维度 | localhost (DEV) | sandbox 域名 (PROD) |
|------|-----------------|---------------------|
| 启动方式 | `coze dev` | `coze build` + `coze start` |
| 代码状态 | 源码，实时热更 | 构建产物，静态部署 |
| 访问方式 | 沙箱内部 / 预览 | 公网域名，外部可直接访问 |
| 环境变量 | `COZE_PROJECT_ENV=DEV` | `COZE_PROJECT_ENV=PROD` |
| 文件写入 | 所有目录可写 | 仅 `/tmp`、`/app/work/logs/bypass/`、`/workspace/tmp/` |
| 用途 | 开发调试 | 正式交付 |

> 类比：一台电脑上的一个服务，`localhost` 是本机访问方式，`sandbox 域名` 是公网映射的访问方式。就像家里的一台电脑，既可以用 `127.0.0.1` 访问，也可以通过路由器映射的公网 IP 访问，但背后是同一台机器。
