// Virtual card grid: only the rows on screen (plus a few above/below) are in the DOM.
// The page itself scrolls (window virtualizer). The column count is read from a hidden .grid probe,
// so it follows the same CSS as the plain grid (auto-fill minmax(--card-min) on desktop · 2 columns on the phone).
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'

interface Props<T> {
  items: T[]
  /** row = 0 for the first row (its images get fetchpriority="high") */
  render: (it: T, row: number) => ReactNode
  id?: string
  /** rows kept rendered above and below the screen */
  overscan?: number
}

/** last measured row height (shared, so a new grid starts from a good estimate) */
let lastRowH = 420

export function VGrid<T>({ items, render, id, overscan = 3 }: Props<T>) {
  const wrap = useRef<HTMLDivElement>(null), probe = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(0), [gap, setGap] = useState(0), [margin, setMargin] = useState(0), [est, setEst] = useState(lastRowH)

  useLayoutEffect(() => {
    const el = probe.current!
    const upd = () => {
      const cs = getComputedStyle(el)
      const n = el.clientWidth ? cs.gridTemplateColumns.split(' ').filter(s => s && s !== 'none').length : 0
      setCols(n); setGap(parseFloat(cs.rowGap) || 0)
    }
    upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect()
  }, [])
  // where the grid starts on the page (things above it can change height: chips, sections)
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return
    const m = Math.round(el.getBoundingClientRect().top + scrollY); if (m !== margin) setMargin(m)
  })

  const rows = cols ? Math.ceil(items.length / cols) : 0
  const v = useWindowVirtualizer({ count: rows, estimateSize: useCallback(() => est, [est]), overscan, scrollMargin: margin, gap })
  // first measured row → better estimate for the rows not measured yet (keeps the scrollbar steady)
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    v.measureElement(el)
    const h = Math.round(el.getBoundingClientRect().height); if (h > 0) { lastRowH = h; if (el.dataset.index === '0') setEst(e => (Math.abs(e - h) > 2 ? h : e)) }
  }, [v])

  return (
    <div id={id} className="vgrid" ref={wrap} style={{ height: rows ? v.getTotalSize() : 0 }}>
      <div className="grid vprobe" ref={probe} aria-hidden="true" />
      {cols > 0 && v.getVirtualItems().map(r => (
        <div key={r.key} data-index={r.index} ref={measure} className="grid vrow"
          style={{ transform: `translateY(${r.start - margin}px)`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.slice(r.index * cols, r.index * cols + cols).map(it => render(it, r.index))}
        </div>
      ))}
    </div>
  )
}
