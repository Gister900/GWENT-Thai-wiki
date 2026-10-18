import type { ReactNode } from 'react'
import { useActions } from '../../store'

/** small breadcrumb above sub-pages of "การ์ด": การ์ด › here */
export function Crumbs({ here }: { here: ReactNode }) {
  const a = useActions()
  return <nav className="crumbs" aria-label="ตำแหน่งในหน้า">
    <button type="button" data-crumb="home" onClick={() => a.showCards({ v: 'home' })}>การ์ด</button><span aria-hidden="true">›</span><b>{here}</b>
  </nav>
}
