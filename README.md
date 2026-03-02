# MACS — Git for AI Agents

> When 10 agents work on the same project, who does what? What changed? Who's affected?
>
> **MACS keeps your agents in sync.** No servers, no setup, just files + Git.

[English](#quick-start) | [中文](#中文)

---

## The Problem

You have multiple AI agents working on the same codebase:

```
Agent-001 changes the API return format
Agent-002 doesn't know, keeps using the old format
Agent-003 changes the database schema
→ Everything breaks
```

**A2A/MCP solve how agents talk. MACS solves how agents work together without chaos.**

## How It Works

```
.macs/
├── protocol/          ← Agents read/write here (JSONL, fast, no conflicts)
│   ├── tasks.jsonl    # Task lifecycle events (append-only)
│   ├── events.jsonl   # All changes, decisions, conflicts
│   ├── state.json     # Current snapshot (auto-rebuilt)
│   └── agents.json    # Who's here, what can they do
│
├── sync/inbox/        ← Agent-to-agent messaging
│   ├── agent-001/
│   └── agent-002/
│
└── human/             ← Auto-generated Markdown (for you to read)
    ├── TASK.md
    └── CHANGELOG.md
```

**Agents write JSONL → Humans read Markdown. Best of both worlds.**

## Quick Start

```bash
# Install
npx macs init

# That's it. Your project now has .macs/
```

### For agents

```typescript
import { MACSProtocol } from '@macs/protocol'

const agent = new MACSProtocol({
  id: 'engineer-sonnet',
  capabilities: ['backend', 'testing']
})

// Claim a task
const task = await agent.tasks.claim({ status: 'pending' })

// Do work...

// Mark done
await agent.tasks.complete(task.id, {
  artifacts: ['src/auth/jwt.ts']
})
```

### For humans

```bash
# See what's happening
macs status

# Who changed what?
macs log

# What does this change affect?
macs impact src/auth/jwt.ts
```

## Why MACS?

### vs. just using Git

Git tracks file changes. MACS tracks **who's doing what, what depends on what, and who gets affected by changes.**

### vs. A2A / MCP

| | A2A/MCP | MACS |
|--|---------|------|
| Solves | How agents communicate | How agents coordinate work |
| Requires | Server, API endpoints | Just files + Git |
| Analogy | HTTP | Git |
| Works offline | No | Yes |

### vs. Jira / Linear for agents

Those are built for humans. MACS is built for machines — JSONL, not Markdown; events, not forms.

## Key Features

**Event Sourcing** — Every action is an append-only event. No conflicts, full history, any state can be rebuilt.

```jsonl
{"type":"task_created","id":"T-001","ts":"...","by":"lead-opus","data":{"title":"Add auth"}}
{"type":"task_assigned","id":"T-001","ts":"...","by":"lead-opus","data":{"assignee":"engineer-sonnet"}}
{"type":"task_completed","id":"T-001","ts":"...","by":"engineer-sonnet","data":{"artifacts":["src/auth.ts"]}}
```

**Task Claiming** — Agents auto-claim tasks. No two agents grab the same task.

**Dependency Tracking** — Task T-002 depends on T-001? Agents know to wait.

**Impact Analysis** — Changed `api/users.ts`? MACS knows which agents are affected.

**Inbox Messaging** — Agents communicate through file-based mailboxes. No server needed.

**Human-Readable Output** — `human/` directory auto-generates Markdown from JSONL. You never lose readability.

## Platform Support

Works with any AI agent framework:

| Platform | Support |
|----------|---------|
| Claude Code | Native |
| Cursor | Adapter |
| Aider | Adapter |
| Continue.dev | Adapter |
| Ollama + local models | Adapter |
| LM Studio | Adapter |
| LangChain / CrewAI / AutoGen | Python SDK |
| Any tool that reads files | Just works |

```bash
# One-line install, auto-detects your platform
./install.sh
```

## Token Optimization

MACS v2.3 includes a Markdown AST indexer for the `human/` layer:

- **99% token reduction** — Query 17 changelog entries in 30 tokens (vs 3000)
- **Dashboard** — http://localhost:3456 for visual analytics

But the real efficiency comes from the Protocol layer: agents read `state.json` (structured) instead of parsing Markdown (slow).

## Positioning

```
Communication Layer     Work Layer          Capability Layer
(how agents talk)      (how agents        (how agents evolve)
                        coordinate)
┌──────────────┐       ┌──────────┐       ┌──────────────┐
│ A2A (Google) │       │   MACS   │       │ EvoMap (GEP) │
│ MCP (Anthr.) │       │          │       │              │
│ ACP (IBM)    │       │          │       │              │
└──────────────┘       └──────────┘       └──────────────┘

Three layers, complementary, not competing.
```

## Roadmap

- [x] **v2.3** — AST indexer, Dashboard, cross-platform install
- [ ] **v3.0** — JSONL Protocol, Event Sourcing, Agent SDK, inbox messaging
- [ ] **v3.5** — Smart task allocation, dependency graph, Dashboard v2
- [ ] **v4.0** — Plugin system, A2A/MCP bridge, Team/Enterprise tiers

## License

MIT © 2026

---

## 中文

# MACS — AI Agent 的 Git

> 10 个 agent 同时改一个项目，谁做什么？改了什么？影响谁？
>
> **MACS 让你的 agent 保持同步。** 不需要服务器，不需要配置，只要文件 + Git。

## 问题

多个 AI agent 在同一个代码库里工作：

```
Agent-001 改了 API 返回格式
Agent-002 不知道，继续用旧格式
Agent-003 改了数据库 schema
→ 整个系统崩了
```

**A2A/MCP 解决 agent 怎么说话。MACS 解决 agent 怎么一起干活不乱套。**

## 原理

```
.macs/
├── protocol/          ← Agent 读写这里（JSONL，快，无冲突）
│   ├── tasks.jsonl    # 任务生命周期事件（只追加）
│   ├── events.jsonl   # 所有变更、决策、冲突
│   ├── state.json     # 当前状态快照（自动重建）
│   └── agents.json    # 谁在、能做什么
│
├── sync/inbox/        ← Agent 间通信
│   ├── agent-001/
│   └── agent-002/
│
└── human/             ← 自动生成的 Markdown（给人看）
    ├── TASK.md
    └── CHANGELOG.md
```

**Agent 写 JSONL → 人读 Markdown。两全其美。**

## 快速开始

```bash
npx macs init
# 搞定。你的项目现在有 .macs/ 了
```

## 核心特性

- **Event Sourcing** — 每个操作都是只追加事件，无冲突，完整历史
- **任务认领** — Agent 自动认领任务，不撞车
- **依赖追踪** — T-002 依赖 T-001？Agent 知道要等
- **影响分析** — 改了 `api/users.ts`？MACS 知道影响哪些 agent
- **收件箱** — Agent 通过文件邮箱通信，不需要服务器
- **人类可读** — `human/` 目录自动从 JSONL 生成 Markdown

## 定位

```
通信层（怎么说话）    工作层（怎么协作）    能力层（怎么进化）
A2A (Google)         MACS（我们）         EvoMap (GEP)
MCP (Anthropic)
ACP (IBM)

三层互补，不竞争。
```

## 平台支持

支持所有 AI agent 框架：Claude Code、Cursor、Aider、Continue、Ollama、LM Studio、LangChain、CrewAI、AutoGen，以及任何能读文件的工具。

```bash
./install.sh  # 一键安装，自动检测平台
```

## 开源协议

MIT © 2026
