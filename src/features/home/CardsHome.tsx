// "การ์ด" home: one big search, 7 faction tiles, rows (recent · starred · with tips), deck styles, door to the full grid.
// Typing replaces the home with results grouped by faction; clearing the box brings the home back.
import { useMemo } from 'react'
import type { Card } from '../../types'
import { FAC, FAC_DESC, FAC_ORDER } from '../../lib/constants'
import { ARCH, BYID, CARDS, FO, SKEY, getCard, hasTip } from '../../lib/data'
import { sorter } from '../../lib/search'
import { ownN } from '../../lib/collection'
import { groupByFac, heroCard } from '../../lib/home'
import { HeroArt, Thumb } from '../../components/images'
import { FI } from '../../components/FactionIcon'
import { VGrid } from '../../components/VGrid'
import { useActions, useAppState } from '../../store'
import { CardTile } from '../cards/CardTile'
import { useSearch } from './useSearch'

const facIdx = (c: { id: number }) => FO.get(c.id)!
const byFac = sorter('fac', facIdx)
/** grids with more cards than this are virtualized */
export const VIRT_MIN = 60
const ROW_MAX = 20
/** cells of the first home row that are on screen at 2560: load with fetchpriority="high", not lazy */
const ROW_PRI = 10
const FAC_N: Record<string, number> = Object.fromEntries(FAC_ORDER.map(f => [f, CARDS.filter(c => c.f === f).length]))
const HERO = Object.fromEntries(FAC_ORDER.map(f => [f, heroCard(CARDS, f)]))
const TIPS = CARDS.filter(c => hasTip(c.id)).sort(sorter('provD', facIdx))
const ARCHS = FAC_ORDER.flatMap(f => ((ARCH && ARCH[f]) || []).map((x, i) => ({ f, i, x, key: (x.key_cards || []).map(Number).find(id => getCard(id)) })))

/** one card tile with the current language / star / collection state */
function useTile() {
  const { lang, own, stars } = useAppState()
  return (c: Card, list: number[], pri = false) => <CardTile key={c.id} c={c} lang={lang} starred={stars.has(c.id)} owned={ownN(own, c.id, BYID)} list={list} pri={pri} />
}

function Row({ id, icon, title, cards, total, empty, more, pri = false }: { id: string; icon: string; title: string; cards: Card[]; total: number; empty: string; more: () => void; pri?: boolean }) {
  const tile = useTile(); const ids = useMemo(() => cards.map(c => c.id), [cards])
  return <section className="hrow-sec" id={id}>
    <div className="hrow-hd"><h2><span aria-hidden="true">{icon}</span> {title}<span className="n">{total}</span></h2>
      {total > 0 && <button type="button" className="more" data-more={id} onClick={more}>ดูทั้งหมด →</button>}</div>
    {cards.length ? <div className="hrow">{cards.map((c, i) => <div className="hcell" key={c.id}>{tile(c, ids, pri && i < ROW_PRI)}</div>)}</div> : <div className="hrow-empty">{empty}</div>}
  </section>
}

export function CardsHome() {
  const { recent, stars } = useAppState(); const a = useActions(); const tile = useTile()
  const { text, q, onText } = useSearch()
  const res = useMemo(() => (q ? CARDS.filter(c => SKEY.get(c.id)!.includes(q)).sort(byFac) : []), [q])
  const resIds = useMemo(() => res.map(c => c.id), [res])
  const groups = useMemo(() => groupByFac(res, FAC_ORDER), [res])
  const recentCards = useMemo(() => recent.map(id => BYID[id]).filter(Boolean), [recent])
  const starCards = useMemo(() => [...stars].reverse().map(id => BYID[id]).filter(Boolean), [stars])
  /** the first row with cards is the one on the first screen */
  const firstRow = recentCards.length ? 'rowRecent' : starCards.length ? 'rowStars' : 'rowTips'

  return (
    <section id="home" className="page s-home">
      <div className="home-hero">
        <h1 className="page-title">การ์ด<small>ค้นหาการ์ด เลือกฝ่าย หรือหาไอเดียจัดเดค · ข้อความไทยแปลโดย AI</small></h1>
        <label className="search hsearch"><span className="ic" aria-hidden="true">⌕</span>
          <input type="search" id="hq" aria-label="ค้นหาการ์ด" placeholder="ค้นหาชื่อการ์ด ความสามารถ หรือแท็ก (ไทย/อังกฤษ) เช่น Geralt, Bleeding, ทำดาเมจ" value={text} onChange={e => onText(e.target.value)} /><kbd>/</kbd></label>
      </div>
      {q ? <div className="home-body" id="hres">
        <div className="hres-hd"><b>พบ <span id="hresN">{res.length}</span> ใบ</b><span className="lbl">สำหรับ “{text.trim()}” · แยกตามฝ่าย</span>
          <button type="button" className="btn" id="hqClear" onClick={() => onText('')}>✕ ล้างคำค้น</button></div>
        {groups.map(([f, cs], gi) => <div className={`rgroup fc-${FAC[f].cls}`} data-fac={f} key={f}>
          <h3><FI f={f} /> {FAC[f].th}<span className="n">{cs.length} ใบ</span></h3>
          {cs.length > VIRT_MIN ? <VGrid items={cs} render={(c, row) => tile(c, resIds, gi === 0 && row === 0)} />
            : <div className="grid">{cs.map((c, i) => tile(c, resIds, gi === 0 && i < 6))}</div>}
        </div>)}
        {!res.length && <div className="empty">ไม่พบการ์ดที่ตรงกับ “{text.trim()}” ลองคำอื่น หรือ <button type="button" className="linkbtn" onClick={() => a.showCards({ v: 'all' })}>ดูการ์ดทั้งหมดพร้อมตัวกรอง</button></div>}
      </div> : <div className="home-body">
        <div className="ftiles" id="ftiles">
          {FAC_ORDER.map(f => { const h = HERO[f]; return <button type="button" key={f} className={`ftile fc-${FAC[f].cls}`} data-fac={f} onClick={() => a.showCards({ v: 'fac', f })}>
            {h && <HeroArt c={h} />}
            <span className="ft-txt"><span className="ft-name"><FI f={f} />{FAC[f].th}</span><span className="ft-desc">{FAC_DESC[f][0]}</span></span>
            <span className="ft-n"><b>{FAC_N[f]}</b> ใบ</span>
          </button> })}
        </div>
        <button type="button" className="all-door" id="homeAll" onClick={() => a.showCards({ v: 'all' })}>☰ ดูการ์ดทั้งหมด ({CARDS.length.toLocaleString('en-US')}) พร้อมตัวกรอง<span aria-hidden="true">→</span></button>
        <Row id="rowRecent" pri={firstRow === 'rowRecent'} icon="🕘" title="ดูล่าสุด" cards={recentCards} total={recentCards.length} more={() => a.showCards({ v: 'all' }, 'recent')}
          empty="ยังไม่ได้เปิดดูการ์ดใบไหน ลองค้นหาหรือกดไทล์ฝ่ายด้านบน การ์ดที่เปิดดูจะมารออยู่ตรงนี้" />
        <Row id="rowStars" pri={firstRow === 'rowStars'} icon="⭐" title="ปักดาว" cards={starCards.slice(0, ROW_MAX)} total={starCards.length} more={() => a.showTab('stars')}
          empty="ยังไม่มีการ์ดปักดาว กด ☆ บนการ์ดใบที่ชอบ แล้วจะเรียกดูได้จากตรงนี้" />
        <Row id="rowTips" pri={firstRow === 'rowTips'} icon="💡" title="การ์ดที่มีทริก" cards={TIPS.slice(0, ROW_MAX)} total={TIPS.length} more={() => a.showCards({ v: 'all' }, 'tip')}
          empty="ยังไม่มีการ์ดที่มีทริก" />
        {ARCHS.length > 0 && <section className="hrow-sec" id="homeArch">
          <div className="hrow-hd"><h2><span aria-hidden="true">🧩</span> แนวเดค<span className="n">{ARCHS.length}</span></h2></div>
          <div className="archgrid">{ARCHS.map(({ f, i, x, key }) => <button type="button" key={f + i} className={`archcard fc-${FAC[f].cls}`} data-fac={f} onClick={() => a.showCards({ v: 'fac', f, to: 'arch' })}>
            {key ? <Thumb c={getCard(key)!} lazy /> : <i className="noth">🧩</i>}
            <span><b>{x.name_th || x.name}</b><small><FI f={f} /> {FAC[f].th}{x.name_th ? ' · ' + x.name : ''}</small></span>
          </button>)}</div>
        </section>}
      </div>}
    </section>
  )
}
