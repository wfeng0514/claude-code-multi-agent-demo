# multi-agent-demo — Claude Code 项目指令

> ⚠️ **强制要求**：在执行任何操作之前，必须先使用 Read 工具读取 `AGENTS.md` 文件，并严格遵守其中定义的主 Agent 行为准则。AGENTS.md 是本项目的核心约束文件，优先级高于本文件。

## 项目概述

这是一个演示 Claude Code **多 Agent 协作**模式的示例项目。核心概念：

- **自定义 Agent 身份** → `.claude/agents/*.md` — 每个文件定义一个专业 Agent 的系统提示词
- **Workflow 编排** → `.claude/workflows/*.js` — 用 `parallel()` / `pipeline()` 编排多个子 Agent
- **工作日志** → 每次运行自动生成 `WORK_LOG.md`，记录每个 Agent 做了什么

## 可用 Agent 身份

| `agentType` | 文件 | 用途 |
|---|---|---|
| `senior-developer` | `.claude/agents/senior-developer.md` | 写代码、架构设计 |
| `code-reviewer` | `.claude/agents/code-reviewer.md` | 找 bug、安全审查 |
| `tech-writer` | `.claude/agents/tech-writer.md` | 写文档、README |

## 可用 Workflow

| Workflow | 说明 | 用法 |
|---|---|---|
| `simple-multi-agent` | 3 个专业 Agent 并行工作 + 协调员合成 + 日志 | `run the simple-multi-agent workflow` |
| `multi-agent-demo` | 5 阶段流水线：Plan → Develop → Review → Document → Log | `run the multi-agent-demo workflow` |

## 项目结构

```
multi-agent-demo/
├── CLAUDE.md                    ← 本文件
├── README.md                    ← 用户手册
├── .claude/
│   ├── agents/                  ← Agent 身份定义
│   └── workflows/               ← Workflow 编排脚本
└── src/                         ← Agent 产出目录
```

## 约定

- 子 Agent 产出的代码、文档、日志均写入本项目目录下
- 每次运行 Workflow 后检查 `WORK_LOG.md` 了解各 Agent 的工作内容
- 新建 Agent 身份只需在 `.claude/agents/` 下加 `.md` 文件，写法参照已有的三个
- 新建 Workflow 只需在 `.claude/workflows/` 下加 `.js` 文件，必须包含 `export const meta = { name, description, phases }`

## 语言和框架

- 子 Agent 默认使用 TypeScript，可通过 workflow 参数覆盖（`args.language`, `args.framework`）
