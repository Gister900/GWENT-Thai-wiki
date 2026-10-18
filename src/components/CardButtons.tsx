import type { Card } from '../types'
import { maxCopiesC } from '../lib/collection'
import { useActions } from '../store'

export const starTxt = (on: boolean) => (on ? '★ ปักดาวแล้ว' : '☆ ปักดาว')

export function StarButton({ id, starred, cls }: { id: number; starred: boolean; cls: string }) {
  const a = useActions()
  return <button type="button" className={cls} data-act="star" data-id={id} aria-pressed={starred} onClick={e => { e.stopPropagation(); a.toggleStar(id) }}>{starTxt(starred)}</button>
}

/** "มี n/m" — press to cycle owned copies 0 → max → 0 (hidden for leader abilities) */
export function OwnButton({ c, n, cls }: { c: Card; n: number; cls: string }) {
  const a = useActions()
  if (c.t === 'Ability') return null
  const m = maxCopiesC(c)
  return <button type="button" className={cls} data-act="own" data-id={c.id} aria-pressed={n >= m} title="กดวนเปลี่ยนจำนวนที่มี" onClick={e => { e.stopPropagation(); a.cycleOwn(c.id) }}>{n >= m ? '✓ ' : ''}มี {n}/{m}</button>
}
