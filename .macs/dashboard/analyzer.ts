/**
 * Dashboard Analyzer
 * Analyzes MACS project data for visualization
 */

import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'
import type { MACSIndex } from '../tools/src/types.js'

export interface DashboardData {
  project: string
  generatedAt: string

  // Overview stats
  stats: {
    totalTasks: number
    completedTasks: number
    openTasks: number
    blockedTasks: number
    totalChanges: number
    contributors: string[]
  }

  // Timeline data (for visualization)
  timeline: Array<{
    date: string
    agent: string
    action: string
    type: 'feat' | 'fix' | 'docs' | 'task' | 'escalation'
  }>

  // File heatmap (which files are touched most)
  heatmap: Array<{
    file: string
    changes: number
  }>

  // Token usage over time
  tokenUsage: Array<{
    date: string
    estimated: number
  }>

  // Recent activity
  recentActivity: Array<{
    timestamp: string
    agent: string
    message: string
  }>

  // Escalations
  escalations: Array<{
    taskId: string
    reason: string
    escalatedAt: string
  }>
}

export class DashboardAnalyzer {
  private indexPath: string
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
    this.indexPath = path.join(projectPath, '.macs', 'index.json')
  }

  async analyze(): Promise<DashboardData> {
    // Load MACS index
    let index: MACSIndex
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf-8')
      index = JSON.parse(indexData)
    } catch {
      throw new Error('No MACS index found. Run `macs index` first.')
    }

    // Get Git activity
    const gitActivity = await this.getGitActivity()

    // Get file heatmap from Git
    const heatmap = await this.getFileHeatmap()

    // Build timeline from changelog
    const timeline = index.changelog.map(e => ({
      date: e.date,
      agent: e.author || 'unknown',
      action: e.content,
      type: e.type as any,
    }))

    // Estimate token usage over time
    const tokenUsage = this.estimateTokenUsage(index)

    // Recent activity (last 10 changelog entries)
    const recentActivity = index.changelog.slice(-10).reverse().map(e => ({
      timestamp: e.date,
      agent: e.author || 'unknown',
      message: `[${e.type}] ${e.content}`,
    }))

    // Escalations from tasks
    const escalations = index.tasks
      .filter(t => t.status === 'blocked')
      .map(t => ({
        taskId: t.id,
        reason: t.blockedBy || 'Unknown',
        escalatedAt: 'N/A',  // TODO: track escalation timestamp
      }))

    return {
      project: index.project,
      generatedAt: new Date().toISOString(),
      stats: {
        ...index.stats,
        blockedTasks: index.tasks.filter(t => t.status === 'blocked').length,
      },
      timeline,
      heatmap,
      tokenUsage,
      recentActivity,
      escalations,
    }
  }

  async refresh() {
    // Re-generate index by calling indexer
    const { MarkdownIndexer } = await import('../tools/src/markdown-indexer.js')
    await MarkdownIndexer.indexProject(this.projectPath)
  }

  private async getGitActivity(): Promise<Array<{ date: string; commits: number }>> {
    try {
      const log = execSync(
        'git log --since="30 days ago" --format="%ci" --no-merges',
        { cwd: this.projectPath, encoding: 'utf-8' }
      )

      const dates = log.trim().split('\n')
        .map(line => line.split(' ')[0])
        .filter(Boolean)

      // Group by date
      const grouped = dates.reduce((acc, date) => {
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return Object.entries(grouped).map(([date, commits]) => ({
        date,
        commits,
      }))
    } catch {
      return []
    }
  }

  private async getFileHeatmap(): Promise<Array<{ file: string; changes: number }>> {
    try {
      const log = execSync(
        'git log --since="30 days ago" --name-only --format="" --no-merges',
        { cwd: this.projectPath, encoding: 'utf-8' }
      )

      const files = log.trim().split('\n').filter(Boolean)

      // Count changes per file
      const counts = files.reduce((acc, file) => {
        acc[file] = (acc[file] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Sort by changes descending
      return Object.entries(counts)
        .map(([file, changes]) => ({ file, changes }))
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 20)  // Top 20 files
    } catch {
      return []
    }
  }

  private estimateTokenUsage(index: MACSIndex): Array<{ date: string; estimated: number }> {
    // Group changelog entries by date
    const byDate = index.changelog.reduce((acc, e) => {
      if (!acc[e.date]) acc[e.date] = []
      acc[e.date].push(e)
      return acc
    }, {} as Record<string, typeof index.changelog>)

    // Estimate tokens per day (lines * 3 tokens/line)
    return Object.entries(byDate).map(([date, entries]) => {
      const lines = entries.reduce((sum, e) => {
        return sum + (e.lineRange[1] - e.lineRange[0] + 1)
      }, 0)

      return {
        date,
        estimated: lines * 3,
      }
    })
  }
}
