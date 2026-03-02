/**
 * MACS Protocol v3.0 — Integration Test
 *
 * Simulates: 3 agents, 5 tasks, full lifecycle
 */

import { mkdirSync, rmSync, existsSync } from 'fs'
import { MACSEngine } from './engine.js'
import { HumanGenerator } from './human-generator.js'

const TEST_DIR = '/tmp/macs-protocol-test'

// Clean start
if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
mkdirSync(TEST_DIR, { recursive: true })

const engine = new MACSEngine(TEST_DIR)
const generator = new HumanGenerator(TEST_DIR)

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${msg}`)
  } else {
    failed++
    console.log(`  ❌ ${msg}`)
  }
}

console.log('\n🧪 MACS Protocol v3.0 — Integration Test\n')

// ── Init ──────────────────────────────────────────
console.log('1. Init')
const config = engine.init('test-project')
assert(config.version === '3.0', 'Config version is 3.0')
assert(config.project === 'test-project', 'Project name correct')

const state0 = engine.getState()
assert(state0.version === '3.0', 'State version is 3.0')
assert(Object.keys(state0.tasks).length === 0, 'No tasks initially')

// ── Register Agents ───────────────────────────────
console.log('\n2. Register Agents')
engine.registerAgent('lead-opus', { capabilities: ['architecture', 'planning'], model: 'opus', role: 'lead' })
engine.registerAgent('engineer-sonnet', { capabilities: ['backend', 'testing'], model: 'sonnet', role: 'engineer' })
engine.registerAgent('frontend-haiku', { capabilities: ['frontend', 'css'], model: 'haiku', role: 'engineer' })

const state1 = engine.getState()
assert(Object.keys(state1.agents).length === 3, '3 agents registered')
assert(state1.agents['lead-opus'].capabilities.includes('architecture'), 'Lead has architecture capability')
assert(state1.metrics.active_agents === 3, '3 active agents')

// ── Create Tasks ──────────────────────────────────
console.log('\n3. Create Tasks')
const t1 = engine.createTask('lead-opus', {
  title: 'Design database schema',
  priority: 'high',
  tags: ['database', 'backend'],
  affects: ['schema/*', 'migrations/*'],
})
assert(t1.id === 'T-001', 'First task ID is T-001')
assert(t1.status === 'pending', 'Task starts as pending')

const t2 = engine.createTask('lead-opus', {
  title: 'Implement JWT auth',
  priority: 'high',
  tags: ['auth', 'backend'],
  depends: ['T-001'],
  affects: ['api/auth/*'],
  estimate_ms: 14400000,
})
assert(t2.id === 'T-002', 'Second task ID is T-002')
assert(t2.depends.includes('T-001'), 'T-002 depends on T-001')

const t3 = engine.createTask('lead-opus', {
  title: 'Build login page',
  priority: 'medium',
  tags: ['frontend', 'auth'],
  depends: ['T-002'],
  affects: ['src/pages/login/*'],
})

const t4 = engine.createTask('lead-opus', {
  title: 'Write API tests',
  priority: 'medium',
  tags: ['testing'],
  depends: ['T-002'],
  affects: ['tests/api/*'],
})

const t5 = engine.createTask('lead-opus', {
  title: 'Setup CI/CD',
  priority: 'low',
  tags: ['devops'],
  affects: ['.github/*'],
})

const state2 = engine.getState()
assert(state2.metrics.total_tasks === 5, '5 tasks created')
assert(state2.metrics.pending === 5, 'All 5 pending')

// ── Task Claiming ─────────────────────────────────
console.log('\n4. Task Claiming')

// T-002 depends on T-001, so auto-claim should pick T-001 (higher priority, no deps)
const claimed1 = engine.claimTask('engineer-sonnet')
assert(claimed1?.id === 'T-001', 'Auto-claim picks T-001 (no deps, high priority)')

// T-002 still blocked by T-001, so auto-claim should pick T-005 (low, no deps)
const claimed2 = engine.claimTask('frontend-haiku')
assert(claimed2?.id === 'T-005', 'Auto-claim picks T-005 (only unblocked task left)')

// Try to claim T-002 explicitly — should fail (depends on T-001 not done)
// Actually claim works regardless of deps for explicit claims
const claimed3 = engine.claimTask('engineer-sonnet', 'T-002')
// This should assign T-002 even though dep not done (explicit claim)
assert(claimed3?.id === 'T-002', 'Explicit claim works for T-002')

// ── Task Lifecycle ────────────────────────────────
console.log('\n5. Task Lifecycle')

engine.startTask('engineer-sonnet', 'T-001')
let stateNow = engine.getState()
assert(stateNow.tasks['T-001'].status === 'in_progress', 'T-001 in progress')
assert(stateNow.tasks['T-001'].started_at !== undefined, 'T-001 has started_at')

// Block T-001
engine.blockTask('engineer-sonnet', 'T-001', {
  reason: 'need_decision',
  description: 'Need database choice: PostgreSQL or MySQL?',
  escalate_to: 'lead-opus',
})
stateNow = engine.getState()
assert(stateNow.tasks['T-001'].status === 'blocked', 'T-001 is blocked')
assert(stateNow.tasks['T-001'].blocked_history.length === 1, 'Block recorded in history')

// Unblock T-001
engine.unblockTask('lead-opus', 'T-001', {
  decision: 'Use PostgreSQL',
  context: 'Better JSON support, team familiarity',
})
stateNow = engine.getState()
assert(stateNow.tasks['T-001'].status === 'in_progress', 'T-001 back to in_progress')
assert(stateNow.tasks['T-001'].blocked_history[0].decision === 'Use PostgreSQL', 'Decision recorded')

// Complete T-001
engine.completeTask('engineer-sonnet', 'T-001', {
  artifacts: ['schema/users.sql', 'schema/sessions.sql'],
  summary: 'PostgreSQL schema with users and sessions tables',
  actual_ms: 7200000,
})
stateNow = engine.getState()
assert(stateNow.tasks['T-001'].status === 'completed', 'T-001 completed')
assert(stateNow.tasks['T-001'].artifacts.length === 2, '2 artifacts recorded')
assert(stateNow.metrics.completed === 1, 'Metrics: 1 completed')

// ── File Locks ────────────────────────────────────
console.log('\n6. File Locks')

const lockOk = engine.acquireLock('engineer-sonnet', 'api/auth/jwt.ts', 'Implementing JWT', 3600000)
assert(lockOk === true, 'Lock acquired successfully')

const lockFail = engine.acquireLock('frontend-haiku', 'api/auth/jwt.ts')
assert(lockFail === false, 'Cannot acquire lock on already-locked file')

stateNow = engine.getState()
assert(stateNow.locks.length === 1, '1 active lock')

engine.releaseLock('engineer-sonnet', 'api/auth/jwt.ts')
stateNow = engine.getState()
assert(stateNow.locks.length === 0, 'Lock released')

// ── Messaging ─────────────────────────────────────
console.log('\n7. Messaging')

engine.sendMessage({
  from: 'lead-opus',
  to: 'engineer-sonnet',
  type: 'general',
  re: 'T-002',
  data: { content: 'T-001 is done, you can start T-002 now' },
})

const inbox = engine.getInbox('engineer-sonnet')
assert(inbox.length === 1, '1 message in inbox')
assert(inbox[0].from === 'lead-opus', 'Message from lead-opus')

const unread = engine.getInbox('engineer-sonnet', true)
assert(unread.length === 1, '1 unread message')

engine.markRead('engineer-sonnet', inbox[0].id)
const unread2 = engine.getInbox('engineer-sonnet', true)
assert(unread2.length === 0, '0 unread after marking read')

// ── Impact Analysis ───────────────────────────────
console.log('\n8. Impact Analysis')

const impact = engine.analyzeImpact('api/auth/login.ts')
assert(impact.affected_tasks.some(t => t.id === 'T-002'), 'T-002 affected by api/auth/* change')

const impact2 = engine.analyzeImpact('src/pages/login/index.tsx')
assert(impact2.affected_tasks.some(t => t.id === 'T-003'), 'T-003 affected by src/pages/login/* change')

// ── Global Events ─────────────────────────────────
console.log('\n9. Global Events')

engine.appendGlobalEvent({
  type: 'file_modified',
  ts: new Date().toISOString(),
  by: 'engineer-sonnet',
  task: 'T-001',
  data: { path: 'schema/users.sql', diff_summary: '+50 -0', purpose: 'Create users table' },
})

engine.appendGlobalEvent({
  type: 'decision_made',
  ts: new Date().toISOString(),
  by: 'lead-opus',
  task: 'T-001',
  data: {
    question: 'Database choice',
    decision: 'PostgreSQL',
    alternatives: ['MySQL', 'SQLite'],
    rationale: 'Better JSON support, team familiarity',
  },
})

engine.appendGlobalEvent({
  type: 'breaking_change',
  ts: new Date().toISOString(),
  by: 'engineer-sonnet',
  task: 'T-002',
  data: {
    file: 'api/auth/jwt.ts',
    description: 'JWT token format changed from HS256 to RS256',
    affected_agents: ['frontend-haiku'],
    migration: 'Update token verification to use public key',
  },
})

const events = engine.getGlobalEvents()
assert(events.length >= 3, 'Global events recorded')

// ── Human Generation ──────────────────────────────
console.log('\n10. Human-Readable Generation')

generator.generate()

const fs = await import('fs')
assert(fs.existsSync(`${TEST_DIR}/.macs/human/TASK.md`), 'TASK.md generated')
assert(fs.existsSync(`${TEST_DIR}/.macs/human/CHANGELOG.md`), 'CHANGELOG.md generated')
assert(fs.existsSync(`${TEST_DIR}/.macs/human/STATUS.md`), 'STATUS.md generated')

const taskMd = fs.readFileSync(`${TEST_DIR}/.macs/human/TASK.md`, 'utf-8')
assert(taskMd.includes('T-001'), 'TASK.md contains T-001')
assert(taskMd.includes('completed'), 'TASK.md shows completed status')
assert(taskMd.includes('Auto-generated'), 'TASK.md has auto-generated notice')

const changelogMd = fs.readFileSync(`${TEST_DIR}/.macs/human/CHANGELOG.md`, 'utf-8')
assert(changelogMd.includes('Decision'), 'CHANGELOG.md contains decisions')
assert(changelogMd.includes('Breaking'), 'CHANGELOG.md contains breaking changes')

const statusMd = fs.readFileSync(`${TEST_DIR}/.macs/human/STATUS.md`, 'utf-8')
assert(statusMd.includes('lead-opus'), 'STATUS.md lists agents')

// ── Agent Stats ───────────────────────────────────
console.log('\n11. Agent Stats')

const finalState = engine.getState()
const sonnetStats = finalState.agents['engineer-sonnet']?.stats
assert(sonnetStats?.tasks_completed === 1, 'Sonnet completed 1 task')
assert(sonnetStats?.blocked_count === 1, 'Sonnet was blocked 1 time')

// ── Summary ───────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`)
console.log(`  Results: ${passed} passed, ${failed} failed`)
console.log(`${'═'.repeat(50)}\n`)

if (failed > 0) process.exit(1)

// Cleanup
rmSync(TEST_DIR, { recursive: true })
console.log('🧹 Test directory cleaned up\n')
