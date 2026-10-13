import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, cpSync, statSync } from 'node:fs'
import { resolve, extname, dirname } from 'node:path'
import { buildIndex } from './scripts/build-index.mjs'

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
}

/** Resolve the local data root: ./private (real records, gitignored) if present, else ./demo-data. */
function dataRoot() {
  const hasRecords = existsSync('private/records') && readdirSync('private/records').some((f) => f.endsWith('.json'))
  return hasRecords ? resolve('private') : resolve('demo-data')
}

/**
 * Dev-only data server. Serves GET /data/* from the data root and accepts PUT /data/* to write
 * new records/attachments from the in-app "Add record" form, rebuilding index.json afterwards.
 */
function localData(): Plugin {
  return {
    name: 'local-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/data/')) return next()
        const root = dataRoot()
        const rel = decodeURIComponent(req.url.slice('/data/'.length).split('?')[0])
        const file = resolve(root, rel)
        if (!file.startsWith(root + '/')) {
          res.statusCode = 403
          return res.end('forbidden')
        }
        if (req.method === 'GET') {
          if (rel === 'index.json') {
            const { index, errors } = buildIndex(root)
            if (errors.length) {
              res.statusCode = 500
              return res.end('index errors:\n' + errors.join('\n'))
            }
            res.setHeader('content-type', 'application/json')
            return res.end(JSON.stringify(index))
          }
          if (!existsSync(file) || statSync(file).isDirectory()) {
            res.statusCode = 404
            return res.end('not found')
          }
          res.setHeader('content-type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream')
          return res.end(readFileSync(file))
        }
        if (req.method === 'PUT') {
          const chunks: Buffer[] = []
          req.on('data', (c) => chunks.push(c))
          req.on('end', () => {
            mkdirSync(dirname(file), { recursive: true })
            writeFileSync(file, Buffer.concat(chunks))
            const { errors } = buildIndex(root)
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: errors.length === 0, errors, root }))
          })
          return
        }
        next()
      })
    },
  }
}

/** Ship the fictional demo dataset with the hosted build so visitors can try the app without a token. */
function copyDemoData(): Plugin {
  return {
    name: 'copy-demo-data',
    apply: 'build',
    closeBundle() {
      const { index, errors } = buildIndex(resolve('demo-data'))
      if (errors.length) throw new Error('demo-data problems:\n' + errors.join('\n'))
      cpSync('demo-data', 'dist/data', { recursive: true })
      writeFileSync('dist/data/index.json', JSON.stringify(index))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), localData(), copyDemoData()],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] },
})
