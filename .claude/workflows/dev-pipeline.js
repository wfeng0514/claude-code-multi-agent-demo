export const meta = {
  name: 'dev-pipeline',
  description: '开发→测试⇄修复→文档：开发与测试分离，自动循环直至测试全部通过，最后生成文档',
  phases: [
    { title: 'Develop', detail: 'Senior developer 编写实现代码（不含测试）' },
    { title: 'Test', detail: 'Test engineer 编写测试并运行，报告通过/失败/bug' },
    { title: 'Fix', detail: '若有失败，Senior developer 根据测试结果修复代码' },
    { title: 'Document', detail: 'Tech writer 编写项目文档' },
    { title: 'Log', detail: '生成完整工作日志' },
  ],
}

// ============================================================
// Dev Pipeline — 开发与测试分离，自动循环修复
//
// 流程：
//   1. Develop  — senior-developer 写代码（不写测试）
//   2. Test     — test-engineer 写测试 + 运行，报告结果和 bug
//   3. Fix      — 测试失败 → senior-developer 修复 → 回到 Test
//   4. Document — 全部通过 → tech-writer 写文档
//   5. Log      — 生成工作日志
// ============================================================

const MAX_ROUNDS = 5;

const taskSlug = (args.task || 'default-task')
  .replace(/[^a-zA-Z0-9一-鿿_-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 60) || 'task-run';

const outDir = `outputs/${taskSlug}`;
const language = args.language || 'TypeScript';
const framework = args.framework || 'Express.js';

log(`📁 输出目录: ${outDir}/`);
log(`🔧 技术栈: ${language} + ${framework}`);

// ============================================================
phase('Develop')

log('👨‍💻 启动开发 Agent（仅编写实现代码，不写测试）...');

const devPrompt = `You are a **Senior Software Engineer**. Write PRODUCTION CODE ONLY — do NOT write any test files.

**Task:** ${args.task || 'Implement the requested feature'}

**输出目录:** ${outDir}/src/

**Requirements:**
- Language: **${language}**
- Framework: **${framework}**
- Write complete, production-ready implementation code
- Include proper error handling and type safety
- Use the Write tool to create ALL implementation files under ${outDir}/src/
- Do NOT write test files — testing will be handled by a separate agent
- Do NOT write documentation files — documentation will be handled by a separate agent

**IMPORTANT:** Your job ends once implementation code is written. Tests will be written and run by a dedicated testing agent.`;

let codeResult = await agent(devPrompt, {
  label: 'dev:implement',
  phase: 'Develop',
  agentType: 'senior-developer',
});

log('✅ 开发 Agent 完成代码编写');

// ============================================================
// Test ⇄ Fix 循环
// ============================================================

let passed = false;
let round = 0;
let lastTestResult = '';
let allTestResults = [];

while (!passed && round < MAX_ROUNDS) {
  round++;
  log(`🧪 第 ${round}/${MAX_ROUNDS} 轮测试...`);

  // --- Test Phase ---
  const testPrompt = round === 1
    ? `You are a **Test Engineer**. Your job is to WRITE TESTS and RUN THEM. Do NOT modify implementation code.

**Implementation code is in:** ${outDir}/src/

**Previous test file exists: ❌ No (this is the first test round)**

**Instructions:**
1. First, READ the implementation files in ${outDir}/src/ to understand the code
2. Write a COMPREHENSIVE test file at **${outDir}/src/*.test.ts** using **Vitest**
   - Cover all public functions/APIs
   - Cover edge cases (null, undefined, empty, boundary values)
   - Cover error paths
   - Use describe/it blocks with clear test names
3. Run the tests: execute \`cd ${outDir} && npx vitest run\` (or \`npx vitest run\` if ${outDir} has a vitest config)
4. Report the result

**You MUST use Write to create the test file, then use Bash to run the tests.**

Return your response in this EXACT format:
\`\`\`
PASS_OR_FAIL: [PASS] or [FAIL]
TEST_SUMMARY: <number passed>/<number total> tests passed
FAILURE_DETAILS:
<if FAIL, list each failing test with the error message; if PASS, write "NONE">
BUGS_FOUND:
<list any implementation bugs discovered through testing; if none, write "NONE">
\`\`\``
    : `You are a **Test Engineer**. The developer has made FIXES based on your previous test results. RE-RUN the tests.

**Implementation code is in:** ${outDir}/src/
**Test file already exists at:** ${outDir}/src/*.test.ts

**Previous test failures:**
${lastTestResult}

**Instructions:**
1. READ the updated implementation files in ${outDir}/src/
2. If needed, UPDATE the existing test file at ${outDir}/src/*.test.ts (the developer may have changed APIs)
3. Run the tests: execute \`cd ${outDir} && npx vitest run\`
4. Report the result

Return your response in this EXACT format:
\`\`\`
PASS_OR_FAIL: [PASS] or [FAIL]
TEST_SUMMARY: <number passed>/<number total> tests passed
FAILURE_DETAILS:
<if FAIL, list each failing test with the error message; if PASS, write "NONE">
BUGS_FOUND:
<list any implementation bugs discovered through testing; if none, write "NONE">
\`\`\``;

  const testResult = await agent(testPrompt, {
    label: `test:round-${round}`,
    phase: 'Test',
    agentType: 'test-engineer',
  });

  allTestResults.push({ round, result: testResult });

  // Parse test result
  if (testResult && testResult.includes('PASS_OR_FAIL: [PASS]')) {
    passed = true;
    log(`✅ 第 ${round} 轮测试全部通过！`);
  } else if (testResult && testResult.includes('PASS_OR_FAIL: [FAIL]')) {
    lastTestResult = testResult;
    log(`❌ 第 ${round} 轮测试失败，通知开发 Agent 修复...`);

    // --- Fix Phase ---
    const fixResult = await agent(
      `You are a **Senior Software Engineer**. The tests written by the QA team are FAILING. Fix the code.

**Implementation code is in:** ${outDir}/src/
**Test file is at:** ${outDir}/src/*.test.ts

**Test failure report (from Round ${round}):**
${lastTestResult}

**Instructions:**
1. READ the implementation files AND the test file in ${outDir}/src/
2. READ the test failure details above carefully
3. FIX the implementation code so that ALL tests pass
4. Use the Edit tool to make targeted fixes to ${outDir}/src/ files
5. Do NOT modify the test file — the tests are the specification
6. After fixing, briefly summarize what you changed

**IMPORTANT:** Only fix implementation code. Do NOT change the test file unless a test is clearly wrong (if so, explain why).`,
      {
        label: `fix:round-${round}`,
        phase: 'Fix',
        agentType: 'senior-developer',
      }
    );

    log(`🔧 开发 Agent 完成第 ${round} 轮修复`);
  } else {
    // Couldn't parse — treat as failure and try to fix
    log(`⚠️ 无法解析测试结果，将尝试继续...`);
    lastTestResult = testResult || '(no output)';
  }
}

if (!passed) {
  log(`⚠️ 已达最大循环轮次 (${MAX_ROUNDS})，测试仍未全部通过。请人工介入。`);
}

// ============================================================
phase('Document')

log('📝 启动文档 Agent...');

const docResult = await agent(
  `You are a **Technical Writer**. Create documentation for the completed and tested project.

**Project source:** ${outDir}/src/

**Implementation summary:**
${codeResult || '(see source files)'}

**Test results (all rounds):**
${allTestResults.map(r => `Round ${r.round}: ${r.result}`).join('\n\n')}

**Final status:** ${passed ? '✅ ALL TESTS PASSED' : '❌ TESTS NOT ALL PASSED'}

**Create the following files under ${outDir}/:**

1. **README.md** — Project overview, quick start, usage examples, API reference
2. **ARCHITECTURE.md** — System design, data flow, key technical decisions

Write both files using the Write tool. Make them professional and thorough.`,
  {
    label: 'writer:document',
    phase: 'Document',
    agentType: 'tech-writer',
  }
);

log('📝 文档生成完成');

// ============================================================
phase('Log')

log('📊 生成工作日志...');

const workLog = await agent(
  `You are a **Project Logger**. Create a comprehensive work log for this development session.

**Session Data:**

- Task: ${args.task || 'Implementation task'}
- Language: ${language}
- Framework: ${framework}
- Output directory: ${outDir}/
- Final status: ${passed ? 'ALL TESTS PASSED' : 'TESTS NOT ALL PASSED'}
- Rounds: ${round}

**Developer Output (initial implementation):**
${codeResult || '(see source files)'}

**Test Results (all ${round} round(s)):**
${allTestResults.map(r => `### Round ${r.round}\n${r.result}`).join('\n\n---\n\n')}

**Documentation:**
${docResult || '(see docs)'}

**Create ${outDir}/WORK_LOG.md** with these sections:

1. **Session Overview** — timestamp, task, agents involved, final status
2. **Pipeline Flow** — visual diagram of the Dev→Test⇄Fix→Doc pipeline
3. **Agent Activity Log** — table: Agent | Role | Phase | Round | Summary
4. **Test Results Timeline** — per-round pass/fail summary
5. **Artifacts Produced** — all files created under ${outDir}/
6. **Key Decisions & Outcomes**
7. **Next Steps** — recommendations

Use the Write tool to create the file.`,
  { label: 'logger:summarize', phase: 'Log' }
);

log(`📊 工作日志已生成: ${outDir}/WORK_LOG.md`);

// ============================================================
return {
  taskSlug,
  outDir,
  passed,
  rounds: round,
  codeResult,
  allTestResults,
  docResult,
  workLog,
};
