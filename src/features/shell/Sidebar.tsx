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

const NAV: [Tab, string, string, string][] = [
  // [page, icon, label, short label for the mobile bar]
  ['cards', '🗂', 'การ์ด', 'การ์ด'],
  ['deck', '🛠', 'จัดเดค', 'จัดเดค'],
  ['coll', '📦', 'คอลเลกชัน', 'คอลเลกชัน'],
  ['stars', '⭐', 'ปักดาว', 'ปักดาว'],
  ['ov', '🧭', 'ฝ่าย & แนวเดค', 'ฝ่าย'],
]

/** sidebar tooltips (desktop only — the sidebar is hidden on the phone): [title, one-line description] per language */
const TIPS: Record<string, Record<Lang, [string, string]>> = {
  cards: { th: ['การ์ด', 'ค้นหาการ์ด เลือกดูตามฝ่าย หรือเปิดดูทั้งหมดพร้อมตัวกรอง'], en: ['Cards', 'Search cards, browse by faction, or open the full list with filters'] },
  deck: { th: ['จัดเดค', 'เลือกฝ่าย leader แล้วใส่การ์ด พร้อมคำแนะนำและแผนคราฟต์'], en: ['Deck builder', 'Pick a faction and leader, add cards, get suggestions and a craft plan'] },
  coll: { th: ['คอลเลกชัน', 'ติ๊กการ์ดที่มีแล้ว ดูว่ายังขาดใบไหน นำเข้า/ส่งออกเป็นไฟล์'], en: ['Collection', 'Mark the cards you own, see what is missing, import/export a file'] },
  stars: { th: ['ปักดาว', 'การ์ดที่ปักดาวเก็บไว้ดูทีหลัง'], en: ['Starred', 'Cards you starred to come back to later'] },
  ov: { th: ['ฝ่าย & แนวเดค', 'กติกาหลัก จุดเด่นของแต่ละฝ่าย และสไตล์เดคพร้อมการ์ดหลัก'], en: ['Factions & decks', 'Core rules, what each faction does, deck styles with key cards'] },
  deckstat: { th: ['เดคปัจจุบัน', 'จำนวนการ์ดและ provision ของเดค กดเพื่อไปหน้าจัดเดค'], en: ['Current deck', 'Card count and provision of your deck · click to open the deck builder'] },
  scraps: { th: ['Scraps ที่มี', 'ใส่จำนวน scraps ที่มี ใช้คำนวณแผนคราฟต์'], en: ['Your scraps', 'How many scraps you have · used by the craft plan'] },
  lang: { th: ['ภาษา', 'สลับข้อความการ์ดเป็นภาษาไทยหรืออังกฤษ'], en: ['Language', 'Show card text in Thai or English'] },
  collapse: { th: ['พับแถบข้าง', 'เหลือแต่ไอคอน ให้พื้นที่การ์ดกว้างขึ้น'], en: ['Collapse sidebar', 'Icons only, more room for the cards'] },
  expand: { th: ['ขยายแถบข้าง', 'แสดงชื่อเมนูและสถานะเดคเต็ม'], en: ['Expand sidebar', 'Show menu names and the full deck status'] },
}
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
  if (!tip || !TIPS[tip.k]) return null
  const [t, d] = TIPS[tip.k][lang]
  return createPortal(<div className="stip" id="sideTip" role="tooltip" style={{ top: tip.top, left: tip.left }}><b>{t}</b><span>{d}</span></div>, document.body)
}

function useCounts() {
  const { deck, own, stars } = useAppState()
  const T = useMemo(() => deckTot(deck, BYID), [deck])
  const owned = useMemo(() => Object.keys(own).filter(id => ownN(own, +id, BYID) > 0).length, [own])
  return { T, owned, stars: stars.size }
}

export function LangSwitch() {
  const { lang } = useAppState(); const a = useActions()
  return <div className="seg lang" role="group" aria-label="ภาษาข้อความการ์ด" data-tip="lang">
    {(['th', 'en'] as Lang[]).map(l => <button key={l} type="button" data-lang={l} aria-pressed={lang === l} className={lang === l ? 'on' : ''} onClick={() => a.setLang(l)}>{l === 'th' ? 'ไทย' : 'EN'}</button>)}
  </div>
}

function Meter({ lbl, v, max, cls }: { lbl: string; v: number; max: number; cls?: string }) {
  return <div className="meter"><div className="row"><span>{lbl}</span><b>{v} / {max}</b></div>
    <div className={'bar ' + (cls || '') + (v > max ? ' over' : '')}><i style={{ width: Math.min(100, max ? v / max * 100 : 0) + '%' }} /></div></div>
}

/** left sidebar: 5 pages + deck status + scraps + language · collapses to icons */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { tab, deck, scraps, lang } = useAppState(); const a = useActions()
  const { T, owned, stars } = useCounts()
  const { tip, handlers } = useSideTip()
  const n: Partial<Record<Tab, string>> = { cards: META.count.toLocaleString('en-US'), deck: deck.f ? `${T.n}/${DECK_MIN}` : '', coll: String(owned), stars: String(stars) }
  return (
    <aside className="side" aria-label="เมนูหลัก" {...handlers}>
      <SideTip tip={tip} lang={lang} />
      <div className="brand">
        <div className="crest" aria-hidden="true">G</div>
        <div className="brand-txt" title={`GWENT-Thai-wiki · แพตช์ ${META.ver}`}><b>GWENT</b><small>Thai wiki · คลังการ์ดภาษาไทย</small></div>
      </div>
      <nav className="nav">
        {NAV.map(([k, ic, t]) => <button key={k} type="button" data-tab={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} aria-label={t} data-tip={k} onClick={() => a.showTab(k)}>
          <span className="ic" aria-hidden="true">{ic}</span><span className="t">{t}</span>{n[k] ? <span className="n">{n[k]}</span> : null}
        </button>)}
      </nav>
      <div className="side-spacer" />
      <div className="deckstat" id="deckStat">
        <button type="button" className="hd" aria-label="ไปหน้าจัดเดค" data-tip="deckstat" onClick={() => a.showTab('deck')}>
          {T.L ? <Thumb c={T.L} /> : <i className="noth">🃏</i>}
          <div><b>{T.L ? T.L.n : deck.f ? 'ยังไม่เลือก leader' : 'ยังไม่ได้จัดเดค'}</b>
            <small>{deck.f ? <><FI f={deck.f} /> {FAC[deck.f].th} · เดคปัจจุบัน</> : 'กดเพื่อเริ่มจัดเดค'}</small></div>
        </button>
        <Meter lbl="การ์ด" v={T.n} max={DECK_MIN} cls="cards" />
        <Meter lbl="Provision" v={T.pv} max={T.cap} />
        <label className="scraps" data-tip="scraps">⚒ Scraps ที่มี
          <input type="number" id="sideScr" min="0" step="1" inputMode="numeric" placeholder="0" value={scraps} onChange={e => a.setScraps(e.target.value)} /></label>
      </div>
      <div className="side-foot">
        <LangSwitch />
        <button type="button" className="collapse-btn" id="collapse" aria-pressed={collapsed} aria-label={collapsed ? 'ขยายแถบข้าง' : 'พับแถบข้าง'} data-tip={collapsed ? 'expand' : 'collapse'} onClick={onToggle}>«</button>
      </div>
    </aside>
  )
}

/** phone header (sidebar is hidden ≤760px) */
export function MobileHead() {
  return <div className="m-head"><div className="crest" aria-hidden="true">G</div><b>GWENT</b><LangSwitch /></div>
}

/** phone bottom tab bar — the deck badge replaces the old floating deck button */
export function BottomNav() {
  const { tab, deck } = useAppState(); const a = useActions()
  const { T } = useCounts()
  return <nav className="bottomnav" aria-label="เมนูหลัก (มือถือ)">
    {NAV.map(([k, ic, , s]) => <button key={k} type="button" data-tab={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => a.showTab(k)}>
      <span className="ic" aria-hidden="true">{ic}</span>{s}{k === 'deck' && deck.f ? <span className="bdg">{T.n}</span> : null}
    </button>)}
  </nav>
}
