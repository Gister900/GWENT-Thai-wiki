import { FAC } from '../lib/constants'

/** faction shield in the faction colour with its short letters */
export function FI({ f }: { f: string }) {
  const d = FAC[f]; if (!d) return null
  return <span className={`fi fc-${d.cls}`} aria-hidden="true">{d.ab}</span>
}
