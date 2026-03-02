#!/usr/bin/env node
/**
 * MACS Dashboard Server
 * Simple HTTP server serving visualization UI
 */

import http from 'http'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { DashboardAnalyzer } from './analyzer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 3456

async function startServer(projectPath: string) {
  const analyzer = new DashboardAnalyzer(projectPath)

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/'

    try {
      // API endpoints
      if (url === '/api/data') {
        const data = await analyzer.analyze()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
        return
      }

      if (url === '/api/refresh') {
        await analyzer.refresh()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'refreshed' }))
        return
      }

      // Static files
      const filePath = url === '/' ? '/ui/index.html' : url
      const fullPath = path.join(__dirname, filePath)

      const content = await fs.readFile(fullPath, 'utf-8')
      const ext = path.extname(fullPath)

      const contentType =
        ext === '.html' ? 'text/html' :
        ext === '.css' ? 'text/css' :
        ext === '.js' ? 'application/javascript' :
        'text/plain'

      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    } catch (err) {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  server.listen(PORT, () => {
    console.log(`\n🚀 MACS Dashboard running at http://localhost:${PORT}`)
    console.log(`📊 Analyzing project: ${projectPath}\n`)

    // Auto-open browser
    const open = async () => {
      const { default: openModule } = await import('open')
      await openModule(`http://localhost:${PORT}`)
    }
    open().catch(() => {
      console.log('⚠️  Could not auto-open browser. Please visit the URL manually.')
    })
  })
}

// CLI usage
const projectPath = process.argv[2] || process.cwd()
startServer(projectPath)
