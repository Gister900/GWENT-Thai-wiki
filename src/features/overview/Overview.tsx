import { memo } from 'react'
import { FAC, FAC_DESC, FAC_ORDER } from '../../lib/constants'
import { ARCH, CARDS, KW, META, getCard } from '../../lib/data'
import { FI } from '../../components/FactionIcon'
import { SourceLinks } from '../../components/SourceLinks'
import { useActions } from '../../store'
import type { Archetype } from '../../types'

const RULES = <div className="panel rules">
  <h3>กติกาหลัก</h3>
  <ul>
    <li><b>แข่ง 3 รอบ ชนะ 2 รอบ</b> — ทุกรอบผลัดกันลงการ์ดทีละใบ ใครพลัง (power) รวมบนกระดานสูงกว่าตอนจบรอบชนะรอบนั้น ผู้เล่นกด <b>Pass</b> เมื่อไม่อยากลงการ์ดเพิ่มในรอบนั้นแล้ว พอทั้งคู่ pass รอบก็จบ แล้วกระดานถูกล้าง</li>
    <li><b>มือการ์ดไม่เติมทุกเทิร์น</b> — เริ่มเกมจั่ว 10 ใบ ต้นรอบ 2 และรอบ 3 จั่วเพิ่ม 3 ใบ (มือเต็มได้ 10 ใบ) จึงเป็นเกมบริหาร "จำนวนการ์ด" ข้ามรอบ บางทีแพ้รอบแรกโดยเสียการ์ดน้อยกว่าคุ้มกว่า มีสิทธิ์ mulligan เปลี่ยนการ์ดในมือก่อนเริ่มแต่ละรอบ</li>
    <li><b>Provision (งบประมาณเด็ค)</b> — การ์ดทุกใบมีค่า provision เด็คมีงบ 150 บวกโบนัสจาก Leader Ability (ประมาณ 14–18) การ์ดยิ่งแรงยิ่งแพง เด็คต้องมีอย่างน้อย 25 ใบ และเป็นยูนิตอย่างน้อย 13 ใบ</li>
    <li><b>Bronze / Gold</b> — การ์ด Bronze ใส่ได้ใบละ 2 ก๊อป การ์ด Gold ใส่ได้ใบละ 1 ก๊อป</li>
    <li><b>กระดานฝั่งละ 2 แถว</b> — แถว Melee และแถว Ranged แถวละไม่เกิน 9 ยูนิต การ์ดหลายใบมีผลตามแถวหรือตามตำแหน่งที่อยู่ติดกัน</li>
    <li><b>ประเภทการ์ด</b> — <span className="kw">Unit</span> ยูนิตที่มีพลังวางบนกระดาน · <span className="kw">Special</span> การ์ดเวท/เหตุการณ์ใช้แล้วหายไป · <span className="kw">Artifact</span> วางบนกระดานแบบไม่มีพลัง ให้ผลต่อเนื่อง · <span className="kw">Stratagem</span> การ์ดที่เริ่มอยู่บนกระดานของผู้เล่นที่เล่นทีหลัง (ชดเชยการเล่นช้า) · <span className="kw">Leader Ability</span> ความสามารถผู้นำ เลือก 1 อันต่อเด็ค</li>
    <li><b>คีย์เวิร์ดที่เจอบ่อย</b> — <span className="kw">Deploy</span> ทำงานตอนลงการ์ด · <span className="kw">Order</span> กดสั่งใช้เองได้ · <span className="kw">Zeal</span> สั่ง Order ได้ทันทีเทิร์นที่ลง · <span className="kw">Boost</span> เพิ่มพลังชั่วคราว · <span className="kw">Strengthen</span> เพิ่มพลังฐาน · <span className="kw">Lock</span> ปิดความสามารถ · <span className="kw">Banish</span> ลบออกจากเกม</li>
  </ul>
</div>

/** one faction's deck styles (name, summary, keywords, key cards, tips, sources) — also used on the faction page */
export function ArchList({ arr }: { arr: Archetype[] }) {
  const a = useActions()
  return <div className="archs"><h4 className="archs-h">สไตล์เดค</h4>
    {arr.map((x, i) => <div className="arch" key={i}>
      <h4>{x.name}{x.name_th ? ' · ' + x.name_th : ''}</h4>
      {x.summary_th && <div className="asum">{x.summary_th}</div>}
      {(x.keywords || []).length > 0 && <div className="klinks">{x.keywords!.map((k, j) => KW[k] ? <button key={j} type="button" className="kwb kw" data-kw={k}>{k}</button> : <span key={j} className="kw">{k}</span>)}</div>}
      {(x.key_cards || []).length > 0 && <div className="klinks">การ์ดหลัก: {x.key_cards!.map(Number).filter(getCard).map((id, j) => <button key={j} type="button" className="klink" data-open={id} onClick={() => a.openModal(id, null)}>{getCard(id)!.n}</button>)}</div>}
      {(x.tips || []).length > 0 && <ul>{x.tips!.map((t, j) => <li key={j}>{t}</li>)}</ul>}
      <SourceLinks arr={x.sources} />
    </div>)}
  </div>
}

/** "ภาพรวมเกม & ฝ่าย" tab: rules + one box per faction with its deck archetypes */
export const Overview = memo(function Overview({ hidden }: { hidden: boolean }) {
  return (
    <section id="ov" className={'page s-ov' + (hidden ? ' hidden' : '')}>
      <div className="topbar"><div className="tb-row"><h1 className="page-title">ฝ่าย &amp; แนวเดค<small>กติกาหลัก · จุดเด่นของแต่ละฝ่าย · สไตล์เดคพร้อมการ์ดหลักและทริก</small></h1></div></div>
      <div className="ov-body">
      {RULES}
      <p className="hint src">ข้อมูลการ์ดจริงจาก <a href="https://api.gwent.one/" target="_blank" rel="noopener">api.gwent.one</a> เวอร์ชันเกม <b>{META.ver}</b> (แพตช์ล่าสุดที่ gwent.one มี ณ 18 ต.ค. 2026) · เฉพาะการ์ดที่สะสมได้ <b>{META.count}</b> ใบ (ไม่รวม token/การ์ดที่ถูกสร้างระหว่างเกม) · รูปการ์ดจาก playgwent.com (token บางใบจาก gwent.one) · ข้อความการ์ดภาษาไทยแปลโดย AI ไม่ใช่คำแปลทางการของ CD PROJEKT RED</p>
      <div className="ov-grid" id="fgrid">
        {FAC_ORDER.map(f => {
          const arr = (ARCH && ARCH[f]) || []
          return <div className={'panel ovf fc-' + FAC[f].cls} key={f}>
            <h3><FI f={f} /> {FAC[f].th}<span className="cnt">{CARDS.filter(c => c.f === f).length} ใบ</span></h3>
            <p><b>{FAC_DESC[f][0]}</b></p>
            <p dangerouslySetInnerHTML={{ __html: FAC_DESC[f][1] }} />
            {arr.length > 0 && <ArchList arr={arr} />}
          </div>
        })}
      </div>
      </div>
    </section>
  )
})
