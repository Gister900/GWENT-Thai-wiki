import { BYID } from '../../lib/data'
import { craftPlan, parseScraps } from '../../lib/craft'
import { ownN } from '../../lib/collection'
import { Thumb } from '../../components/images'
import { useActions, useAppState } from '../../store'

/** "แผนคราฟต์": missing copies cheapest first vs scraps on hand */
export function CraftPlanBox() {
  const { deck, own, scraps } = useAppState(); const a = useActions()
  const { items, total, have, last, rows } = craftPlan(deck, BYID, id => ownN(own, id, BYID), parseScraps(scraps))
  const verdict = !items.length ? <b>✓ มีการ์ดครบทุกใบในเดคแล้ว ไม่ต้องคราฟต์</b>
    : have === null ? 'กรอก scraps ที่มีอยู่เพื่อดูว่าพอไหม'
    : have >= total ? <><b className="okc">✓ พอ</b> — มี {have} ใช้ {total} เหลือ {have - total} scraps</>
    : <><b className="short">✗ ไม่พอ</b> — มี {have} ต้องใช้ {total} ขาดอีก <b className="short">{total - have}</b> scraps</>
  const reach = have === null || !items.length ? null
    : last < 0 ? <div>ด้วย scraps ที่มี ยังคราฟต์ใบแรก ({items[0].n}) ไม่ได้</div>
    : <div>ถ้าคราฟต์ไล่จากถูกไปแพง จะคราฟต์ได้ {last + 1} ใบ ถึงใบ <b>{items[last].n}</b>{last + 1 < items.length ? ` · ยังเหลืออีก ${items.length - last - 1} ใบ` : ''}</div>
  return <>
    <div className="panel-hd"><h3>แผนคราฟต์</h3><span className="sub">· การ์ดในเดคที่ยังไม่มี เรียงจากถูกไปแพง</span></div>
    <div className="panel-bd">
      <label className="scr">⚒ Scraps ที่มีอยู่<input type="number" className="select" id="dScr" min="0" step="1" inputMode="numeric" placeholder="เช่น 1000" value={scraps} onChange={e => a.setScraps(e.target.value)} /></label>
      {rows.map(({ c, cum, can }, i) => <div className={'craft-row' + (have !== null && !can ? ' no' : '')} key={i}>
        <Thumb c={c} lazy />
        <b className="nm" data-open={c.id} onClick={() => a.openModal(c.id, null)}>{c.n} <small>{c.c} · {c.r}</small></b>
        <span className="st">{have === null ? '#' + (i + 1) : can ? '✓ คราฟต์ได้' : '✗ เกินงบ'}</span>
        <span className="cost">⚒ {c.cc || 0}<small>สะสม {cum}</small></span>
      </div>)}
      <div className="csum">
        <div>ขาดการ์ด <b>{items.length}</b> ใบ · ต้องใช้ scraps รวม <b>{total}</b></div>
        {have !== null && items.length > 0 && <div className="bar"><i style={{ width: Math.min(100, total ? have / total * 100 : 100) + '%' }} /></div>}
        <div>{verdict}</div>{reach}
      </div>
    </div>
  </>
}
