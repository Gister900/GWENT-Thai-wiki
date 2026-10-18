import { useRef } from 'react'
import type { Own } from '../../types'
import { BYID, CARDS } from '../../lib/data'
import { exportPayload, maxCopiesC, ownSummaryText, parseImport, setOwn } from '../../lib/collection'
import { toast } from '../../components/Toast'
import { useActions } from '../../store'

/** bulk set / export / import of the collection (gwent-own) + summary line · top of the collection page, or inside the filter panel */
export function CollectionTools({ own }: { own: Own }) {
  const a = useActions(); const file = useRef<HTMLInputElement>(null)
  const bulk = (full: boolean) => {
    const ids = a.getCurList().filter(id => BYID[id].t !== 'Ability')
    if (!ids.length) { toast('ไม่มีการ์ดในรายการที่กรองอยู่'); return }
    if (!confirm(`ตั้งการ์ด ${ids.length} ใบที่กรองอยู่ตอนนี้ให้เป็น "${full ? 'มีครบ' : 'ไม่มี'}" ทั้งหมด ตกลงไหม`)) return
    let o = own; ids.forEach(id => { o = setOwn(o, id, full ? maxCopiesC(BYID[id]) : 0) }); a.setOwnAll(o)
    toast(`✓ ตั้ง ${ids.length} ใบเป็น ${full ? 'มีครบ' : 'ไม่มี'} แล้ว`)
  }
  const exp = () => {
    const now = new Date(); const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([JSON.stringify(exportPayload(own, now), null, 1)], { type: 'application/json' }))
    el.download = 'gwent-collection-' + now.toISOString().slice(0, 10) + '.json'
    document.body.appendChild(el); el.click(); setTimeout(() => { URL.revokeObjectURL(el.href); el.remove() }, 500)
  }
  const imp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target; const f = input.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const clean = parseImport(String(r.result), BYID)
        if (!confirm(`นำเข้าคอลเลกชัน ${Object.keys(clean).length} ใบ (จะแทนที่ข้อมูลเดิมในเครื่องนี้) ตกลงไหม`)) return
        a.setOwnAll(clean); toast('✓ นำเข้าคอลเลกชันแล้ว')
      } catch { toast('⛔ ไฟล์นี้ไม่ใช่ไฟล์คอลเลกชันที่ export จากหน้านี้') }
      input.value = ''
    }
    r.readAsText(f)
  }
  return (
    <div className="ctools">
      <div className="ctools-sum" id="ownSum">{ownSummaryText(CARDS, own, BYID)}</div>
      <div className="ctools-btns">
        <button type="button" className="btn" id="bulkFull" onClick={() => bulk(true)}>ตั้งทุกใบที่กรองอยู่เป็น มีครบ</button>
        <button type="button" className="btn" id="bulkNone" onClick={() => bulk(false)}>ตั้งทุกใบที่กรองอยู่เป็น ไม่มี</button>
        <button type="button" className="btn" id="ownExp" onClick={exp}>⬇ Export (JSON)</button>
        <button type="button" className="btn" id="ownImpB" onClick={() => file.current?.click()}>⬆ Import</button>
        <input type="file" id="ownImp" accept=".json,application/json" hidden ref={file} onChange={imp} />
      </div>
    </div>
  )
}
