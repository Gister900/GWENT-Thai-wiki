import { useT } from '../i18n/useT'

/** "Sources: url · url" line under tips */
export function SourceLinks({ arr }: { arr?: string[] }) {
  const T = useT()
  if (!arr || !arr.length) return null
  return <div className="srcs">{T.card.sources} {arr.map((u, i) => <span key={i}>{i > 0 && ' · '}<a href={u} target="_blank" rel="noopener">{u}</a></span>)}</div>
}
