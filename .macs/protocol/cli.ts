#!/usr/bin/env node
/**
 * MACS CLI v3.0
 *
 * Usage:
 *   macs boot --agent <id> [--capabilities a,b] [--model sonnet]
 *   macs init [project-name]
 *   macs status
 *   macs create <title> [--priority high] [--depends T-001] [--tags auth,backend]
 *   macs claim [task-id]
 *   macs start <task-id>
 *   macs done <task-id> [--summary "..."] [--artifacts file1,file2]
 *   macs block <task-id> --reason "..." [--escalate agent-id]
 *   macs unblock <task-id> [--decision "..."]
 *   macs register <agent-id> --capabilities backend,testing [--model sonnet]
 *   macs log [--limit 20]
 *   macs impact <file-path>
 *   macs inbox <agent-id>
 *   macs send <from> <to> <message> [--type general] [--re T-001]
 *   macs generate
 */

import { MACSEngine } from './engine.js'
import { HumanGenerator } from './human-generator.js'

const args = process.argv.slice(2)
const command = args[0]
const projectRoot = process.cwd()

const engine = new MACSEngine(projectRoot)
const generator = new HumanGenerator(projectRoot)

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1]
  return undefined
}

function hasFlag(flag: string): boolean {
  return args.includes(flag)
}

function autoGenerate(): void {
  try { generator.generate() } catch {}
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 2) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

switch (command) {
  case 'init': {
    const name = args[1] || projectRoot.split('/').pop() || 'project'
    const config = engine.init(name)
    autoGenerate()
    console.log(`✅ MACS initialized: ${name}`)
    console.log(`   .macs/protocol/  — agent data (JSONL)`)
    console.log(`   .macs/human/     — human-readable (auto-generated)`)
    console.log(`   .macs/sync/inbox/ — agent messaging`)
    console.log(`\nNext: macs register <agent-id> --capabilities backend,testing`)
    break
  }

  case 'status': {
    const state = engine.getState()
    const m = state.metrics

    console.log(`\n📊 Project Status`)
    console.log(`${'─'.repeat(50)}`)
    console.log(`Tasks:  ${m.completed}/${m.total_tasks} completed | ${m.in_progress} in progress | ${m.blocked} blocked | ${m.pending} pending`)
    console.log(`Agents: ${m.active_agents} active`)
    if (m.conflict_count > 0) console.log(`⚠️  Conflicts: ${m.conflict_count}`)
    if (m.breaking_changes > 0) console.log(`⚠️  Breaking changes: ${m.breaking_changes}`)

    // Show active tasks
    const activeTasks = Object.values(state.tasks).filter(t =>
      t.status === 'in_progress' || t.status === 'blocked' || t.status === 'assigned'
    )
    if (activeTasks.length > 0) {
      console.log(`\n📋 Active Tasks`)
      console.log(`${'─'.repeat(50)}`)
      for (const t of activeTasks) {
        const statusIcon = t.status === 'in_progress' ? '🔄' : t.status === 'blocked' ? '🚫' : '📋'
        console.log(`${statusIcon} ${t.id} ${t.title}`)
        console.log(`   owner: ${t.assignee || 'unassigned'} | priority: ${t.priority}`)
      }
    }

    // Show agents
    const agents = Object.values(state.agents)
    if (agents.length > 0) {
      console.log(`\n🤖 Agents`)
      console.log(`${'─'.repeat(50)}`)
      for (const a of agents) {
        const icon = a.status === 'busy' ? '🟢' : a.status === 'idle' ? '🟡' : a.status === 'offline' ? '🔴' : '🟠'
        console.log(`${icon} ${a.id} (${a.status}) — tasks done: ${a.stats.tasks_completed}`)
      }
    }

    // Show locks
    if (state.locks.length > 0) {
      console.log(`\n🔒 Active Locks`)
      console.log(`${'─'.repeat(50)}`)
      for (const l of state.locks) {
        console.log(`  ${l.file} — locked by ${l.locked_by}`)
      }
    }

    console.log('')
    break
  }

  case 'create': {
    const title = args[1]
    if (!title) { console.error('Usage: macs create <title>'); process.exit(1) }

    const priority = (getArg('--priority') || 'medium') as any
    const tags = getArg('--tags')?.split(',') || []
    const depends = getArg('--depends')?.split(',') || []
    const affects = getArg('--affects')?.split(',') || []

    const task = engine.createTask('cli', { title, priority, tags, depends, affects })
    autoGenerate()
    console.log(`✅ Created ${task.id}: ${task.title} [${task.priority}]`)
    break
  }

  case 'claim': {
    const agentId = getArg('--agent') || 'cli'
    // Only treat args[1] as taskId if it's not a flag (doesn't start with --)
    const taskId = args[1] && !args[1].startsWith('--') ? args[1] : undefined
    const task = engine.claimTask(agentId, taskId)
    if (task) {
      autoGenerate()
      console.log(`✅ ${agentId} claimed ${task.id}: ${task.title}`)
    } else {
      console.log('❌ No available tasks to claim')
    }
    break
  }

  case 'start': {
    const taskId = args[1]
    const agentId = getArg('--agent') || 'cli'
    if (!taskId) { console.error('Usage: macs start <task-id>'); process.exit(1) }
    engine.startTask(agentId, taskId)
    autoGenerate()
    console.log(`🔄 ${agentId} started ${taskId}`)
    break
  }

  case 'done': {
    const taskId = args[1]
    const agentId = getArg('--agent') || 'cli'
    if (!taskId) { console.error('Usage: macs done <task-id>'); process.exit(1) }

    const summary = getArg('--summary')
    const artifacts = getArg('--artifacts')?.split(',') || []

    engine.completeTask(agentId, taskId, { summary, artifacts })
    autoGenerate()
    console.log(`✅ ${taskId} completed`)
    break
  }

  case 'block': {
    const taskId = args[1]
    const agentId = getArg('--agent') || 'cli'
    const reason = getArg('--reason') || 'unspecified'
    const escalate = getArg('--escalate')
    if (!taskId) { console.error('Usage: macs block <task-id> --reason "..."'); process.exit(1) }

    engine.blockTask(agentId, taskId, {
      reason: 'other',
      description: reason,
      escalate_to: escalate,
    })
    autoGenerate()
    console.log(`🚫 ${taskId} blocked: ${reason}`)
    break
  }

  case 'unblock': {
    const taskId = args[1]
    const agentId = getArg('--agent') || 'cli'
    const decision = getArg('--decision')
    if (!taskId) { console.error('Usage: macs unblock <task-id>'); process.exit(1) }

    engine.unblockTask(agentId, taskId, { decision })
    autoGenerate()
    console.log(`✅ ${taskId} unblocked${decision ? `: ${decision}` : ''}`)
    break
  }

  case 'register': {
    const agentId = args[1]
    if (!agentId) { console.error('Usage: macs register <agent-id> --capabilities backend,testing'); process.exit(1) }

    const capabilities = getArg('--capabilities')?.split(',') || []
    const model = getArg('--model')
    const role = getArg('--role')

    engine.registerAgent(agentId, { capabilities, model, role })
    autoGenerate()
    console.log(`✅ Agent registered: ${agentId} (${capabilities.join(', ')})`)
    break
  }

  case 'log': {
    const limit = parseInt(getArg('--limit') || '20', 10)
    const taskEvents = engine.getTaskEvents()
    const globalEvents = engine.getGlobalEvents()

    // Merge and sort by timestamp
    const all = [
      ...taskEvents.map(e => ({ ...e, source: 'task' as const })),
      ...globalEvents.map(e => ({ ...e, source: 'global' as const })),
    ].sort((a, b) => a.ts.localeCompare(b.ts))

    const recent = all.slice(-limit)

    console.log(`\n📜 Event Log (last ${recent.length})`)
    console.log(`${'─'.repeat(60)}`)
    for (const event of recent) {
      const time = event.ts.split('T')[1]?.slice(0, 8) || ''
      const id = ('id' in event) ? ` ${(event as any).id}` : ''
      const task = ('task' in event && event.task) ? ` (${event.task})` : ''
      console.log(`  ${time} [${event.type}]${id}${task} — by ${event.by}`)
    }
    console.log('')
    break
  }

  case 'impact': {
    const file = args[1]
    if (!file) { console.error('Usage: macs impact <file-path>'); process.exit(1) }

    const result = engine.analyzeImpact(file)
    console.log(`\n🎯 Impact Analysis: ${file}`)
    console.log(`${'─'.repeat(50)}`)

    if (result.affected_tasks.length === 0 && result.affected_agents.length === 0) {
      console.log('  No known impact.')
    } else {
      if (result.affected_tasks.length > 0) {
        console.log(`\n  Affected tasks:`)
        for (const t of result.affected_tasks) {
          console.log(`    ${t.id} ${t.title} (${t.status}, owner: ${t.assignee || 'none'})`)
        }
      }
      if (result.affected_agents.length > 0) {
        console.log(`\n  Affected agents: ${result.affected_agents.join(', ')}`)
      }
    }
    console.log('')
    break
  }

  case 'inbox': {
    const agentId = args[1]
    if (!agentId) { console.error('Usage: macs inbox <agent-id>'); process.exit(1) }

    const unreadOnly = hasFlag('--unread')
    const messages = engine.getInbox(agentId, unreadOnly)

    console.log(`\n📬 Inbox: ${agentId} (${messages.length} messages${unreadOnly ? ', unread only' : ''})`)
    console.log(`${'─'.repeat(50)}`)
    for (const msg of messages) {
      const readIcon = msg.read ? '  ' : '🔵'
      console.log(`${readIcon} ${msg.id} from ${msg.from} [${msg.type}] ${msg.ts.split('T')[1]?.slice(0, 8)}`)
      if (msg.re) console.log(`   re: ${msg.re}`)
    }
    console.log('')
    break
  }

  case 'send': {
    const from = args[1]
    const to = args[2]
    const content = args[3]
    if (!from || !to || !content) {
      console.error('Usage: macs send <from> <to> <message>')
      process.exit(1)
    }

    const type = (getArg('--type') || 'general') as any
    const re = getArg('--re')

    const msg = engine.sendMessage({ from, to, type, re, data: { content } })
    console.log(`✅ Message sent: ${msg.id} (${from} → ${to})`)
    break
  }

  case 'boot': {
    const agentId = getArg('--agent')
    if (!agentId) {
      console.error('Usage: macs boot --agent <id> [--capabilities backend,testing] [--model sonnet]')
      process.exit(1)
    }

    let state = engine.getState()

    // Auto-register if not seen before
    if (!state.agents[agentId]) {
      const capabilities = getArg('--capabilities')?.split(',') || []
      const model = getArg('--model')
      engine.registerAgent(agentId, { capabilities, model })
      state = engine.getState()
    }

    const agent = state.agents[agentId]
    const lastHeartbeatMs = new Date(agent.last_heartbeat).getTime()
    const isFirstSession = agent.last_heartbeat === agent.registered_at

    // Record heartbeat for this session
    engine.heartbeat(agentId, { status: 'idle' })

    // Find last completed task by this agent
    const taskEvents = engine.getTaskEvents()
    const globalEvents = engine.getGlobalEvents()
    const myLastCompleted = [...taskEvents]
      .reverse()
      .find(e => e.type === 'task_completed' && e.by === agentId)
    const lastCompletedTask = myLastCompleted ? state.tasks[myLastCompleted.id] : null

    // Breaking changes since last heartbeat
    const recentBreaking = globalEvents.filter(e =>
      e.type === 'breaking_change' &&
      new Date(e.ts).getTime() > lastHeartbeatMs
    )

    // Newly unblocked tasks: pending tasks whose deps were completed after last heartbeat
    const allTasks = Object.values(state.tasks)
    const newlyUnblocked = allTasks.filter(t => {
      if (t.status !== 'pending' || t.depends.length === 0) return false
      const allDepsCompleted = t.depends.every(depId => state.tasks[depId]?.status === 'completed')
      if (!allDepsCompleted) return false
      return t.depends.some(depId => {
        const depDoneEvent = [...taskEvents]
          .reverse()
          .find(e => e.type === 'task_completed' && e.id === depId)
        return depDoneEvent && new Date(depDoneEvent.ts).getTime() > lastHeartbeatMs
      })
    })

    // Unread inbox messages
    const unread = engine.getInbox(agentId, true)

    // Recommended next task: pending + unblocked, sorted by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const available = allTasks
      .filter(t => {
        if (t.status !== 'pending') return false
        return t.depends.every(depId => state.tasks[depId]?.status === 'completed')
      })
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    const recommended = available[0]
    const myInProgress = allTasks.find(t => t.assignee === agentId && t.status === 'in_progress')

    // --- Output ---
    const caps = agent.capabilities?.join(', ') || '未声明'
    console.log(`\n你是 ${agentId} (${caps})`)

    if (isFirstSession) {
      console.log('首次会话，初始化完成')
    } else if (lastCompletedTask) {
      console.log(`上次会话：${timeAgo(agent.last_heartbeat)}，完成了 ${lastCompletedTask.id} (${lastCompletedTask.title})`)
    } else {
      console.log(`上次会话：${timeAgo(agent.last_heartbeat)}`)
    }

    const changes: string[] = []
    for (const msg of unread) {
      changes.push(`📬 ${msg.from} 发来消息 [${msg.type}]`)
    }
    for (const e of recentBreaking) {
      const file = (e as any).data?.file || (e as any).data?.path || '未知文件'
      changes.push(`⚠️  ${e.by} 做了 breaking change: ${file}`)
    }
    for (const t of newlyUnblocked) {
      changes.push(`🔓 ${t.id} 的依赖 ${t.depends.join(', ')} 已完成，可以开始了`)
    }

    if (changes.length > 0) {
      console.log('\n变化提醒（与你有关）：')
      for (const c of changes) console.log(`  ${c}`)
    }

    if (myInProgress) {
      console.log(`\n当前任务：${myInProgress.id} (${myInProgress.title}) — 进行中`)
      console.log(`完成后运行：\`macs done ${myInProgress.id} --agent ${agentId}\``)
    } else if (recommended) {
      console.log(`\n推荐下一步：认领 ${recommended.id} (${recommended.title}) [${recommended.priority}]`)
      console.log(`\n运行 \`macs claim ${recommended.id} --agent ${agentId}\` 开始`)
    } else {
      console.log('\n当前没有可认领的任务，等待新任务分配。')
    }

    console.log('')
    break
  }

  case 'generate': {
    generator.generate()
    console.log('✅ human/ directory updated (TASK.md, CHANGELOG.md, STATUS.md)')
    break
  }

  default: {
    console.log(`
MACS Protocol v3.0 — Git for AI Agents

Usage:
  macs boot --agent <id> [flags]     ★ Session start: catch up + get next task
  macs init [name]                   Initialize MACS in current project
  macs status                        Show project status
  macs create <title> [flags]        Create a task
  macs claim [task-id] --agent <id>  Claim a task
  macs start <task-id>               Start working on a task
  macs done <task-id>                Complete a task
  macs block <task-id> --reason "."  Block a task
  macs unblock <task-id>             Unblock a task
  macs register <agent-id> [flags]   Register an agent
  macs log [--limit N]               View event log
  macs impact <file>                 Analyze change impact
  macs inbox <agent-id>              Check agent inbox
  macs send <from> <to> <msg>        Send a message
  macs generate                      Regenerate human/ Markdown
`)
    break
  }
}
