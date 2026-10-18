import { useEffect, useRef } from 'react'
import { BYID, abHTML } from '../../lib/data'
import { deckChecks, deckTot, DECK_MIN, UNIT_MIN } from '../../lib/deckRules'
import { abText } from '../../lib/i18n'
import { ownN } from '../../lib/collection'
import { FAC } from '../../lib/constants'
import { Thumb } from '../../components/images'
import { artSources } from '../../lib/art'
import { useActions, useAppState } from '../../store'

function DStat({ lbl, v, max, cap }: { lbl: string; v: number; max: number; cap?: boolean }) {
  const over = !!cap && v > max, full = !cap && v >= max, pct = Math.min(100, max ? v / max * 100 : 0)
  const note = cap ? (over ? `✗ เกิน ${v - max}` : `เหลือ ${max - v}`) : (full ? '✓ ครบ' : `ขาด ${max - v}`)
  return <div className={'dstat' + (full ? ' ok' : '') + (over ? ' over' : '')}>
    <div className="row"><span>{lbl}</span><b>{v}<em>/{max}</em></b></div>
    <div className={'bar' + (cap ? '' : ' cards')} role="progressbar" aria-valuenow={v} aria-valuemax={max} aria-label={lbl}><i style={{ width: pct + '%' }} /></div>
    <small>{note}</small></div>
}

/** middle column of the deck page: leader banner, meters, Gold/Bronze rows, checklist */
export function DeckSide() {
  const { deck, own, newRow, lang } = useAppState(); const a = useActions()
  const T = deckTot(deck, BYID); const { n, u, pv, L, cap } = T
  const list = useRef<HTMLDivElement>(null)
  const ids = Object.keys(deck.c).map(Number).filter(i => BYID[i]).sort((x, y) => BYID[y].v - BYID[x].v || BYID[x].n.localeCompare(BYID[y].n))
  const chk = deckChecks(deck, T)

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
      <button type="button" className="nm" data-open={i} title="เปิดการ์ดใบใหญ่" onClick={() => a.openModal(i, null)}>{c.n}<em className="newb">ใหม่</em>
        <small>{c.t}{c.cat ? ' · ' + c.cat : ''} · {miss ? `มี ${o}` : `✓ มีครบ (มี ${o})`}</small></button>
      {miss > 0 && <span className="miss">ขาด {miss}</span>}
      <span className="cnt" aria-label="จำนวน">×{k}</span>
      <button type="button" className="rm" data-act="rem" data-id={i} aria-label={`เอา ${c.n} ออก 1 ใบ`} onClick={() => a.removeFromDeck(i)}>−</button>
      <button type="button" className="rm plus" data-act="add" data-id={i} aria-label={`เพิ่ม ${c.n} 1 ใบ`} onClick={() => a.addToDeck(i)}>+</button>
    </div>
  }
  const grp = (col: 'Gold' | 'Bronze') => {
    const g = ids.filter(i => BYID[i].c === col); if (!g.length) return null
    const k = g.reduce((s, i) => s + deck.c[i], 0), p = g.reduce((s, i) => s + BYID[i].v * deck.c[i], 0)
    return <div className="dgroup"><h4><span className="gem" style={{ background: col === 'Gold' ? 'var(--gold)' : 'var(--bronze)' }} />{col}<span>{k} ใบ · {p} provision</span></h4>{g.map(row)}</div>
  }

  return (
    <div className="panel dside">
      {L ? <div className="leader">
        <img src={artSources(L, 'low')[0]?.url} alt="" />
        <div className="txt"><small>♛ Leader · {FAC[deck.f]?.th}</small><h3>{L.n}</h3><div id="dLeadTxt" className="ab" dangerouslySetInnerHTML={{ __html: abHTML(abText(L, lang)) }} /></div>
      </div> : <div className="leader empty"><div className="txt"><small>♛ Leader</small><h3>{deck.f ? 'ยังไม่เลือก leader' : 'ยังไม่เลือกฝ่าย'}</h3><p>{deck.f ? 'เลือก Leader Ability ที่ช่องด้านบน เพดาน provision จะเพิ่มตาม leader' : 'เลือกฝ่ายของเดคที่ช่องด้านบนก่อน'}</p><div id="dLeadTxt" /></div></div>}
      <div className="dstats" id="dHead">
        <DStat lbl="การ์ด" v={n} max={DECK_MIN} /><DStat lbl={`ยูนิต (ขั้นต่ำ ${UNIT_MIN})`} v={u} max={UNIT_MIN} /><DStat lbl="Provision" v={pv} max={cap} cap />
      </div>
      {!L && <p className="hint pad">เพดาน provision ยังไม่รวม leader (เลือก leader แล้วเพดานจะเพิ่ม)</p>}
      <div id="dList" ref={list}>
        {ids.length ? <>{grp('Gold')}{grp('Bronze')}</> : <p className="hint pad">{deck.f ? 'ยังไม่มีการ์ดในเดค กดการ์ดทางซ้าย (หรือปุ่ม +) เพื่อเพิ่ม' : 'เลือกฝ่ายด้านบนก่อน แล้วค่อยเลือกการ์ด'}</p>}
      </div>
      <ul className="chk" id="dChk">
        {chk.map(([ok, t], i) => <li key={i} className={ok ? 'ok' : 'bad'}>{t}</li>)}
        <li className="sum">{chk.every(x => x[0]) ? <b>✓ เดคนี้ถูกเกณฑ์ครบ</b> : <b>⚠ เดคยังไม่ครบเกณฑ์</b>}</li>
      </ul>
    </div>
  )
}
