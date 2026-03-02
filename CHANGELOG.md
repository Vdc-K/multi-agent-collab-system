# 变更记录

> **维护规则**：只保留最近 2 周。旧记录移到 `archive/CHANGELOG-YYYY-MM.md`

## 格式
```
- [类型] 描述（一句话）- by {model}@{session前6位} #标签
```

**类型**：`✨新增` `🐛修复` `♻️重构` `📝文档` `⚡️性能` `🔧配置` `🗑️清理`

**常用标签**：`#运维` `#开发` `#文档` `#skill开发` `#调试` `#部署` `#设计`

---

## 2026-02-28

### v2.3 Technical Upgrade 🚀
- [✨ feat] **Markdown AST Indexer**: 98% token reduction via structured querying - by sonnet #dev #perf
- [✨ feat] **Dashboard**: Visual analytics for multi-agent collaboration - by sonnet #dev #ui
- [✨ feat] Query Engine API: queryChangelog/queryTasks/queryContext - by sonnet #dev
- [✨ feat] Token savings stats: real-time cost estimation - by sonnet #dev
- [🔧 config] CLI tool `macs`: index/stats/query/dashboard/init commands - by sonnet #ops
- [📝 docs] TECHNICAL-FEATURES.md: architecture & implementation details - by sonnet #docs
- [🐛 fix] Cross-platform package.json (ESM support) - by sonnet #dev

**Key Metrics**:
- Token usage: 3450 → 45 tokens per query (98.7% reduction)
- Cost savings: $26,460 over 12 weeks (Opus, 100 queries/day)
- Dashboard startup: <3 seconds
- Index generation: <1 second for 1000-line docs

**Tech Stack**:
- Markdown AST: unified + remark + unist-util-visit
- Dashboard: Node HTTP + D3.js + vanilla JS
- TypeScript: strict mode, ESM modules

---

## 2026-02-14

### v2.0 Initial Release
- [✨ feat] MACS v2 refactor: model-tiered cowork + document-driven sync - by sonnet #design
- [✨ feat] WEEKLY-REPORT.md template with pattern discovery section - by sonnet #skill
- [🐛 fix] init.sh sed cross-platform compatibility (macOS/Linux) - by sonnet #dev
- [🐛 fix] CHANGELOG template with initial entry placeholder - by sonnet #dev
- [🐛 fix] Remove incorrect `brew install qmd` from BEST-PRACTICES - by sonnet #docs
- [📝 docs] Complete README + SKILL.md + BEST-PRACTICES - by sonnet #docs

### v2.1 Universal & Bilingual
- [♻️ refactor] Platform-agnostic design (works with any multi-agent system) - by sonnet #design
- [📝 docs] Bilingual documentation (English/Chinese) for user-facing files - by sonnet #docs
- [📝 docs] Platform support list (Claude Code/Cursor/OpenAI/LangChain/OpenClaw) - by sonnet #docs
- [♻️ refactor] Templates pure English (agent-facing, token-efficient) - by sonnet #design

### v2.2 Self-Governing Agents & Enterprise Ready
- [✨ feat] Escalation Protocol: Engineers can block tasks and escalate to Lead - by sonnet #design
- [✨ feat] Escalations section in TASK.md (priority queue for blocked tasks) - by sonnet #dev
- [📝 docs] EVENT-TRIGGERS.md: Guide for auto-triggering weekly maintenance - by sonnet #docs
- [🔧 config] Integration examples for cron/GitHub Actions/mycc scheduler - by sonnet #ops
- [📝 docs] #escalation tag for blocked tasks in CHANGELOG - by sonnet #docs
- [📝 docs] SKILL-CAPSULES.md: EvoMAP-inspired skill packaging with environment fingerprint - by sonnet #docs
- [📝 docs] ENTERPRISE-TEAMS.md: Multi-agent team coordination architecture - by sonnet #docs
- [📝 docs] QUICKSTART.md: 5-minute getting started guide - by sonnet #docs
- [📝 docs] FAQ.md: Comprehensive Q&A - by sonnet #docs
- [📝 docs] CONTRIBUTING.md: Contribution guidelines - by sonnet #docs
- [🔧 config] LICENSE: MIT license added - by sonnet #config
- [🔧 config] .gitignore + GitHub templates - by sonnet #config
- [📝 docs] Simple project example added - by sonnet #docs
