// รัน: npm run dev (อีกเทอร์มินัล) แล้ว npm run test:quote
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import JSZip from 'jszip'
import fs from 'node:fs'

const URL = (process.env.URL ?? 'http://localhost:5173') + '/#/quote'
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }
fs.mkdirSync('docs/quote', { recursive: true })
const img = fs.readFileSync('sample/background.jpg').toString('base64')

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1500, height: 2300 }, acceptDownloads: true })
const page = await ctx.newPage()
page.on('pageerror', e => { console.log('PAGEERROR', e.message); process.exitCode = 1 })
await page.goto(URL)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('[data-testid=qc-stage]')
const stage = page.locator('[data-testid=qc-stage]')
const S = () => page.evaluate(() => import('/src/quote/store.ts').then(m => ({ n: m.page.value.elements.length })))

// ฟังก์ชันช่วยที่รันในหน้า (ใช้ store ตัวเดียวกับแอป)
const put = (b64) => page.evaluate(async b64 => {
  const m = await import('/src/quote/store.ts')
  const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
  await m.dropImage(new File([a], 'x.jpg', { type: 'image/jpeg' }))
}, b64)
const dl = async (clickText) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), page.getByRole('button', { name: clickText }).click()])
  return fs.readFileSync(await d.path())
}
const png = b => PNG.sync.read(b)

// 1) คอนทราสต์ของ preset ทั้ง 6
const themes = await page.evaluate(async () => {
  const t = await import('/src/quote/theme.ts')
  return t.THEMES.map(x => ({ id: x.id, c: t.themeContrast(x), c2: Math.min(t.contrast(x.text2, x.bg1), t.contrast(x.text2, x.bg2)) }))
})
for (const t of themes) ok(t.c >= 4.5, `preset ${t.id} คอนทราสต์ข้อความหลัก ${t.c.toFixed(1)}:1`)

// 2) ทุก template x ทุก preset (เก็บ screenshot) + เนื้อหาไม่หายเมื่อเปลี่ยน template
const TPL = ['top-photo', 'arch', 'fade-bg', 'circle-left', 'text-only', 'split']
await page.locator('[data-tpl=top-photo]').click()
await put(img)
await page.getByTestId('text-main').waitFor({ state: 'detached' }).catch(() => {})
for (const t of TPL) {
  await page.locator(`[data-tpl=${t}]`).click()
  const kept = await page.evaluate(async () => { const m = await import('/src/quote/store.ts'); return m.page.value.elements.some(e => e.kind === 'image' && e.asset) })
  const text = await page.evaluate(async () => { const m = await import('/src/quote/store.ts'); return m.page.value.elements.find(e => e.slot === 'quote')?.text?.slice(0, 8) })
  ok(kept && text === 'ความสำเร', `template ${t}: รูปและข้อความยังอยู่หลังสลับ`)
  for (const th of themes) {
    await page.locator(`[data-theme=${th.id}]`).click()
    await page.waitForTimeout(150)
    await stage.screenshot({ path: `docs/quote/${t}__${th.id}.png` })
  }
}

// 3) auto-fit: ข้อความสั้น 10 ตัว และยาว 300 ตัว ไม่ล้นกรอบ
await page.locator('[data-tpl=text-only]').click()
for (const n of [10, 300]) {
  await page.evaluate(async n => {
    const m = await import('/src/quote/store.ts')
    m.page.value.elements.find(e => e.slot === 'quote').text = 'ก็ที่ปู่'.repeat(100).slice(0, n)
  }, n)
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => [...document.querySelectorAll('.qt')].map(q => { const i = q.querySelector('.qt-in'); return [i.offsetHeight, q.clientHeight, i.scrollWidth, q.clientWidth] }))
  ok(r.every(([ih, ch, sw, cw]) => ih <= ch + 1 && sw <= cw + 1), `auto-fit ข้อความ ${n} ตัวอักษรไม่ล้นกรอบ ${JSON.stringify(r[0])}`)
  await stage.screenshot({ path: `docs/quote/autofit-${n}.png` })
}
await page.evaluate(async () => { const m = await import('/src/quote/store.ts'); m.page.value.elements.find(e => e.slot === 'quote').text = 'ความสำเร็จไม่ใช่จุดหมายปลายทาง แต่คือการเดินทางที่เราไม่เคยหยุดเรียนรู้ ก็ที่นี่ผู้ปู่' })

// 4) export: ขนาด / alpha / ZIP
await page.locator('[data-tpl=arch]').click()
await page.locator('[data-theme=navy-gold]').click()
let sz = {}
for (const [id, w, h] of [['a4', 2480, 3508], ['a4_150', 1240, 1754], ['social', 1080, 1350]]) {
  await page.getByTestId('size').selectOption(id)
  const p = png(await dl('บันทึกหน้านี้'))
  sz[id] = p
  ok(p.width === w && p.height === h, `export ${id}: ${p.width}x${p.height}`)
  fs.writeFileSync(`docs/quote/export-${id}.png`, PNG.sync.write(p))
}
await page.getByTestId('size').selectOption('a4')
const tr = png(await dl('บันทึกพื้นโปร่งใส'))
const alpha = (x, y) => tr.data[(y * tr.width + x) * 4 + 3]
let solid = 0; for (let i = 3; i < tr.data.length; i += 4000) if (tr.data[i] > 0) solid++
ok(tr.width === 2480 && alpha(3, 3) === 0 && alpha(2476, 3504) === 0 && solid > 0, 'พื้นโปร่งใส: มุมโปร่ง (alpha=0) และมีองค์ประกอบทึบ')
fs.writeFileSync('docs/quote/export-transparent.png', PNG.sync.write(tr))

await page.getByRole('button', { name: '+ หน้า' }).click()
await page.getByTestId('size').selectOption('a4_150')
const zipBuf = await dl('บันทึกทุกหน้า')
const zip = await JSZip.loadAsync(zipBuf)
const names = Object.keys(zip.files).sort()
ok(names.length === 2 && names[0] === '01-คำคม.png' && names[1] === '02-คำคม.png', 'ZIP ชื่อไฟล์ไทย ' + names.join(','))
ok(zipBuf.readUInt16LE(6) & 0x800, 'ZIP ตั้ง UTF-8 flag (Windows/macOS อ่านชื่อไทยถูก)')
await page.getByRole('button', { name: 'ลบหน้า' }).click()

// 5) พรีวิว == export (เทียบพิกเซล: ซูม 100% เทียบกับ export 1240x1754)
await page.locator('select[aria-label="ซูมพรีวิว"]').selectOption({ label: '100%' })
await page.evaluate(() => { document.activeElement?.blur() })
await page.locator('.q-pages').click({ position: { x: 700, y: 5 } }) // เคลียร์ selection
await page.waitForTimeout(400)
const prev = png(await stage.screenshot())
const exp = sz.a4_150
let diff = 0
if (prev.width === exp.width && prev.height === exp.height) {
  for (let i = 0; i < prev.data.length; i += 4) if (Math.max(Math.abs(prev.data[i] - exp.data[i]), Math.abs(prev.data[i + 1] - exp.data[i + 1]), Math.abs(prev.data[i + 2] - exp.data[i + 2])) > 40) diff++
}
const frac = diff / (exp.width * exp.height)
ok(prev.width === 1240 && frac < .01, `พรีวิวตรง export: ต่างกัน ${(frac * 100).toFixed(2)}% ของพิกเซล`)
await page.locator('select[aria-label="ซูมพรีวิว"]').selectOption({ label: 'พอดีหน้าจอ' })

// 6) แก้ไข: undo/redo, คีย์ลัด, ลาก/ย่อ/หมุน, snap
await page.getByRole('button', { name: '+ ข้อความ' }).click()
const n0 = (await page.evaluate(async () => (await import('/src/quote/store.ts')).page.value.elements.length))
await page.waitForTimeout(450)
await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
const n1 = (await page.evaluate(async () => (await import('/src/quote/store.ts')).page.value.elements.length))
await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(100)
const n2 = (await page.evaluate(async () => (await import('/src/quote/store.ts')).page.value.elements.length))
ok(n1 === n0 - 1 && n2 === n0, `undo/redo: ${n0} -> ${n1} -> ${n2}`)
const geo = () => page.evaluate(async () => { const m = await import('/src/quote/store.ts'); const e = m.selected.value; return e && { x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot, n: m.page.value.elements.length } })
await page.evaluate(async () => { const m = await import('/src/quote/store.ts'); m.ui.sel = m.page.value.elements.at(-1).id })
let g0 = await geo()
await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown')
let g1 = await geo()
ok(g1.x === g0.x + 1 && g1.y === g0.y + 10, 'ลูกศร 1px / Shift+ลูกศร 10px')
await page.keyboard.press('Control+d')
ok((await geo()).n === g0.n + 1, 'Ctrl+D ทำสำเนา')
await page.keyboard.press('Delete')
ok((await page.evaluate(async () => (await import('/src/quote/store.ts')).page.value.elements.length)) === g0.n, 'Delete ลบ')
// ลากด้วยเมาส์
await page.getByRole('button', { name: '+ ข้อความ' }).click()
const box0 = await geo()
const sb = await stage.boundingBox(), sc = sb.width / 1240
const cx = sb.x + (box0.x + box0.w / 2) * sc, cy = sb.y + (box0.y + box0.h / 2) * sc
await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 60, cy + 40, { steps: 5 }); await page.mouse.up()
const box1 = await geo()
ok(Math.abs(box1.x - box0.x) > 30 && Math.abs(box1.y - box0.y) > 20, `ลากย้าย ${box0.x},${box0.y} -> ${box1.x},${box1.y}`)
// ย่อ/ขยายด้วย handle มุมขวาล่าง
const hx = sb.x + (box1.x + box1.w) * sc, hy = sb.y + (box1.y + box1.h) * sc
await page.mouse.move(hx, hy); await page.mouse.down(); await page.mouse.move(hx + 50, hy + 30, { steps: 5 }); await page.mouse.up()
const box2 = await geo()
ok(box2.w > box1.w + 30 && box2.h > box1.h + 15, `ย่อ/ขยาย ${box1.w}x${box1.h} -> ${box2.w}x${box2.h}`)
// หมุน
const rx = sb.x + (box2.x + box2.w / 2) * sc, ry = sb.y + (box2.y - 34 / sc * sc) * sc
await page.mouse.move(sb.x + (box2.x + box2.w / 2) * sc, sb.y + box2.y * sc - 34); await page.mouse.down()
await page.mouse.move(sb.x + (box2.x + box2.w) * sc + 80, sb.y + (box2.y + box2.h / 2) * sc, { steps: 5 }); await page.mouse.up()
ok(Math.abs((await geo()).rot) > 20, `หมุน rot=${(await geo()).rot}`)
// จัดชิด
await page.getByRole('button', { name: 'ชิดซ้าย' }).click()
const gl = await page.evaluate(async () => { const m = await import('/src/quote/store.ts'), g = await import('/src/quote/geom.ts'); return g.bbox(m.selected.value).x })
ok(Math.abs(gl) < 1, `จัดชิดซ้าย (กรอบหมุนแล้วชิดขอบ x=${gl})`)
await page.keyboard.press('Delete')

// 7) บันทึก/เปิดโปรเจกต์ + ปิดเปิดใหม่ข้อมูลยังอยู่
const projBefore = await page.evaluate(async () => (await import('/src/quote/store.ts')).page.value.elements.length)
const json = await dl('บันทึกโปรเจกต์')
fs.writeFileSync('docs/quote/project.json', json)
await page.reload(); await page.waitForSelector('[data-testid=qc-stage]')
const afterReload = await page.evaluate(async () => (await import('/src/quote/store.ts')).page.value.elements.length)
ok(afterReload === projBefore, `localStorage: โหลดซ้ำแล้วองค์ประกอบยังอยู่ (${afterReload})`)
page.once('dialog', d => d.accept())
await page.getByRole('button', { name: 'Reset' }).click()
await page.getByTestId('open-json').setInputFiles('docs/quote/project.json')
await page.waitForTimeout(300)
const reopened = await page.evaluate(async () => { const m = await import('/src/quote/store.ts'); return [m.page.value.elements.length, Object.keys(m.assets).length] })
ok(reopened[0] === projBefore && reopened[1] >= 1, `เปิดโปรเจกต์ .json: องค์ประกอบ ${reopened[0]} รูป ${reopened[1]}`)

// 8) รูปใหญ่ 4000x3000
const t0 = Date.now()
const big = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 4000; c.height = 3000
  const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 4000, 3000); g.addColorStop(0, '#e33'); g.addColorStop(1, '#33e'); x.fillStyle = g; x.fillRect(0, 0, 4000, 3000)
  for (let i = 0; i < 4000; i++) { x.fillStyle = `hsl(${i % 360},70%,50%)`; x.fillRect(Math.random() * 4000, Math.random() * 3000, 60, 60) }
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9))
  const m = await import('/src/quote/store.ts')
  m.addEl((await import('/src/quote/elements.ts')).mkImage({ w: 800, h: 600 }))
  await m.loadImageInto(m.selected.value, new File([blob], 'big.jpg', { type: 'image/jpeg' }))
  return [m.selected.value.nw, m.selected.value.nh]
})
await page.getByTestId('size').selectOption('a4')
const bigExp = png(await dl('บันทึกหน้านี้'))
ok(bigExp.width === 2480 && Date.now() - t0 < 120000, `รูป 4000x3000 -> ย่อเก็บ ${big} และ export ได้ใน ${(Date.now() - t0) / 1000}s`)

await browser.close()
