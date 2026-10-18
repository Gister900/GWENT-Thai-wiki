/** "แหล่งที่มา: url · url" line under tips */
export function SourceLinks({ arr }: { arr?: string[] }) {
  if (!arr || !arr.length) return null
  return <div className="srcs">แหล่งที่มา: {arr.map((u, i) => <span key={i}>{i > 0 && ' · '}<a href={u} target="_blank" rel="noopener">{u}</a></span>)}</div>
}
