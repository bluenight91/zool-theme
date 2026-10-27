/** Provider names from Nezha's public `config.oauth2_providers`, in the order they arrived. */
export function oauthProviderNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const names: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const name = item.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

/** The browser location from `GET /api/v1/oauth2/:provider`. Only http(s) is followed. */
export function oauthRedirectTarget(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  if (record.success === false) return null
  const payload = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : record
  const redirect = payload.redirect
  if (typeof redirect !== 'string') return null
  try {
    const url = new URL(redirect)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}
