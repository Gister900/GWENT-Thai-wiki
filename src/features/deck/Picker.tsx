import { useMemo } from 'react'
import type { Deck } from '../../types'
import { BYID, CARDS, SKEY } from '../../lib/data'
import { blockWhy, maxCopies } from '../../lib/deckRules'
import { ownN } from '../../lib/collection'
import { pickCards, type PickFilter } from '../../lib/search'
import { CardTile } from '../cards/CardTile'
import { useAppState } from '../../store'
import type { Card } from '../../types'

/** left column of the deck page: cards of the deck faction + Neutral (click = add) */
export function Picker({ pf, setPf }: { pf: PickFilter; setPf: React.Dispatch<React.SetStateAction<PickFilter>> }) {
  const { deck, own, lang, stars } = useAppState()
  const set = (k: keyof PickFilter) => (e: React.ChangeEvent<HTMLSelectElement>) => setPf(p => ({ ...p, [k]: e.target.value }))
  const list = useMemo(() => deck.f ? pickCards(CARDS, deck.f, pf, c => SKEY.get(c.id)!, id => ownN(own, id, BYID)) : [], [deck.f, pf, own])
  const ids = useMemo(() => list.map(c => c.id), [list])
  return (
    <div className="panel picker dpick">
      <div className="panel-hd"><h3>เลือกการ์ด</h3><span className="sub" id="pCount">{deck.f ? `· ${list.length} ใบ` : ''}</span>
        <div className="pfil">
          <select className="select" id="pCol" aria-label="กรองสี" value={pf.col} onChange={set('col')}><option value="">ระดับ: ทั้งหมด</option><option value="Gold">◆ Gold</option><option value="Bronze">● Bronze</option></select>
          <select className="select" id="pType" aria-label="กรองประเภท" value={pf.type} onChange={set('type')}><option value="">ประเภท: ทั้งหมด</option><option value="Unit">Unit</option><option value="Special">Special</option><option value="Artifact">Artifact</option><option value="Stratagem">Stratagem</option></select>
          <select className="select" id="pProv" aria-label="กรอง provision" value={pf.prov} onChange={set('prov')}><option value="">Provision: ทั้งหมด</option><option value="0-5">ไม่เกิน 5</option><option value="6-7">6–7</option><option value="8-9">8–9</option><option value="10-11">10–11</option><option value="12-99">12 ขึ้นไป</option></select>
          <select className="select" id="pOwn" aria-label="กรองคอลเลกชัน" value={pf.own} onChange={set('own')}><option value="">คอลเลกชัน: ทั้งหมด</option><option value="has">มีแล้ว (อย่างน้อย 1)</option><option value="none">ไม่มี</option></select>
        </div>
      </div>
      <div className="panel-bd">
        <div className="grid" id="dPick">
          {!deck.f ? <div className="pempty"><b>เลือกฝ่ายของเดคก่อน</b><br />เลือกที่ช่อง "ฝ่าย" ด้านบน แล้วการ์ดของฝ่ายนั้นกับ Neutral จะขึ้นให้เลือกตรงนี้</div>
            : list.length ? list.map(c => <PickTile key={c.id} c={c} deck={deck} owned={ownN(own, c.id, BYID)} starred={stars.has(c.id)} lang={lang} list={ids} />)
            : <div className="pempty">ไม่พบการ์ดที่ตรงกับตัวกรอง</div>}
        </div>
      </div>
    </div>
  )
}

function PickTile({ c, deck, owned, starred, lang, list }: { c: Card; deck: Deck; owned: number; starred: boolean; lang: 'th' | 'en'; list: number[] }) {
  const n = deck.c[c.id] || 0, m = maxCopies(c), b = blockWhy(c, deck, BYID)
  const block = n < m ? (b ? b.s : null) : `ใส่ครบ ${m} ใบแล้ว`
  return <CardTile c={c} lang={lang} starred={starred} owned={owned} mode="pick" inDeck={n} block={block} list={list} />
}
