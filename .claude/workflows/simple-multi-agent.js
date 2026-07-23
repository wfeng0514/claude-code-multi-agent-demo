export const meta = {
  name: 'simple-multi-agent',
  description: 'Lightweight demo: launch 3 specialist agents in parallel, then synthesize results',
  phases: [
    { title: 'Execute', detail: 'Three specialists work in parallel on different aspects' },
    { title: 'Synthesize', detail: 'Coordinator merges all outputs into a final deliverable' },
  ],
}

phase('Execute')

// Launch all 3 specialist agents IN PARALLEL
// Each has a distinct identity and task
const [codeResult, reviewResult, docResult] = await parallel([
  // Agent 1: Senior Developer - writes the code
  () => agent(
    `You are a **Senior Developer** specializing in writing clean, well-tested code.

**Task:** Create a file at src/utils.ts
that exports these utility functions:
- \`formatDate(date: Date, format: string): string\` — format a date with patterns like "YYYY-MM-DD"
- \`slugify(text: string): string\` — convert text to a URL-friendly slug
- \`chunk<T>(arr: T[], size: number): T[][]\` — split an array into chunks of the given size

Write complete, production-ready TypeScript with JSDoc comments and error handling.
Use the Write tool to create the file.`,
    { label: 'dev:utils', phase: 'Execute', agentType: 'senior-developer' }
  ),

  // Agent 2: Code Reviewer - audits a hypothetical codebase
  () => agent(
    `You are a **Code Reviewer**.

**Task:** Review this TypeScript code for bugs, edge cases, and improvements:

\`\`\`typescript
// File: src/user-service.ts
export class UserService {
  private users: Map<string, { name: string; email: string }> = new Map();

  addUser(id: string, name: string, email: string) {
    this.users.set(id, { name, email });
  }

  getUser(id: string) {
    return this.users.get(id);
  }

  deleteUser(id: string) {
    this.users.delete(id);
  }

  findUsersByName(name: string) {
    const results = [];
    for (const [id, user] of this.users) {
      if (user.name === name) {
        results.push({ id, ...user });
      }
    }
    return results;
  }
}
\`\`\`

Identify ALL issues: bugs, missing validation, edge cases, type safety gaps, etc.
Use the standard review format (🔴 Critical / 🟡 Warning / 🔵 Suggestion).`,
    { label: 'review:user-service', phase: 'Execute', agentType: 'code-reviewer' }
  ),

  // Agent 3: Tech Writer - writes documentation
  () => agent(
    `You are a **Technical Writer**.

**Task:** Create a file at README.md

This is for a project called "multi-agent-demo" — a demonstration of how to use multiple
specialized AI agents coordinated by a main agent to develop, review, and document code.

Write a complete, well-structured README.md that includes:
1. Project title and one-line description
2. How it works (the multi-agent pattern)
3. Agent types available (Senior Developer, Code Reviewer, Tech Writer)
4. How to run it
5. Example output

Use the Write tool. Make it professional and informative.`,
    { label: 'writer:readme', phase: 'Execute', agentType: 'tech-writer' }
  ),
])

log('✅ All 3 specialists completed their work in parallel')

// ============================================================
phase('Synthesize')

// Coordinator synthesizes all results
const summary = await agent(
  `You are the **Engineering Lead / Coordinator**.

Three specialist agents just completed their work. Here's what they produced:

--- DEVELOPER (Senior Developer) ---
${codeResult || '(no output)'}

--- REVIEWER (Code Reviewer) ---
${reviewResult || '(no output)'}

--- WRITER (Technical Writer) ---
${docResult || '(no output)'}
--- END ---

**Your job:** Create a synthesis document at SYNTHESIS.md that:
1. Summarizes what each agent did
2. Evaluates the quality of each agent's output
3. Notes any follow-up actions needed
4. Concludes whether the multi-agent pattern was effective for this task

Use the Write tool.`,
  { label: 'coordinator:synthesize', phase: 'Synthesize' }
)

log('📊 Synthesis complete')

// Also write the work log
const logResult = await agent(
  `Create a detailed work log at WORK_LOG.md

This was a multi-agent development session. The agents involved:

| Agent | Role | What they did |
|-------|------|---------------|
| Senior Developer | dev:utils | Created src/utils.ts with utility functions |
| Code Reviewer | review:user-service | Reviewed src/user-service.ts for issues |
| Tech Writer | writer:readme | Created README.md |
| Coordinator | coordinator:synthesize | Synthesized all outputs into SYNTHESIS.md |

Write a comprehensive work log in markdown with:
- Session metadata (date, purpose, agents)
- Per-agent activity log with timestamps (use the current time as reference)
- Files created/modified
- Key decisions and outcomes
- The coordinator's synthesis summary

Use the Write tool to create the file at the path above.`,
  { label: 'logger:work-log', phase: 'Synthesize' }
)

return { codeResult, reviewResult, docResult, summary, logResult }
