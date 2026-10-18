export const FAC: Record<string, { th: string; ab: string; cls: string }> = {
  'Monster': { th: 'Monsters', ab: 'M', cls: 'Monster' },
  'Nilfgaard': { th: 'Nilfgaard', ab: 'Ni', cls: 'Nilfgaard' },
  'Northern Realms': { th: 'Northern Realms', ab: 'NR', cls: 'NorthernRealms' },
  'Scoiatael': { th: "Scoia'tael", ab: 'ST', cls: 'Scoiatael' },
  'Skellige': { th: 'Skellige', ab: 'Sk', cls: 'Skellige' },
  'Syndicate': { th: 'Syndicate', ab: 'Sy', cls: 'Syndicate' },
  'Neutral': { th: 'Neutral', ab: 'N', cls: 'Neutral' },
}
export const FAC_ORDER = Object.keys(FAC)

/** [headline, keyword line (HTML)] per faction, overview tab */
export const FAC_DESC: Record<string, [string, string]> = {
  'Monster': ['เน้นยูนิตตัวใหญ่ ใช้พลังของตัวเองเป็นเงื่อนไข', "<span class='kw'>Thrive</span> โตตามยูนิตที่ใหญ่กว่า · <span class='kw'>Consume</span> กินยูนิตอื่นเอาพลัง · <span class='kw'>Deathwish</span> ทำงานตอนตาย · <span class='kw'>Dominance</span> ได้ผลถ้ามียูนิตพลังสูงสุดบนกระดาน · สาย Wild Hunt, Vampire, Insectoid"],
  'Nilfgaard': ['ควบคุมและก่อกวน เล่นด้วยการ์ดของฝ่ายตรงข้าม', "<span class='kw'>Lock</span> ปิดความสามารถ · <span class='kw'>Seize</span> ขโมยยูนิต · <span class='kw'>Poison</span> · <span class='kw'>Assimilate</span> โตเมื่อเล่นการ์ดที่ไม่ได้อยู่ในเด็คตั้งต้น · ยูนิต Spying ไปวางฝั่งศัตรู · สาย Soldier/Officer"],
  'Northern Realms': ['ทัพมนุษย์ เน้นยูนิตที่สั่ง Order ซ้ำๆ และบัฟกันเอง', "<span class='kw'>Charge</span> สั่ง Order ได้หลายครั้ง · <span class='kw'>Zeal</span> · <span class='kw'>Inspired</span> · <span class='kw'>Formation</span> · <span class='kw'>Crew</span> ลูกเรือเสริมเครื่องจักรล้อมเมือง · ใช้ Armor และ Boost เยอะ"],
  'Scoiatael': ['เอลฟ์/คนแคระ/ดรายแอด เน้นเคลื่อนย้ายและซุ่มโจมตี', "<span class='kw'>Harmony</span> โตเมื่อลงหมวดใหม่ · <span class='kw'>Ambush</span> วางคว่ำแล้วเปิดทีหลัง · <span class='kw'>Symbiosis</span> ทำงานกับการ์ดธรรมชาติ · เน้นการ Move ยูนิต และ tempo"],
  'Skellige': ['นักรบเกาะ เลือดร้อน ทำร้ายตัวเองเพื่อแรง และใช้สุสาน', "<span class='kw'>Bloodthirst</span> แรงขึ้นตามยูนิตศัตรูที่บาดเจ็บ · <span class='kw'>Berserk</span> แปลงร่างเมื่อพลังต่ำ · Discard แล้วชุบ (Resurrect) จากสุสาน · ยิง Damage ใส่ตัวเอง"],
  'Syndicate': ['แก๊งโนวิกราด เล่นด้วยเหรียญ (Coin)', "<span class='kw'>Profit</span> ได้เหรียญ · <span class='kw'>Tribute</span> จ่ายเหรียญตอนลงการ์ด · <span class='kw'>Fee</span> จ่ายเหรียญใช้ความสามารถซ้ำ · <span class='kw'>Hoard</span> ได้ผลถ้ามีเหรียญถึง · <span class='kw'>Insanity</span> · การ์ด Crime/Bounty"],
  'Neutral': ['การ์ดกลางที่ทุกฝ่ายใส่เด็คได้', 'การ์ดแก้ทาง (tech) และยูนิตทองดังๆ เช่น เหล่า Witcher (Geralt, Ciri, Yennefer) · special แบบล้างแถว/สภาพอากาศ · Artifact และ Stratagem ส่วนใหญ่อยู่ที่นี่'],
}
export const TYPE: Record<string, string> = { 'Unit': 'Unit (ยูนิต)', 'Special': 'Special (การ์ดพิเศษ)', 'Artifact': 'Artifact (อาร์ติแฟกต์)', 'Stratagem': 'Stratagem (สตราตาเจม)', 'Ability': 'Leader Ability (ผู้นำ)' }
export const COL: Record<string, { t: string; i: string }> = { 'Bronze': { t: 'Bronze', i: '●' }, 'Gold': { t: 'Gold', i: '◆' }, 'Leader': { t: 'Leader', i: '♛' } }
export const RAR: Record<string, string> = { 'Common': 'Common', 'Rare': 'Rare', 'Epic': 'Epic', 'Legendary': 'Legendary' }

export const TOAST_MS = 2600
export const DEBOUNCE_MS = 120
