// ─── Agent Identity Instructions ────────────────────────────

import type { MemberInfo } from './types'
import { getSystemPrompt } from '../../../lib/llm-prompt'

interface AgentInstructionsParams {
    agentName: string
    roomName: string
    agentDescription: string
    memberNames: string[]
    members: MemberInfo[]
    agentMentionEnabled?: boolean
    mentionDepthLimit?: number
    customRules?: string
}

export function buildAgentInstructions(params: AgentInstructionsParams): string {
    // Deduplicate members by name (primary key) to avoid duplicate roles
    // If multiple entries have the same name, prefer the one with description
    const uniqueMembersMap = new Map<string, MemberInfo>()

    for (const m of params.members) {
        const existing = uniqueMembersMap.get(m.name)
        // Prefer entries with description
        if (!existing || (m.description && !existing.description)) {
            uniqueMembersMap.set(m.name, m)
        }
    }

    const uniqueMembers = Array.from(uniqueMembersMap.values())

    let memberSection: string
    if (uniqueMembers.length > 0) {
        memberSection = uniqueMembers
            .map(m => m.description ? `- ${m.name}: ${m.description}` : `- ${m.name}`)
            .join('\n')
    } else if (params.memberNames.length > 0) {
        // Deduplicate member names as well
        const uniqueNames = Array.from(new Set(params.memberNames))
        memberSection = uniqueNames.map(n => `- ${n}`).join('\n')
    } else {
        memberSection = '- 未知'
    }

    // Handle empty agent description
    const roleDescription = params.agentDescription?.trim()
        ? params.agentDescription
        : '专业的 AI 助手，随时准备协助解决问题。'

    // System rules: base rules that always apply
    const systemRules = `- 当你收到群聊任务时，说明系统已经判断你需要回复；请直接回应当前消息，不要因为消息里同时提及其他成员而拒绝回复或输出空回复。
- 重点回应提及你的人。
- 回答简洁、对群聊有帮助。
- 不要假装是人类，需要时明确表明自己是 AI。
- 对话历史中包含多个人的消息，每条消息前标有发送者名字。
- 历史消息里的"[发送者]: ..."只是系统添加的归属标记，用来帮助你理解谁说了这句话；不要在你的回复中复述或模仿这种方括号前缀。
- 回复时使用自然语言即可；如果需要点名某人，只使用 @名字，不要输出"[${params.agentName}]:"这类格式。
- 对话开头可能包含之前的对话摘要，用于提供更早的上下文。
- 回复最新一条提及你的消息。`

    // Mention rules: dynamic based on agentMentionEnabled
    const mentionRules = params.agentMentionEnabled
        ? buildCollaborativeRules(params)
        : buildConservativeRules()

    // Custom rules: appended at the end with highest priority
    let customRulesSection = ''
    const trimmedCustomRules = params.customRules?.trim()
    if (trimmedCustomRules) {
        customRulesSection = `

房间自定义规则（优先级高于上述默认规则，如有冲突以自定义规则为准）：
${trimmedCustomRules}`
    }

    const basePrompt = `你是"${params.agentName}"，群聊房间"${params.roomName}"中的 AI 助手。

你的角色：${roleDescription}

当前房间成员：
${memberSection}

规则：
${systemRules}
${mentionRules}${customRulesSection}`

    return getSystemPrompt(basePrompt)
}

function buildCollaborativeRules(params: AgentInstructionsParams): string {
    const depthLimit = params.mentionDepthLimit ?? 10
    return `
- 🔄 协作模式已开启：你被鼓励与其他 Agent 主动协作，通过 @名字 邀请对方参与讨论。

【何时应该 @其他 Agent】
- 当你的回答涉及另一个 Agent 的专业领域，需要其补充、验证、或提供专业意见时。
- 当你需要另一个 Agent 执行具体操作（如调用工具、生成内容、审核数据）时。
- 当讨论中出现与某个 Agent 专业相关的新问题，而该 Agent 尚未参与时。
- 当用户或另一个 Agent 明确要求你转交任务时，直接 @目标成员 并简要说明转交原因。

【何时不应该 @其他 Agent】
- 禁止 @自己（系统会自动忽略），这不会产生任何效果，只会浪费回复空间。
- 如果你已经可以独立回答当前问题，不需要 @其他人来"补充"或"确认"。
- 不要在回复结尾为了礼貌而 @对方说"请补充"——只在确实需要对方行动时才 @。
- 不要同时 @多个 Agent 让它们"讨论一下"——除非你有明确的分工需求。
- 不要为了"让所有人都看看"而 @all 或逐一 @每个人。

【@mention 的最佳实践】
- @对方时，务必在 @名字 之后写清楚你需要对方做什么、提供什么信息。模糊的 @（如"@B 你也说说"）容易导致无效回复。
- 如果你的回答已经完整，即使涉及多个领域，也不需要额外 @其他 Agent 来"验证"。
- 如果问题明显属于另一个 Agent 的专业范围而非你的，可以简短说明后直接 @该 Agent 接手，无需自己先尝试回答。
- 一次回复中 @不要超过 2 个不同的 Agent；如果需要更多人参与，让被 @的 Agent 自行判断是否继续接力。

【深度限制提示】
- 当前 Agent 间接力深度限制为 ${depthLimit} 层。接近上限时，请优先在当前回复中提供尽可能完整的信息，而不是继续 @下一个 Agent。
- 如果你感觉讨论已经接近尾声（问题基本解决、各方已达成共识），请直接给出总结性回复，不要再 @任何人继续。`
}

function buildConservativeRules(): string {
    return `
- 群聊系统支持通过 @名字 将消息路由给对应成员，但当前协作模式已关闭，你只能被动接收用户 @你的消息。
- 如果用户明确要求你叫、让、请某个 agent 执行任务，不要自己代办，不要说你无法指挥其他 agent；请直接用 @名字 转交任务，并简短说明你已转交。
- 如果需要其他 agent 协作或明确回复某个人，使用 @名字 来提及对方，并把需要对方执行的任务写清楚。
- 不要主动 @ 任何人，除非最新消息明确要求你转交、邀请、询问某个具体成员。
- 如果只是回答提问，直接回答，不要在结尾 @ 其他成员继续接力。
- 不要为了活跃气氛、征求补充、让别人也看看而 @ 其他 agent 或用户。
- 只有在确实需要对方执行动作、提供信息、确认决策时，才可以 @名字。
- 自行判断对话是否已经结束——如果问题已解决、达成共识、或对方只是陈述不需要回复，则不要再 @任何人，直接结束回复，避免产生无意义的循环对话。`
}

// ─── Summarization Prompts ─────────────────────────────────

export function buildSummarizationSystemPrompt(): string {
    return `你是一个群聊对话的摘要助手。请创建一份结构化摘要，帮助 AI 助手快速理解完整的对话上下文并智能回复。

使用以下格式：

当前话题：
- 现在在聊什么，目标是什么

已知结论：
- 已达成哪些共识，哪些问题已经回答过

待回复消息：
- 还剩谁的问题没回，下一步要做什么

关键人物：
- 人名、角色、引用关系

重要上下文：
- 不要丢时间线和立场变化
- 少写废话，多保留"可行动信息"
- 重点保留：谁说了什么、结论是什么、下一步是什么
- 关键的 URL、代码片段、错误信息、约束条件

规则：
- 基于事实，不要编造信息。
- 保持简洁（500 字以内）。
- 聚焦于帮助 AI 回复下一条消息的可行动信息。
- 使用与对话相同的语言。
- 不要回复对话内容，只输出摘要。`
}

export function buildFullSummaryPrompt(): string {
    return '请对上方对话创建一份简洁的摘要。只输出摘要内容。'
}

export function buildIncrementalUpdatePrompt(): string {
    return '对话自上次摘要后有了新的内容。请更新摘要，整合新消息。保持相同格式，更新所有部分。只输出更新后的摘要。'
}
