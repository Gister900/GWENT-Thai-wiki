import { useEffect, useMemo, useRef, useState } from 'react'
import { COL, DEBOUNCE_MS, FAC, FAC_ORDER } from '../../lib/constants'
import { useT } from '../../i18n/useT'
import { BYID, CARDS, CTIPS, FO, PROVS, SKEY, hasTip } from '../../lib/data'
import { matchCard, normQuery, sorter, type CardFilter, type SortKey } from '../../lib/search'
import { ownN, ownOk, type OwnFilter } from '../../lib/collection'
import { FI } from '../../components/FactionIcon'
import { useActions, useAppState, type GridPage } from '../../store'
import { CollectionTools } from '../collection/CollectionBar'
import { CardTile } from './CardTile'
import { VGrid } from '../../components/VGrid'
import { Crumbs } from '../home/Crumbs'

const P0 = PROVS[0], P1 = PROVS[PROVS.length - 1]
const facIdx = (c: { id: number }) => FO.get(c.id)!
const TIERS: Record<string, string> = { Bronze: 'var(--bronze)', Gold: 'var(--gold)', Leader: 'var(--leader)' }
const OWN_OPTS: OwnFilter[] = ['', 'full', 'miss', 'none']
const TYPES = ['Unit', 'Special', 'Artifact', 'Stratagem', 'Ability']

/** recent = only the cards in the home "ดูล่าสุด" row (gwent-recent) */
interface PageFilter { st: CardFilter; qText: string; sort: SortKey; own: OwnFilter; recent?: boolean }
const blank = (): CardFilter => ({ fac: new Set(), type: new Set(), col: new Set(), q: '', pmin: P0, pmax: P1, star: false, tip: false })
/** each grid page keeps its own filters; collection and starred start with a preset */
const preset = (p: GridPage): PageFilter => {
  const st = blank()
  if (p === 'stars') st.star = true
  if (p === 'coll') st.type = new Set(['Unit', 'Special', 'Artifact', 'Stratagem']) // leader abilities can't be owned
  return { st, qText: '', sort: 'fac', own: '' }
}

const isMobile = () => typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches

/** การ์ด / คอลเลกชัน / ปักดาว — one card grid with a filter panel, active-filter chips and a sticky search */
export function CardsPage({ page, hidden }: { page: GridPage; hidden: boolean }) {
  const { lang, own, stars, recent, allReq } = useAppState(); const a = useActions(); const L = useT(); const G = L.grid
  const [all, setAll] = useState<Record<GridPage, PageFilter>>(() => ({ cards: preset('cards'), coll: preset('coll'), stars: preset('stars') }))
  const [panel, setPanel] = useState(() => !isMobile())
  const tq = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { st, qText, sort, own: fOwn } = all[page]
  const upd = (f: (p: PageFilter) => PageFilter) => setAll(x => ({ ...x, [page]: f(x[page]) }))
  const setSt = (f: (s: CardFilter) => CardFilter) => upd(p => ({ ...p, st: f(p.st) }))

  const toggle = (key: 'fac' | 'type' | 'col', k: string) => setSt(s => { const n = new Set(s[key]); if (n.has(k)) n.delete(k); else n.add(k); return { ...s, [key]: n } })
  const onQ = (v: string) => { upd(p => ({ ...p, qText: v })); clearTimeout(tq.current); const pg = page; tq.current = setTimeout(() => setAll(x => ({ ...x, [pg]: { ...x[pg], st: { ...x[pg].st, q: normQuery(v) } } })), DEBOUNCE_MS) }
  const reset = () => { clearTimeout(tq.current); upd(p => ({ ...p, qText: '', own: '', recent: false, st: blank() })) }
  useEffect(() => () => clearTimeout(tq.current), [])
  // "ดูทั้งหมด →" on a home row: start the all-cards grid from that filter
  useEffect(() => {
    if (!allReq.n || !allReq.preset) return
    const p = preset('cards'); if (allReq.preset === 'tip') p.st.tip = true; else p.recent = true
    clearTimeout(tq.current); setAll(x => ({ ...x, cards: p }))
  }, [allReq])
  const fRecent = !!all[page].recent
  const recentSet = useMemo(() => new Set(recent), [recent])

  const list = useMemo(() => CARDS.filter(c => matchCard(c, st, SKEY.get(c.id)!, stars.has(c.id), hasTip(c.id)) && ownOk(fOwn, c, ownN(own, c.id, BYID)) && (!fRecent || recentSet.has(c.id))).sort(sorter(sort, facIdx)), [st, sort, fOwn, own, stars, fRecent, recentSet])
  const ids = useMemo(() => list.map(c => c.id), [list])
  useEffect(() => { if (!hidden) a.setCurList(ids) }, [a, ids, hidden])

  // active filters → removable chips
  const chips: [string, React.ReactNode, () => void][] = []
  st.fac.forEach(f => chips.push(['fac' + f, <><FI f={f} />{FAC[f].th}</>, () => toggle('fac', f)]))
  st.type.forEach(t => chips.push(['type' + t, L.type[t].split(' (')[0], () => toggle('type', t)]))
  st.col.forEach(c => chips.push(['col' + c, <><span className="gem" style={{ background: TIERS[c] }} />{COL[c].t}</>, () => toggle('col', c)]))
  if (st.pmin !== P0 || st.pmax !== P1) chips.push(['prov', `Provision ${st.pmin}–${st.pmax}`, () => setSt(s => ({ ...s, pmin: P0, pmax: P1 }))])
  if (st.tip) chips.push(['tip', G.chipTip, () => setSt(s => ({ ...s, tip: false }))])
  if (st.star) chips.push(['star', G.chipStar, () => setSt(s => ({ ...s, star: false }))])
  if (fRecent) chips.push(['recent', G.chipRecent, () => upd(p => ({ ...p, recent: false }))])
  if (fOwn) chips.push(['own', '📦 ' + G.ownChip[fOwn], () => upd(p => ({ ...p, own: '' }))])
  const qChip = st.q ? [['q', `“${qText.trim()}”`, () => onQ('')] as [string, React.ReactNode, () => void]] : []

  const pmin = (v: number) => setSt(s => ({ ...s, pmin: Math.min(v, s.pmax) }))
  const pmax = (v: number) => setSt(s => ({ ...s, pmax: Math.max(v, s.pmin) }))
  const pct = (v: number) => ((v - P0) / (P1 - P0)) * 100
  const sw = (on: boolean) => <span className={'switch' + (on ? ' on' : '')} aria-hidden="true" />

  return (
    <section id="cards" className={'page s-cards' + (hidden ? ' hidden' : '')} data-page={page}>
      <div className="topbar">
        {page === 'cards' && <Crumbs here={G.crumb} />}
        <div className="tb-row">
          <h1 className="page-title">{G.title[page]}<small>{G.sub}</small></h1>
          <label className="search"><span className="ic" aria-hidden="true">⌕</span>
            <input type="search" id="q" aria-label={G.searchAria} placeholder={G.searchPh} value={qText} onChange={e => onQ(e.target.value)} /><kbd>/</kbd></label>
          <div className="tb-right">
            <button type="button" className={'btn' + (panel ? ' on' : '')} id="ftoggle" aria-expanded={panel} aria-controls="fpanel" onClick={() => setPanel(v => !v)}>{G.filters}{chips.length ? <span className="badge">{chips.length}</span> : null}</button>
            <select className="select" id="sort" aria-label={G.sortAria} value={sort} onChange={e => upd(p => ({ ...p, sort: e.target.value as SortKey }))}>
              {['fac', 'provD', 'provA', 'powD', 'name'].map(k => <option key={k} value={k}>{G.sort[k]}</option>)}
            </select>
          </div>
        </div>
        <div className="activebar" id="activebar">
          {chips.length + qChip.length > 0 && <span className="lbl">{G.filtering}</span>}
          {[...qChip, ...chips].map(([k, label, rm]) => <span className="fchip" key={k} data-chip={k}>{label}<button type="button" aria-label={G.rmChip} onClick={rm}>✕</button></span>)}
          {chips.length + qChip.length > 0 && <button type="button" className="clear-all" id="reset" onClick={reset}>{G.clearAll}</button>}
          <span className="count" id="count">{G.count(list.length, CARDS.length)}</span>
        </div>
      </div>
      {page === 'coll' && <div className="coll-head"><CollectionTools own={own} /></div>}
      <div className={'cards-body' + (panel ? '' : ' nofilter')}>
        <div className={'fwrap' + (panel ? ' open' : '')} onClick={e => { if (e.target === e.currentTarget) setPanel(false) }}>
          <aside className="fpanel" id="fpanel" aria-label={G.panelAria}>
            <div className="grabber" aria-hidden="true" />
            <div className="fp-hd"><h3>{G.panelTitle}</h3><span className="fp-n">{chips.length ? G.inUse(chips.length) : ''}</span><button type="button" title={G.closePanel} aria-label={G.closePanelAria} onClick={() => setPanel(false)}>✕</button></div>
            <div className="fsec"><h4>{G.fac} {st.fac.size > 0 && <span>{G.picked(st.fac.size)}</span>}</h4>
              <div className="facgrid" id="fFac">{FAC_ORDER.map(f => <button key={f} type="button" className={`facbtn fc-${FAC[f].cls}` + (st.fac.has(f) ? ' on' : '')} aria-pressed={st.fac.has(f)} data-k={f} onClick={() => toggle('fac', f)}><FI f={f} />{FAC[f].th}</button>)}</div></div>
            <div className="fsec"><h4>{G.type}</h4>
              <div className="pills" id="fType">{TYPES.map(t => <button key={t} type="button" className={'pill' + (st.type.has(t) ? ' on' : '')} aria-pressed={st.type.has(t)} data-k={t} onClick={() => toggle('type', t)}>{L.type[t].split(' (')[0]}</button>)}</div></div>
            <div className="fsec"><h4>{G.tier}</h4>
              <div className="pills" id="fCol">{Object.keys(COL).map(c => <button key={c} type="button" className={'pill' + (st.col.has(c) ? ' on' : '')} aria-pressed={st.col.has(c)} data-k={c} onClick={() => toggle('col', c)}><span className="gem" style={{ background: TIERS[c] }} />{COL[c].t}</button>)}</div></div>
            <div className="fsec"><h4>Provision <span>{st.pmin} – {st.pmax}</span></h4>
              <div className="range">
                <div className="track" /><div className="fill" style={{ left: pct(st.pmin) + '%', right: 100 - pct(st.pmax) + '%' }} />
                <input type="range" id="pmin" aria-label={G.pmin} min={P0} max={P1} step={1} value={st.pmin} onChange={e => pmin(+e.target.value)} />
                <input type="range" id="pmax" aria-label={G.pmax} min={P0} max={P1} step={1} value={st.pmax} onChange={e => pmax(+e.target.value)} />
              </div>
              <div className="range-lbl"><span>{P0}</span><span>{Math.round(P0 + (P1 - P0) / 3)}</span><span>{Math.round(P0 + (P1 - P0) * 2 / 3)}</span><span>{P1}</span></div></div>
            <div className="fsec"><h4>{G.coll}</h4>
              <div className="pills" id="fOwn">{OWN_OPTS.map(k => <button key={k || 'all'} type="button" className={'pill' + (fOwn === k ? ' on' : '')} aria-pressed={fOwn === k} data-own={k} onClick={() => upd(p => ({ ...p, own: k }))}>{G.own[k]}</button>)}</div></div>
            <div className="fsec"><h4>{G.other}</h4>
              {CTIPS && <button type="button" className="togrow" id="fTip" aria-pressed={st.tip} onClick={() => setSt(s => ({ ...s, tip: !s.tip }))}>{G.tipToggle}{sw(st.tip)}</button>}
              <button type="button" className="togrow" id="fStar" aria-pressed={st.star} onClick={() => setSt(s => ({ ...s, star: !s.star }))}>{G.starToggle}{sw(st.star)}</button>
              {page !== 'coll' && <details className="fp-more"><summary>{G.collTools}<span aria-hidden="true">›</span></summary><CollectionTools own={own} /></details>}
              <p className="hint">{G.hint}</p>
            </div>
            <div className="sheet-actions"><button type="button" className="btn" onClick={reset}>{G.clear}</button><button type="button" className="btn gold" id="sheetDone" onClick={() => setPanel(false)}>{G.show(list.length)}</button></div>
          </aside>
        </div>
        <div>
          {!hidden && <VGrid id="grid" items={list} render={(c, row) => <CardTile key={c.id} c={c} lang={lang} starred={stars.has(c.id)} owned={ownN(own, c.id, BYID)} pri={row === 0} />} />}
          {!list.length && <div className="empty" id="empty">{page === 'stars' && !stars.size ? G.starsEmpty : G.empty}</div>}
        </div>
      </div>
    </section>
  )
}
