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
//   3. A final agent generates a log of who did what
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

Keep it concise. This plan will be passed to specialist agents.`,
  { label: 'coordinator:plan', phase: 'Plan' }
)

log(`📋 Work plan created by coordinator:\n${plan}`)

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
- Output ALL files needed - use the Write tool to create them in /Users/wfeng/Developer/multi-agent-demo/

Create the implementation now.`,
  {
    label: 'developer:implement',
    phase: 'Develop',
    agentType: 'senior-developer',
  }
)

log(`💻 Developer completed implementation`)

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
1. Read the actual files that were created in /Users/wfeng/Developer/multi-agent-demo/
2. Review them thoroughly for bugs, security issues, and improvements
3. Output your findings in the standard review format`,
  {
    label: 'reviewer:audit',
    phase: 'Review',
    agentType: 'code-reviewer',
  }
)

log(`🔍 Code review completed`)

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

**Create the following documentation files in /Users/wfeng/Developer/multi-agent-demo/:**

1. **README.md** - Project overview, quick start, usage examples
2. **ARCHITECTURE.md** - System design, data flow, key decisions

Write the files using the Write tool.`,
  {
    label: 'writer:document',
    phase: 'Document',
    agentType: 'tech-writer',
  }
)

log(`📝 Documentation created`)

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

**Create the work log file at /Users/wfeng/Developer/multi-agent-demo/WORK_LOG.md** with these sections:

1. **Session Overview** - timestamp, task description, agents involved
2. **Agent Activity Log** - a table with columns: Agent Name | Role | Phase | Summary of Work | Files Touched
3. **Timeline** - chronological order of what happened
4. **Artifacts Produced** - list of all files created
5. **Review Status** - summary of review findings and whether they were addressed
6. **Next Steps** - what should happen next

Use the Write tool to create the file.`,
  { label: 'logger:summarize', phase: 'Log' }
)

log(`📊 Work log generated at /Users/wfeng/Developer/multi-agent-demo/WORK_LOG.md`)

// ============================================================
// Return the complete session summary
return {
  plan,
  code,
  review,
  docs,
  workLog,
}
