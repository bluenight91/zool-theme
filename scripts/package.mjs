#!/usr/bin/env node
// Packs the Nezha build into release/dist.zip.
// The archive root is `dist/` with a nonempty `dist/index.html`, which is the only
// shape 设置 → 前端管理 will install. Run `pnpm build` first.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { assertDistZip } from './check-dist-zip.mjs'

const root = new URL('..', import.meta.url).pathname
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const out = join(root, 'release')
const dist = join(root, 'dist')

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) {
      console.error(`✗ symlink in dist/: ${relative(dist, path)}`)
      process.exit(1)
    }
    if (stat.isDirectory()) walk(path, acc)
    else acc.push(path)
  }
  return acc
}

if (!existsSync(join(dist, 'index.html')) || statSync(join(dist, 'index.html')).size === 0) {
  console.error('✗ dist/index.html is missing, run `pnpm build` first')
  process.exit(1)
}
const files = walk(dist)
const maps = files.filter((file) => file.endsWith('.map'))
if (maps.length) {
  console.error(`✗ source maps found in dist/: ${maps.map((file) => relative(dist, file)).join(', ')}`)
  process.exit(1)
}

mkdirSync(out, { recursive: true })
const zipPath = join(out, 'dist.zip')
rmSync(zipPath, { force: true })
// Paths inside the archive must be `dist/...`, so zip from the repo root.
execFileSync('zip', ['-r', '-X', '-q', zipPath, 'dist'], { cwd: root })

const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
assertDistZip(listing, statSync(join(dist, 'index.html')).size)

const sha = createHash('sha256').update(readFileSync(zipPath)).digest('hex')
const size = (statSync(zipPath).size / 1024).toFixed(0)
console.log(`✓ dist.zip  ${size} KB  ${listing.length} entries  sha256 ${sha}  (theme v${pkg.version})`)
writeFileSync(join(out, 'SHA256SUMS'), `${sha}  dist.zip\n`)
