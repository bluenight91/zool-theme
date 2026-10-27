import { normalizeSettings, safeLogoUrl, type ThemeSettings } from './settings'

/**
 * Globals the Nezha dashboard's "custom code" box is expected to set, matching the
 * names used by the official user frontend. Strings `"true"` and `"false"` count,
 * because that is how the box is usually filled in.
 */
export interface RuntimeGlobals {
  ZoolConfig?: unknown
  CustomLogo?: unknown
  CustomDesc?: unknown
  ForceTheme?: unknown
  DisableAnimatedMan?: unknown
  ShowNetTransfer?: unknown
}

const CUSTOM_KEYS = ['CustomLogo', 'CustomDesc', 'ForceTheme', 'DisableAnimatedMan', 'ShowNetTransfer'] as const

const baselines = new WeakMap<object, unknown>()

const isTrue = (value: unknown) => value === true || value === 'true'
const isFalse = (value: unknown) => value === false || value === 'false'

function clone(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as unknown
  }
}

/**
 * Put `ZoolConfig` back to the copy config.js shipped, and drop custom-code globals.
 * Called before each injection so a later, empty custom code does not keep the previous script's assignments.
 */
export function resetRuntimeGlobals(target: RuntimeGlobals): void {
  const box = target as object
  if (!baselines.has(box)) baselines.set(box, clone(target.ZoolConfig))
  target.ZoolConfig = clone(baselines.get(box))
  const record = target as Record<string, unknown>
  for (const key of CUSTOM_KEYS) delete record[key]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** Read config.js and the custom-code globals into one settings object. Custom code wins per key. */
export function readRuntime(globals: RuntimeGlobals): { settings: ThemeSettings; description: string } {
  // A script that assigns `window.ZoolConfig = { siteTitle }` replaces the object. Keys it
  // does not mention stay as config.js left them, which is what `resetRuntimeGlobals` saved.
  const raw: Record<string, unknown> = { ...asRecord(baselines.get(globals as object)), ...asRecord(globals.ZoolConfig) }
  if (globals.ForceTheme === 'light' || globals.ForceTheme === 'dark') raw.defaultAppearance = globals.ForceTheme
  const settings = normalizeSettings(raw)
  const record = globals as Record<string, unknown>
  if ('CustomLogo' in record) settings.logo = safeLogoUrl(globals.CustomLogo)
  if ('DisableAnimatedMan' in record) settings.hideWordmark = isTrue(globals.DisableAnimatedMan)
  if ('ShowNetTransfer' in record) settings.showNetTransfer = !isFalse(globals.ShowNetTransfer)
  const description = typeof globals.CustomDesc === 'string' ? globals.CustomDesc.trim() : ''
  return { settings, description }
}
