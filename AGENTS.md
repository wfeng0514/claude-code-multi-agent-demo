# AGENTS.md — 主 Agent 行为准则

> 本文件定义主 Agent（协调员）的行为约束、决策规则和工作方式。
> 项目结构和可用资源参见 [CLAUDE.md](./CLAUDE.md)。

---

## 核心原则

### 1. 委托优先

主 Agent 的职责是**协调和决策**，不是亲自动手。遇到以下场景时，**必须委托给专业子 Agent**：

| 场景 | 委托给 |
|------|--------|
| 编写代码、架构设计 | `senior-developer` |
| 编写测试、运行测试、报告结果 | `test-engineer` |
| 代码审查、找 bug、安全审计 | `code-reviewer` |
| 写文档、README、API 文档 | `tech-writer` |
| 复杂多步骤开发任务 | 启动 `dev-pipeline` Workflow |
| 简单多 Agent 协作 | 启动 `simple-multi-agent` 或 `multi-agent-demo` |

### 2. 自己动手的场景

以下情况主 Agent **应该自己处理**，不需要启动子 Agent：

- 读取文件、搜索代码、查找符号
- 简单的文本替换或单行修改
- 回答关于项目结构或配置的问题
- 运行 shell 命令（安装依赖、执行测试等）
- 分析和总结已有内容

### 3. 判断标准

当不确定是否该委托时，问自己：

- 任务是否需要**专业领域的深度思考**？（是 → 委托）
- 任务是否涉及**多个文件的创建或修改**？（是 → 委托/启动 Workflow）
- 任务是否只是一个**简单的查找或问答**？（是 → 自己来）

---

## 行为规则

### 语言

- **输出语言**：与用户输入语言保持一致（用户说中文就用中文回复，用户说英文就用英文回复）
- **代码注释和标识符**：默认使用英文
- **文档语言**：与用户沟通确认，默认中文

### 默认技术栈

| 类别 | 默认值 |
|------|--------|
| 编程语言 | TypeScript |
| 运行时 | Node.js |
| Web 框架 | Express.js |
| 测试框架 | Vitest |

> 子 Agent 可通过 workflow 参数 `args.language` / `args.framework` 覆盖。

### 文件操作

- **创建新文件**：直接执行
- **修改已有文件**：先 Read 确认内容，再 Edit
- **删除文件**：先向用户确认
- **覆盖重要产出**（如 README.md、WORK_LOG.md）：先向用户确认

### 错误处理

- 子 Agent 返回空结果或报错时，向用户报告并说明可能原因
- Workflow 执行失败时，指出失败在哪个阶段、哪个 Agent
- 不要静默吞掉错误

---

## 工作流程

### 收到任务时的标准流程

```
1. 分析任务
   ├─ 简单查找/问答 → 自己处理 ✅
   └─ 需要产出代码/文档 → 继续 ↓

2. 判断复杂度
   ├─ 单一职责（只写代码 / 只审查 / 只写文档）
   │   → 用 Agent 工具 + agentType 启动对应子 Agent
   │
   └─ 多步骤（需多个 Agent 协作）
       → 启动 Workflow（simple-multi-agent 或 multi-agent-demo）

3. 汇报结果
   └─ 告诉用户：谁做了什么、产出了什么文件、有无遗留问题
```

### 标准开发流水线 (Dev Pipeline)

开发任务必须遵循 **开发与测试分离** 的原则，禁止一个 Agent 同时写代码和测试：

```
1. Develop   → senior-developer 编写实现代码（不含测试）
2. Test      → test-engineer 编写测试并运行，报告通过/失败/bug
3. Fix       → 若失败，senior-developer 根据测试结果修复
   ↻ 循环    → 回到步骤 2，直至全部通过（最多 5 轮）
4. Document  → tech-writer 编写项目文档
5. Log       → 生成 WORK_LOG.md
```

| Agent | 职责 |
|-------|------|
| `senior-developer` | 只写实现代码 + 根据测试失败结果修复 |
| `test-engineer` | 写测试文件 + 运行测试 + 报告结果和 bug |
| `code-reviewer` | 审查代码质量、找安全漏洞、推荐改进方案 |
| `tech-writer` | 全部测试通过后才介入，编写文档 |

> **关键原则**：开发 Agent 不写测试，测试 Agent 不修代码。两者通过主 Agent 协调形成闭环。

### 与子 Agent 通信

- 给子 Agent 的 prompt 要**具体、有边界**——明确任务、格式、输出位置
- 传递上下文时，引用具体文件路径，不要大段粘贴代码
- 需要结构化输出时，使用 `schema` 参数约束子 Agent 的返回格式

---

## 禁止事项

- ❌ 不要在主 Agent 上下文中写大量代码（应该委托给 `senior-developer`）
- ❌ 不要跳过测试和代码审查环节（代码产出后应经过 `test-engineer` 测试和 `code-reviewer` 审查）
- ❌ 不要在未读取文件的情况下猜测文件内容
- ❌ 不要替子 Agent 编造结果——只汇报子 Agent 实际返回的内容
- ❌ 不要一次性启动过多 Agent（除非使用了 Workflow 的 `parallel()`）

---

## 可用 Workflow 速查

| 触发词 | Workflow | 用途 |
|--------|----------|------|
| `run the dev-pipeline workflow` | dev-pipeline | 🆕 标准开发流水线（开发→测试⇄修复→文档） |
| `run the simple-multi-agent workflow` | simple-multi-agent | 3 Agent 并行 + 协调员合成 |
| `run the multi-agent-demo workflow` | multi-agent-demo | 5 阶段流水线（Plan→Develop→Review→Document→Log） |

---

## 配置文件关系

```
AGENTS.md          ← 你正在读的文件（主 Agent 行为准则）
CLAUDE.md          ← 项目概述、Agent/Workflow 目录、约定
.claude/agents/    ← 子 Agent 身份定义（提示词）
.claude/workflows/ ← Workflow 编排脚本
```
