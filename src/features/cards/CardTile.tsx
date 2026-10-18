import { memo, useMemo } from 'react'
import type { Card, Lang } from '../../types'
import { FAC } from '../../lib/constants'
import { abHTML, hasTip } from '../../lib/data'
import { abText } from '../../lib/i18n'
import { maxCopiesC } from '../../lib/collection'
import { CardArt } from '../../components/images'
import { hidePop } from '../../components/KeywordPopover'
import { useActions } from '../../store'

const tier = (c: Card) => (c.c === 'Leader' ? 'leader' : c.c === 'Gold' ? 'gold' : 'bronze')
const powSym = (c: Card) => (c.t === 'Unit' ? String(c.p) : c.c === 'Leader' ? '♛' : c.t === 'Artifact' ? '⚱' : '✦')
export const cardSub = (c: Card) => (c.c === 'Leader' ? 'Leader Ability' : c.t + (c.cat ? ' · ' + c.cat : ''))

export interface TileProps {
  c: Card; lang: Lang; starred: boolean; owned: number
  /** grid = click opens the modal · pick = deck builder: click adds to the deck */
  mode?: 'grid' | 'pick'
  /** pick mode: copies in the deck, why it cannot be added (null = can), modal list */
  inDeck?: number; block?: string | null
  /** modal prev/next order (grid mode without it = the all-cards list) */
  list?: number[]
  /** first visible row: image loads with fetchpriority="high" */
  pri?: boolean
}

/** one card, in-game look: metal frame by tier, faction pennant with power, provision coin, hover lift + quick buttons */
export const CardTile = memo(function CardTile({ c, lang, starred, owned, mode = 'grid', inDeck = 0, block = null, list, pri }: TileProps) {
  const a = useActions()
  const ab = useMemo(() => abHTML(abText(c, lang)), [c, lang])
  const m = maxCopiesC(c), isAb = c.t === 'Ability'
  const open = () => { hidePop(); a.openModal(c.id, list || (mode === 'pick' ? null : a.getCurList())) }
  const stop = (f: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); f() }
  return (
    <article className={`gc t-${tier(c)} fc-${FAC[c.f]?.cls || 'Neutral'}` + (inDeck ? ' in-deck' : '') + (block ? ' blk' : '')}
      data-id={c.id} data-indeck={inDeck ? '×' + inDeck : undefined} tabIndex={0}
      role={mode === 'pick' ? 'button' : undefined} aria-label={mode === 'pick' ? `เพิ่ม ${c.n} ลงเดค` : undefined}
      onClick={e => { if ((e.target as Element).closest('a')) return; if (mode === 'pick') a.addToDeck(c.id); else open() }}
      onKeyDown={mode === 'pick' ? e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); a.addToDeck(c.id) } } : undefined}>
      <div className="gc-in">
        <CardArt c={c} pri={pri}>
          <div className={'gc-pow' + (c.t === 'Unit' ? '' : ' sym')} title={c.t === 'Unit' ? 'พลัง' : c.t}><b>{powSym(c)}</b></div>
          {c.ar ? <div className="gc-armor" title="เกราะ">🛡{c.ar}</div> : null}
          <div className={`gc-gem r-${c.r}`} title={c.r} />
          {starred && <div className="gc-star" aria-label="ปักดาวแล้ว">★</div>}
          <div className="gc-acts">
            <button type="button" data-act="star" data-id={c.id} aria-pressed={starred} title={starred ? 'เอาดาวออก' : 'ปักดาว'} onClick={stop(() => a.toggleStar(c.id))}>{starred ? '★' : '☆'}</button>
            {mode === 'pick'
              ? <button type="button" data-open={c.id} title="เปิดการ์ดใบใหญ่" aria-label={`เปิดการ์ด ${c.n} ใบใหญ่`} onClick={stop(open)}>🔍</button>
              : !isAb && <button type="button" data-act="own-q" data-id={c.id} title="มีแล้ว (กดวนจำนวน)" onClick={stop(() => a.cycleOwn(c.id))}>✓</button>}
            <button type="button" className="add" data-act="add" data-id={c.id} title="ใส่เดค" aria-label={`เพิ่ม ${c.n} ลงเดค`} onClick={stop(() => a.addToDeck(c.id))}>+</button>
          </div>
          <div className="gc-prov" title={isAb ? 'provision ที่ leader เพิ่ม' : 'provision'}><b>{isAb ? '+' + c.v : c.v}</b></div>
          <div className="gc-name"><span className="name">{c.n}</span><small>{cardSub(c)}{c.f2 && FAC[c.f2] ? ' · + ' + FAC[c.f2].th : ''}</small></div>
        </CardArt>
        <div className="gc-body">
          <div className="gc-ab ab" dangerouslySetInnerHTML={{ __html: ab }} />
          {block && <div className="gc-blk">⛔ {block}</div>}
          <div className="gc-foot">
            {!isAb && <button type="button" className={'own ' + (owned >= m ? 'full' : owned ? 'part' : 'none')} data-act="own" data-id={c.id} aria-pressed={owned >= m} title="กดวนเปลี่ยนจำนวนที่มี" onClick={stop(() => a.cycleOwn(c.id))}>{owned >= m ? '✓ ' : ''}มี {owned}/{m}</button>}
            {hasTip(c.id) && <span className="tipb" title="มีทริกเฉพาะใบ">💡</span>}
            <span className="craft" title="ค่าคราฟต์ (scraps)">{c.cc ? '⚒ ' + c.cc : '—'}</span>
          </div>
        </div>
      </div>
    </article>
  )
})
