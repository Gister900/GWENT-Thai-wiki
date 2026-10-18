// Site footer (end of every page) + a short "About" dialog: the fan-content disclaimer CD PROJEKT RED asks for
// (https://cdprojektred.com/fan-content — exact English sentence + Thai translation), credits and trademarks.
import { useRef, type MouseEvent } from 'react'

/** build:web hosts its own images · build:single loads them from the card sites (needs internet) */
const LOCAL_ART = typeof __LOCAL_ART__ !== 'undefined' && __LOCAL_ART__

/** the wording CD PROJEKT RED's fan content guidelines require — keep it exactly as it is */
export const DISCLAIMER_EN = 'This is an unofficial fan work and is not approved/endorsed by CD PROJEKT RED.'
const DISCLAIMER_TH = 'เว็บนี้เป็นผลงานแฟนที่ไม่เป็นทางการ ไม่ได้รับการอนุมัติหรือรับรองจาก CD PROJEKT RED'
const TM = 'GWENT® and The Witcher® are trademarks of CD PROJEKT S.A. · GWENT และ The Witcher เป็นเครื่องหมายการค้าของ CD PROJEKT'

export function SiteFooter() {
  const dlg = useRef<HTMLDialogElement>(null)
  // a click on the dialog's own padding / the gaps between paragraphs also has target === the dialog,
  // so close only when the click lands outside its box (= on the backdrop).
  const closeOnBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    const d = dlg.current; if (!d || e.target !== d) return
    const r = d.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close()
  }
  return <footer className="foot" id="siteFoot">
    <p lang="en"><b>{DISCLAIMER_EN}</b></p>
    <p>{DISCLAIMER_TH}</p>
    <p>ข้อมูลการ์ดจาก gwent.one API · รูปการ์ดจาก playgwent.com · ข้อมูลและภาพการ์ดเป็นของ CD PROJEKT RED · {' '}
      <button type="button" className="about-link" id="aboutOpen" onClick={() => dlg.current?.showModal()}>เกี่ยวกับเว็บนี้ / About</button></p>
    <dialog ref={dlg} className="about" id="aboutDlg" aria-labelledby="aboutTitle" onClick={closeOnBackdrop}>
      <h2 id="aboutTitle">เกี่ยวกับ GWENT-Thai-wiki</h2>
      <p>คลังการ์ด GWENT ภาษาไทยที่แฟนทำขึ้น ค้นการ์ด อ่านความสามารถเป็นภาษาไทย จัดเดค ติ๊กคอลเลกชัน และวางแผนคราฟต์ ข้อมูลทั้งหมดของผู้ใช้เก็บในเบราว์เซอร์ของตัวเอง ไม่มีการส่งออกไปที่ไหน ไม่มีโฆษณา</p>
      <p lang="en">A Thai-language GWENT card library made by a fan: card search with Thai text, deck builder, collection tracker and crafting plan. No ads, not for profit.</p>
      <h3>Disclaimer</h3>
      <p lang="en"><b>{DISCLAIMER_EN}</b></p>
      <p>{DISCLAIMER_TH}</p>
      <p>{TM}</p>
      <h3>เครดิต / Credits</h3>
      <ul>
        <li>ข้อมูลการ์ด: <a href="https://api.gwent.one/" target="_blank" rel="noopener">gwent.one API</a></li>
        <li>รูปการ์ด: <a href="https://www.playgwent.com/" target="_blank" rel="noopener">playgwent.com</a> (เว็บทางการของ CD PROJEKT RED) · ภาพ token บางใบจาก gwent.one{!LOCAL_ART && ' · ไฟล์เดียวนี้ดึงรูปการ์ดจากเว็บดังกล่าว ต้องต่อเน็ตถึงจะเห็นรูป'}</li>
        <li>ข้อความการ์ดภาษาไทยแปลโดย AI ไม่ใช่คำแปลทางการ อาจคลาดเคลื่อนได้</li>
        <li>ทริกและแนวเดคมีลิงก์แหล่งที่มากำกับไว้ในแต่ละข้อ</li>
      </ul>
      <form method="dialog"><button type="submit" className="about-close">ปิด / Close</button></form>
    </dialog>
  </footer>
}
