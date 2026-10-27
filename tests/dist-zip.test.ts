import { describe, expect, it } from 'vitest'
import { distZipProblems } from '../scripts/check-dist-zip.mjs'

describe('dist.zip layout', () => {
  it('accepts a frontend whose files all live under dist/', () => {
    expect(distZipProblems(['dist/', 'dist/index.html', 'dist/assets/index-abc.js', 'dist/config.js'], 120)).toEqual([])
  })

  it('rejects an archive that is not the shape Nezha installs', () => {
    expect(distZipProblems(['zool-dist/index.html'], 10)).toContain('missing dist/index.html')
    expect(distZipProblems(['index.html', 'dist/index.html'], 10)).toContain('path outside dist/: index.html')
    expect(distZipProblems(['dist/index.html', 'dist/../../etc/passwd'], 10).some((p) => p.startsWith('unsafe path'))).toBe(true)
    expect(distZipProblems(['dist/index.html', 'dist/assets/app.js.map'], 10)).toContain('source map: dist/assets/app.js.map')
    expect(distZipProblems(['dist/index.html'], 0)).toContain('dist/index.html is empty')
    expect(distZipProblems(['dist/index.html', 'dist/index.html'], 10)).toContain('duplicate path: dist/index.html')
  })
})
