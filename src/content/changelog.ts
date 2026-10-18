// "What's new" — newest first. Every change people can see goes here (CONTRIBUTING.md), in Thai and English,
// written as what changed for the user, not how the code changed. `version` must be unique: the newest version
// the user has seen is kept in localStorage gwent-seen-changelog (dot on the guide menu until they look).
export interface ChangeEntry { version: string; date: string; th: string[]; en: string[] }

export const CHANGELOG: ChangeEntry[] = [
  {
    version: '1.1', date: '2026-10-18',
    th: [
      'โลโก้ใหม่ของเว็บ (โล่ตัว G) ทั้งในแถบข้าง หัวหน้าแรก และไอคอนแท็บเบราว์เซอร์',
      'เก็บได้หลายเดค: สร้าง สลับ ทำสำเนา เปลี่ยนชื่อ และลบ ได้จากหัวหน้าจัดเดคและกล่องเดคในแถบข้าง (เดคเดิมย้ายมาเป็น "เดค 1" ให้อัตโนมัติ)',
      'Export / Import เดคเป็นไฟล์ .json ทั้งเดคเดียวหรือทุกเดค ไฟล์ที่นำเข้าจะถูกตรวจกติกาก่อน และเพิ่มเป็นเดคใหม่เสมอ',
      'แชร์เดคเป็นลิงก์: กด "คัดลอกลิงก์เดค" แล้วส่งให้เพื่อน คนเปิดลิงก์จะเห็นพรีวิวและเลือกนำเข้าได้',
      'หน้า "วิธีใช้" อธิบายทุกส่วนของเว็บ พร้อมคีย์ลัดทั้งหมด และส่วน "มีอะไรใหม่" นี้',
      'หัวหน้าแรกใหม่ พร้อมชื่อเว็บและคำโปรยสองภาษา',
      'เปิดเว็บหลายแท็บพร้อมกันได้อย่างปลอดภัย: เดค คอลเลกชัน และดาว ที่แก้ในแท็บหนึ่งจะขึ้นในแท็บอื่นทันทีและไม่ถูกเขียนทับ แต่ละแท็บเปิดดูคนละเดคได้ ถ้าเดคที่เปิดอยู่ถูกลบในอีกแท็บ จะสลับไปเดคอื่นพร้อมแจ้งเตือน',
      'ถ้าบันทึกลงเบราว์เซอร์ไม่สำเร็จ (เช่น พื้นที่เต็ม) จะมีข้อความเตือน สิ่งที่แก้ยังอยู่บนจอ และจะถูกบันทึกพร้อมการแก้ครั้งถัดไปเมื่อบันทึกได้ · Import คอลเลกชันแทนที่ด้วยค่าในไฟล์ทั้งหมดเสมอ · ไฟล์เดคที่มาจากเวอร์ชันที่ไม่รู้จักหรือมีเกิน 200 เดคจะไม่ถูกนำเข้า',
    ],
    en: [
      'New site logo (a G shield) in the sidebar, on the home header and as the browser tab icon',
      'Several decks: create, switch, duplicate, rename and delete them from the deck builder header and the sidebar deck box (your old deck moves in as "Deck 1" automatically)',
      'Export / import decks as a .json file, one deck or all of them; imported files are checked against the rules and always added as new decks',
      'Share a deck as a link: press "Copy deck link" and send it; whoever opens it sees a preview and can import it',
      'A "Guide" page that explains every part of the site, lists all keyboard shortcuts, and holds this "What\'s new" list',
      'New home header with the site name and a short tagline',
      'Safe to keep the site open in several tabs: decks, collection and stars changed in one tab show up in the others right away and are never overwritten; each tab can show a different deck, and if the open deck is deleted in another tab, the tab switches to another deck and tells you',
      'A warning appears when the browser refuses to save (for example, storage is full); your changes stay on screen and are saved with your next change once saving works again · importing a collection always replaces it with exactly what is in the file · deck files from an unknown version or with more than 200 decks are not imported',
    ],
  },
  {
    version: '1.0', date: '2026-10-18',
    th: [
      'เปิดตัว GWENT-Thai-wiki: คลังการ์ด GWENT ทั้ง 1,260 ใบ ค้นได้ด้วยชื่อ ความสามารถ หรือแท็ก ทั้งภาษาไทยและอังกฤษ',
      'ข้อความการ์ดภาษาไทย (แปลโดย AI) พร้อมคำอธิบายคีย์เวิร์ด การ์ดที่เล่นคู่กัน token ที่เกี่ยวข้อง และทริกจากผู้เล่นพร้อมแหล่งที่มา',
      'หน้าแรกการ์ด: ไทล์ 7 ฝ่าย แถวการ์ดที่ดูล่าสุด ปักดาว และการ์ดที่มีทริก · หน้าฝ่าย · ดูทั้งหมดพร้อมแผงตัวกรอง',
      'การ์ดใบใหญ่: เลื่อนดูใบก่อน/ถัดไป และกดลิงก์การ์ดในนั้นแล้วย้อนกลับได้ (ปุ่มกลับ · breadcrumb · คีย์ลัด)',
      'จัดเดคพร้อมเช็กกติกา (25 ใบ · ยูนิต 13 · provision) การ์ดแนะนำให้เพิ่ม และแผนคราฟต์ตาม scraps ที่มี',
      'ติ๊กคอลเลกชันและ export/import เป็นไฟล์ · หน้าฝ่ายและแนวเดค',
      'สลับภาษาไทย/อังกฤษได้ทั้งเว็บ · ใช้ได้ทั้งมือถือและคอม · แถบข้างพับเหลือไอคอนได้',
    ],
    en: [
      'Launch of GWENT-Thai-wiki: all 1,260 GWENT cards, searchable by name, ability or tag in Thai or English',
      'Thai card text (AI-translated) with keyword help, card pairings, related tokens and community tips with sources',
      'Cards home: 7 faction tiles, rows of recently viewed, starred and tipped cards · faction pages · all cards with a filter panel',
      'Big card view: step to the previous/next card, follow card links inside it and go back (back button · breadcrumb · shortcuts)',
      'Deck builder with rule checks (25 cards · 13 units · provision), suggested cards and a crafting plan for your scraps',
      'Collection tracking with file export/import · factions and deck styles page',
      'Switch the whole site between Thai and English · works on phones and desktops · the sidebar can collapse to icons',
    ],
  },
]

export const NEWEST = CHANGELOG[0].version
/** true when there is an entry newer than the one the user saw last (never seen = true) */
export const hasNews = (seen: string | null) => seen !== NEWEST
