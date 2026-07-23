export const meta = {
  name: 'multi-agent-demo',
  description: 'Demo: main agent assigns work to specialist sub-agents (developer, reviewer, writer) with logging',
  phases: [
    { title: 'Plan', detail: 'Main agent analyzes the task and creates a work plan' },
    { title: 'Develop', detail: 'Senior developer implements the feature' },
    { title: 'Review', detail: 'Code reviewer audits the implementation' },
    { title: 'Document', detail: 'Tech writer creates documentation' },
    { title: 'Log', detail: 'Generate work log summarizing all agent activity' },
  ],
}

// ============================================================
// Multi-Agent Demo Workflow
//
// This workflow demonstrates the "main agent coordinates specialists" pattern:
//   1. Main agent (this script + phase structure) acts as the coordinator
//   2. Specialist sub-agents do the actual work
//   3. All outputs are saved under outputs/<task-slug>/
// ============================================================

// Derive task folder name from args.task, fallback to "default-demo"
const taskSlug = (args.task || 'default-demo')
  .replace(/[^a-zA-Z0-9一-鿿_-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 60) || 'task-run';

const outDir = `outputs/${taskSlug}`;

log(`📁 输出目录: ${outDir}/`);

// ============================================================
phase('Plan')

// Step 1: The main "coordinator" agent analyzes the task and creates a work plan
const plan = await agent(
  `You are the **Engineering Lead / Coordinator**. Your job is to plan work, not do it.

A user has asked you to build: **${args.task || 'a simple REST API endpoint that returns the current server time in JSON format'}**

Analyze this request and create a detailed work plan with these sections:
1. What needs to be built (specs)
2. Who should do what (which specialist to assign each part to)
3. Acceptance criteria

Keep it concise. This plan will be passed to specialist agents.

**重要:** 计划完成后，使用 Write 工具将完整计划写入 **${outDir}/PLAN.md**。`,
  { label: 'coordinator:plan', phase: 'Plan' }
)

log(`📋 Work plan created by coordinator`);

// ============================================================
phase('Develop')

// Step 2: Assign the development work to the senior developer agent
const code = await agent(
  `You are a **Senior Software Engineer**.

Your task is to implement the following work plan created by the engineering lead:

--- WORK PLAN ---
${plan}
--- END PLAN ---

**Requirements:**
- Write complete, production-ready code
- Include error handling
- Use **${args.language || 'TypeScript'}** with **${args.framework || 'Express.js'}**
- Output ALL files needed — use the Write tool to create them under **${outDir}/src/**

Create the implementation now.`,
  {
    label: 'developer:implement',
    phase: 'Develop',
    agentType: 'senior-developer',
  }
)

log(`💻 Developer completed implementation`);

// ============================================================
phase('Review')

// Step 3: The code reviewer audits the work
const review = await agent(
  `You are a **Code Reviewer**.

Review the following code that was just implemented by a senior developer:

--- IMPLEMENTATION SUMMARY ---
${code}
--- END ---

**Instructions:**
1. Read the actual files that were created under ${outDir}/src/
2. Review them thoroughly for bugs, security issues, and improvements
3. Use the standard review format (🔴 严重 / 🟡 警告 / 🔵 建议)

**重要:** 审查完成后，使用 Write 工具将完整审查报告写入 **${outDir}/REVIEW.md**。`,
  {
    label: 'reviewer:audit',
    phase: 'Review',
    agentType: 'code-reviewer',
  }
)

log(`🔍 Code review completed`);

// ============================================================
phase('Document')

// Step 4: Tech writer creates documentation
const docs = await agent(
  `You are a **Technical Writer**.

Create documentation for the following code that was just built and reviewed:

--- CODE CONTEXT ---
${code}

--- REVIEW FINDINGS ---
${review}
--- END ---

**Create the following documentation files under ${outDir}/:**

1. **README.md** — Project overview, quick start, usage examples
2. **ARCHITECTURE.md** — System design, data flow, key decisions

Write the files using the Write tool.`,
  {
    label: 'writer:document',
    phase: 'Document',
    agentType: 'tech-writer',
  }
)

log(`📝 Documentation created`);

// ============================================================
phase('Log')

// Step 5: Generate a work log summarizing everything
const workLog = await agent(
  `You are a **Project Logger**. Your only job is to create an accurate, detailed work log.

Below is the complete output from a multi-agent development session. Create a comprehensive work log in markdown format.

--- SESSION DATA ---

**Coordinator Plan:**
${plan}

**Developer Output:**
${code}

**Review Findings:**
${review}

**Documentation:**
${docs}

--- END DATA ---

**使用 Write 工具将工作日志写入 ${outDir}/WORK_LOG.md**，包含以下章节：

1. **Session Overview** — timestamp, task description, agents involved
2. **Agent Activity Log** — a table with columns: Agent Name | Role | Phase | Summary of Work | Files Touched
3. **Timeline** — chronological order of what happened
4. **Artifacts Produced** — list of all files created (all under ${outDir}/)
5. **Review Status** — summary of review findings and whether they were addressed
6. **Next Steps** — what should happen next`,
  { label: 'logger:summarize', phase: 'Log' }
)

log(`📊 Work log generated at ${outDir}/WORK_LOG.md`);

// ============================================================
// Return the complete session summary
return {
  taskSlug,
  outDir,
  plan,
  code,
  review,
  docs,
  workLog,
}
