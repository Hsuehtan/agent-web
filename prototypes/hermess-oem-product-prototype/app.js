const navItems = [
  ["overview", "产品总览", "Map"],
  ["login", "登录与首次进入", "Auth"],
  ["chat", "AI 聊天工作台", "Core"],
  ["history", "历史与搜索", "Core"],
  ["group", "群聊房间", "Core"],
  ["jobs", "定时任务", "Agent"],
  ["kanban", "任务看板", "Agent"],
  ["channels", "平台渠道", "Agent"],
  ["skills", "技能与插件", "Agent"],
  ["memory", "记忆管理", "Agent"],
  ["models", "模型与 Provider", "Agent"],
  ["usage", "用量分析", "Monitor"],
  ["logs", "日志与性能", "Monitor"],
  ["profiles", "Profile 管理", "System"],
  ["files", "文件浏览器", "System"],
  ["terminal", "Web 终端", "System"],
  ["settings", "设置中心", "System"],
  ["mobile", "移动端主流程", "Mobile"]
];

const sidebarGroups = [
  ["会话", ["对话", "历史", "群聊", "搜索"]],
  ["代理", ["任务", "看板", "渠道", "技能", "插件", "记忆", "模型"]],
  ["监控", ["日志", "用量", "性能", "技能用量"]],
  ["系统", ["网关用户", "设置"]]
];

const stage = document.querySelector("#screenStage");
const title = document.querySelector("#screenTitle");
const nav = document.querySelector("#screenNav");
const modal = document.querySelector("#prototypeModal");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");
let activeScreen = "overview";

function shell(activeLabel, content, options = {}) {
  const sidebar = sidebarGroups.map(([group, items]) => `
    <div class="app-group">
      <div class="app-group-title">${group}</div>
      ${items.map((item) => `
        <div class="app-item ${item === activeLabel ? "active" : ""}">
          <span class="app-item-dot"></span><span>${item}</span>
        </div>
      `).join("")}
    </div>
  `).join("");

  return `
    <div class="prototype-page">
      <div class="app-shell">
        <aside class="app-sidebar">
          <div class="app-logo"><span class="app-logo-mark">H</span><span>Hermess</span></div>
          ${sidebar}
          <div class="sidebar-bottom">
            <div class="caption">用户</div>
            <div class="select-like">default</div>
            <div class="caption">模型</div>
            <div class="select-like">gpt-5.5</div>
            <div class="status ok">已连接</div>
          </div>
        </aside>
        <main class="app-main">${content}</main>
      </div>
    </div>
  `;
}

function pageHeader(titleText, subtitle, actions = "") {
  return `
    <header class="page-header">
      <div>
        <h2 class="page-title">${titleText}</h2>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
      </div>
      <div class="toolbar">${actions}</div>
    </header>
  `;
}

function metrics(items) {
  return `<div class="grid four">${items.map(([label, value, delta]) => `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-delta">${delta}</div>
    </div>
  `).join("")}</div>`;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderOverview() {
  return `
    <div class="prototype-page">
      ${pageHeader("Hermess OEM 产品总览", "面向自托管 AI Agent 的多模型、多渠道、多 Profile 管理台", `<button class="primary-btn" data-modal="flows">关键流程</button>`)}
      <div class="content grid">
        ${metrics([
          ["一级模块", "18", "覆盖当前路由"],
          ["核心对象", "Profile / Session / Model", "围绕隔离与授权"],
          ["主工作流", "6", "从登录到监控闭环"],
          ["设计主题", "Pure Ink", "黑白灰后台工具风格"]
        ])}
        <div class="grid three">
          <div class="panel">
            <h3>信息架构</h3>
            <p class="muted">侧边栏按会话、代理、监控、系统分组。底部固定 Profile、模型、语言、连接状态和退出入口。</p>
            <div class="chip-row">
              <span class="chip">会话</span><span class="chip">代理</span><span class="chip">监控</span><span class="chip">系统</span>
            </div>
          </div>
          <div class="panel">
            <h3>核心价值</h3>
            <p class="muted">把聊天、技能、任务、渠道、文件、终端和监控放在同一个自托管控制台里，降低多 Agent 运营成本。</p>
          </div>
          <div class="panel">
            <h3>OEM 关注点</h3>
            <p class="muted">品牌名称、Logo、登录页、侧边栏链接、版本信息、联系入口、Provider 可见性和默认登录提示。</p>
          </div>
        </div>
        <div class="panel">
          <h3>产品模块地图</h3>
          <div class="flow-map">
            ${[
              ["登录", "账号密码登录，默认凭据提醒，Token 会话保持。"],
              ["聊天", "会话列表、流式回复、工具调用、文件上传、模型切换。"],
              ["群聊", "房间、Agent 成员、@ 提及路由、邀请码。"],
              ["任务", "Cron 创建、暂停、恢复、立即执行、历史记录。"],
              ["渠道", "Telegram、Discord、Slack、WhatsApp、Matrix、飞书、微信、企业微信。"],
              ["模型", "Provider、OAuth、模型发现、默认模型与可见性。"],
              ["文件", "远程文件树、上传下载、预览编辑、重命名移动。"],
              ["监控", "用量、费用、缓存命中、日志、性能、技能调用。"],
              ["系统", "Profile、用户绑定、设置、终端、主题语言。"]
            ].map(([a, b]) => `<div class="flow-step"><strong>${a}</strong><p>${b}</p></div>`).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderLogin() {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-mark">H</div>
        <h2>Hermess Control</h2>
        <p class="muted">登录后管理 AI 会话、渠道、任务、模型与用量。</p>
        <div class="form-stack">
          <label class="caption">用户名</label>
          <div class="input-like">admin</div>
          <label class="caption">密码</label>
          <div class="input-like">••••••••</div>
          <button class="primary-btn" data-modal="login">登录</button>
        </div>
        <p class="caption" style="margin-top:18px">首次运行提示默认账号，并建议立即修改。</p>
      </div>
    </div>
  `;
}

function renderChat() {
  return shell("对话", `
    ${pageHeader("这是一张什么图片", "Bridge(beta) / default / gpt-5.5", `
      <button class="ghost-btn" data-modal="newChat">新建对话</button>
      <button class="icon-btn" data-modal="share">copy</button>
    `)}
    <div class="chat-layout">
      <aside class="session-list">
        <div class="toolbar" style="justify-content:space-between;margin-bottom:10px">
          <strong>会话</strong><button class="icon-btn" data-modal="batch">+</button>
        </div>
        ${["置顶: 生成图片提示词", "API SERVER: 哈哈", "Bridge: 这是一张什么图片", "CLI: 修改标题", "Cron: 周报摘要"].map((item, i) => `
          <div class="session-card ${i === 2 ? "active" : ""}">
            <strong>${item}</strong>
            <div class="small muted">gpt-5.5 · ${i === 2 ? "14:39" : "08:30"}</div>
          </div>
        `).join("")}
      </aside>
      <section class="conversation">
        <div class="message-scroll">
          <div class="message user"><div class="bubble">screenshot_20260513_215000 把界面这张图片发给我</div></div>
          <div class="message">
            <div class="caption">Assistant · 思考过程 22 字</div>
            <div class="bubble">
              这是一个 AI Web UI 的聊天界面。左侧为模块导航和 Profile/模型选择，中间为会话列表，右侧为流式消息区。<br />
              <br />建议原型保留：会话分组、工具调用折叠、文件抽屉、审批提示和上下文 token 显示。
            </div>
            <div class="tool-call">工具调用 request_file_preview(path) · 可展开参数/结果</div>
          </div>
          <div class="message user"><div class="bubble">批准本次读取文件</div></div>
          <div class="message">
            <div class="bubble">收到，已完成文件读取，并把文件摘要写入当前会话上下文。</div>
          </div>
        </div>
        <div class="composer">
          <div class="composer-box">
            <button class="icon-btn">clip</button>
            <div class="input-like">输入消息...（Enter 发送，Shift+Enter 换行）</div>
            <button class="primary-btn">发送</button>
          </div>
        </div>
      </section>
      <aside class="side-drawer">
        <div class="tabs"><button class="seg-btn active">文件</button><button class="seg-btn">终端</button><button class="seg-btn">大纲</button></div>
        <div class="card" style="margin-top:12px">
          <h3>待审批工具</h3>
          <p class="muted small">agent 请求访问当前 Profile 文件。</p>
          <div class="inline-actions"><button class="primary-btn">本次允许</button><button class="ghost-btn">拒绝</button></div>
        </div>
        <div class="card" style="margin-top:12px">
          <h3>上下文</h3>
          <p class="muted small">466 / 200.0k · 剩余 199.5k</p>
        </div>
      </aside>
    </div>
  `);
}

function renderHistory() {
  return shell("历史", `
    ${pageHeader("历史与搜索", "本地 Web UI 会话库 + 只读 Hermes 历史", `<button class="primary-btn" data-modal="search">打开 Ctrl+K 搜索</button>`)}
    <div class="content grid two">
      <div class="panel">
        <h3>会话搜索</h3>
        <div class="input-like">搜索标题、消息内容、模型、Profile</div>
        ${table(["会话", "来源", "模型", "更新时间"], [
          ["生成图片提示词", "Web UI", "gpt-5.5", "今天 14:39"],
          ["部署环境排查", "CLI", "glm-5-turbo", "昨天 18:06"],
          ["定时日报", "Cron", "gpt-5.5", "周一 09:00"]
        ])}
      </div>
      <div class="panel">
        <h3>历史详情</h3>
        <p class="muted">右侧展示只读历史消息、来源标签、Profile 提示和重新打开为新会话的入口。</p>
        <div class="bubble">用户：帮我分析 server.log 中的连接异常。</div>
        <div class="bubble" style="margin-top:10px">助手：发现 WebSocket 握手失败，建议检查网关代理路径。</div>
      </div>
    </div>
  `);
}

function renderGroup() {
  return shell("群聊", `
    ${pageHeader("群聊房间", "多 Agent 协作、@ 提及路由、邀请码管理", `<button class="primary-btn" data-modal="room">创建房间</button>`)}
    <div class="content grid" style="grid-template-columns:260px 1fr 260px">
      <div class="panel">
        <h3>房间</h3>
        ${["产品评审室", "部署排障", "内容生产"].map((r, i) => `<div class="session-card ${i === 0 ? "active" : ""}"><strong>${r}</strong><div class="small muted">${i + 2} agents online</div></div>`).join("")}
      </div>
      <div class="panel">
        <h3>产品评审室</h3>
        <div class="bubble">@Design 请根据 OEM 改动点补充登录页。</div>
        <div class="bubble" style="margin-top:10px">@Backend 检查 Profile 权限绑定是否覆盖普通管理员。</div>
        <div class="composer" style="border:0;padding:16px 0 0"><div class="input-like">@Agent 输入消息...</div></div>
      </div>
      <div class="panel">
        <h3>Agent 成员</h3>
        ${["Design Agent", "Backend Agent", "QA Agent", "Writer Agent"].map((a) => `<p><span class="status ok">${a}</span></p>`).join("")}
        <button class="ghost-btn" data-modal="invite">邀请码管理</button>
      </div>
    </div>
  `);
}

function renderJobs() {
  return shell("任务", `
    ${pageHeader("定时任务", "Cron 任务创建、暂停、恢复、立即执行与历史记录", `<button class="primary-btn" data-modal="job">新建任务</button>`)}
    <div class="content grid two">
      <div class="panel">
        <h3>任务列表</h3>
        ${table(["名称", "Cron", "状态", "操作"], [
          ["每日运营日报", "0 9 * * *", '<span class="status ok">运行中</span>', "立即执行"],
          ["清理临时上传", "0 */6 * * *", '<span class="status warn">暂停</span>', "恢复"],
          ["周报摘要", "0 18 * * 5", '<span class="status ok">运行中</span>', "编辑"]
        ])}
      </div>
      <div class="panel">
        <h3>运行历史</h3>
        ${table(["时间", "任务", "耗时", "结果"], [
          ["09:00", "每日运营日报", "38s", '<span class="status ok">成功</span>'],
          ["06:00", "清理临时上传", "4s", '<span class="status ok">成功</span>'],
          ["昨天", "周报摘要", "61s", '<span class="status danger">失败</span>']
        ])}
      </div>
    </div>
  `);
}

function renderKanban() {
  return shell("看板", `
    ${pageHeader("任务看板", "把 Agent 输出转成可跟进任务", `<button class="primary-btn" data-modal="task">新增卡片</button>`)}
    <div class="content">
      <div class="kanban">
        ${[
          ["Inbox", ["整理 OEM 配置项", "补充品牌资源规范"]],
          ["Ready", ["平台渠道验收", "移动端侧边栏测试"]],
          ["Doing", ["模型 Provider 分组"]],
          ["Done", ["登录页默认凭据提示", "用量页周期切换"]]
        ].map(([col, tasks]) => `
          <div class="kanban-col">
            <strong>${col}</strong>
            ${tasks.map((task) => `<div class="task-card">${task}<div class="small muted">P1 · default</div></div>`).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `);
}

function renderChannels() {
  return shell("渠道", `
    ${pageHeader("平台渠道", "统一配置 8 个平台凭证和行为策略", `<button class="primary-btn" data-modal="save">保存配置</button>`)}
    <div class="content grid two">
      ${["Telegram", "Discord", "Slack", "WhatsApp", "Matrix", "飞书", "微信", "企业微信"].map((p, i) => `
        <div class="panel platform-card">
          <div>
            <h3>${p}</h3>
            <p class="muted small">Token / 提及控制 / 自动线程 / 白名单 / 表情回应</p>
            <div class="input-like">${i % 3 === 0 ? "已填写凭证" : "等待配置"}</div>
          </div>
          <span class="status ${i % 3 === 0 ? "ok" : "warn"}">${i % 3 === 0 ? "已配置" : "未配置"}</span>
        </div>
      `).join("")}
    </div>
  `);
}

function renderSkills() {
  return shell("技能", `
    ${pageHeader("技能与插件", "浏览技能、查看附件、管理插件 manifest", `<button class="primary-btn" data-modal="plugin">安装插件</button>`)}
    <div class="content grid two">
      <div class="panel">
        <h3>技能库</h3>
        <div class="input-like">搜索 skill 名称、描述、附件</div>
        ${["hyperframes", "markdown-viewer", "apikey-image-gen", "remotion"].map((s) => `<div class="session-card active"><strong>${s}</strong><div class="small muted">已安装 · 含 SKILL.md</div></div>`).join("")}
      </div>
      <div class="panel">
        <h3>插件管理</h3>
        ${table(["插件", "状态", "入口"], [
          ["Botmail", '<span class="status ok">可用</span>', "Inbox"],
          ["Figma", '<span class="status ok">已连接</span>', "Design"],
          ["Custom Agent Tool", '<span class="status warn">需配置</span>', "Settings"]
        ])}
      </div>
    </div>
  `);
}

function renderMemory() {
  return shell("记忆", `
    ${pageHeader("记忆管理", "用户笔记、档案、长期偏好与 Profile 隔离", `<button class="primary-btn" data-modal="memory">新增记忆</button>`)}
    <div class="content grid two">
      <div class="panel">
        <h3>用户档案</h3>
        <div class="textarea-like" style="min-height:180px">用户偏好：使用中文沟通；需要简洁工程说明；关注 OEM 商业化改动。</div>
      </div>
      <div class="panel">
        <h3>记忆条目</h3>
        ${["默认 Profile 用于 Web UI 测试", "偏好 Pure Ink 主题", "部署环境为本地 + Docker 可选"].map((m) => `<div class="session-card active">${m}</div>`).join("")}
      </div>
    </div>
  `);
}

function renderModels() {
  return shell("模型", `
    ${pageHeader("模型与 Provider", "凭证池发现、OAuth 登录、默认模型、可见性", `<button class="primary-btn" data-modal="provider">新增 Provider</button>`)}
    <div class="content grid">
      ${metrics([
        ["Provider", "6", "2 个 OAuth"],
        ["可见模型", "42", "按 Profile 授权"],
        ["默认模型", "gpt-5.5", "default Profile"],
        ["缓存命中", "68%", "近 30 天"]
      ])}
      ${table(["Provider", "Base URL", "模型", "状态"], [
        ["OpenAI Compatible", "https://api.example.com/v1", "gpt-5.5, gpt-5-mini", '<span class="status ok">可用</span>'],
        ["Nous Portal", "OAuth", "Hermes-3, DeepHermes", '<span class="status ok">已登录</span>'],
        ["Custom Local", "http://localhost:11434/v1", "qwen, llama", '<span class="status warn">需检测</span>']
      ])}
    </div>
  `);
}

function renderUsage() {
  return shell("用量", `
    ${pageHeader("用量分析", "Token、费用、模型分布、每日趋势", `<button class="seg-btn active">30d</button><button class="seg-btn">90d</button><button class="ghost-btn">刷新</button>`)}
    <div class="content grid">
      ${metrics([
        ["输入 Token", "3.8M", "+12%"],
        ["输出 Token", "1.1M", "+8%"],
        ["预估费用", "$42.18", "-3%"],
        ["会话数", "286", "+31"]
      ])}
      <div class="grid two">
        <div class="panel">
          <h3>30 天趋势</h3>
          <div class="chart-bars">${[45, 60, 24, 80, 66, 34, 48, 94, 70, 42, 58, 86].map((h) => `<div class="bar" style="height:${h}%"></div>`).join("")}</div>
        </div>
        <div class="panel">
          <h3>模型分布</h3>
          <div class="donut"></div>
          <div class="chip-row"><span class="chip">gpt-5.5 38%</span><span class="chip">glm-5 27%</span><span class="chip">local 35%</span></div>
        </div>
      </div>
    </div>
  `);
}

function renderLogs() {
  return shell("日志", `
    ${pageHeader("日志与性能", "Agent / Server / Error 日志过滤，节点性能仅超级管理员可见", `<button class="primary-btn">下载日志</button>`)}
    <div class="content grid two">
      <div class="panel">
        <h3>日志过滤</h3>
        <div class="toolbar"><div class="select-like">server.log</div><div class="select-like">level: warn</div><div class="input-like">keyword: websocket</div></div>
        <div class="terminal" style="min-height:300px">[12:01:09] INFO server listening on 8648<br>[12:03:44] WARN websocket reconnect profile=default<br>[12:04:10] INFO chat-run completed session=abc123</div>
      </div>
      <div class="panel">
        <h3>性能监控</h3>
        ${metrics([
          ["CPU", "28%", "normal"],
          ["Memory", "1.8GB", "stable"],
          ["WS", "12", "active"],
          ["P95", "1.2s", "chat-run"]
        ])}
      </div>
    </div>
  `);
}

function renderProfiles() {
  return shell("网关用户", `
    ${pageHeader("Profile 管理", "创建、切换、导入导出、账号绑定 Profile 权限", `<button class="primary-btn" data-modal="profile">创建 Profile</button>`)}
    <div class="content grid two">
      <div class="panel">
        <h3>Profiles</h3>
        ${["default", "demo", "enterprise", "sandbox"].map((p, i) => `<div class="session-card ${i === 0 ? "active" : ""}"><strong>${p}</strong><div class="small muted">${i === 0 ? "active" : "available"} · sessions isolated</div></div>`).join("")}
      </div>
      <div class="panel">
        <h3>用户绑定</h3>
        ${table(["用户", "角色", "可访问 Profile"], [
          ["admin", "super_admin", "all"],
          ["ops", "admin", "default, enterprise"],
          ["demo-user", "admin", "demo"]
        ])}
      </div>
    </div>
  `);
}

function renderFiles() {
  return shell("网关用户", `
    ${pageHeader("文件浏览器", "远程后端文件树、上传下载、预览编辑", `<button class="primary-btn" data-modal="upload">上传</button><button class="ghost-btn">新建文件夹</button>`)}
    <div class="content">
      <div class="file-split">
        <aside class="file-tree">
          <strong>/default</strong>
          ${["uploads", "outputs", "skills", "logs", "workspace"].map((f) => `<div class="session-card">${f}</div>`).join("")}
        </aside>
        <section class="panel" style="border:0;border-radius:0">
          <div class="toolbar" style="justify-content:space-between"><strong>/default/outputs</strong><div class="input-like">搜索文件</div></div>
          ${table(["名称", "类型", "大小", "更新时间"], [
            ["report.md", "Markdown", "14 KB", "今天"],
            ["chart.png", "Image", "280 KB", "昨天"],
            ["session-export.json", "JSON", "92 KB", "周一"]
          ])}
          <div class="bubble" style="margin-top:14px">预览：report.md 内容，支持语法高亮与下载。</div>
        </section>
      </div>
    </div>
  `);
}

function renderTerminal() {
  return shell("网关用户", `
    ${pageHeader("Web 终端", "node-pty + WebSocket，多会话 PTY", `<button class="primary-btn">新建终端</button>`)}
    <div class="content">
      <div class="tabs"><button class="seg-btn active">default</button><button class="seg-btn">docker</button><button class="seg-btn">ssh-prod</button></div>
      <div class="terminal" style="margin-top:12px">$ hermes-web-ui start<br>Hermess Control listening on http://localhost:8648<br><br>$ hermes chat --profile default<br>Connected to agent bridge.<br><br>$ _</div>
    </div>
  `);
}

function renderSettings() {
  return shell("设置", `
    ${pageHeader("设置中心", "账户、用户、显示、Agent、记忆、压缩、会话、隐私、模型、语音", `<button class="primary-btn">保存</button>`)}
    <div class="content grid">
      <div class="tabs">${["账户", "用户", "显示", "Agent", "记忆", "压缩", "会话", "隐私", "模型", "语音"].map((t, i) => `<button class="seg-btn ${i === 0 ? "active" : ""}">${t}</button>`).join("")}</div>
      <div class="grid two">
        <div class="panel">
          <h3>账户设置</h3>
          <label class="caption">用户名</label><div class="input-like">admin</div>
          <label class="caption">新密码</label><div class="input-like" style="margin-top:8px">••••••••</div>
        </div>
        <div class="panel">
          <h3>显示设置</h3>
          ${["流式输出", "紧凑模式", "显示推理过程", "显示费用"].map((s, i) => `<p><span class="status ${i === 0 ? "ok" : "warn"}">${s}</span></p>`).join("")}
        </div>
      </div>
    </div>
  `);
}

function renderMobile() {
  return `
    <div class="prototype-page">
      ${pageHeader("移动端主流程", "可折叠侧边栏、会话列表覆盖层、底部输入区")}
      <div class="content">
        <div class="mobile-frame">
          <div class="mobile-chat">
            <div class="mobile-topbar"><button class="icon-btn">menu</button><strong>这是一张什么图片</strong><button class="icon-btn">+</button></div>
            <div class="message-scroll" style="padding:16px">
              <div class="message user"><div class="bubble">把界面这张图片发给我</div></div>
              <div class="message"><div class="bubble">这是当前聊天界面的移动端布局：顶部导航、消息流、底部输入区，侧边栏从左侧覆盖打开。</div></div>
              <div class="panel">
                <h3>会话抽屉</h3>
                <p class="muted small">点击 menu 后覆盖显示会话列表和 Profile/模型选择。</p>
              </div>
            </div>
            <div class="composer"><div class="composer-box"><button class="icon-btn">clip</button><div class="input-like">输入消息...</div><button class="primary-btn">发</button></div></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

const renderers = {
  overview: renderOverview,
  login: renderLogin,
  chat: renderChat,
  history: renderHistory,
  group: renderGroup,
  jobs: renderJobs,
  kanban: renderKanban,
  channels: renderChannels,
  skills: renderSkills,
  memory: renderMemory,
  models: renderModels,
  usage: renderUsage,
  logs: renderLogs,
  profiles: renderProfiles,
  files: renderFiles,
  terminal: renderTerminal,
  settings: renderSettings,
  mobile: renderMobile
};

function renderNav() {
  nav.innerHTML = navItems.map(([key, label, badge]) => `
    <button class="nav-button ${key === activeScreen ? "active" : ""}" data-screen="${key}">
      <span>${label}</span><span class="nav-badge">${badge}</span>
    </button>
  `).join("");
}

function renderScreen(key) {
  activeScreen = key;
  const item = navItems.find(([id]) => id === key);
  title.textContent = item ? item[1] : "产品总览";
  stage.innerHTML = renderers[key] ? renderers[key]() : renderOverview();
  renderNav();
}

function showModal(kind) {
  const copy = {
    flows: ["关键用户流程", [
      "登录：输入账号密码 -> 写入 Token -> 跳转聊天工作台 -> 提示修改默认凭据。",
      "新建会话：选择 Profile -> Provider -> 模型 -> 创建 Session -> 流式运行。",
      "工具审批：Agent 请求工具 -> 用户选择本次/本会话/总是允许/拒绝 -> 写入执行结果。",
      "配置渠道：选择平台 -> 填写凭证 -> 设置提及/线程策略 -> 保存到 .env 和 config.yaml。",
      "监控闭环：会话产生用量 -> 聚合费用和模型分布 -> 日志定位异常 -> 调整 Provider/模型。"
    ]],
    login: ["登录交互", ["空用户名/密码时展示表单错误。", "429/503 展示登录锁提示。", "首次默认账号登录后弹出修改默认凭据提醒。"]],
    newChat: ["新建对话弹窗", ["Profile 下拉：default/demo/enterprise。", "Provider 下拉随 Profile 权限变化。", "模型下拉显示别名，但发送给 Agent 的是原始模型 ID。"]],
    search: ["Ctrl+K 搜索", ["搜索本地 Web UI 会话库。", "支持按标题、消息、模型、Profile 过滤。", "只读 Hermes 历史不进入 Ctrl+K 范围。"]],
    job: ["任务表单", ["任务名、Cron 表达式、快捷预设、Prompt、启用状态。", "保存后进入任务列表，可立即执行。"]],
    provider: ["Provider 表单", ["预设 Provider 或自定义 OpenAI 兼容 URL。", "自动检测 /v1/models，支持非 v1 版本。", "可设置 Profile 可见性和默认模型。"]],
    profile: ["Profile 表单", ["新建、重命名、克隆、导入 .tar.gz、导出备份。", "超级管理员可绑定普通管理员可访问范围。"]],
    upload: ["上传文件", ["上传到当前 Profile 工作目录。", "下载时按真实路径解析，兼容 local、Docker、SSH、Singularity。"]],
    room: ["创建群聊房间", ["输入房间名和说明。", "添加 Agent 并设置各自 Profile。", "生成邀请码用于加入。"]],
    memory: ["新增记忆", ["支持用户笔记和长期偏好。", "按 Profile 隔离，受设置中的字符限制控制。"]],
    plugin: ["插件安装", ["读取插件 manifest。", "展示权限、入口和配置状态。", "安装后可出现在侧边栏或页面插槽。"]]
  };
  const [heading, items] = copy[kind] || ["交互说明", ["该按钮用于表达原型中的关键交互点。"]];
  modalTitle.textContent = heading;
  modalBody.innerHTML = `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  modal.hidden = false;
}

document.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-screen]");
  if (navButton) renderScreen(navButton.dataset.screen);

  const modalButton = event.target.closest("[data-modal]");
  if (modalButton) showModal(modalButton.dataset.modal);
});

document.querySelector("#modalClose").addEventListener("click", () => {
  modal.hidden = true;
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.hidden = true;
});

document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.querySelector("#themeToggle").textContent = document.body.classList.contains("dark") ? "切换浅色" : "切换深色";
});

document.querySelector("#flowButton").addEventListener("click", () => showModal("flows"));

renderScreen(activeScreen);
