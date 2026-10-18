import { useMemo, useState } from 'react'
import { ARCH, BYID, CARDS, PLBL } from '../../lib/data'
import { buildPairIndex, reasonLabel, recommend } from '../../lib/recommend'
import { ownN } from '../../lib/collection'
import { COL } from '../../lib/constants'
import * as storage from '../../lib/storage'
import { Thumb } from '../../components/images'
import { useActions, useAppState } from '../../store'

const IX = buildPairIndex(CARDS)
const MAXV = 3

/** "แนะนำให้เพิ่ม" box in the deck column: top 10 cards that pair with what is already in the deck */
export function Recommend() {
  const { deck, own } = useAppState(); const a = useActions()
  const [ownedOnly, setOwnedOnly] = useState(storage.loadRecOwned)
  const list = useMemo(() => recommend(deck, BYID, CARDS, IX, { ownedOnly, owned: id => ownN(own, id, BYID), arch: ARCH }), [deck, own, ownedOnly])
  const ids = useMemo(() => list.map(x => x.card.id), [list])
  const empty = !Object.keys(deck.c).some(i => BYID[+i]) && !(deck.L && BYID[deck.L])

  const cls: Record<string, string> = { pair: 'pair', leader: 'lead', arch: 'arch', units: 'bal', prov: 'bal' }
  return (
    <div className="panel rec" id="dRec">
      <div className="panel-hd"><h3>แนะนำให้เพิ่ม</h3>
        <label className="chk-own"><input type="checkbox" id="recOwned" checked={ownedOnly} onChange={e => { setOwnedOnly(e.target.checked); storage.saveRecOwned(e.target.checked) }} /> เฉพาะที่มีในคอลเลกชัน</label></div>
      <div className="panel-bd">
        {deck.f && !empty && <p className="hint">{list.length} ใบ · คิดจากคู่การ์ด · leader · แนวเดค · ความสมดุลของเดค</p>}
        {!deck.f ? <p className="hint">เลือกฝ่ายก่อน แล้วค่อยเพิ่มการ์ด</p>
          : empty ? <p className="hint" id="recEmpty">เพิ่มการ์ดลงเดคสักใบก่อน (หรือเลือก leader) แล้วจะเริ่มแนะนำการ์ดที่เข้ากัน</p>
          : !list.length ? <p className="hint" id="recEmpty">{ownedOnly ? 'ยังไม่มีการ์ดในคอลเลกชันที่เข้ากับเดคนี้ (ลองเอาติ๊ก "เฉพาะที่มีแล้ว" ออก)' : 'ยังไม่มีการ์ดที่เพิ่มได้และเข้ากับการ์ดในเดคนี้'}</p>
          : <div className="reclist" id="recList">{list.map(({ card: c, via, leader, arch, tags }) => (
            <div key={c.id} className="rec-item rc" data-rec={c.id}>
              <button type="button" className={'th t-' + (c.c === 'Gold' ? 'gold' : 'bronze')} data-open={c.id} title="เปิดการ์ดใบใหญ่" onClick={() => a.openModal(c.id, ids)}><Thumb c={c} lazy /><span className="pv">{c.v}</span></button>
              <div className="rcb">
                <h5><button type="button" className="rname" data-open={c.id} onClick={() => a.openModal(c.id, ids)}>{c.n}</button><span className="score">{COL[c.c].t} · {c.t === 'Unit' ? 'พลัง ' + c.p : c.t}{c.f === 'Neutral' ? ' · Neutral' : ''}{deck.c[c.id] ? ` · ในเดค ×${deck.c[c.id]}` : ''}</span></h5>
                <div className="reasons rcw">{tags.map(t => <span key={t.k} className={'rsn rtag ' + (cls[t.k] || 'bal')} data-tag={t.k}>{
                  t.k === 'pair' ? <>🔗 เข้ากับ {via.slice(0, MAXV).map((v, i) => {
                    const lb = reasonLabel(v.reason, PLBL)
                    return <span key={v.id}>{i > 0 && ' · '}<button type="button" className="rcn" data-open={v.id} onClick={() => a.openModal(v.id, null)}>{BYID[v.id].n}</button>{lb && ` (${lb})`}</span>
                  })}{via.length > MAXV && <span className="rcmore"> +{via.length - MAXV}</span>}</>
                  : t.k === 'leader' ? `👑 เข้ากับ leader${leader?.reason ? ' · ' + reasonLabel(leader.reason, PLBL) : ''}`
                  : t.k === 'arch' ? `🧩 แนว ${arch?.name_th || arch?.name || ''}`
                  : t.k === 'units' ? '⚖️ เดคยังขาดยูนิต' : '⚖️ provision พอดี'
                }</span>)}</div>
              </div>
              <button type="button" className="add" data-act="add" data-id={c.id} aria-label={`เพิ่ม ${c.n} ลงเดค`} onClick={() => a.addToDeck(c.id)}>+</button>
            </div>))}</div>}
        <div className="legend"><span className="rsn pair">🔗 คู่กับการ์ดในเดค</span><span className="rsn lead">👑 คู่กับ leader</span><span className="rsn arch">🧩 การ์ดหลักของแนวเดค</span><span className="rsn bal">⚖️ ช่วยสมดุลยูนิต/provision</span></div>
      </div>
    </div>
  )
}
