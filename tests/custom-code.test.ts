import { describe, expect, it } from 'vitest'
import { readRuntime, resetRuntimeGlobals } from '../src/core/custom-code'
import { DEFAULT_SETTINGS } from '../src/core/settings'

describe('custom code', () => {
  it('lets a script override the site title, logo and description', () => {
    const runtime = readRuntime({
      ZoolConfig: { siteTitle: '我的面板', footerNote: 'kept' },
      CustomLogo: 'https://example.com/logo.png',
      CustomDesc: '  醉后不知天在水，满船清梦压星河。  ',
      DisableAnimatedMan: 'true',
      ShowNetTransfer: 'true',
    })
    expect(runtime.settings.siteTitle).toBe('我的面板')
    expect(runtime.settings.footerNote).toBe('kept')
    expect(runtime.settings.logo).toBe('https://example.com/logo.png')
    expect(runtime.description).toBe('醉后不知天在水，满船清梦压星河。')
    expect(runtime.settings.hideWordmark).toBe(true)
    expect(runtime.settings.showNetTransfer).toBe(true)
  })

  it('treats the string false as hiding cumulative transfer', () => {
    expect(readRuntime({ ShowNetTransfer: 'false' }).settings.showNetTransfer).toBe(false)
    expect(readRuntime({ ShowNetTransfer: false }).settings.showNetTransfer).toBe(false)
    expect(readRuntime({}).settings.showNetTransfer).toBe(true)
  })

  it('drops logo URLs that are not http(s)', () => {
    expect(readRuntime({ CustomLogo: 'javascript:alert(1)' }).settings.logo).toBe('')
    expect(readRuntime({ CustomLogo: '/local.svg' }).settings.logo).toBe('')
    expect(readRuntime({ CustomLogo: 'data:image/png;base64,aaaa' }).settings.logo).toBe('')
  })

  it('maps ForceTheme onto the appearance default and leaves other values alone', () => {
    expect(readRuntime({ ForceTheme: 'dark' }).settings.defaultAppearance).toBe('dark')
    expect(readRuntime({ ForceTheme: 'light', ZoolConfig: { defaultAppearance: 'dark' } }).settings.defaultAppearance).toBe('light')
    expect(readRuntime({ ForceTheme: 'system' }).settings.defaultAppearance).toBe(DEFAULT_SETTINGS.defaultAppearance)
    expect(readRuntime({ DisableAnimatedMan: 'false' }).settings.hideWordmark).toBe(false)
    expect(readRuntime({ ZoolConfig: { loginMode: 'oauth' } }).settings.loginMode).toBe('oauth')
    expect(readRuntime({ ZoolConfig: { loginMode: 'nope' } }).settings.loginMode).toBe('both')
  })

  it('keeps config.js keys the custom script did not assign', () => {
    const target: { ZoolConfig: Record<string, unknown> } = { ZoolConfig: { footerNote: 'kept', siteTitle: 'from file' } }
    resetRuntimeGlobals(target)
    target.ZoolConfig = { siteTitle: '我的面板' }
    const runtime = readRuntime(target)
    expect(runtime.settings.siteTitle).toBe('我的面板')
    expect(runtime.settings.footerNote).toBe('kept')
  })

  it('restores config.js after a custom script replaces it', () => {
    const target = { ZoolConfig: { siteTitle: 'from file' }, CustomLogo: 'https://cdn.example/a.png' }
    resetRuntimeGlobals(target)
    target.ZoolConfig = { siteTitle: 'custom' }
    target.CustomLogo = 'https://cdn.example/b.png'
    resetRuntimeGlobals(target)
    expect(target.ZoolConfig).toEqual({ siteTitle: 'from file' })
    expect('CustomLogo' in target).toBe(false)
  })
})
