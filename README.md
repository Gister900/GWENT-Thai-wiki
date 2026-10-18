# GWENT-Thai-wiki

คลังการ์ด GWENT ภาษาไทย ทำโดยแฟน · A Thai-language GWENT card library made by a fan.

**เว็บ: https://&lt;user&gt;.github.io/GWENT-Thai-wiki/** _(placeholder — ใส่ลิงก์จริงหลังเปิด GitHub Pages)_

> **This is an unofficial fan work and is not approved/endorsed by CD PROJEKT RED.**
> เว็บนี้เป็นผลงานแฟนที่ไม่เป็นทางการ ไม่ได้รับการอนุมัติหรือรับรองจาก CD PROJEKT RED

![หน้าแรก](docs/home.jpg)

## ทำอะไรได้บ้าง
- **ค้นการ์ดทั้ง 1,260 ใบ** ด้วยชื่อ ความสามารถ หรือแท็ก ได้ทั้งภาษาไทยและอังกฤษ · กรองตามฝ่าย ประเภท ความหายาก provision
- **ข้อความการ์ดภาษาไทย** พร้อมคำอธิบายคีย์เวิร์ด · การ์ดที่เล่นคู่กัน · token ที่เกี่ยวข้อง · ทริกจากผู้เล่น (มีลิงก์แหล่งที่มา)
- **หน้าฝ่ายและแนวเดค** สรุปจุดเด่นแต่ละฝ่ายพร้อมการ์ดหลัก
- **จัดเดค** เช็กกติกา (25 ใบ · ยูนิต 13 · provision) และแนะนำการ์ดที่เข้ากับเดค
- **ติ๊กคอลเลกชัน + แผนคราฟต์** บอกว่าต้องใช้ scraps เท่าไหร่ · export/import ไฟล์ได้
- ใช้ได้ทั้งมือถือและคอม · ข้อมูลที่ติ๊กเก็บในเบราว์เซอร์ของคุณเท่านั้น · ไม่มีโฆษณา

![modal การ์ด](docs/modal.jpg)

**English:** search all 1,260 collectible cards (Thai or English), read Thai card text with keyword help, card pairings and community tips, browse factions and deck archetypes, build decks with rule checks and suggestions, and track your collection with a crafting plan. Everything you save stays in your own browser. No ads.

## เครดิต / Credits
- ข้อมูลการ์ด: [gwent.one API](https://api.gwent.one/)
- รูปการ์ด: [playgwent.com](https://www.playgwent.com/) (เว็บทางการของ CD PROJEKT RED) · ภาพ token บางใบจาก gwent.one
- ข้อความการ์ดภาษาไทยแปลโดย AI ไม่ใช่คำแปลทางการ อาจคลาดเคลื่อนได้ (Thai card text is machine-translated, not official)
- ทริกและแนวเดคมีลิงก์แหล่งที่มากำกับไว้ในแต่ละข้อ
- GWENT® and The Witcher® are trademarks of CD PROJEKT S.A. · GWENT และ The Witcher เป็นเครื่องหมายการค้าของ CD PROJEKT

## วิธี build / Build
ต้องมี Node.js 22 ขึ้นไป

```
npm install
npm run build:web        # dist/ เว็บปกติ · ตั้ง base: BASE=/GWENT-Thai-wiki/ npm run build:web
npm run build:single     # dist-single/GWENT-Thai-wiki.html ไฟล์เดียว เปิดจาก file:// ได้ (รูปการ์ดดึงจากเน็ต)
npm run dev              # dev server http://localhost:5190
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm test` | unit test ของ `src/lib` (vitest) |
| `npm run e2e` | Playwright บนไฟล์ `dist-single/GWENT-Thai-wiki.html` (build ก่อน · ต้องมี chromium: `npx playwright install chromium`) |
| `npm run e2e:web` | build เว็บด้วย `BASE=/GWENT-Thai-wiki/` แล้ว serve `dist/` ใต้ path นั้นเหมือน GitHub Pages · เช็กว่ารูปการ์ดมาจาก `art/` ของเว็บเอง ไม่มี 404 และไม่ดึงรูปจาก playgwent/gwent.one (ยกเว้น token ที่ไม่มีไฟล์ในเว็บ) |
| `npm run data` | สร้าง `src/data/*.json` จาก `data/` ใหม่ (**ต้องมีไฟล์ข้อมูลดิบใน `data/raw/` ซึ่งไม่ได้รวมไว้ใน repo นี้** + Python 3 · ไฟล์ที่สร้างแล้ว commit ไว้ build ปกติไม่ต้องใช้) |
| `npm run art` / `npm run art:refresh` | เช็ก/ดาวน์โหลดรูปการ์ดลง `.cache/art/` (**ต้องมีไฟล์ข้อมูลดิบใน `data/raw/` ซึ่งไม่ได้รวมไว้ใน repo นี้** + venv `.venv` ที่ติดตั้ง Pillow) |
| `npm run art:web` | แปลงรูปใน `.cache/art/` (จาก `npm run art`) เป็น webp กว้าง 376px ขนาดเดียวใน `public/art/l/` (ต้องมี `.venv` ที่ติดตั้ง Pillow · รูปที่แปลงแล้ว commit ไว้ build ปกติไม่ต้องใช้) |

เว็บบน GitHub Pages build ด้วย `.github/workflows/pages.yml` ทุกครั้งที่ push เข้า `main` ใช้เฉพาะข้อมูลและรูปที่ commit ไว้ ไม่ดึงอะไรจากเว็บการ์ด

## License
โค้ดของโปรเจกต์นี้ใช้ [MIT License](LICENSE) **เฉพาะโค้ดเท่านั้น**

ข้อมูลการ์ด ชื่อ ข้อความ รูปการ์ด สัญลักษณ์ฝ่าย และทุกอย่างของ GWENT / The Witcher (รวมไฟล์ใน `data/raw/`, `src/data/`, `public/art/`) เป็นของ CD PROJEKT RED **ไม่อยู่ใต้ license นี้** ใช้ในฐานะแฟนคอนเทนต์ตาม [กติกาแฟนคอนเทนต์ของ CD PROJEKT RED](https://cdprojektred.com/fan-content)

The MIT license covers the code only. GWENT card data and images belong to CD PROJEKT RED and are not covered by it.
