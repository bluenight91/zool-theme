import { readRuntime, resetRuntimeGlobals } from '@/core/custom-code'
import { oauthProviderNames, oauthRedirectTarget } from '@/core/oauth'
import { injectCustomCode } from '@/core/inject-custom-code'
import { request, resilientSocket, wsUrl } from '@/core/http'
import { mapOnlineHistory, type OnlineHistoryPayload } from '@/core/online'
import type {
  LiveEvent,
  LoginResult,
  MonitorAdapter,
  NodeInfo,
  OnlineHistory,
  PingData,
  Session,
  SiteInfo,
  Snapshot,
} from '@/core/model'
import { flagToRegion } from '@/core/region'

/* ---------- API shapes (Nezha dashboard v1, tested on v2.0.13) ---------- */

interface Common<T> {
  success: boolean
  data?: T
  error?: string
}

export interface NezhaServer {
  id: number
  name: string
  public_note?: string
  display_index?: number
  country_code?: string
  last_active?: string
  host?: {
    platform?: string
    platform_version?: string
    cpu?: string[]
    gpu?: string[]
    mem_total?: number
    disk_total?: number
    swap_total?: number
    arch?: string
    virtualization?: string
    boot_time?: number
  }
  // Fields are `omitempty` on the wire: a zero value is simply missing.
  state?: {
    cpu?: number
    mem_used?: number
    swap_used?: number
    disk_used?: number
    net_in_transfer?: number
    net_out_transfer?: number
    net_in_speed?: number
    net_out_speed?: number
    uptime?: number
    load_1?: number
    load_5?: number
    load_15?: number
    tcp_conn_count?: number
    udp_conn_count?: number
    process_count?: number
  }
}

export interface NezhaFrame {
  now: number
  servers?: NezhaServer[]
}

export interface NezhaGroup {
  group: { id: number; name: string }
  servers: number[] | null
}

interface NezhaSetting {
  config?: { site_name?: string; language?: string; custom_code?: string; oauth2_providers?: unknown }
  tsdb_enabled?: boolean
}

/** Current dashboards send `monitor_*`. Older ones sent `service_*`. */
export interface ServiceHistoryRow {
  monitor_id?: number
  service_id?: number
  monitor_name?: string
  service_name?: string
  server_name?: string
  display_index?: number
  created_at?: Array<number | null> | null
  avg_delay?: Array<number | null> | null
}

export function servicePeriod(hours: number): '1d' | '7d' | '30d' {
  if (hours >= 30 * 24) return '30d'
  if (hours >= 7 * 24) return '7d'
  return '1d'
}

function stamp(t: number) {
  return t > 0 && t < 1e12 ? t * 1000 : t
}

/** One row per latency monitor. Names come from `monitor_name` on current dashboards. */
export function mapServiceHistory(rows: ServiceHistoryRow[]): PingData {
  const tasks: PingData['tasks'] = []
  const points: PingData['points'] = []
  const sorted = [...rows].sort((a, b) => (b.display_index ?? 0) - (a.display_index ?? 0) || (a.monitor_id ?? a.service_id ?? 0) - (b.monitor_id ?? b.service_id ?? 0))
  for (const row of sorted) {
    const id = Number(row.monitor_id ?? row.service_id ?? 0)
    const name = (row.monitor_name || row.service_name || row.server_name || '').trim() || `#${id}`
    const at = row.created_at ?? []
    const delay = row.avg_delay ?? []
    const values = delay.filter((v): v is number => typeof v === 'number' && v > 0)
    tasks.push({
      id,
      name,
      interval: 0,
      loss: 0,
      avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    })
    at.forEach((t, i) => {
      if (typeof t !== 'number') return
      const sample = delay[i]
      points.push({ at: stamp(t), task: id, value: typeof sample === 'number' ? sample : -1 })
    })
  }
  points.sort((a, b) => a.at - b.at)
  return { tasks, points }
}

/* ---------- public_note (nezha-dash / Nazhua convention) ---------- */

interface PublicNote {
  billingDataMod?: { endDate?: string; autoRenewal?: string; cycle?: string; amount?: string }
  planDataMod?: { trafficVol?: string; trafficType?: string }
}

const CYCLES: [RegExp, number][] = [
  [/^(月|mo|month|monthly|m)$/i, 30],
  [/^(季|季度|q|quarter|quarterly)$/i, 90],
  [/^(半年|half|semi|semiannual|h)$/i, 182],
  [/^(年|y|yr|year|yearly|annual|annually)$/i, 365],
  [/^(两年|二年|2y|biennial)$/i, 730],
  [/^(三年|3y|triennial)$/i, 1095],
]

const SIZE = /^([\d.]+)\s*([KMGTP]?)i?B?$/i

function parseSize(v = ''): number {
  const m = SIZE.exec(v.trim())
  if (!m) return 0
  const pow = ' KMGTP'.indexOf((m[2] || ' ').toUpperCase())
  return Number(m[1]) * 1024 ** Math.max(0, pow)
}

export function parsePublicNote(note: string | undefined) {
  const out = {
    price: 0,
    currency: '$',
    billingCycle: 0,
    autoRenewal: false,
    expiredAt: null as number | null,
    trafficLimit: 0,
    trafficLimitType: 'max' as NodeInfo['trafficLimitType'],
  }
  if (!note || note.trim()[0] !== '{') return out
  let parsed: PublicNote
  try {
    parsed = JSON.parse(note) as PublicNote
  } catch {
    return out
  }
  const b = parsed.billingDataMod
  if (b) {
    const amount = (b.amount ?? '').trim()
    const num = /-?[\d.]+/.exec(amount)
    if (amount === '0' || /free|免费/i.test(amount)) out.price = -1
    else if (num) {
      out.price = Number(num[0])
      out.currency = amount.replace(num[0], '').trim().slice(0, 4) || '$'
    }
    out.billingCycle = CYCLES.find(([re]) => re.test((b.cycle ?? '').trim()))?.[1] ?? 0
    out.autoRenewal = b.autoRenewal === '1'
    const end = b.endDate ? Date.parse(b.endDate) : NaN
    out.expiredAt = Number.isFinite(end) && new Date(end).getUTCFullYear() > 2000 ? end : null
  }
  const p = parsed.planDataMod
  if (p?.trafficVol) {
    out.trafficLimit = parseSize(p.trafficVol)
    out.trafficLimitType = p.trafficType === '2' ? 'sum' : 'max'
  }
  return out
}

/* ---------- mapping ---------- */

const PLATFORMS: Record<string, string> = {
  istoreos: 'iStoreOS',
  openwrt: 'OpenWrt',
  centos: 'CentOS',
  opensuse: 'openSUSE',
  macos: 'macOS',
  darwin: 'macOS',
  freebsd: 'FreeBSD',
  rhel: 'RHEL',
}

/** Nezha reports platform ids such as "debian"; show them as product names. */
const prettyPlatform = (p = '') => PLATFORMS[p.toLowerCase()] ?? (p ? p[0].toUpperCase() + p.slice(1) : '')

/** "Intel Xeon 2 Virtual Core" → ["Intel Xeon", 2] */
function splitCpu(cpu = ''): [string, number] {
  const m = /^(.*?)\s+(\d+)\s+(Physical|Virtual)\s+Core$/i.exec(cpu.trim())
  return m ? [m[1], Number(m[2])] : [cpu, 0]
}

export function mapServer(s: NezhaServer, groups: Map<number, string[]>, note?: string): NodeInfo {
  const h = s.host ?? {}
  const [cpuName, cores] = splitCpu(h.cpu?.[0])
  const billing = parsePublicNote(note ?? s.public_note)
  return {
    id: String(s.id),
    name: s.name,
    groups: groups.get(s.id) ?? [],
    tags: [],
    region: (s.country_code ?? '').toUpperCase() || flagToRegion(s.name),
    os: [prettyPlatform(h.platform), h.platform_version].filter(Boolean).join(' '),
    arch: h.arch ?? '',
    cpuName,
    cpuCores: cores * Math.max(1, h.cpu?.length ?? 1),
    virtualization: h.virtualization ?? '',
    gpuName: (h.gpu ?? []).join(', '),
    kernel: '',
    memTotal: h.mem_total ?? 0,
    swapTotal: h.swap_total ?? 0,
    diskTotal: h.disk_total ?? 0,
    // Nezha sorts by display_index descending.
    weight: -(s.display_index ?? 0),
    note: '',
    ...billing,
  }
}

/** Nezha has no explicit online flag; its own frontend treats 30s of silence as offline. */
const OFFLINE_AFTER_MS = 30_000

export function mapState(s: NezhaServer, now: number): Snapshot {
  const st = s.state ?? {}
  const h = s.host ?? {}
  // A server that never reported carries Go's zero time, "0001-01-01T00:00:00Z", which parses to
  // a large negative number and printed as "last seen 739,874 days ago". Treat it as never seen.
  const parsed = s.last_active ? Date.parse(s.last_active) : NaN
  const last = parsed > 0 ? parsed : 0
  return {
    online: last > 0 && now - last < OFFLINE_AFTER_MS,
    at: last || (s.last_active ? 0 : now),
    cpu: st.cpu ?? 0,
    memUsed: st.mem_used ?? 0,
    memTotal: h.mem_total ?? 0,
    swapUsed: st.swap_used ?? 0,
    swapTotal: h.swap_total ?? 0,
    diskUsed: st.disk_used ?? 0,
    diskTotal: h.disk_total ?? 0,
    netUp: st.net_out_speed ?? 0,
    netDown: st.net_in_speed ?? 0,
    totalUp: st.net_out_transfer ?? 0,
    totalDown: st.net_in_transfer ?? 0,
    load1: st.load_1 ?? 0,
    load5: st.load_5 ?? 0,
    load15: st.load_15 ?? 0,
    tcp: st.tcp_conn_count ?? 0,
    udp: st.udp_conn_count ?? 0,
    process: st.process_count ?? 0,
    uptime: st.uptime ?? 0,
  }
}

export function groupIndex(groups: NezhaGroup[]): Map<number, string[]> {
  const index = new Map<number, string[]>()
  for (const g of groups) {
    for (const id of g.servers ?? []) index.set(id, [...(index.get(id) ?? []), g.group.name])
  }
  return index
}

/**
 * Nezha sends `public_note` **only in the first frame** after a socket connects
 * (`StreamServer.PublicNote` is filled with `withPublicNote = count == 0`), so billing
 * and quota data has to be remembered across frames — otherwise it vanishes on frame two
 * and never comes back after a reconnect.
 */
const publicNotes = new Map<string, string>()

export function mapFrame(
  frame: NezhaFrame,
  groups: Map<number, string[]>,
  notes: Map<string, string> = publicNotes,
): Required<LiveEvent> {
  const servers = frame.servers ?? []
  const now = frame.now || Date.now()
  const snapshots: Record<string, Snapshot> = {}
  const nodes: NodeInfo[] = []
  for (const s of servers) {
    const id = String(s.id)
    if (s.public_note) notes.set(id, s.public_note)
    snapshots[id] = mapState(s, now)
    nodes.push(mapServer(s, groups, notes.get(id)))
  }
  return { snapshots, nodes }
}

/* ---------- shared socket hub ---------- */

type Listener = (frame: NezhaFrame) => void

const hub = (() => {
  const listeners = new Set<Listener>()
  const statusListeners = new Set<(s: 'connecting' | 'open' | 'closed') => void>()
  let socket: ReturnType<typeof resilientSocket> | null = null
  let last: NezhaFrame | null = null
  let status: 'connecting' | 'open' | 'closed' = 'connecting'

  const ensure = () => {
    if (socket) return
    socket = resilientSocket({
      url: () => wsUrl('/api/v1/ws/server'),
      onStatus: (s) => {
        status = s
        statusListeners.forEach((l) => l(s))
      },
      onMessage: (text) => {
        try {
          last = JSON.parse(text) as NezhaFrame
          listeners.forEach((l) => l(last!))
        } catch {
          /* ignore */
        }
      },
    })
  }

  return {
    first(timeoutMs: number): Promise<NezhaFrame> {
      if (last) return Promise.resolve(last)
      ensure()
      return new Promise((resolve, reject) => {
        const once: Listener = (f) => {
          clearTimeout(timer)
          listeners.delete(once)
          resolve(f)
        }
        // Without a frame the page would sit on its skeleton forever; fail into the retry state.
        const timer = setTimeout(() => {
          listeners.delete(once)
          reject(new Error('No data from /api/v1/ws/server'))
        }, timeoutMs)
        listeners.add(once)
      })
    },
    /** A forced refresh: the next first() waits for a new frame instead of replaying the last. */
    reset() {
      socket?.close()
      socket = null
      last = null
      status = 'connecting'
    },
    listen(l: Listener, s?: (st: 'connecting' | 'open' | 'closed') => void) {
      ensure()
      listeners.add(l)
      if (s) {
        statusListeners.add(s)
        // The socket may already be open (loadNodes starts it first).
        s(status)
      }
      if (last) l(last)
      return () => {
        listeners.delete(l)
        if (s) statusListeners.delete(s)
      }
    },
  }
})()

// Module-level so socket frames replayed synchronously on subscribe already see the groups.
let groupsCache = new Map<number, string[]>()
let groupsPromise: Promise<Map<number, string[]>> | null = null
const loadGroups = () =>
  (groupsPromise ??= request<Common<NezhaGroup[]>>('/api/v1/server-group')
    .then((r) => (groupsCache = groupIndex(r.data ?? [])))
    .catch(() => groupsCache))

const FIRST_FRAME_TIMEOUT_MS = 15_000

/* ---------- adapter ---------- */

export const nezha: MonitorAdapter = {
  target: 'nezha',
  capabilities: { billing: true, trafficLimit: true, history: false, ping: true },
  adminUrl: '/dashboard',
  poweredBy: { name: 'Nezha', url: 'https://github.com/nezhahq/nezha' },
  historyRanges: [0],
  pingRanges: [24, 168, 720],
  guestRangeHours: 24,
  supportsTwoFactor: false,

  async loadSite(): Promise<SiteInfo> {
    const res = await request<Common<NezhaSetting>>('/api/v1/setting').catch(() => null)
    const cfg = res?.data?.config ?? {}
    // config.js has already run. Restore it, then let the administrator's custom code override it.
    resetRuntimeGlobals(window)
    try {
      await injectCustomCode(typeof cfg.custom_code === 'string' ? cfg.custom_code : '')
    } catch (error) {
      console.error('[zool-theme] custom code failed', error)
    }
    const runtime = readRuntime(window)
    const providers = oauthProviderNames(cfg.oauth2_providers)
    return {
      name: (cfg.site_name ?? '').trim() || 'Nezha',
      description: runtime.description,
      language: cfg.language?.replace('_', '-'),
      settings: runtime.settings,
      recordHours: 0,
      oauth: providers.length > 0,
      oauthProvider: providers[0],
      oauthProviders: providers,
      passwordLogin: true,
    }
  },

  async loadNodes() {
    const [frame, groups] = await Promise.all([hub.first(FIRST_FRAME_TIMEOUT_MS), loadGroups()])
    return mapFrame(frame, groups).nodes
  },

  async loadSession(): Promise<Session> {
    try {
      const res = await request<Common<{ username?: string }>>('/api/v1/profile')
      return res.success ? { loggedIn: true, username: res.data?.username } : { loggedIn: false }
    } catch {
      return { loggedIn: false }
    }
  },

  subscribe(listener, onStatus) {
    loadGroups()
    return hub.listen((frame) => listener(mapFrame(frame, groupsCache)), onStatus)
  },

  reset() {
    hub.reset()
    groupsPromise = null
  },

  async loadHistory() {
    return []
  },

  async loadPing(id, hours): Promise<PingData> {
    const period = servicePeriod(hours)
    const res = await request<Common<ServiceHistoryRow[]>>(`/api/v1/server/${encodeURIComponent(id)}/service?period=${period}`)
    return mapServiceHistory(res.data ?? [])
  },

  async loadOnlineHistory(id, days): Promise<OnlineHistory | null> {
    const res = await request<Common<OnlineHistoryPayload>>(`/api/v1/server/${encodeURIComponent(id)}/online-history?days=${days}`)
    return res.success && res.data ? mapOnlineHistory(res.data) : null
  },

  async login(username, password): Promise<LoginResult> {
    try {
      const res = await request<Common<unknown>>('/api/v1/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      return res.success ? { ok: true } : { ok: false, reason: 'invalid', message: res.error }
    } catch (e) {
      return e instanceof Error && e.name !== 'AbortError' && 'status' in e
        ? { ok: false, reason: 'invalid' }
        : { ok: false, reason: 'network' }
    }
  },

  async oauthRedirect(provider) {
    const name = provider.trim()
    if (!name) return null
    try {
      const res = await request<Common<{ redirect?: string }>>(`/api/v1/oauth2/${encodeURIComponent(name)}?type=1`)
      return oauthRedirectTarget(res)
    } catch {
      return null
    }
  },
  nodePath: (id) => `/server/${encodeURIComponent(id)}`,
  // Nezha only serves the SPA for `/` and `/server/:id`.
  matchNodePath: (pathname) => /^\/server\/(\d+)/.exec(pathname)?.[1] ?? null,
}

export default nezha
