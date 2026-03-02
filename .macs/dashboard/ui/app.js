// MACS Dashboard App
let dashboardData = null

// Load data on page load
async function loadData() {
  try {
    const res = await fetch('/api/data')
    dashboardData = await res.json()
    renderDashboard()
  } catch (err) {
    console.error('Failed to load data:', err)
    document.getElementById('project-name').textContent = 'Error loading data'
  }
}

// Render all dashboard components
function renderDashboard() {
  if (!dashboardData) return

  // Update header
  document.getElementById('project-name').textContent = `Project: ${dashboardData.project}`

  // Update stats
  document.getElementById('total-tasks').textContent = dashboardData.stats.totalTasks
  document.getElementById('completed-tasks').textContent = dashboardData.stats.completedTasks
  document.getElementById('open-tasks').textContent = dashboardData.stats.openTasks
  document.getElementById('blocked-tasks').textContent = dashboardData.stats.blockedTasks
  document.getElementById('total-changes').textContent = dashboardData.stats.totalChanges
  document.getElementById('contributors').textContent = dashboardData.stats.contributors.length

  // Render charts
  renderTimeline()
  renderTokenChart()
  renderHeatmap()
  renderRecentActivity()
  renderEscalations()
  renderContributors()
}

// Timeline chart (simple bar chart)
function renderTimeline() {
  const container = document.getElementById('timeline-chart')
  container.innerHTML = ''

  // Group by date
  const byDate = {}
  dashboardData.timeline.forEach(item => {
    if (!byDate[item.date]) byDate[item.date] = []
    byDate[item.date].push(item)
  })

  // Get last 30 days
  const dates = Object.keys(byDate).sort().slice(-30)

  if (dates.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center;">No activity data</p>'
    return
  }

  const maxCount = Math.max(...dates.map(d => byDate[d].length))

  dates.forEach(date => {
    const count = byDate[date].length
    const width = (count / maxCount) * 100

    const bar = document.createElement('div')
    bar.className = 'heatmap-bar'
    bar.innerHTML = `
      <div class="heatmap-label">${date}</div>
      <div class="heatmap-bar-fill" style="width: ${width}%"></div>
      <div class="heatmap-count">${count}</div>
    `
    container.appendChild(bar)
  })
}

// Token usage chart
function renderTokenChart() {
  const container = document.getElementById('token-chart')
  container.innerHTML = ''

  if (!dashboardData.tokenUsage || dashboardData.tokenUsage.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center;">No token usage data</p>'
    return
  }

  const data = dashboardData.tokenUsage.slice(-30)  // Last 30 days
  const maxTokens = Math.max(...data.map(d => d.estimated))

  data.forEach(item => {
    const width = (item.estimated / maxTokens) * 100

    const bar = document.createElement('div')
    bar.className = 'heatmap-bar'
    bar.innerHTML = `
      <div class="heatmap-label">${item.date}</div>
      <div class="heatmap-bar-fill" style="width: ${width}%; background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%);"></div>
      <div class="heatmap-count">${item.estimated} tokens</div>
    `
    container.appendChild(bar)
  })
}

// File heatmap
function renderHeatmap() {
  const container = document.getElementById('heatmap')
  container.innerHTML = ''

  if (!dashboardData.heatmap || dashboardData.heatmap.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center;">No file change data</p>'
    return
  }

  const maxChanges = Math.max(...dashboardData.heatmap.map(f => f.changes))

  dashboardData.heatmap.slice(0, 15).forEach(file => {
    const width = (file.changes / maxChanges) * 100

    const bar = document.createElement('div')
    bar.className = 'heatmap-bar'
    bar.innerHTML = `
      <div class="heatmap-label" title="${file.file}">${file.file}</div>
      <div class="heatmap-bar-fill" style="width: ${width}%;"></div>
      <div class="heatmap-count">${file.changes}</div>
    `
    container.appendChild(bar)
  })
}

// Recent activity
function renderRecentActivity() {
  const container = document.getElementById('recent-activity')
  container.innerHTML = ''

  if (!dashboardData.recentActivity || dashboardData.recentActivity.length === 0) {
    container.innerHTML = '<p style="color: #999;">No recent activity</p>'
    return
  }

  dashboardData.recentActivity.forEach(activity => {
    const item = document.createElement('div')
    item.className = 'activity-item'

    // Extract type from message (e.g., "[feat]")
    const typeMatch = activity.message.match(/\[([\w]+)\]/)
    const type = typeMatch ? typeMatch[1] : 'task'
    const badge = `<span class="type-badge type-${type}">${type}</span>`

    item.innerHTML = `
      <div class="activity-timestamp">${activity.timestamp}</div>
      <div>
        ${badge}
        <span class="activity-agent">${activity.agent}</span>
      </div>
      <div class="activity-message">${activity.message.replace(/\[[\w]+\]\s*/, '')}</div>
    `
    container.appendChild(item)
  })
}

// Escalations
function renderEscalations() {
  const section = document.getElementById('escalations-section')
  const container = document.getElementById('escalations-list')
  container.innerHTML = ''

  if (!dashboardData.escalations || dashboardData.escalations.length === 0) {
    section.style.display = 'none'
    return
  }

  section.style.display = 'block'

  dashboardData.escalations.forEach(esc => {
    const item = document.createElement('div')
    item.className = 'escalation-item'
    item.innerHTML = `
      <div><span class="escalation-id">${esc.taskId}</span></div>
      <div style="margin-top: 4px; color: #666;">${esc.reason}</div>
    `
    container.appendChild(item)
  })
}

// Contributors
function renderContributors() {
  const container = document.getElementById('contributors-list')
  container.innerHTML = ''

  if (!dashboardData.stats.contributors || dashboardData.stats.contributors.length === 0) {
    container.innerHTML = '<p style="color: #999;">No contributors yet</p>'
    return
  }

  dashboardData.stats.contributors.forEach(contributor => {
    const badge = document.createElement('span')
    badge.className = 'contributor-badge'
    badge.textContent = contributor
    container.appendChild(badge)
  })
}

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn')
  btn.textContent = '⏳ Refreshing...'
  btn.disabled = true

  try {
    await fetch('/api/refresh')
    await loadData()
    btn.textContent = '✓ Refreshed!'
    setTimeout(() => {
      btn.textContent = '🔄 Refresh'
      btn.disabled = false
    }, 2000)
  } catch (err) {
    btn.textContent = '❌ Failed'
    setTimeout(() => {
      btn.textContent = '🔄 Refresh'
      btn.disabled = false
    }, 2000)
  }
})

// Initial load
loadData()

// Auto-refresh every 30 seconds
setInterval(loadData, 30000)
