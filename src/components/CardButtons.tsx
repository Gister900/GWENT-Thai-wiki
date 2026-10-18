import type { Card } from '../types'
import { maxCopiesC } from '../lib/collection'
import { useActions } from '../store'
import { useT } from '../i18n/useT'

export function StarButton({ id, starred, cls }: { id: number; starred: boolean; cls: string }) {
  const a = useActions(); const T = useT().card
  return <button type="button" className={cls} data-act="star" data-id={id} aria-pressed={starred} onClick={e => { e.stopPropagation(); a.toggleStar(id) }}>{starred ? T.starredBtn : T.starBtn}</button>
}

/** "มี n/m" — press to cycle owned copies 0 → max → 0 (hidden for leader abilities) */
export function OwnButton({ c, n, cls }: { c: Card; n: number; cls: string }) {
  const a = useActions(); const T = useT().card
  if (c.t === 'Ability') return null
  const m = maxCopiesC(c)
  return <button type="button" className={cls} data-act="own" data-id={c.id} aria-pressed={n >= m} title={T.ownCycle} onClick={e => { e.stopPropagation(); a.cycleOwn(c.id) }}>{n >= m ? '✓ ' : ''}{T.own(n, m)}</button>
}
