/**
 * Run the HTML an administrator saved as Nezha's user-frontend custom code.
 * A `<script>` parsed from a string does not run until a new element is inserted,
 * which is what makes `window.CustomLogo` and the rest visible to the theme.
 */

const MARK = 'data-zool-injected'
const LOAD_TIMEOUT_MS = 15_000

const classicType = (type: string) =>
  !type ||
  type === 'text/javascript' ||
  type === 'application/javascript' ||
  type === 'text/ecmascript' ||
  type === 'application/ecmascript'

function copyAttributes(from: Element, to: Element) {
  for (const attr of from.attributes) to.setAttribute(attr.name, attr.value)
  to.setAttribute(MARK, '')
}

function loadElement(node: HTMLScriptElement | HTMLLinkElement, parent: ParentNode): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup()
      console.error('[zool-theme] custom resource timed out')
      resolve()
    }, LOAD_TIMEOUT_MS)
    const cleanup = () => {
      window.clearTimeout(timer)
      node.onload = null
      node.onerror = null
    }
    node.onload = () => {
      cleanup()
      resolve()
    }
    node.onerror = () => {
      cleanup()
      console.error('[zool-theme] custom resource failed to load')
      resolve()
    }
    parent.appendChild(node)
  })
}

function mountScript(source: HTMLScriptElement): Promise<void> {
  const script = document.createElement('script')
  copyAttributes(source, script)
  script.textContent = source.textContent
  script.async = false
  const type = script.type.trim().toLowerCase()
  const moduleType = type === 'module'
  if (!classicType(type) && !moduleType) {
    document.head.appendChild(script)
    return Promise.resolve()
  }
  if (script.src || moduleType) return loadElement(script, document.head)
  document.body.appendChild(script)
  return Promise.resolve()
}

export async function injectCustomCode(html: string): Promise<void> {
  if (typeof document === 'undefined') return
  document.querySelectorAll(`[${MARK}]`).forEach((node) => node.remove())
  const trimmed = html.trim()
  if (!trimmed) return
  const template = document.createElement('template')
  template.innerHTML = trimmed
  for (const source of [...template.content.childNodes]) {
    if (!(source instanceof Element)) continue
    if (source instanceof HTMLScriptElement) {
      await mountScript(source)
      continue
    }
    if (source instanceof HTMLStyleElement) {
      const style = document.createElement('style')
      copyAttributes(source, style)
      style.textContent = source.textContent
      document.head.appendChild(style)
      continue
    }
    if (source instanceof HTMLLinkElement && source.rel.toLowerCase() === 'stylesheet') {
      const link = source.cloneNode(true) as HTMLLinkElement
      link.setAttribute(MARK, '')
      await loadElement(link, document.head)
      continue
    }
    const node = source.cloneNode(true) as Element
    node.setAttribute(MARK, '')
    const parent = source instanceof HTMLMetaElement || source instanceof HTMLLinkElement ? document.head : document.body
    parent.appendChild(node)
  }
}
