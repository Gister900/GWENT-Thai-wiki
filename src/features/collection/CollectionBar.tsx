import { useRef } from 'react'
import type { Own } from '../../types'
import { BYID, CARDS } from '../../lib/data'
import { exportPayload, maxCopiesC, ownSummaryText, parseImport } from '../../lib/collection'
import { toast } from '../../components/Toast'
import { useActions, useLang } from '../../store'
import { UI } from '../../i18n/ui'

/** bulk set / export / import of the collection (gwent-own) + summary line · top of the collection page, or inside the filter panel */
export function CollectionTools({ own }: { own: Own }) {
  const a = useActions(); const file = useRef<HTMLInputElement>(null); const lang = useLang(); const C = UI[lang].coll
  const bulk = (full: boolean) => {
    const ids = a.getCurList().filter(id => BYID[id].t !== 'Ability')
    if (!ids.length) { toast(C.noCards); return }
    const s = full ? C.full : C.none
    if (!confirm(C.bulkQ(ids.length, s))) return
    // only the filtered cards change; cards ticked meanwhile in another tab keep their value
    const ch: Record<number, number> = {}; ids.forEach(id => { ch[id] = full ? maxCopiesC(BYID[id]) : 0 }); a.setOwnCards(ch)
    toast(C.bulkDone(ids.length, s))
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
        if (!confirm(C.impQ(Object.keys(clean).length))) return
        a.replaceOwn(clean); toast(C.impDone)
      } catch { toast(C.impBad) }
      input.value = ''
    }
    r.readAsText(f)
  }
  return (
    <div className="ctools">
      <div className="ctools-sum" id="ownSum">{ownSummaryText(CARDS, own, BYID, lang)}</div>
      <div className="ctools-btns">
        <button type="button" className="btn" id="bulkFull" onClick={() => bulk(true)}>{C.bulkFull}</button>
        <button type="button" className="btn" id="bulkNone" onClick={() => bulk(false)}>{C.bulkNone}</button>
        <button type="button" className="btn" id="ownExp" onClick={exp}>⬇ Export (JSON)</button>
        <button type="button" className="btn" id="ownImpB" onClick={() => file.current?.click()}>⬆ Import</button>
        <input type="file" id="ownImp" accept=".json,application/json" hidden ref={file} onChange={imp} />
      </div>
    </div>
  )
}
