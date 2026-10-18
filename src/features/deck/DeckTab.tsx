import { useRef, useState } from 'react'
import { FAC, FAC_ORDER, DEBOUNCE_MS } from '../../lib/constants'
import { BYID, CARDS } from '../../lib/data'
import { deckTot, leaderAdds } from '../../lib/deckRules'
import { normQuery, type PickFilter } from '../../lib/search'
import { useActions, useAppState } from '../../store'
import { Picker } from './Picker'
import { DeckSide } from './DeckSide'
import { Recommend } from './Recommend'
import { CraftPlanBox } from './CraftPlan'

/** "จัดเดค": topbar (search + clear) · 3 columns: pick cards | the deck | recommendations + craft plan (phone: 2 views) */
export function DeckTab({ hidden }: { hidden: boolean }) {
  const { deck } = useAppState(); const a = useActions()
  const [view, setView] = useState<'pick' | 'deck'>('pick')
  const [pf, setPf] = useState<PickFilter>({ q: '', col: '', type: '', prov: '', own: '' })
  const [qText, setQText] = useState('')
  const tp = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrap = useRef<HTMLDivElement>(null)
  const { n, L } = deckTot(deck, BYID)
  const leads = CARDS.filter(c => c.t === 'Ability' && c.f === deck.f).sort((x, y) => x.n.localeCompare(y.n))

  const onFac = (f: string) => {
    if (f !== deck.f && Object.keys(deck.c).length && !confirm('เปลี่ยนฝ่ายจะล้างการ์ดในเดคปัจจุบัน ตกลงไหม')) return
    a.setDeck(f !== deck.f ? { f, L: null, c: {} } : deck)
  }
  const setDView = (v: 'pick' | 'deck') => {
    setView(v)
    const el = wrap.current; if (!el) return
    const y = el.getBoundingClientRect().top + scrollY - 120; if (scrollY > y) scrollTo(0, y)
  }
  const onQ = (v: string) => { setQText(v); clearTimeout(tp.current); tp.current = setTimeout(() => setPf(p => ({ ...p, q: normQuery(v) })), DEBOUNCE_MS) }

  return (
    <section id="deck" className={'page s-deck' + (hidden ? ' hidden' : '')}>
      <div className="topbar">
        <div className="tb-row">
          <h1 className="page-title">จัดเดค<small>{deck.f ? FAC[deck.f].th : 'ยังไม่เลือกฝ่าย'} · {L ? L.n : 'ยังไม่เลือก leader'} · กดการ์ดหรือ + เพื่อใส่เดค</small></h1>
          <label className="search"><span className="ic" aria-hidden="true">⌕</span>
            <input type="search" id="pQ" aria-label="ค้นหาการ์ดใส่เดค" placeholder={deck.f ? `ค้นหาการ์ดใส่เดค (เฉพาะ ${FAC[deck.f].th} + Neutral)` : 'เลือกฝ่ายของเดคก่อน แล้วค้นหาการ์ดได้ที่นี่'} value={qText} onChange={e => onQ(e.target.value)} /><kbd>/</kbd></label>
          <div className="tb-right">
            <button type="button" className="btn" id="dClear" disabled={!Object.keys(deck.c).length} onClick={() => { if (confirm('ล้างการ์ดทั้งหมดในเดค?')) a.setDeck({ ...deck, c: {} }) }}>🗑 ล้างเดค</button>
          </div>
        </div>
        <div className="dset">
          <label><span>ฝ่าย</span><select className="select" id="dFac" value={deck.f} onChange={e => onFac(e.target.value)}><option value="">— เลือกฝ่าย —</option>{FAC_ORDER.filter(f => f !== 'Neutral').map(f => <option key={f} value={f}>{FAC[f].th}</option>)}</select></label>
          <label><span>Leader Ability</span><select className="select" id="dLead" disabled={!deck.f} value={deck.L || ''} onChange={e => a.setDeck({ ...deck, L: +e.target.value || null })}><option value="">— เลือก leader ability —</option>{leads.map(c => <option key={c.id} value={c.id}>{c.n} (+{leaderAdds(c)} provision)</option>)}</select></label>
          <p className="hint">เกณฑ์: เพดาน provision = 150 + ค่าที่ leader เพิ่ม · ขั้นต่ำ 25 ใบ · ยูนิตอย่างน้อย 13 · Bronze ใบละ 2 · Gold ใบละ 1 · ฝ่ายเดียวกับเดคและ Neutral · บันทึกในเครื่องนี้ 1 เดค</p>
        </div>
        <div className="dsub" role="tablist" aria-label="มุมมองจัดเดค">
          <button type="button" role="tab" data-dv="pick" aria-selected={view === 'pick'} id="dsPick" onClick={() => setDView('pick')}>เลือกการ์ด{deck.f ? ' (' + FAC[deck.f].th + ')' : ''}</button>
          <button type="button" role="tab" data-dv="deck" aria-selected={view === 'deck'} id="dsDeck" onClick={() => setDView('deck')}>เดคของฉัน {n}/25</button>
        </div>
      </div>
      <div className="deck-body" id="deckwrap" data-view={view} ref={wrap}>
        <Picker pf={pf} setPf={setPf} />
        <DeckSide />
        <div className="dcol3">
          <Recommend />
          <div className="panel" id="dCraft"><CraftPlanBox /></div>
        </div>
      </div>
    </section>
  )
}
