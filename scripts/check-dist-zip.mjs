// Nezha installs a user frontend only when every archive entry lives under dist/
// and dist/index.html is present. See nezhahq/nezha pkg/frontend/store.go.

export function distZipProblems(entries, indexBytes) {
  const problems = []
  if (!entries.length) problems.push('archive is empty')
  const seen = new Set()
  let index = false
  for (const raw of entries) {
    const name = String(raw).replace(/\\/g, '/').replace(/^\.\//, '')
    if (!name) continue
    if (seen.has(name)) problems.push(`duplicate path: ${name}`)
    seen.add(name)
    if (name.startsWith('/') || name.split('/').includes('..')) {
      problems.push(`unsafe path: ${name}`)
      continue
    }
    const trimmed = name.endsWith('/') ? name.slice(0, -1) : name
    if (trimmed !== 'dist' && !trimmed.startsWith('dist/')) problems.push(`path outside dist/: ${name}`)
    if (trimmed.endsWith('.map')) problems.push(`source map: ${name}`)
    if (trimmed === 'dist/index.html') index = true
  }
  if (!index) problems.push('missing dist/index.html')
  if (indexBytes !== undefined && !(indexBytes > 0)) problems.push('dist/index.html is empty')
  return problems
}

export function assertDistZip(entries, indexBytes) {
  const problems = distZipProblems(entries, indexBytes)
  if (problems.length) throw new Error(`dist.zip is not a Nezha frontend:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
}
