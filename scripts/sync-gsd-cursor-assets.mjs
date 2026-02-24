#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

function ensureDirectory(absolutePath) {
  if (!existsSync(absolutePath)) {
    mkdirSync(absolutePath, { recursive: true })
  }
}

function resolveRequiredPath(relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required source path: ${relativePath}`)
  }
  return absolutePath
}

function copyMatchingFiles({ sourceRelativeDir, destinationRelativeDir, predicate }) {
  const sourceDir = resolveRequiredPath(sourceRelativeDir)
  const destinationDir = path.resolve(repoRoot, destinationRelativeDir)
  ensureDirectory(destinationDir)

  let copiedCount = 0
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    if (!predicate(entry.name)) continue

    const sourceFile = path.join(sourceDir, entry.name)
    const destinationFile = path.join(destinationDir, entry.name)
    cpSync(sourceFile, destinationFile, { force: true })
    copiedCount += 1
  }

  return copiedCount
}

function copyDirectory({ sourceRelativeDir, destinationRelativeDir }) {
  const sourceDir = resolveRequiredPath(sourceRelativeDir)
  const destinationDir = path.resolve(repoRoot, destinationRelativeDir)
  ensureDirectory(path.dirname(destinationDir))

  cpSync(sourceDir, destinationDir, { recursive: true, force: true })

  const stack = [destinationDir]
  let fileCount = 0
  while (stack.length > 0) {
    const currentDir = stack.pop()
    if (!currentDir) continue

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const nextPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        stack.push(nextPath)
      } else if (entry.isFile()) {
        fileCount += 1
      }
    }
  }

  return fileCount
}

const copiedAgents = copyMatchingFiles({
  sourceRelativeDir: '.claude/agents',
  destinationRelativeDir: '.cursor/agents',
  predicate: (fileName) => fileName.startsWith('gsd-') && fileName.endsWith('.md'),
})

const copiedCommands = copyMatchingFiles({
  sourceRelativeDir: '.claude/commands/gsd',
  destinationRelativeDir: '.cursor/commands/gsd',
  predicate: (fileName) => fileName.endsWith('.md'),
})

const copiedTemplates = copyDirectory({
  sourceRelativeDir: '.claude/get-shit-done/templates',
  destinationRelativeDir: '.cursor/templates',
})

const copiedWorkflows = copyMatchingFiles({
  sourceRelativeDir: '.claude/get-shit-done/workflows',
  destinationRelativeDir: '.cursor/workflows/gsd',
  predicate: (fileName) => fileName.endsWith('.md'),
})

console.log(`Synced GSD agents: ${copiedAgents}`)
console.log(`Synced GSD commands: ${copiedCommands}`)
console.log(`Synced GSD templates: ${copiedTemplates}`)
console.log(`Synced GSD workflows: ${copiedWorkflows}`)
