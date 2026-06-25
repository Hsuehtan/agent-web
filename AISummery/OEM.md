# Hermes Web UI 商业化贴牌（OEM）改动指南

> 本文档梳理了在**保持主功能完全不变**的前提下，将 Hermes Web UI 进行商业化贴牌所需改动的全部位置。  
> 按改动类型分为 8 大类，每条均标注文件路径、行号/关键代码、改动说明和优先级。
>
> **类别1 项已实现配置化**：修改项目根目录下的 `oem.config.ts` 即可完成品牌展示定制，无需改动任何源码。详见[第十二章](#十二oem-改动分类配置化-vs-谨慎处理)。

---

## 一、品牌名称 & 产品标题

所有用户可见的 "Hermes" 字样均需替换为自有品牌名。

| # | 文件 | 位置 | 原始内容 | 改动说明 | 优先级 |
|---|------|------|----------|----------|--------|
| 1 | `packages/client/src/components/layout/AppSidebar.vue` | L80 | `<span class="logo-text">Hermes</span>` | 替换为自有品牌名 | P0 |
| 2 | `packages/client/src/components/layout/AppSidebar.vue` | L79 | `alt="Hermes"` | 替换 alt 文本 | P0 |
| 3 | `packages/client/src/views/LoginView.vue` | L62 | `alt="Hermes"` | 替换登录页 Logo alt 文本 | P0 |
| 4 | `packages/client/src/views/LoginView.vue` | L64 | `{{ t("login.title") }}` | i18n 中 `login.title` 值为 `'Hermes Web UI'`，需替换 | P0 |
| 5 | `packages/client/src/i18n/locales/zh.ts` | L4 | `title: 'Hermes Web UI'` | 替换为自有品牌标题 | P0 |
| 6 | `packages/client/src/i18n/locales/en.ts` | L4 | `title: 'Hermes Web UI'` | 同上 | P0 |
| 7 | `packages/client/src/i18n/locales/de.ts` | L4 | `title: 'Hermes Web UI'` | 同上 | P0 |
| 8 | `packages/client/src/i18n/locales/es.ts` | L4 | 同上 | 同上 | P0 |
| 9 | `packages/client/src/i18n/locales/fr.ts` | L4 | 同上 | 同上 | P0 |
| 10 | `packages/client/src/i18n/locales/ja.ts` | L4 | 同上 | 同上 | P0 |
| 11 | `packages/client/src/i18n/locales/ko.ts` | L4 | 同上 | 同上 | P0 |
| 12 | `packages/client/src/i18n/locales/pt.ts` | L4 | 同上 | 同上 | P0 |
| 13 | `packages/client/src/i18n/locales/zh-TW.ts` | L4 | 同上 | 同上 | P0 |
| 14 | `packages/client/src/i18n/locales/ru.ts` | L4 | 同上 | 同上 | P0 |
| 15 | `packages/client/index.html` | `<title>` | 页面标题 | 替换为自有品牌名 | P0 |

### i18n 中所有包含 "Hermes" 的文案

10 个语言文件中，除了 `login.title`，还有以下关键文案含有 "Hermes"：

| i18n Key | 示例值（zh.ts） | 说明 |
|----------|----------------|------|
| `chat.emptyState` | `'开始与 Hermes Agent 对话'` | 聊天空态提示 |
| `history.hermesHistory` | `'Hermes 历史'` | 历史会话标签 |
| `history.historyScopeHint` | `'只读查看当前 profile 的 Hermes 历史会话'` | 历史提示 |
| `search.searchScope` | `'不包含只读 Hermes 历史会话'` | 搜索范围提示 |
| `plugins.notice` | `'Hermes 插件 manifest'` | 插件说明 |
| `models.aliasHint` | `'发送给 Hermes 的仍是原始模型 ID'` | 模型别名提示 |
| `models.visibilityHint` | `'不会改写 Hermes CLI 的配置'` | 模型可见性提示 |
| `profiles.switchTo` | `'切换 Hermes Profile'` | Profile 切换 |
| `profiles.switchConfirm` | `'切换 Hermes CLI 的 active profile'` | 切换确认 |
| `profiles.switchSuccess/Failed` | `'Hermes active profile 已切换/失败'` | 切换结果 |
| `settings.copilotAddDetected` | `'在 Hermes 中启用 Copilot'` | Copilot 检测 |
| `settings.copilotAddSourceEnv` | `'~/.hermes/.env'` | 环境变量路径 |
| `settings.copilotDeleteHintEnv/GhCli/AppsJson` | 多条含 Hermes | 删除提示 |
| `sidebar.updateTip` | `'hermes-web-ui update'` | 更新命令提示 |
| `skills.subtitle` | `'Hermes 会话中的技能'` | 技能页副标题 |
| `platform.weixinTokenHint` | `'hermes weixin'` | 微信令牌提示 |
| `changelog.new_0_*` | ~15 条含 "Hermes" | 更新日志条目 |

> **批量替换策略**：在 10 个 i18n 文件中全局搜索 `Hermes` 和 `hermes`，根据上下文决定替换为自有品牌名或保留（如 `hermes` 作为 API 路径/命令名时不宜修改）。

---

## 二、Logo & 图标资源

| # | 资源文件 | 用途 | 改动说明 | 优先级 |
|---|----------|------|----------|--------|
| 1 | `packages/client/public/logo.png` | 侧边栏 Logo + 登录页 Logo | 替换为自有品牌 Logo | P0 |
| 2 | `packages/client/public/favicon.ico` | 浏览器标签页图标 | 替换为自有品牌 Favicon | P0 |
| 3 | `packages/client/public/icons.svg` | SVG 图标集合（可能含品牌图标） | 检查并替换其中的品牌图标 | P1 |

---

## 三、外部链接 & 社交入口

侧边栏底部包含指向原项目的 GitHub 和官网链接。

| # | 文件 | 位置 | 原始内容 | 改动说明 | 优先级 |
|---|------|------|----------|----------|--------|
| 1 | `packages/client/src/components/layout/AppSidebar.vue` | L310 | `href="https://github.com/EKKOLearnAI/hermes-web-ui"` | 替换为自有 GitHub 仓库地址，或删除 | P0 |
| 2 | `packages/client/src/components/layout/AppSidebar.vue` | L313 | `href="https://ekkolearnai.com/"` | 替换为自有官网地址，或删除 | P0 |
| 3 | `packages/client/src/components/layout/AppSidebar.vue` | L311 | GitHub SVG 图标 | 如删除链接则同步移除图标 | P1 |

---

## 四、版本信息 & 更新提示

| # | 文件 | 位置 | 原始内容 | 改动说明 | 优先级 |
|---|------|------|----------|----------|--------|
| 1 | `packages/client/src/components/layout/AppSidebar.vue` | L317 | `Web UI v{{ appStore.serverVersion }}` | 可改品牌名前缀，如 `MyBrand v0.6.0` | P1 |
| 2 | `packages/client/src/i18n/locales/zh.ts` | L143 | `'hermes-web-ui update'` | 替换更新命令提示文案 | P1 |
| 3 | `packages/server/src/controllers/health.ts` | L50 | `packageName = 'hermes-web-ui'` | 版本检查 fallback 包名 | P2 |
| 4 | `packages/server/src/controllers/update.ts` | L91 | `'hermes-web-ui@latest'` | npm 自动更新包名，如自建 npm 则替换 | P2 |
| 5 | `packages/server/src/controllers/update.ts` | L79 | `'hermes-web-ui', 'bin', 'hermes-web-ui.mjs'` | CLI 脚本路径 | P2 |
| 6 | `packages/server/src/index.ts` | L88 | `` `hermes-web-ui v${APP_VERSION} starting...` `` | 启动日志 | P2 |

---

## 五、JWT & 认证标识

| # | 文件 | 位置 | 原始内容 | 改动说明 | 优先级 |
|---|------|------|----------|----------|--------|
| 1 | `packages/server/src/middleware/user-auth.ts` | L29 | `aud: 'hermes-web-ui'` | JWT audience 字段 | P1 |
| 2 | `packages/server/src/middleware/user-auth.ts` | L42 | `const JWT_AUDIENCE = 'hermes-web-ui'` | JWT audience 常量 | P1 |
| 3 | `packages/server/src/controllers/hermes/xai-auth.ts` | L294 | `referrer: 'hermes-web-ui'` | xAI OAuth referrer | P1 |

> **注意**：修改 JWT audience 后，已发放的旧 Token 将失效，所有用户需重新登录。

---

## 六、API Header & 数据存储标识

### 6.1 HTTP Header

| # | 文件 | 位置 | 原始内容 | 改动说明 | 优先级 |
|---|------|------|----------|----------|--------|
| 1 | `packages/client/src/stores/hermes/chat.ts` | L108 | `headers['X-Hermes-Profile']` | 如改品牌名需同步修改前后端 Header 名 | P2 |
| 2 | `packages/client/src/api/client.ts` | L96 | `headers['X-Hermes-Profile']` | 同上 | P2 |
| 3 | `packages/client/src/api/hermes/files.ts` | L87 | `headers['X-Hermes-Profile']` | 同上 | P2 |

> **建议**：如果后端（Hermes Agent）不改名，`X-Hermes-Profile` Header 可以保留。改名需前后端 + Agent 三端同步。

### 6.2 localStorage Key

| # | 文件 | Key 名 | 改动说明 | 优先级 |
|---|------|--------|----------|--------|
| 1 | `packages/client/src/composables/useTheme.ts` | `hermes_brightness` | 可改名，但旧用户主题偏好丢失 | P2 |
| 2 | `packages/client/src/composables/useTheme.ts` | `hermes_style` | 同上 | P2 |
| 3 | `packages/client/src/stores/hermes/app.ts` | `hermes_sidebar_collapsed` | 同上 | P2 |
| 4 | `packages/client/src/components/auth/DefaultCredentialPrompt.vue` | `hermes_default_credentials_prompt_dismissed_*` | 同上 | P2 |

> **建议**：这些 Key 仅影响本地存储，改名后旧设置会重置，可加迁移逻辑。

### 6.3 文件系统路径 & 环境变量

| # | 文件 | 内容 | 改动说明 | 优先级 |
|---|------|------|----------|--------|
| 1 | `packages/server/src/config.ts` | `HERMES_WEB_UI_HOME`、`~/.hermes-web-ui` | 数据目录名，改名需同步修改环境变量和默认路径 | P1 |
| 2 | `packages/server/src/db/index.ts` | `hermes-web-ui.db`、`hermes-web-ui.json` | 数据库文件名 | P1 |
| 3 | `bin/hermes-web-ui.mjs` | `HERMES_WEB_UI_HOME`、`.hermes-web-ui`、`hermes-web-ui.db` | CLI 入口文件中的路径 | P1 |
| 4 | `docker-compose.yml` | `hermes-webui` 容器名、`hermes-web-ui-local:latest` 镜像名 | Docker 部署标识 | P1 |
| 5 | `Dockerfile` | `HERMES_HOME=/home/agent/.hermes`、`HERMES_WEB_UI_MANAGED_GATEWAY` | 容器内路径 | P1 |

---

## 七、第三方服务 & Provider 标识

| # | 文件 | 位置 | 内容 | 改动说明 | 优先级 |
|---|------|------|------|----------|--------|
| 1 | `packages/server/src/shared/providers.ts` | L17-20 | `label: 'Codex-apikey.fun'`, `base_url: 'https://api.apikey.fun/v1'` | 中转站 API 提供商标签，按需移除或替换 | P1 |
| 2 | `packages/server/src/shared/providers.ts` | L31-34 | `label: 'Claude-apikey.fun'`, `base_url: 'https://api.apikey.fun'` | 同上 | P1 |
| 3 | `packages/server/src/shared/providers.ts` | L394-400 | `label: 'Nous Portal'`, `base_url: 'https://inference-api.nousresearch.com/v1'` | 原项目关联的模型 Provider，按需移除 | P1 |
| 4 | `packages/server/src/controllers/hermes/nous-auth.ts` | L7-8 | `NOUS_PORTAL_URL = 'https://portal.nousresearch.com'`, `NOUS_CLIENT_ID = 'hermes-cli'` | Nous Portal OAuth 登录，按需移除或替换 | P1 |
| 5 | `packages/server/src/shared/providers.ts` | L399 | `hermes-agent.nousresearch.com` 注释 | 仅注释，可清理 | P2 |

---

## 八、项目元数据 & 文档

| # | 文件 | 内容 | 改动说明 | 优先级 |
|---|------|------|----------|--------|
| 1 | `package.json` | `name: "hermes-web-ui"` | npm 包名 | P0 |
| 2 | `package.json` | `version: "0.6.0"` | 可选择保持或重置版本号 | P1 |
| 3 | `README.md` | 项目标题、描述、截图链接均含 "Hermes Web UI" | 全面替换 | P0 |
| 4 | `README_zh.md` | 同上 | 全面替换 | P0 |
| 5 | `LICENSE` | `Licensor: EKKOLearnAI`、`Licensed Work: Hermes Web UI` | **需获取商业授权后替换** | P0 |
| 6 | `.github/ISSUE_TEMPLATE/bug_report.yml` | `hermes_version` | 如保留 GitHub Issue 模板需修改 | P2 |
| 7 | `.github/ISSUE_TEMPLATE/config.yml` | `github.com/EKKOLearnAI/hermes-web-ui` 链接 | 同上 | P2 |
| 8 | `.github/workflows/docker-publish.yml` | `hermes-web-ui` Docker 镜像名 | 如使用 CI/CD 需修改 | P2 |
| 9 | `scripts/setup.sh` | `hermes-web-ui` 多处引用 | 安装脚本 | P2 |
| 10 | `scripts/hermes-mock.sh` | `hermes-agent`、`hermes_cli` | Mock 脚本 | P2 |

---

## 九、改动优先级汇总

### P0 — 必须改动（用户直接可见）

```
1. 替换 Logo 资源：logo.png、favicon.ico
2. 替换品牌名称：侧边栏 Logo 文字、登录页标题、index.html <title>
3. 替换 i18n 中 10 个语言文件的 login.title 和所有用户可见的 "Hermes" 文案
4. 替换/移除侧边栏底部 GitHub 和官网链接
5. 替换 README.md / README_zh.md 中的项目名和描述
6. 处理 LICENSE（获取商业授权或替换）
7. 替换 package.json 中的 name
```

### P1 — 建议改动（影响专业性和一致性）

```
1. 替换侧边栏版本号前缀
2. 替换/移除 providers.ts 中的 apikey.fun 和 Nous Portal
3. 替换/移除 nous-auth.ts 中的 Portal OAuth
4. 替换数据目录名（~/.hermes-web-ui → 自有品牌目录）
5. 替换数据库文件名（hermes-web-ui.db）
6. 替换 Docker 镜像名和容器名
7. 替换 JWT audience
```

### P2 — 可选改动（不影响用户体验）

```
1. 替换 localStorage Key（会导致旧用户设置重置）
2. 替换 HTTP Header 名 X-Hermes-Profile（需 Agent 端同步）
3. 替换 CLI 入口文件名和命令名
4. 替换 GitHub Actions / Issue 模板
5. 替换安装脚本中的引用
6. 清理 providers.ts 中的注释链接
```

---

## 十、快速操作清单（Checklist）

```
[ ] 1. 准备自有品牌 Logo (PNG, 建议正方形 256x256+) 和 Favicon (.ico)
[ ] 2. 替换 packages/client/public/logo.png
[ ] 3. 替换 packages/client/public/favicon.ico
[ ] 4. 修改 AppSidebar.vue L79-80 的 alt 和品牌名文字
[ ] 5. 修改 index.html 的 <title>
[ ] 6. 批量替换 10 个 i18n 文件中的 "Hermes Web UI" 和 "Hermes"
[ ] 7. 修改侧边栏底部 GitHub/官网链接 (AppSidebar.vue L310-314)
[ ] 8. 修改 package.json 的 name 字段
[ ] 9. 修改 README.md 和 README_zh.md
[ ] 11. 修改 providers.ts 移除/替换 apikey.fun 和 Nous Portal
[ ] 12. 修改 JWT audience (user-auth.ts)
[ ] 13. 修改数据目录名和数据库文件名（config.ts, db/index.ts, bin/hermes-web-ui.mjs）
[ ] 14. 修改 Dockerfile 和 docker-compose.yml
[ ] 15. 全局搜索 "hermes" 确认无遗漏
```

---

## 十一、注意事项

1. **LICENSE 合规**：当前项目使用 BSL 1.1 许可证，商业使用需要从 EKKOLearnAI 获取商业授权。贴牌前务必完成授权。
2. **Hermes Agent 联动**：`X-Hermes-Profile` Header、`~/.hermes/` 目录、`hermes` CLI 命令名等与底层 Hermes Agent 深度耦合。如果 Agent 端不更名，这些标识建议保留，仅替换 UI 层面的品牌展示。
3. **i18n 批量替换**：建议用脚本统一替换，但需注意区分"用户可见文案"和"API 路径/命令名"，后者不宜修改。
4. **数据库兼容**：修改数据库文件名或目录后，已部署实例的数据需要迁移。
5. **版本号管理**：如自行维护版本线，建议在 package.json 中重置版本号并建立自己的 changelog。
6. **Docker 镜像**：修改镜像名后需同步更新 CI/CD 和部署文档。

---

## 十二、OEM 改动分类（配置化 vs 谨慎处理）

将所有改动项按"修改后是否影响项目逻辑"分为两类，指导后续实施策略。

### 类别1：静态展示/纯文案项 — 可配置化

这类修改仅影响用户可见的展示内容，不涉及代码逻辑、数据路径或跨组件引用，可抽到一份统一配置文件（如 `oem.config.ts` 或 `oem.json`），构建时或运行时读取。

| 序号 | 原始内容 | 文件位置 | 配置化建议 |
|------|----------|----------|------------|
| 1 | 侧边栏 Logo 文字 `Hermes` | `AppSidebar.vue` L80 | `brand.name` |
| 2 | 侧边栏 Logo `alt="Hermes"` | `AppSidebar.vue` L79 | `brand.name` |
| 3 | 登录页 Logo `alt="Hermes"` | `LoginView.vue` L62 | `brand.name` |
| 4 | 登录页标题 `login.title`（10 个语言文件） | `i18n/locales/*.ts` | `brand.loginTitle`，构建时注入 i18n |
| 5 | `index.html` `<title>` | `packages/client/index.html` | `brand.pageTitle` |
| 6 | Logo 资源 `logo.png` | `packages/client/public/logo.png` | `brand.logoPath`，指向替换文件 |
| 7 | Favicon `favicon.ico` | `packages/client/public/favicon.ico` | `brand.faviconPath` |
| 8 | SVG 图标集 `icons.svg` | `packages/client/public/icons.svg` | `brand.iconsPath` |
| 9 | 侧边栏 GitHub 链接 | `AppSidebar.vue` L310 | `links.github`（留空则隐藏） |
| 10 | 侧边栏官网链接 | `AppSidebar.vue` L313 | `links.website`（留空则隐藏） |
| 11 | 侧边栏版本号前缀 `Web UI v...` | `AppSidebar.vue` L317 | `brand.versionPrefix` |
| 12 | i18n 全部含 "Hermes" 的用户可见文案（约 15+ key × 10 语言） | `i18n/locales/*.ts` | `brand.name`，构建时批量替换 i18n 值中的占位符 |
| 13 | `README.md` / `README_zh.md` 中的项目名和描述 | 根目录 | 构建时根据配置生成（非运行时） |
| 14 | `LICENSE` 中的授权方和工作名 | `LICENSE` | 构建时根据配置生成 |
| 15 | `providers.ts` 中的 apikey.fun 和 Nous Portal 标签/URL | `providers.ts` | `providers` 数组，按需增减 |
| 16 | `providers.ts` 中的注释链接 | `providers.ts` L399 | `providers.cleanupComments` |

**关键特征**：修改这些项只是"换个壳"，项目运行逻辑、数据存储、API 通信完全不受影响。

**已实现配置化**：以上 16 项已全部通过 `oem.config.ts` 实现配置化，无需修改任何源码即可完成品牌展示定制。配置文件位于项目根目录，修改后保存即生效（支持 HMR 热更新）。

配置文件结构与类别1对应关系：

```typescript
// oem.config.ts
const oemConfig = {
  brand: {
    name: 'Hermes',           // → 序号 1, 2, 3, 12
    loginTitle: 'Hermes Web UI', // → 序号 4
    pageTitle: 'Hermes',      // → 序号 5
    versionPrefix: 'Web UI',  // → 序号 11
    logoPath: '/logo.png',    // → 序号 6
    faviconPath: '/favicon.ico', // → 序号 7
  },
  links: {
    github: 'https://...',    // → 序号 9（设为 '' 隐藏）
    website: 'https://...',   // → 序号 10（设为 '' 隐藏）
  },
  providers: {
    excludeValues: [],        // → 序号 15, 16（填 provider value 移除）
  },
  i18n: {
    brandName: 'Hermes',      // → 序号 12（全局替换 i18n 中的品牌名）
  },
}
```

实现架构说明：

| 层级 | 文件 | 职责 |
|------|------|------|
| 配置源 | `oem.config.ts`（项目根目录） | 单一真相源，用户唯一需要修改的文件 |
| 客户端桥接 | `packages/client/src/config/oem.ts` | 通过 `@oem-config` Vite 别名引用根配置，提供 `replaceBrandInText()` 工具函数 |
| 服务端桥接 | `packages/server/src/config/oem.ts` | 通过相对路径引用根配置 |
| Vite 别名 | `vite.config.ts` → `@oem-config` | 使客户端代码可引用项目根配置 |
| i18n 钩子 | `packages/client/src/i18n/index.ts` | `postTranslation: replaceBrandInText` 自动替换所有翻译文本中的品牌名 |
| Provider 过滤 | `packages/server/src/shared/providers.ts` | 模块加载时根据 `oemConfig.providers.excludeValues` 过滤 `_RAW_PROVIDER_PRESETS`，导出为 `PROVIDER_PRESETS` |

修改了以下源文件以读取 OEM 配置（修改后无需再次改动）：
- `vite.config.ts` — 新增 `@oem-config` 别名
- `packages/client/src/config/oem.ts` — 新建，客户端 OEM 运行时模块
- `packages/server/src/config/oem.ts` — 新建，服务端 OEM 运行时模块
- `packages/client/src/i18n/index.ts` — 添加 `postTranslation` 钩子
- `packages/client/src/main.ts` — 动态设置页面标题和 favicon
- `packages/client/src/components/layout/AppSidebar.vue` — 品牌名、Logo、链接、版本前缀
- `packages/client/src/views/LoginView.vue` — 品牌 Logo、登录标题
- `packages/server/src/shared/providers.ts` — Provider 预设过滤

### 类别2：改名会影响代码引用 — 需谨慎处理

这类修改牵涉跨文件/跨模块的硬编码引用、数据兼容性或外部系统联动，不能简单替换字符串，需评估影响范围。

| 序号 | 原始内容 | 影响范围 | 风险说明 |
|------|----------|----------|----------|
| 1 | `package.json` `name: "hermes-web-ui"` | npm 包名、构建产物、可能的内部 import 路径 | 改名可能影响 monorepo 内部包引用、发布流程 |
| 2 | `HERMES_WEB_UI_HOME` / `~/.hermes-web-ui` 数据目录 | `config.ts`、`db/index.ts`、`bin/hermes-web-ui.mjs`、`Dockerfile` | 改名后已有用户数据目录找不到，需迁移逻辑 |
| 3 | `hermes-web-ui.db` / `hermes-web-ui.json` 数据库文件名 | `db/index.ts`、`bin/hermes-web-ui.mjs` | 同上，改名后旧数据库文件不识别 |
| 4 | JWT audience `hermes-web-ui` | `user-auth.ts` L29/L42 | 改名后已发放的 Token 全部失效，所有用户强制重新登录 |
| 5 | `X-Hermes-Profile` HTTP Header | `chat.ts`、`client.ts`、`files.ts` (前端) + 后端 + Hermes Agent | 需前端 + 后端 + Agent 三端同步修改，任何一端不匹配即功能异常 |
| 6 | localStorage Key（`hermes_brightness` 等 4 个） | `useTheme.ts`、`app.ts`、`DefaultCredentialPrompt.vue` | 改名后旧用户本地设置丢失，需写迁移脚本 |
| 7 | `nous-auth.ts` 中 OAuth URL 和 Client ID | `nous-auth.ts` L7-8 | 修改影响 OAuth 登录流程，需对接新的 OAuth Provider |
| 8 | `xAI OAuth referrer: 'hermes-web-ui'` | `xai-auth.ts` L294 | 修改影响 xAI 认证流程 |
| 9 | Docker 镜像名/容器名 | `docker-compose.yml`、`Dockerfile` | 修改影响部署脚本和 CI/CD |
| 10 | `update.ts` 中的 npm 包名和 CLI 脚本路径 | `update.ts` L79/L91 | 改名后自动更新功能失效或指向错误包 |
| 11 | `health.ts` 中的 packageName fallback | `health.ts` L50 | 改名影响版本检查逻辑 |
| 12 | CLI 入口文件名 `bin/hermes-web-ui.mjs` | 根目录 bin/ | 改名影响 CLI 启动命令 |
| 13 | GitHub Actions / Issue 模板 | `.github/` 目录 | 改名影响 CI/CD 和社区贡献流程 |
| 14 | 安装脚本 `scripts/setup.sh` 中的引用 | `scripts/setup.sh` | 改名影响安装流程 |

### 分类总结

| 维度 | 类别1（可配置化） | 类别2（需谨慎） |
|------|-------------------|-----------------|
| 数量 | 16 项 | 14 项 |
| 核心特征 | 纯展示层，改了不影响逻辑 | 改名会传导到存储/认证/API/部署等链路 |
| 实施策略 | 统一抽到 `oem.config.*`，构建时/运行时注入 | 逐项评估影响面，必要时写迁移脚本或保持原值 |
| 优先级 | **高** — 改动安全、收益大、可快速落地 | **低** — 风险高、收益有限、需协调多端 |

> **特别提示**：类别2中，JWT audience（#4）和 HTTP Header（#5）风险最高，涉及认证和数据通信的核心链路；数据目录和数据库文件名（#2、#3）需要迁移逻辑支持，否则已有用户数据会丢失。建议类别2的项暂不改动，或在有完整迁移方案后再逐步推进。
