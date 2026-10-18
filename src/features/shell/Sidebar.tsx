import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Lang } from '../../types'
import { BYID, META } from '../../lib/data'
import { FAC } from '../../lib/constants'
import { deckTot, DECK_MIN } from '../../lib/deckRules'
import { ownN } from '../../lib/collection'
import { Thumb } from '../../components/images'
import { FI } from '../../components/FactionIcon'
import { useActions, useAppState, type Tab } from '../../store'
import { useT } from '../../i18n/useT'
import { UI } from '../../i18n/ui'
import { Logo } from '../../components/Logo'
import { DeckSelect } from '../deck/DeckShare'

/** [page, icon] · label and short label for the mobile bar come from the dictionary (nav) */
const NAV: [Tab, string][] = [['cards', '🗂'], ['deck', '🛠'], ['coll', '📦'], ['stars', '⭐'], ['ov', '🧭'], ['guide', '📖']]

/** menu click: the guide opens at "What's new" while there is something unseen */
const go = (a: ReturnType<typeof useActions>, k: Tab, news: boolean) => (k === 'guide' ? a.showGuide(news ? 'whatsnew' : undefined) : a.showTab(k))

const TIP_DELAY = 300

/** themed tooltip to the right of the sidebar: hover (after 300 ms, gone at once on leave) or keyboard focus */
function useSideTip() {
  const [tip, setTip] = useState<{ k: string; top: number; left: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined), cur = useRef<Element | null>(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const hide = () => { clearTimeout(timer.current); cur.current = null; setTip(null) }
  const show = (el: HTMLElement, delay: number) => {
    clearTimeout(timer.current); cur.current = el
    timer.current = setTimeout(() => {
      const r = el.getBoundingClientRect(), side = el.closest('.side')!.getBoundingClientRect()
      setTip({ k: el.dataset.tip!, top: r.top + r.height / 2, left: side.right + 10 })
    }, delay)
  }
  const target = (e: { target: EventTarget | null }) => (e.target as Element | null)?.closest?.<HTMLElement>('[data-tip]') || null
  const handlers = {
    onPointerOver: (e: React.PointerEvent) => { if (e.pointerType === 'touch') return; const el = target(e); if (el === cur.current) return; if (el) { setTip(null); show(el, TIP_DELAY) } else hide() },
    onPointerLeave: hide,
    onFocus: (e: React.FocusEvent) => { const el = target(e); if (el && (e.target as Element).matches(':focus-visible')) { setTip(null); show(el, 0) } },
    onBlur: hide,
    onClick: hide,
  }
  return { tip, handlers }
}

function SideTip({ tip, lang }: { tip: { k: string; top: number; left: number } | null; lang: Lang }) {
  const tips = UI[lang].side.tips
  if (!tip || !tips[tip.k]) return null
  const [t, d] = tips[tip.k]
  return createPortal(<div className="stip" id="sideTip" role="tooltip" style={{ top: tip.top, left: tip.left }}><b>{t}</b><span>{d}</span></div>, document.body)
}

function useCounts() {
  const { deck, own, stars } = useAppState()
  const T = useMemo(() => deckTot(deck, BYID), [deck])
  const owned = useMemo(() => Object.keys(own).filter(id => ownN(own, +id, BYID) > 0).length, [own])
  return { T, owned, stars: stars.size }
}

export function LangSwitch() {
  const { lang } = useAppState(); const a = useActions(); const T = useT().side
  return <div className="seg lang" role="group" aria-label={T.langGroup} data-tip="lang">
    {(['th', 'en'] as Lang[]).map(l => <button key={l} type="button" data-lang={l} aria-pressed={lang === l} className={lang === l ? 'on' : ''} onClick={() => a.setLang(l)}>{l === 'th' ? T.langTh : T.langEn}</button>)}
  </div>
}

function Meter({ lbl, v, max, cls }: { lbl: string; v: number; max: number; cls?: string }) {
  return <div className="meter"><div className="row"><span>{lbl}</span><b>{v} / {max}</b></div>
    <div className={'bar ' + (cls || '') + (v > max ? ' over' : '')}><i style={{ width: Math.min(100, max ? v / max * 100 : 0) + '%' }} /></div></div>
}

/** left sidebar: 5 pages + deck status + scraps + language · collapses to icons */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { tab, deck, scraps, lang, newsDot } = useAppState(); const a = useActions()
  const { T, owned, stars } = useCounts()
  const { tip, handlers } = useSideTip(); const L = useT()
  const n: Partial<Record<Tab, string>> = { cards: META.count.toLocaleString('en-US'), deck: deck.f ? `${T.n}/${DECK_MIN}` : '', coll: String(owned), stars: String(stars) }
  return (
    <aside className="side" aria-label={L.side.mainMenu} {...handlers}>
      <SideTip tip={tip} lang={lang} />
      <div className="brand">
        <Logo kind="side" /><Logo kind="shield" />
        <div className="brand-txt" title={L.side.brandTitle(META.ver)}><b>GWENT</b><small>{L.side.brandSub}</small></div>
      </div>
      <nav className="nav">
        {NAV.map(([k, ic]) => { const t = L.nav[k][0]; return <button key={k} type="button" data-tab={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} aria-label={t} data-tip={k} onClick={() => go(a, k, newsDot)}>
          <span className="ic" aria-hidden="true">{ic}</span><span className="t">{t}</span>{n[k] ? <span className="n">{n[k]}</span> : null}
          {k === 'guide' && newsDot ? <span className="newsdot" id="newsDot" title={L.side.news}><span className="sr">{L.side.news}</span></span> : null}
        </button> })}
      </nav>
      <div className="side-spacer" />
      <div className="deckstat" id="deckStat">
        <label className="side-decksel" data-tip="deckSel"><DeckSelect id="sideDeckSel" /></label>
        <button type="button" className="hd" aria-label={L.side.toDeck} data-tip="deckstat" onClick={() => a.showTab('deck')}>
          {T.L ? <Thumb c={T.L} /> : <i className="noth">🃏</i>}
          <div><b>{T.L ? T.L.n : deck.f ? L.side.noLeader : L.side.noDeck}</b>
            <small>{deck.f ? <><FI f={deck.f} /> {FAC[deck.f].th} · {L.side.curDeck}</> : L.side.startDeck}</small></div>
        </button>
        <Meter lbl={L.side.cards} v={T.n} max={DECK_MIN} cls="cards" />
        <Meter lbl="Provision" v={T.pv} max={T.cap} />
        <label className="scraps" data-tip="scraps">{L.side.scraps}
          <input type="number" id="sideScr" min="0" step="1" inputMode="numeric" placeholder="0" value={scraps} onChange={e => a.setScraps(e.target.value)} /></label>
      </div>
      <div className="side-foot">
        <LangSwitch />
        <button type="button" className="collapse-btn" id="collapse" aria-pressed={collapsed} aria-label={collapsed ? L.side.expand : L.side.collapse} data-tip={collapsed ? 'expand' : 'collapse'} onClick={onToggle}>«</button>
      </div>
    </aside>
  )
}

/** phone header (sidebar is hidden ≤760px) */
export function MobileHead() {
  return <div className="m-head"><Logo kind="shield" /><b>GWENT</b><LangSwitch /></div>
}

/** phone bottom tab bar — the deck badge replaces the old floating deck button */
export function BottomNav() {
  const { tab, deck, newsDot } = useAppState(); const a = useActions()
  const { T } = useCounts(); const L = useT()
  return <nav className="bottomnav" aria-label={L.side.mobileMenu}>
    {NAV.map(([k, ic]) => { const s = L.nav[k][1]; return <button key={k} type="button" data-tab={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => go(a, k, newsDot)}>
      <span className="ic" aria-hidden="true">{ic}</span>{s}{k === 'deck' && deck.f ? <span className="bdg">{T.n}</span> : null}
      {k === 'guide' && newsDot ? <span className="newsdot" title={L.side.news}><span className="sr">{L.side.news}</span></span> : null}
    </button> })}
  </nav>
}
