import { useRef, useState } from 'react'
import { FAC, FAC_ORDER, DEBOUNCE_MS } from '../../lib/constants'
import { BYID, CARDS } from '../../lib/data'
import { deckTot, leaderAdds } from '../../lib/deckRules'
import { normQuery, type PickFilter } from '../../lib/search'
import { useActions, useAppState } from '../../store'
import { useT } from '../../i18n/useT'
import { Picker } from './Picker'
import { DeckSide } from './DeckSide'
import { Recommend } from './Recommend'
import { CraftPlanBox } from './CraftPlan'
import { DeckBar } from './DeckShare'

/** "จัดเดค": topbar (search + clear) · 3 columns: pick cards | the deck | recommendations + craft plan (phone: 2 views) */
export function DeckTab({ hidden }: { hidden: boolean }) {
  const { deck } = useAppState(); const a = useActions(); const D = useT().deck
  const [view, setView] = useState<'pick' | 'deck'>('pick')
  const [pf, setPf] = useState<PickFilter>({ q: '', col: '', type: '', prov: '', own: '' })
  const [qText, setQText] = useState('')
  const tp = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrap = useRef<HTMLDivElement>(null)
  const { n, L } = deckTot(deck, BYID)
  const leads = CARDS.filter(c => c.t === 'Ability' && c.f === deck.f).sort((x, y) => x.n.localeCompare(y.n))

  const onFac = (f: string) => {
    if (f !== deck.f && Object.keys(deck.c).length && !confirm(D.facQ)) return
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
          <h1 className="page-title">{D.title}<small>{deck.f ? FAC[deck.f].th : D.noFac} · {L ? L.n : D.noLeader} · {D.sub}</small></h1>
          <label className="search"><span className="ic" aria-hidden="true">⌕</span>
            <input type="search" id="pQ" aria-label={D.searchAria} placeholder={deck.f ? D.searchPh(FAC[deck.f].th) : D.searchPh0} value={qText} onChange={e => onQ(e.target.value)} /><kbd>/</kbd></label>
          <div className="tb-right">
            <button type="button" className="btn" id="dClear" disabled={!Object.keys(deck.c).length} onClick={() => { if (confirm(D.clearQ)) a.setDeck({ ...deck, c: {} }) }}>{D.clear}</button>
          </div>
        </div>
        <DeckBar />
        <div className="dset">
          <label><span>{D.fac}</span><select className="select" id="dFac" value={deck.f} onChange={e => onFac(e.target.value)}><option value="">{D.pickFac}</option>{FAC_ORDER.filter(f => f !== 'Neutral').map(f => <option key={f} value={f}>{FAC[f].th}</option>)}</select></label>
          <label><span>Leader Ability</span><select className="select" id="dLead" disabled={!deck.f} value={deck.L || ''} onChange={e => a.setDeck({ ...deck, L: +e.target.value || null })}><option value="">{D.pickLeader}</option>{leads.map(c => <option key={c.id} value={c.id}>{D.leaderOpt(c.n, leaderAdds(c))}</option>)}</select></label>
          <p className="hint">{D.rulesHint}</p>
        </div>
        <div className="dsub" role="tablist" aria-label={D.views}>
          <button type="button" role="tab" data-dv="pick" aria-selected={view === 'pick'} id="dsPick" onClick={() => setDView('pick')}>{D.pick}{deck.f ? ' (' + FAC[deck.f].th + ')' : ''}</button>
          <button type="button" role="tab" data-dv="deck" aria-selected={view === 'deck'} id="dsDeck" onClick={() => setDView('deck')}>{D.mine(n)}</button>
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
