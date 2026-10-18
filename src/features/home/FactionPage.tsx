// One faction: banner + play style, jump bar, collapsible sections (Leader · Gold · Bronze · special · deck styles), faction search.
import { useEffect, useMemo, useState } from 'react'
import { FAC, FAC_DESC } from '../../lib/constants'
import { ARCH, BYID, CARDS, FO, SKEY } from '../../lib/data'
import { sorter } from '../../lib/search'
import { ownN } from '../../lib/collection'
import { heroCard, SEC_LBL, splitSections, type SecKey } from '../../lib/home'
import { HeroArt } from '../../components/images'
import { FI } from '../../components/FactionIcon'
import { VGrid } from '../../components/VGrid'
import { useActions, useAppState } from '../../store'
import { CardTile } from '../cards/CardTile'
import { ArchList } from '../overview/Overview'
import { Crumbs } from './Crumbs'
import { VIRT_MIN } from './CardsHome'
import { useSearch } from './useSearch'

const facIdx = (c: { id: number }) => FO.get(c.id)!
const SECS: SecKey[] = ['leader', 'gold', 'bronze', 'other']
const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'start' })

export function FactionPage({ f, to }: { f: string; to?: 'arch' }) {
  const { lang, own, stars } = useAppState(); const a = useActions()
  const { text, q, onText } = useSearch()
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const all = useMemo(() => CARDS.filter(c => c.f === f).sort(sorter('fac', facIdx)), [f])
  const list = useMemo(() => (q ? all.filter(c => SKEY.get(c.id)!.includes(q)) : all), [all, q])
  const ids = useMemo(() => list.map(c => c.id), [list])
  const secs = useMemo(() => splitSections(list), [list])
  const arch = (ARCH && ARCH[f]) || []
  const hero = useMemo(() => heroCard(CARDS, f), [f])
  const shown = SECS.filter(k => secs[k].length > 0)
  const firstSec = shown[0]

  const open = (k: string) => setClosed(s => { if (!s.has(k)) return s; const n = new Set(s); n.delete(k); return n })
  const toggle = (k: string) => setClosed(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const go = (k: string) => { open(k); requestAnimationFrame(() => jump('fx-' + k)) }
  // from a deck-style card on the home: land on this faction's deck styles
  useEffect(() => { if (to === 'arch') requestAnimationFrame(() => jump('fx-arch')) }, [to])

  const tile = (c: (typeof list)[number], pri: boolean) => <CardTile key={c.id} c={c} lang={lang} starred={stars.has(c.id)} owned={ownN(own, c.id, BYID)} list={ids} pri={pri} />
  const hd = (k: string, label: string, n: number) => <button type="button" className="fsect-hd" aria-expanded={!closed.has(k)} onClick={() => toggle(k)}>
    <span className="chev" aria-hidden="true">▾</span>{label}<span className="n">{n}</span></button>

  return (
    <section id="facpage" className={`page s-fac fc-${FAC[f].cls}`} data-fac={f}>
      <div className="topbar">
        <Crumbs here={<><FI f={f} /> {FAC[f].th}</>} />
        <div className="tb-row">
          <h1 className="page-title">{FAC[f].th}<small>{all.length} ใบ · ข้อความไทยแปลโดย AI</small></h1>
          <label className="search"><span className="ic" aria-hidden="true">⌕</span>
            <input type="search" id="fq" aria-label={`ค้นหาในฝ่าย ${FAC[f].th}`} placeholder={`ค้นหาในฝ่าย ${FAC[f].th}`} value={text} onChange={e => onText(e.target.value)} /><kbd>/</kbd></label>
          <div className="tb-right"><button type="button" className="btn" id="facBack" onClick={() => a.showCards({ v: 'home' })}>← หน้าแรกการ์ด</button></div>
        </div>
        <div className="fjump" id="fjump">
          {shown.map(k => <button type="button" key={k} data-jump={k} onClick={() => go(k)}>{SEC_LBL[k]}<span className="n">{secs[k].length}</span></button>)}
          {arch.length > 0 && <button type="button" data-jump="arch" onClick={() => go('arch')}>🧩 สไตล์เดค<span className="n">{arch.length}</span></button>}
          {q && <span className="count">พบ {list.length} / {all.length} ใบ</span>}
        </div>
      </div>
      <div className="fac-body">
        <div className="fbanner">
          {hero && <HeroArt key={hero.id} c={hero} />}
          <div className="fb-txt"><h2><FI f={f} /> {FAC[f].th}<span className="n">{all.length} ใบ</span></h2>
            <p><b>{FAC_DESC[f][0]}</b></p><p dangerouslySetInnerHTML={{ __html: FAC_DESC[f][1] }} /></div>
        </div>
        {shown.map(k => <section className="fsect" id={'fx-' + k} data-sec={k} key={k}>
          {hd(k, SEC_LBL[k], secs[k].length)}
          {!closed.has(k) && (secs[k].length > VIRT_MIN
            ? <VGrid items={secs[k]} render={(c, row) => tile(c, k === firstSec && row === 0)} />
            : <div className="grid">{secs[k].map((c, i) => tile(c, k === firstSec && i < 8))}</div>)}
        </section>)}
        {!list.length && <div className="empty">ไม่พบการ์ดในฝ่ายนี้ที่ตรงกับ “{text.trim()}”</div>}
        {arch.length > 0 && <section className="fsect" id="fx-arch" data-sec="arch">
          {hd('arch', '🧩 สไตล์เดคของฝ่าย', arch.length)}
          {!closed.has('arch') && <div className="panel fx-archs"><ArchList arr={arch} /></div>}
        </section>}
      </div>
    </section>
  )
}
