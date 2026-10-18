import type { ReactNode } from 'react'
import { useActions } from '../../store'
import { useT } from '../../i18n/useT'

/** small breadcrumb above sub-pages of "การ์ด": การ์ด › here */
export function Crumbs({ here }: { here: ReactNode }) {
  const a = useActions(); const T = useT().crumbs
  return <nav className="crumbs" aria-label={T.aria}>
    <button type="button" data-crumb="home" onClick={() => a.showCards({ v: 'home' })}>{T.cards}</button><span aria-hidden="true">›</span><b>{here}</b>
  </nav>
}
