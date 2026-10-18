import { useEffect, useRef } from 'react'
import { BYID, abHTML } from '../../lib/data'
import { deckChecks, deckTot, DECK_MIN, UNIT_MIN } from '../../lib/deckRules'
import { abText } from '../../lib/i18n'
import { ownN } from '../../lib/collection'
import { FAC } from '../../lib/constants'
import { Thumb } from '../../components/images'
import { artSources } from '../../lib/art'
import { useActions, useAppState } from '../../store'
import { useT } from '../../i18n/useT'

function DStat({ lbl, v, max, cap }: { lbl: string; v: number; max: number; cap?: boolean }) {
  const over = !!cap && v > max, full = !cap && v >= max, pct = Math.min(100, max ? v / max * 100 : 0); const D = useT().deck
  const note = cap ? (over ? D.over(v - max) : D.left(max - v)) : (full ? D.ok : D.miss(max - v))
  return <div className={'dstat' + (full ? ' ok' : '') + (over ? ' over' : '')}>
    <div className="row"><span>{lbl}</span><b>{v}<em>/{max}</em></b></div>
    <div className={'bar' + (cap ? '' : ' cards')} role="progressbar" aria-valuenow={v} aria-valuemax={max} aria-label={lbl}><i style={{ width: pct + '%' }} /></div>
    <small>{note}</small></div>
}

/** middle column of the deck page: leader banner, meters, Gold/Bronze rows, checklist */
export function DeckSide() {
  const { deck, own, newRow, lang } = useAppState(); const a = useActions(); const TT = useT(); const D = TT.deck
  const T = deckTot(deck, BYID); const { n, u, pv, L, cap } = T
  const list = useRef<HTMLDivElement>(null)
  const ids = Object.keys(deck.c).map(Number).filter(i => BYID[i]).sort((x, y) => BYID[y].v - BYID[x].v || BYID[x].n.localeCompare(BYID[y].n))
  const chk = deckChecks(deck, T, lang)

  // bring the just-added row into view (only when the deck column is visible)
  useEffect(() => {
    const nr = list.current?.querySelector<HTMLElement>('.dr.new')
    if (nr && nr.offsetParent) nr.scrollIntoView({ block: 'nearest' })
  }, [newRow])

  const row = (i: number) => {
    const c = BYID[i], k = deck.c[i], o = ownN(own, i, BYID), miss = Math.max(0, k - o)
    return <div key={i} className={'drow dr t-' + (c.c === 'Gold' ? 'gold' : 'bronze') + (newRow && newRow.id === i ? ' new' : '')} data-dr={i}>
      <Thumb c={c} lazy cls="bgart" />
      <span className="pv">{c.v}</span><span className="pw">{c.t === 'Unit' ? c.p : '✦'}</span>
      <button type="button" className="nm" data-open={i} title={TT.card.openBig} onClick={() => a.openModal(i, null)}>{c.n}<em className="newb">{D.newB}</em>
        <small>{c.t}{c.cat ? ' · ' + c.cat : ''} · {miss ? D.has(o) : D.hasAll(o)}</small></button>
      {miss > 0 && <span className="miss">{D.miss(miss)}</span>}
      <span className="cnt" aria-label={D.count}>×{k}</span>
      <button type="button" className="rm" data-act="rem" data-id={i} aria-label={D.rmOne(c.n)} onClick={() => a.removeFromDeck(i)}>−</button>
      <button type="button" className="rm plus" data-act="add" data-id={i} aria-label={D.addOne(c.n)} onClick={() => a.addToDeck(i)}>+</button>
    </div>
  }
  const grp = (col: 'Gold' | 'Bronze') => {
    const g = ids.filter(i => BYID[i].c === col); if (!g.length) return null
    const k = g.reduce((s, i) => s + deck.c[i], 0), p = g.reduce((s, i) => s + BYID[i].v * deck.c[i], 0)
    return <div className="dgroup"><h4><span className="gem" style={{ background: col === 'Gold' ? 'var(--gold)' : 'var(--bronze)' }} />{col}<span>{D.grp(k, p)}</span></h4>{g.map(row)}</div>
  }

  return (
    <div className="panel dside">
      {L ? <div className="leader">
        <img src={artSources(L, 'low')[0]?.url} alt="" />
        <div className="txt"><small>♛ Leader · {FAC[deck.f]?.th}</small><h3>{L.n}</h3><div id="dLeadTxt" className="ab" dangerouslySetInnerHTML={{ __html: abHTML(abText(L, lang)) }} /></div>
      </div> : <div className="leader empty"><div className="txt"><small>♛ Leader</small><h3>{deck.f ? D.noLeader : D.noFacYet}</h3><p>{deck.f ? D.leaderHint : D.facHint}</p><div id="dLeadTxt" /></div></div>}
      <div className="dstats" id="dHead">
        <DStat lbl={D.cards} v={n} max={DECK_MIN} /><DStat lbl={D.units(UNIT_MIN)} v={u} max={UNIT_MIN} /><DStat lbl="Provision" v={pv} max={cap} cap />
      </div>
      {!L && <p className="hint pad">{D.capHint}</p>}
      <div id="dList" ref={list}>
        {ids.length ? <>{grp('Gold')}{grp('Bronze')}</> : <p className="hint pad">{deck.f ? D.empty : D.emptyNoFac}</p>}
      </div>
      <ul className="chk" id="dChk">
        {chk.map(([ok, t], i) => <li key={i} className={ok ? 'ok' : 'bad'}>{t}</li>)}
        <li className="sum">{chk.every(x => x[0]) ? <b>{D.allOk}</b> : <b>{D.notOk}</b>}</li>
      </ul>
    </div>
  )
}
