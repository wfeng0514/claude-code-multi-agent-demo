# Multi-Agent Demo

> 演示 Claude Code 中多 Agent 协作的完整模式：定义身份 → 编排工作流 → 生成日志。

## 核心理念

这个项目展示了如何用 **主 Agent（协调员）** 管理和分配任务给**多个专业子 Agent**，每个子 Agent 拥有独立的身份、提示词和能力边界。最终由协调员合成所有输出，并生成一份完整的**工作日志**记录谁做了什么。

```
你（用户）
  │  "run the simple-multi-agent workflow"
  ▼
┌─────────────────────────────────────────────────┐
│              主 Agent（对话中的你）                │
│         接收指令，决定启动哪个 Workflow            │
└────────────────────┬────────────────────────────┘
                     │ 调用 Workflow 工具
                     ▼
┌─────────────────────────────────────────────────┐
│              Workflow 编排脚本 (.js)              │
│    parallel() / pipeline() / phase()             │
│    定义执行顺序、数据流、错误处理                   │
└────────────────────┬────────────────────────────┘
                     │ agent(prompt, {agentType: 'xxx'})
                     ▼
┌─────────────────────────────────────────────────┐
│              子 Agent 实例（独立上下文）            │
│  加载 .claude/agents/*.md 中的系统提示词           │
│  + 当前任务的具体描述                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  高级     │ │  代码     │ │  技术     │         │
│  │  工程师   │ │  审查员   │ │  文档师   │         │
│  └──────────┘ └──────────┘ └──────────┘         │
└────────────────────┬────────────────────────────┘
                     │ 各自返回结果
                     ▼
┌─────────────────────────────────────────────────┐
│         协调员 Agent + 日志 Agent                 │
│  合成 SYNTHESIS.md  →  生成 WORK_LOG.md          │
└─────────────────────────────────────────────────┘
```

---

## 项目文件结构

```
项目根目录/
│
├── .claude/                              # Claude Code 配置根目录
│   │
│   ├── agents/                           # ★ 自定义 Agent 身份定义
│   │   ├── senior-developer.md           #   身份：高级软件工程师
│   │   ├── code-reviewer.md              #   身份：代码审查员
│   │   └── tech-writer.md               #   身份：技术文档工程师
│   │
│   └── workflows/                        # ★ Workflow 编排脚本
│       ├── simple-multi-agent.js         #   轻量演示（并行 + 合成）
│       └── multi-agent-demo.js           #   完整流水线（5 阶段）
│
└── multi-agent-demo/                     # ★ 演示输出目录
    ├── README.md                         #   你正在读的文件
    └── src/                              #   子 Agent 生成的代码放在这里
```

### 三层架构

| 层 | 位置 | 职责 |
|---|---|---|
| **身份定义层** | `.claude/agents/*.md` | 定义每个 Agent 的专长、规则、输出格式 |
| **编排逻辑层** | `.claude/workflows/*.js` | 定义执行顺序、数据流、并行/串行策略 |
| **产物输出层** | `multi-agent-demo/` | 存放 Agent 生成的代码、文档、日志 |

---

## Agent 身份定义

每个 `.claude/agents/*.md` 文件定义一个可复用的 Agent 身份，由**前置元数据（frontmatter）**和**系统提示词（body）**组成：

### 文件格式

```markdown
---
name: senior-developer          # 唯一标识符，workflow 中通过 agentType 引用
description: Senior software... # 一句话描述，用于自动匹配
model: opus                     # 可选：opus | sonnet | haiku | fable
---

你是一个 **高级软件工程师**...    # 系统提示词（正文）
```

### 三个预定义 Agent

| Agent | `agentType` | 模型 | 专长 |
|-------|-------------|------|------|
| **高级工程师** | `senior-developer` | Opus | 写代码、架构决策、测试 |
| **代码审查员** | `code-reviewer` | Opus | 找 bug、安全审查、性能分析 |
| **技术文档师** | `tech-writer` | Sonnet | README、API 文档、用户指南 |

### 如何创建新的 Agent 身份

在 `.claude/agents/` 下新建 `.md` 文件即可，例如：

```markdown
---
name: data-analyst
description: Data analyst specialized in SQL queries, pandas, and visualization.
model: sonnet
---

你是一个 **数据分析师**。专长：
- 写高效的 SQL 查询
- 用 pandas 清洗和分析数据
- 用 matplotlib 做数据可视化
...
```

创建后在 Workflow 中通过 `agentType: 'data-analyst'` 引用。

---

## Workflow 编排

Workflow 是纯 JavaScript 脚本，运行在 Workflow 工具中。核心 API：

### API 速查表

```javascript
// 1. 启动一个子 Agent
const result = await agent(
  '任务描述...',                      // prompt：给 Agent 的指令
  {
    label: 'dev:utils',              // 显示标签
    phase: 'Execute',                // 所属阶段（分组显示）
    agentType: 'senior-developer',   // 引用 .claude/agents/ 中的身份
    // model: 'sonnet',              // 可选：覆盖默认模型
    // schema: MY_SCHEMA,            // 可选：强制结构化输出
  }
)

// 2. 并行执行多个 Agent（等待全部完成）
const [a, b, c] = await parallel([
  () => agent(...),
  () => agent(...),
  () => agent(...),
])

// 3. 流水线执行（无阶段间等待）
//    item A 进入 stage 2 时 item B 可以还在 stage 1
const results = await pipeline(
  items,
  item => agent(/* stage 1 */),
  prev => agent(/* stage 2 */),
)

// 4. 声明阶段（在进度显示中分组）
phase('Develop')

// 5. 输出进度日志
log('✅ 已完成 xxx')
```

### `parallel()` vs `pipeline()`

| | `parallel()` | `pipeline()` |
|---|---|---|
| **阶段间行为** | 等待全部完成才进入下一阶段 | 无等待，各 item 独立流经各阶段 |
| **适用场景** | 需要汇集全部结果后才能下一步 | 各 item 独立，互不依赖 |
| **效率** | 最慢的 item 拖慢整体 | 总时间 = 最慢单 item 的链 |

### 两个演示 Workflow

#### `simple-multi-agent` — 轻量演示

```
Phase 1: Execute (并行)
  ┌──────────────────────────────────────────────────┐
  │ dev:utils      review:user-service  writer:readme │
  │ (senior-dev)   (code-reviewer)     (tech-writer)  │
  └──────────────────────────────────────────────────┘
           │               │                │
           └───────────────┼────────────────┘
                           ▼
Phase 2: Synthesize (串行)
  coordinator:synthesize ──▶ logger:work-log
```

**启动方式**：在 Claude Code 对话中输入
```
run the simple-multi-agent workflow
```

#### `multi-agent-demo` — 完整流水线

```
Phase 1: Plan
  coordinator:plan ── 分析任务，制定工作计划

Phase 2: Develop
  developer:implement ── 按计划写代码

Phase 3: Review
  reviewer:audit ── 审查代码质量

Phase 4: Document
  writer:document ── 写 README + 架构文档

Phase 5: Log
  logger:summarize ── 生成 WORK_LOG.md
```

**启动方式**：在 Claude Code 对话中输入
```
run the multi-agent-demo workflow
```

还可以传递参数：
```
run the multi-agent-demo workflow with task "build a WebSocket chat server" and language "Go"
```

---

## 在终端中的使用方式

### 方式一：对话中直接触发（最常用）

在 Claude Code 对话中直接说：

```
# 运行预定义 workflow
run the simple-multi-agent workflow

# 或者直接使用 Agent 工具
用 senior-developer 身份写一个 LRU Cache
用 code-reviewer 审查 src/auth.ts
```

### 方式二：`/workflows` 命令

```bash
# 在 Claude Code 中输入
/workflows
```

会列出所有可用的 workflow，选择即可运行。

### 方式三：通过 Claude Agent SDK 编程调用

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "run the simple-multi-agent workflow",
  options: {
    // 可以设置模型、权限等
    model: "claude-opus-4-8",
  },
});
```

### 方式四：使用 Managed Agents（生产环境）

如果要将多 Agent 协作部署为生产服务，使用 Managed Agents API：

```python
# 创建 coordinator agent
coordinator = client.beta.agents.create(
    name="Engineering Lead",
    model="claude-opus-4-8",
    system="你是一个工程协调员...",
    multiagent={
        "type": "coordinator",
        "agents": [
            "agent_developer_id",
            "agent_reviewer_id",
            "agent_writer_id",
        ],
    },
)

# 启动 session
session = client.beta.sessions.create(
    agent={"type": "agent", "id": coordinator.id, "version": coordinator.version},
    environment_id="env_xxx",
)

# 发送任务
client.beta.sessions.events.send(
    session_id=session.id,
    events=[{"type": "user.message", "content": [{"type": "text", "text": "构建..."}]}],
)
```

---

## 工作日志机制

每次 Workflow 运行完成后，Logger Agent 会生成 `WORK_LOG.md`，格式如下：

### 日志结构

```markdown
# Work Log — 2026-07-23

## Session Overview
| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-23 14:30 |
| 任务 | 构建 REST API 时间服务 |
| 总 Agent 数 | 5 |

## Agent Activity Log
| Agent | 身份 | 阶段 | 工作摘要 | 产出文件 |
|-------|------|------|----------|----------|
| coordinator:plan | 协调员 | Plan | 制定开发计划 | — |
| developer:implement | 高级工程师 | Develop | 实现 API 端点 | src/server.ts |
| reviewer:audit | 代码审查员 | Review | 发现 3 个问题 | — |
| writer:document | 技术文档师 | Document | 写 README | README.md |
| logger:summarize | 日志员 | Log | 生成本日志 | WORK_LOG.md |

## Timeline
1. 14:30 — 协调员制定计划
2. 14:31 — 开发工程师开始编码
3. 14:35 — 代码审查开始
...

## Artifacts Produced
- src/server.ts
- README.md
- WORK_LOG.md
```

---

## 进阶技巧

### 1. 让 Agent 之间传递上下文

```javascript
// 上一个 Agent 的输出作为下一个的输入
const plan = await agent('制定计划...', { agentType: 'senior-developer' })
const code = await agent(`按此计划实施：${plan}`, { agentType: 'senior-developer' })
```

### 2. 结构化输出（JSON Schema）

```javascript
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { enum: ['critical', 'warning', 'suggestion'] },
          file: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['severity', 'file', 'summary'],
      },
    },
  },
  required: ['findings'],
}

const result = await agent('审查代码...', {
  agentType: 'code-reviewer',
  schema: REVIEW_SCHEMA,  // 强制 JSON 输出
})

// result.findings 是类型安全的数组
```

### 3. 循环直到收敛

```javascript
let dry = 0
const bugs = []
while (dry < 2) {
  const found = await agent('找更多 bug...', { schema: BUG_SCHEMA })
  const fresh = found.bugs.filter(b => !seen.has(b.id))
  if (fresh.length === 0) { dry++; continue }
  dry = 0
  bugs.push(...fresh)
}
```

### 4. 对抗性验证（Adversarial Verify）

```javascript
const votes = await parallel(
  Array.from({length: 3}, () => () =>
    agent(`验证这个发现是否为误报：${finding}`, { schema: VERDICT_SCHEMA })
  )
)
const confirmed = votes.filter(Boolean).filter(v => v.isReal).length >= 2
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **一个 Agent 一件事** | 每个 Agent 身份应聚焦单一职责 |
| **提示词要具体** | 明确规则、输出格式、边界条件 |
| **先并行后串行** | 独立工作用 `parallel()`，依赖工作用 `pipeline()` |
| **始终生成日志** | 每次运行留 WORK_LOG.md，方便回溯 |
| **选择合适的模型** | 复杂推理用 Opus，文档生成用 Sonnet |
| **验证子 Agent 输出** | 用额外的 Agent 或检查步骤确保质量 |
| **设置 token 预算** | Agent 循环用 `budget` 参数控制成本 |
