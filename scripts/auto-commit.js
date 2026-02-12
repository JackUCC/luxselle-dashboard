#!/usr/bin/env node
/**
 * Watches the repo and auto-commits + pushes when there are changes.
 * Run with: npm run auto-commit
 * Your existing post-commit hook will push to origin after each commit.
 *
 * Polls every 90 seconds. Stops on Ctrl+C.
 */

const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const INTERVAL_MS = 90 * 1000;
const COMMIT_MSG = 'chore: WIP auto-save';

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: REPO_ROOT, ...opts });
  } catch (e) {
    return null;
  }
}

function hasChanges() {
  const out = run('git status --short');
  return out != null && out.trim().length > 0;
}

function commitAndPush() {
  if (!hasChanges()) return;
  run('git add -A');
  run(`git commit -m "${COMMIT_MSG}"`);
  // post-commit hook runs: git push origin HEAD
}

function tick() {
  if (hasChanges()) {
    console.log(`[${new Date().toISOString()}] Changes detected, committing and pushing...`);
    commitAndPush();
  }
}

console.log(`Auto-commit running (every ${INTERVAL_MS / 1000}s). Stop with Ctrl+C.`);
tick();
setInterval(tick, INTERVAL_MS);
