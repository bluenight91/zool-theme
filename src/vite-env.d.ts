/// <reference types="vite/client" />

declare const __ZOOL_TARGET__: 'nezha' | 'demo'
declare const __ZOOL_VERSION__: string

interface Window {
  /** Nezha runtime configuration, see targets/nezha/config.js. */
  ZoolConfig?: Record<string, unknown>
  /** Set from the dashboard's user-frontend custom code. See src/core/custom-code.ts. */
  CustomLogo?: unknown
  CustomDesc?: unknown
  ForceTheme?: unknown
  DisableAnimatedMan?: unknown
  ShowNetTransfer?: unknown
}
