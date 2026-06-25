# 部署环境专属 BUG 修复记录

> 记录仅在生产部署环境复现、开发沙箱中不复现的 BUG 及其修复。

---

## Bug D-1: 插件发现接口 500 (Plugins API 500 on FaaS)

### 复现路径
`GET /api/hermes/plugins` → HTTP 500

### 生产日志
```
[bootstrap] agent bridge failed to start: agent bridge exited before ready code=2 signal=null
```

### 根因分析

**开发环境**：`hermes-agent` 目录存在于 `/workspace/projects/hermes-agent`，Python 模块 `hermes_cli.plugins` 可正常 import，插件发现成功。

**生产 FaaS 环境**：`hermes-agent` 不随代码部署，`HERMES_AGENT_ROOT` 指向的目录不存在或为空。`plugins.ts` 中 `discoverHermesPlugins()` 调用 Python 脚本 `from hermes_cli.plugins import discover_plugins`，Python import 失败退出码 2，Node 侧未 catch 该错误，直接抛出 500。

### 为什么开发环境不复现
开发沙箱中 `hermes-agent` 是预装的，`PYTHON_BRIDGE` 脚本可以正常 import `hermes_cli` 模块。

### 修复方案

**文件**：`packages/server/src/services/hermes/plugins.ts`

在 `discoverHermesPlugins()` 函数中添加前置检查：
1. 调用 `resolveHermesPath()` 获取 `agentRoot`
2. 若 `agentRoot` 为 null 或目录不存在 → 跳过 Python 调用，返回空列表 + warn 日志
3. Python 进程 spawn 添加 `error` 事件监听 + 非零退出码处理

```typescript
// 修复前（简化）
async function discoverHermesPlugins(): Promise<PluginEntry[]> {
  const { agentRoot } = resolveHermesPath()
  // 直接执行 Python，未检查 agentRoot
  const result = await execPython(...)
  return JSON.parse(result)
}

// 修复后（简化）
async function discoverHermesPlugins(): Promise<PluginEntry[]> {
  const { agentRoot } = resolveHermesPath()
  if (!agentRoot || !existsSync(agentRoot)) {
    console.warn('[plugins] agentRoot not resolved or does not exist, skipping plugin discovery')
    return []
  }
  try {
    const result = await execPython(...)
    return JSON.parse(result)
  } catch (err) {
    console.warn('[plugins] failed to discover hermes plugins:', err)
    return []
  }
}
```

### 影响范围
- 插件列表在无 hermes-agent 环境下返回空列表而非 500
- 前端 Plugins 页面正常渲染空状态，不再报错

---

## Bug D-2: 终端功能不可用 (Terminal Feature Broken on FaaS)

### 复现路径
前端 Terminal 页面 → 连接失败或空白

### 生产构建日志
```
╭ Warning ───────────────────────────────────────────────────────╮
│   Ignored build scripts: @parcel/watcher@2.5.6, esbuild@0.27.7,│
│   node-pty@1.1.0.                                               │
│   Run "pnpm approve-builds" to pick which dependencies should   │
│   be allowed to run scripts.                                     │
╰──────────────────────────────────────────────────────────────────╯
```

### 根因分析

**开发环境**：`pnpm install` 默认执行所有构建脚本，`node-pty` 的 `install.js` 正常编译原生 C++ addon（通过 `node-gyp`），终端功能可用。

**生产 FaaS 构建环境**：pnpm v10 引入安全机制，`onlyBuiltDependencies` 未配置时默认拒绝执行第三方包的构建脚本。`node-pty@1.1.0` 的 `install.js`（编译原生模块）被跳过，导致 `node-pty.node` 二进制文件不存在，`require('node-pty')` 运行时抛出 `MODULE_NOT_FOUND`。

### 为什么开发环境不复现
开发沙箱使用 `pnpm install` 时 `node-pty` 的构建脚本被正常执行（或沙箱环境已有预编译的 node-pty），原生模块可用。

### 修复方案

**文件**：`package.json`

添加 `pnpm.onlyBuiltDependencies` 配置，允许 `esbuild` 和 `node-pty` 执行构建脚本：

```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "node-pty"
    ]
  }
}
```

### 补充说明
- `esbuild` 也被加入了允许列表，否则 Vite 构建同样会失败
- `@parcel/watcher` 未加入，它是文件监听库，生产环境不需要
- 此配置是 pnpm v10 的安全策略变更，之前版本默认执行所有构建脚本

### 影响范围
- 生产环境终端功能恢复可用
- 前端 Terminal 页面正常连接 WebSocket、创建 PTY 会话

---

## Bug D-3: hermes-agent 未随代码部署到生产环境

### 复现路径
生产部署后，agent bridge 启动失败、插件列表为空、gateway 无法启动：
```
[gateway-runner] failed to spawn hermes gateway process: spawn hermes ENOENT
[bootstrap] agent bridge failed to start: agent bridge exited before ready code=2 signal=null
```

### 根因分析

**FaaS 部署架构隔离**：Coze FaaS 将构建环境与运行环境完全隔离。代码打包阶段只将 git 跟踪的源码推送到构建环境，构建产物（`dist/`）被部署到 FaaS 运行时的 `/opt/bytefaas/` 目录。

问题链条：

1. **构建脚本未打包 hermes-agent**：`scripts/build-server.mjs` 只复制了 `skills/` 和 `agent-bridge/hermes_bridge.py`，没有将 `hermes-agent/` 源码复制到 `dist/` 目录

2. **HERMES_AGENT_ROOT 硬编码**：`.coze` 的 `deploy.run` 命令中 `HERMES_AGENT_ROOT=/workspace/projects/hermes-agent`，而 FaaS 运行时不存在 `/workspace/projects/` 目录，实际工作目录是 `/opt/bytefaas/`

3. **hermes CLI 不可用**：`hermes-mock.sh` 在构建时复制到 `/usr/local/bin/hermes`，但 FaaS 运行时无法访问构建环境的 `/usr/local/bin/`

4. **pip install -e 无效**：构建阶段执行 `pip install -e /workspace/projects/hermes-agent`（editable mode），创建的是指向源码的 `.egg-link`，运行时源码不存在，链接断裂

### 为什么开发环境不复现
- 开发沙箱 `/workspace/projects/hermes-agent` 目录始终存在
- `hermes-mock.sh` 已安装到 `/usr/local/bin/hermes`
- Python 模块通过 `pip install -e` 正常可用

### 修复方案

#### 1. 构建脚本打包 hermes-agent（`scripts/build-server.mjs`）

将 hermes-agent 核心源码（排除 tests/docs/web 等冗余目录）复制到 `dist/hermes-agent/`：

```javascript
// Copy hermes-agent source (excluding dev/test/docs/media) for production runtime.
const agentExcludes = new Set([
  '.git', '.venv', 'node_modules', 'tests', '.github', 'web', 'website',
  'ui-tui', 'datagen-config-examples', 'docker', 'infographic', 'images',
  'locales', 'nix', 'packaging', 'cron', 'plans', 'optional-skills',
  '__pycache__', 'hermes_agent.egg-info', 'docs', 'assets', '.plans',
  'mini-swe-agent', 'browser-use', 'agent-browser', 'environments',
  'examples', 'wandb', 'testlogs',
])

function copyAgentDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (agentExcludes.has(entry.name)) continue
    if (entry.isFile() && entry.name.startsWith('RELEASE_')) continue
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyAgentDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}
copyAgentDir(agentSrcDir, agentOutDir)
```

同时在 `dist/bin/hermes` 生成 CLI wrapper 脚本，使用相对路径定位 agent root：

```python
#!/usr/bin/env python3
import sys, os
agent_root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'hermes-agent')
os.environ.setdefault('HERMES_AGENT_ROOT', agent_root)
sys.path.insert(0, agent_root)
from hermes_cli.main import main
main()
```

#### 2. 修正 .coze 部署配置（`.coze`）

```toml
[deploy]
run = ["bash", "-c", "unset AUTH_DISABLED; HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN=0 HERMES_AGENT_ROOT=$(pwd)/dist/hermes-agent PATH=$(pwd)/dist/bin:$PATH node dist/server/index.js"]
```

关键变更：
- `HERMES_AGENT_ROOT` 从硬编码 `/workspace/projects/hermes-agent` 改为 `$(pwd)/dist/hermes-agent`（FaaS 运行时 `$(pwd)` 解析为 `/opt/bytefaas`）
- `PATH` 前置 `$(pwd)/dist/bin`，使 `hermes` CLI 可被 gateway-runner 等 spawn 调用
- `hermes_bridge.py` 的 `_ensure_agent_imports()` 通过 `HERMES_AGENT_ROOT` 环境变量定位源码，自动兼容

#### 3. Python 模块加载

`hermes_bridge.py` 已有 `_ensure_agent_imports()` 机制，会读取 `HERMES_AGENT_ROOT` 环境变量并添加到 `sys.path`，因此不再需要 `pip install -e`。构建阶段保留 `pip install -e` 仅为了 `hermes-mock.sh` 在构建时可用。

### 影响范围
- 生产环境 agent bridge 正常启动，插件发现可用
- 生产环境 gateway 可通过 `hermes` CLI 正常 spawn
- Bug D-1 的 plugins.ts 优雅降级仍保留，作为额外安全网

---

## 环境差异总结

| 维度 | 开发沙箱 | 生产 FaaS |
|------|----------|-----------|
| hermes-agent | 预装于 /workspace/projects/ | 需打包到 dist/hermes-agent/ |
| hermes CLI | /usr/local/bin/hermes (构建时复制) | dist/bin/hermes (构建脚本生成) |
| HERMES_AGENT_ROOT | /workspace/projects/hermes-agent (硬编码) | $(pwd)/dist/hermes-agent (动态解析) |
| pnpm 构建脚本 | 默认全部执行 | onlyBuiltDependencies 限制，需显式允许 |
| NODE_ENV | 未设置（但 cwd 含完整源码） | 未设置（代码部署到 /opt/bytefaas） |
| 可写目录 | 全局可写 | 仅 ~/.hermes-web-ui 及 /tmp |
| Python 可用 | 完整 Python 环境 + pip install -e | 有 Python 但需 sys.path 手动注入 |
| Python 第三方依赖 | 系统 site-packages 已安装 (PyYAML 等) | 系统环境干净，需 pip install --target 打包 |

---

## Bug D-4: Python 第三方依赖缺失导致插件发现和对话功能失败

### 现象

生产部署后：
1. 插件接口 500：`ModuleNotFoundError: No module named 'yaml'`
2. 对话功能报错：`No module named ...`

错误堆栈：
```
File "/opt/bytefaas/dist/hermes-agent/hermes_cli/plugins.py", line 51
  from utils import env_var_enabled
File "/opt/bytefaas/dist/hermes-agent/utils.py", line 12
  import yaml
ModuleNotFoundError: No module named 'yaml'
```

### 根因分析

Bug D-3 修复了 hermes-agent 源码打包到 `dist/hermes-agent/`，但 hermes-agent 的 Python 依赖（PyYAML、rich、prompt_toolkit 等）在 FaaS 运行时环境中不存在：

1. **构建时**：`pip install -e /workspace/projects/hermes-agent` 安装到系统 Python 的 `site-packages/`
2. **运行时**：FaaS 环境隔离，系统 Python 是干净的，`site-packages/` 中无这些依赖
3. `PYTHON_BRIDGE` 脚本能找到 `hermes_cli`（通过 `sys.path.insert(0, agent_root)`），但 `hermes_cli` → `utils.py` → `import yaml` 失败

### 为什么开发环境不复现

开发沙箱中 `pip install -e` 已将 PyYAML 等安装到系统 Python 的 `site-packages/`，Python 默认搜索路径即可找到。

### 修复

#### 1. 构建阶段：`pip install --target`

`.coze` 的 `deploy.build` 新增：
```bash
pip install --target=dist/pylibs -r /workspace/projects/hermes-agent/requirements.txt
```

将 Python 依赖安装到 `dist/pylibs/` 目录，随构建产物一起部署到 FaaS 运行时。

#### 2. 运行时：`PYTHONPATH` 注入

`.coze` 的 `deploy.run` 新增：
```bash
PYTHONPATH=$(pwd)/dist/pylibs:$(pwd)/dist/hermes-agent
```

确保 Python 解释器在运行时可找到第三方依赖。

#### 3. Node.js 代码：进程环境注入

`plugins.ts` 的 `discoverHermesPlugins()` 和 `manager.ts` 的 agent bridge spawn 添加：
```typescript
// 自动解析 dist/pylibs 路径
const pylibsDir = resolve(agentRoot, '..', 'pylibs')
if (existsSync(pylibsDir)) {
  env.PYTHONPATH = [pylibsDir, agentRoot, process.env.PYTHONPATH].filter(Boolean).join(':')
}
```

#### 4. dist/bin/hermes CLI wrapper

构建脚本自动将 `pylibs` 目录添加到 `sys.path`，确保 gateway 进程也能加载依赖。

### 影响范围

- 插件发现：`import yaml` 等第三方依赖可正常解析
- 对话功能：agent bridge 的 Python 进程可加载 hermes_cli 及其依赖
- gateway 进程：通过 `dist/bin/hermes` 启动，自动包含 pylibs

### 补充: Bug D-6 — pip install 在 FaaS 构建环境静默失败

> **状态: 未修复** — 详见 [faas-ws-handshake-diagnosis.md](./faas-ws-handshake-diagnosis.md) 第三节

Bug D-4 的修复方案在 FaaS 构建环境中未能生效:

1. **`pip install --target=dist/pylibs` 静默失败**: FaaS 构建日志显示 pip 输出 "Usage:"（无参数/参数无效），说明该命令未正确执行
2. **管道掩盖退出码**: `pip install ... 2>&1 | tail -5 && ...` 中，管道的退出码是 `tail` 的退出码（0），即使 pip 失败也不会中断 `&&` 链
3. **dist/pylibs 不存在**: pip 失败导致目录从未创建，PYTHONPATH 中的路径无效，Python 依赖仍缺失

这意味着 Bug D-4 的修复在 FaaS 环境中**实际未生效**，Python 第三方依赖问题仍然存在。

---

## Bug D-5: FaaS WebSocket 代理层握手失败

> **状态: 未修复** — 完整诊断见 [faas-ws-handshake-diagnosis.md](./faas-ws-handshake-diagnosis.md)

### 现象

生产日志中大量 WebSocket 握手失败:
```
[FaaS System] [wsConnProxy] Dial failed,
  URL: ws://9.100.181.67:5000/api/hermes/kanban/events?board=default&token=...&profile=default,
  err: websocket: bad handshake
```

所有 WebSocket 连接 100% 失败，导致 kanban/terminal/group-chat 等实时功能全部不可用。

### 根因

FaaS 平台的 `wsConnProxy` 组件向用户函数发起 WebSocket 连接时，用户函数返回非 101 响应，导致握手失败。具体原因待确认（需添加调试日志）。

### 影响

- 所有实时功能不可用
- 与 D-6 独立，需分别修复
