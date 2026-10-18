// Keyword explanation popover. Opened by any <button class="kwb" data-kw> (also those inside ability HTML)
// through the document-level click handler in App.
import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { KW } from '../lib/data'
import { useLang } from '../store'

let state: { kw: string; rect: DOMRect } | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())

export function showPop(btn: HTMLElement) {
  const k = btn.dataset.kw || ''; if (!KW[k]) return
  state = { kw: k, rect: btn.getBoundingClientRect() }; emit()
}
export function hidePop() { if (state) { state = null; emit() } }
export const isPopOpen = () => !!state

export function KeywordPopover() {
  const s = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state)
  const ref = useRef<HTMLDivElement>(null); const lang = useLang()
  useLayoutEffect(() => {
    const pop = ref.current; if (!pop || !s) return
    const r = s.rect, pw = pop.offsetWidth, ph = pop.offsetHeight
    const x = Math.min(Math.max(8, r.left), innerWidth - pw - 8); let y = r.bottom + 6
    if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 6)
    pop.style.left = x + 'px'; pop.style.top = y + 'px'
  }, [s])
  const d = s && KW[s.kw]
  return (
    <div className={'pop' + (s ? '' : ' hidden')} id="pop" role="dialog" ref={ref}>
      {s && d && (lang === 'en' ? <><b>{s.kw}</b><p>{d.en}</p></> : <><b>{s.kw}</b>{d.th ? <p>{d.th}</p> : null}<p style={{ color: 'var(--ink-mut)' }}>{d.th ? 'EN: ' : ''}{d.en}</p></>)}
    </div>
  )
}
