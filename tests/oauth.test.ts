import { describe, expect, it } from 'vitest'
import { oauthProviderNames, oauthRedirectTarget } from '../src/core/oauth'

describe('oauth providers', () => {
  it('keeps configured names in order and drops blanks', () => {
    expect(oauthProviderNames([' GitHub ', 'GitHub', '', '  ', 1, 'Gitee'])).toEqual(['GitHub', 'Gitee'])
    expect(oauthProviderNames(undefined)).toEqual([])
  })

  it('follows only an http(s) redirect from the dashboard response', () => {
    expect(oauthRedirectTarget({ success: true, data: { redirect: 'https://github.com/login/oauth/authorize?x=1' } })).toBe(
      'https://github.com/login/oauth/authorize?x=1',
    )
    expect(oauthRedirectTarget({ success: false, data: { redirect: 'https://github.com/login' } })).toBeNull()
    expect(oauthRedirectTarget({ redirect: 'javascript:alert(1)' })).toBeNull()
    expect(oauthRedirectTarget({ data: {} })).toBeNull()
  })
})
