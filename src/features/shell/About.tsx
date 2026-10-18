// Site footer (end of every page) + a short "About" dialog: the fan-content disclaimer CD PROJEKT RED asks for
// (https://cdprojektred.com/fan-content — exact English sentence + Thai translation), credits and trademarks.
import { useRef, type MouseEvent } from 'react'
import { useT } from '../../i18n/useT'

/** build:web hosts its own images · build:single loads them from the card sites (needs internet) */
const LOCAL_ART = typeof __LOCAL_ART__ !== 'undefined' && __LOCAL_ART__

/** the wording CD PROJEKT RED's fan content guidelines require — keep it exactly as it is */
export const DISCLAIMER_EN = 'This is an unofficial fan work and is not approved/endorsed by CD PROJEKT RED.'
// Thai translation of the disclaimer, trademark line and the rest of the text: src/i18n/ui.ts (foot) · English mode shows no Thai

export function SiteFooter() {
  const dlg = useRef<HTMLDialogElement>(null); const T = useT().foot
  // a click on the dialog's own padding / the gaps between paragraphs also has target === the dialog,
  // so close only when the click lands outside its box (= on the backdrop).
  const closeOnBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    const d = dlg.current; if (!d || e.target !== d) return
    const r = d.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close()
  }
  return <footer className="foot" id="siteFoot">
    <p lang="en"><b>{DISCLAIMER_EN}</b></p>
    {T.disclaimer && <p>{T.disclaimer}</p>}
    {T.mt && <p id="mtNote">{T.mt}</p>}
    <p>{T.credit}{' '}
      <button type="button" className="about-link" id="aboutOpen" onClick={() => dlg.current?.showModal()}>{T.about}</button></p>
    <dialog ref={dlg} className="about" id="aboutDlg" aria-labelledby="aboutTitle" onClick={closeOnBackdrop}>
      <h2 id="aboutTitle">{T.aboutTitle}</h2>
      <p>{T.aboutText}</p>
      {T.disclaimer ? <p lang="en">A fan-made GWENT card library in English and Thai: card search, deck builder, collection tracker and crafting plan. No ads, not for profit.</p> : <p>{T.mt}</p>}
      <h3>Disclaimer</h3>
      <p lang="en"><b>{DISCLAIMER_EN}</b></p>
      {T.disclaimer && <p>{T.disclaimer}</p>}
      <p>{T.tm}</p>
      <h3>{T.credits}</h3>
      <ul>
        <li>{T.cData} <a href="https://api.gwent.one/" target="_blank" rel="noopener">gwent.one API</a></li>
        <li>{T.cArt} <a href="https://www.playgwent.com/" target="_blank" rel="noopener">playgwent.com</a>{T.cArtNote}{!LOCAL_ART && T.cOnline}</li>
        <li>{T.cAi}</li>
        <li>{T.cTips}</li>
      </ul>
      <form method="dialog"><button type="submit" className="about-close">{T.close}</button></form>
    </dialog>
  </footer>
}
