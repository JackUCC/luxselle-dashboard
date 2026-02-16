#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const args = new Set(process.argv.slice(2));
const shouldRunChecks = args.has('--run-checks');
const shouldJson = args.has('--json');

const swarm = {
  objective: 'Continuously improve UX, reliability, data quality, and release confidence across the full dashboard.',
  commander: {
    id: 'agent-codebase-optimizer',
    prompt:
      'Use the Codebase Optimizer agent to orchestrate a full-repo improvement sprint. Split work into frontend, backend, data, and QA tracks, then return a prioritized patch plan.',
  },
  subagents: [
    {
      id: 'agent-frontend-ux-optimizer',
      area: 'src/**',
      prompt:
        'Use the Frontend UX Optimizer agent to improve page clarity, loading/empty/error states, and cross-page navigation affordances.',
      deliverable: 'UX backlog + small, safe UI refinements',
    },
    {
      id: 'agent-backend-reliability-optimizer',
      area: 'packages/server/**',
      prompt:
        'Use the Backend Reliability Optimizer agent to harden route validation, error handling, and deterministic business logic.',
      deliverable: 'Contract-safe reliability improvements + regression tests',
    },
    {
      id: 'agent-data-pipeline-optimizer',
      area: 'supplier feed, imports, jobs',
      prompt:
        'Use the Data Pipeline Optimizer agent to improve import resilience, dedupe controls, and observability around supplier ingestion.',
      deliverable: 'Pipeline risk report + targeted fixes',
    },
    {
      id: 'agent-test-hardening',
      area: 'tests and release quality gates',
      prompt:
        'Use the Test Hardening agent to improve test coverage around critical flows and tighten release gates.',
      deliverable: 'Added/updated tests + pass/fail readiness summary',
    },
  ],
  checks: [
    'npm run test --workspace=@luxselle/server',
    'npm run test',
    'npm run build',
    'npm run typecheck',
  ],
};

function printMarkdownPlan() {
  console.log('# Agent Swarm Launch Plan\n');
  console.log(`## Objective\n${swarm.objective}\n`);
  console.log('## Commander Prompt');
  console.log(`- ${swarm.commander.prompt}\n`);
  console.log('## Subagent Prompts');
  swarm.subagents.forEach((agent, index) => {
    console.log(`${index + 1}. **${agent.id}** (${agent.area})`);
    console.log(`   - Prompt: ${agent.prompt}`);
    console.log(`   - Deliverable: ${agent.deliverable}`);
  });
  console.log('\n## Suggested Validation Checks');
  swarm.checks.forEach((cmd) => console.log(`- ${cmd}`));
}

function runChecks() {
  console.log('\n# Running validation checks\n');
  const failures = [];

  for (const cmd of swarm.checks) {
    console.log(`\n$ ${cmd}`);
    const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
    if (result.status !== 0) {
      failures.push({ cmd, code: result.status });
    }
  }

  if (failures.length) {
    console.error('\nValidation checks completed with failures:');
    failures.forEach((failure) => {
      console.error(`- ${failure.cmd} (exit ${failure.code})`);
    });
    process.exit(1);
  }

  console.log('\nAll validation checks passed.');
}

if (shouldJson) {
  console.log(JSON.stringify(swarm, null, 2));
} else {
  printMarkdownPlan();
}

if (shouldRunChecks) {
  runChecks();
}
