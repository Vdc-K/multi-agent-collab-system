#!/usr/bin/env node
/**
 * MACS CLI entry point
 * Delegates to the compiled protocol CLI
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Try compiled dist first, fall back to tsx for development
const distCli = join(__dirname, '..', '.macs', 'protocol', 'dist', 'cli.js')
const srcCli = join(__dirname, '..', '.macs', 'protocol', 'cli.ts')

if (existsSync(distCli)) {
  // Production: use compiled JS
  const { default: cli } = await import(distCli)
} else if (existsSync(srcCli)) {
  // Development: use tsx
  const tsx = join(__dirname, '..', '.macs', 'protocol', 'node_modules', '.bin', 'tsx')
  const child = spawn(tsx, [srcCli, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: process.cwd(),
  })
  child.on('exit', (code) => process.exit(code || 0))
} else {
  console.error('MACS: protocol not found. Run: macs init')
  process.exit(1)
}
