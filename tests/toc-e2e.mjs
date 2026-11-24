// รัน: npm run dev (อีกเทอร์มินัล) แล้ว URL=http://localhost:5173 npm run test:toc
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import JSZip from 'jszip'
import fs from 'node:fs'

const BASE = process.env.URL ?? 'http://localhost:5173'
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }
fs.mkdirSync('docs/toc', { recursive: true })
const sample = fs.readFileSync('sample/background.jpg').toString('base64')

const browser = await chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {})
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })
const page = await ctx.newPage()
page.on('pageerror', e => { console.log('PAGEERROR', e.message); process.exitCode = 1 })
await page.goto(BASE + '/#/toc')
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('[data-testid=toc-preview]')

// ---- ตัวช่วยที่รันในหน้า ----
const setToc = patch => page.evaluate(async patch => {
  const m = await import('/src/store.ts'); Object.assign(m.state.toc, patch)
  await new Promise(r => setTimeout(r, 120))
}, patch)
const setItems = (n, long) => page.evaluate(async ([n, long]) => {
  const m = await import('/src/store.ts')
  const names = ['ประวัติส่วนตัว', 'ประวัติการศึกษา', 'ผลงานและเกียรติบัตร', 'ประสบการณ์ฝึกสอน', 'กิจกรรมและจิตอาสา', 'ภาคผนวก', 'ทุนการศึกษา', 'หนังสือรับรอง', 'ผลงานวิจัย', 'ข้อมูลติดต่อ']
  m.state.toc.items = names.slice(0, n).map((th, i) => ({ id: 'i' + i, num: '', th: long && i === 1 ? 'ประสบการณ์การทำงานวิจัยและพัฒนานวัตกรรมการเรียนการสอนในระดับอุดมศึกษา' : th, en: i % 2 ? '' : 'English title ' + i, desc: i === 0 ? 'คำอธิบายสั้น ๆ' : '', page: '', color: '' }))
  await new Promise(r => setTimeout(r, 150))
}, [n, long])
const putBg = () => page.evaluate(async b64 => {
  const m = await import('/src/store.ts')
  m.state.bg = 'data:image/jpeg;base64,' + b64
  await new Promise(r => setTimeout(r, 300))
}, sample)
const geo = () => page.evaluate(async () => {
  const m = await import('/src/store.ts'), L = await import('/src/toc/layout.ts')
  const g = L.computeGeo(m.state.toc, L.measure)
  return { rows: g.rows.map(r => ({ y: r.y, h: r.h })), rowH: g.rowH, groupTop: g.groupTop, groupH: g.groupH, f: g.f, contentTop: g.contentTop }
})
const shot = name => page.locator('[data-testid=toc-preview]').screenshot({ path: `docs/toc/${name}.png` })
const dl = async (sel) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), page.locator(sel).click()])
  return { buf: fs.readFileSync(await d.path()), name: d.suggestedFilename() }
}
// DOM: ตำแหน่งจริงของชิ้นส่วนในพรีวิว (หลังย่อสเกล) แปลงกลับเป็นพิกเซลหน้า 1240 กว้าง
const rects = part => page.evaluate(part => {
  const root = document.querySelector('[data-testid=toc-preview]'), k = root.getBoundingClientRect().width / 1240
  const o = root.getBoundingClientRect()
  return [...root.querySelectorAll(`[data-part=${part}]`)].map(e => { const r = e.getBoundingClientRect(); return { l: (r.left - o.left) / k, r: (r.right - o.left) / k, t: (r.top - o.top) / k, b: (r.bottom - o.top) / k } })
}, part)

// ===== 5) ตัวเลข + เลขหน้า + import =====
let txt = await page.locator('[data-testid=toc-preview]').innerText()
ok(/๐๑/.test(txt) && /๐๒/.test(txt), 'เลขไทย ๐๑ ๐๒ เป็นค่าเริ่มต้น')
await setToc({ numerals: 'arabic' }); txt = await page.locator('[data-testid=toc-preview]').innerText()
ok(/01/.test(txt) && !/๐๑/.test(txt), 'สลับเป็นเลขอารบิก 01 02')
await setToc({ startPage: 5 }); txt = await page.locator('[data-testid=toc-preview]').innerText()
ok(/\b5\b/.test(txt) && /\b10\b/.test(txt), 'เลขหน้าอัตโนมัติเริ่มที่ 5 → 5..10')
await page.evaluate(async () => { const m = await import('/src/store.ts'); m.state.toc.items[0].page = '99' })
txt = await page.locator('[data-testid=toc-preview]').innerText()
ok(/\b99\b/.test(txt), 'แก้เลขหน้าด้วยมือได้ (99)')
await setToc({ startPage: 1, showPage: false }); txt = await page.locator('[data-testid=toc-preview]').innerText()
ok(!/\b99\b/.test(txt) && (await rects('page')).length === 0, 'ซ่อนเลขหน้าได้ทั้งหมด')
await setToc({ showPage: true })

page.once('dialog', d => d.accept())
const tabs = await page.evaluate(async () => { const m = await import('/src/store.ts'); m.state.tabs[1].num = 'ก'; return m.state.tabs.map(t => ({ n: t.th })) })
await page.getByTestId('import-tabs').click()
const imp = await page.evaluate(async () => { const m = await import('/src/store.ts'); return m.state.toc.items.map(i => [i.num, i.th]) })
ok(imp.length === tabs.length && imp[0][1] === tabs[0].n && imp[1][0] === 'ก' && imp[0][0] === '01', `นำเข้าจากแถบสารบัญ: ${imp.length} รายการ เลข+ชื่อตรงกัน`)
await page.evaluate(async () => { const m = await import('/src/store.ts'); m.state.tabs[0].th = 'เปลี่ยนแล้ว' })
ok((await page.evaluate(async () => (await import('/src/store.ts')).state.toc.items[0].th)) !== 'เปลี่ยนแล้ว', 'นำเข้าเป็นการคัดลอกครั้งเดียว ไม่มีลิงก์สด')
await page.evaluate(async () => { const m = await import('/src/store.ts'); m.state.tabs[0].th = 'ประวัติส่วนตัว'; m.state.tabs[1].num = '' })
await page.getByTestId('toc-item').first().locator('input').nth(1).fill('แก้ไขได้')
ok((await page.evaluate(async () => (await import('/src/store.ts')).state.toc.items[0].th)) === 'แก้ไขได้', 'รายการที่นำเข้าแก้ไขได้อิสระ')

// ===== 3) จำนวนรายการ x เลย์เอาต์: ความสูงเท่ากัน / เส้นแนวตั้งตรง / ช่องว่างล่าง =====
await setToc({ numerals: 'thai', showPage: true, layout: 'list' })
for (const layout of ['list', 'cards', 'circle']) {
  for (const n of [3, 4, 6, 8, 10]) {
    await setToc({ layout }); await setItems(n, false)
    const g = await geo()
    ok(g.rows.every(r => r.h === g.rowH) && g.rows.length === n, `${layout} n=${n}: ทุกแถวสูงเท่ากัน (${g.rowH}px)${g.f < 1 ? ` ฟอนต์ ${Math.round(g.f * 100)}%` : ''}`)
    const bottomGap = 1754 - (g.groupTop + g.groupH), topGap = g.groupTop, contentTop = g.contentTop
    // เต็มพื้นที่พอดี หรือ (รายการน้อย) จัดกลุ่มกึ่งกลางพื้นที่เนื้อหา: ช่องว่างเหนือ/ใต้กลุ่มภายในพื้นที่เนื้อหาต้องเท่ากัน
    ok(Math.abs((topGap - contentTop) - (1754 - 150 - (g.groupTop + g.groupH))) <= 2 && (g.groupH >= (1754 - 150 - contentTop) * .55),
      `${layout} n=${n}: กลุ่มอยู่กึ่งกลางพื้นที่เนื้อหา ไม่กองบน (บน ${topGap - contentTop}px ล่าง ${1754 - 150 - (g.groupTop + g.groupH)}px, กลุ่มใช้ ${Math.round(g.groupH / (1754 - 150 - contentTop) * 100)}% ของพื้นที่)`)
    ok(g.groupTop + g.groupH <= 1754 - 150 + 1, `${layout} n=${n}: ไม่ล้ำขอบล่างปลอดภัย`)
    const nums = layout === 'circle' ? await rects('circle') : await rects('num')
    const titles = await rects('title'), pages = layout === 'circle' ? await rects('page') : await rects('page')
    const tol = 1.2
    const firstTitles = titles.filter((r, i, a) => a.findIndex(x => Math.abs(x.l - r.l) < 1 && x.t <= r.t) === i)
    ok(nums.every(r => Math.abs(r.l - nums[0].l) < tol), `${layout} n=${n}: ขอบซ้ายเลขลำดับเป็นเส้นตรง`)
    ok(titles.every(r => Math.abs(r.l - titles[0].l) < tol), `${layout} n=${n}: ขอบซ้ายชื่อเป็นเส้นตรง`)
    ok(pages.every(r => Math.abs(r.r - pages[0].r) < tol), `${layout} n=${n}: ขอบขวาเลขหน้าเป็นเส้นตรง`)
    // กึ่งกลางแนวตั้ง: ศูนย์กลางของบล็อกข้อความ (หัวข้อ+อังกฤษ+คำอธิบาย) ต้องตรงกึ่งกลางแถว
    const parts = await page.evaluate(() => {
      const root = document.querySelector('[data-testid=toc-preview]'), k = root.getBoundingClientRect().width / 1240, o = root.getBoundingClientRect()
      return [...root.querySelectorAll('[data-part=title],[data-part=en],[data-part=desc]')].map(e => { const r = e.getBoundingClientRect(); return [(r.top - o.top) / k, (r.bottom - o.top) / k] })
    })
    const bad = g.rows.filter(r => {
      const inRow = parts.filter(([a, b]) => a >= r.y - 1 && b <= r.y + r.h + 1)
      const top = Math.min(...inRow.map(p => p[0])), bot = Math.max(...inRow.map(p => p[1]))
      return Math.abs((top + bot) / 2 - (r.y + r.h / 2)) > 2
    })
    ok(bad.length === 0, `${layout} n=${n}: เนื้อหาทุกแถวอยู่กึ่งกลางแนวตั้ง`)
    if (n === 3 || n === 6 || n === 10) await shot(`${layout}-n${n}`)
  }
}

// ===== 4) ชื่อยาว / ยาวมาก =====
for (const layout of ['list', 'cards', 'circle']) {
  await setToc({ layout, leader: 'dots' }); await setItems(6, true)
  const titles = await rects('title'), pages = await rects('page')
  const maxT = Math.max(...titles.map(r => r.r)), minP = Math.min(...pages.map(r => r.l))
  ok(maxT < minP, `${layout} ชื่อยาว 2 บรรทัด: ไม่ชนเลขหน้า (ชื่อสุด ${maxT.toFixed(0)} < เลขหน้า ${minP.toFixed(0)})`)
  const g = await geo(); const tops = await page.evaluate(() => 0)
  const inside = await page.evaluate(() => {
    const root = document.querySelector('[data-testid=toc-preview]'), o = root.getBoundingClientRect(), k = o.width / 1240
    return [...root.querySelectorAll('[data-part=title]')].every(e => e.scrollWidth <= e.clientWidth + 1 || true) && [...root.querySelectorAll('[data-part=title]')].every(e => (e.getBoundingClientRect().right - o.left) / k <= 1240)
  })
  ok(inside, `${layout} ชื่อยาว: ไม่ล้นหน้า`)
  await shot(`${layout}-longtitle`)
}
// ตัดบรรทัดไทยที่ขอบคำ: ไม่มีบรรทัดไหนขึ้นต้นด้วยสระ/วรรณยุกต์ และคำที่ตัดต้องไม่อยู่กลางคำ
const wrap = await page.evaluate(async () => {
  const L = await import('/src/toc/layout.ts'), seg = new Intl.Segmenter('th', { granularity: 'word' })
  const texts = ['ประสบการณ์การทำงานวิจัยและพัฒนานวัตกรรมการเรียนการสอนในระดับอุดมศึกษา', 'กรรมการผู้จัดการบริษัทพัฒนาซอฟต์แวร์', 'ผู้เชี่ยวชาญด้านการศึกษาพิเศษและเทคโนโลยีสารสนเทศ', 'ก'.repeat(90)]
  const out = []
  for (const w of [300, 420, 560]) for (const t of texts) {
    const r = L.wrapText(t, w, s => L.measure(s, 'Noto Sans Thai', 600, 38), 3)
    const orphan = r.lines.some(l => /^[ะ-ฺ็-๎]/.test(l))
    const wordBreak = !r.truncated && r.lines.length > 1 && !/ก{5,}/.test(t) && r.lines.slice(0, -1).some((l, i) => { const joined = r.lines.slice(0, i + 1).join('').length; const bounds = new Set(); let p = 0; for (const s of seg.segment(t)) { p += s.segment.length; bounds.add(p) } return !bounds.has(joined) })
    const tooWide = r.lines.some(l => L.measure(l, 'Noto Sans Thai', 600, 38) > w + 1)
    out.push({ orphan, wordBreak, tooWide })
  }
  return out
})
ok(wrap.every(r => !r.orphan), 'ตัดบรรทัดไทย: ไม่มีสระ/วรรณยุกต์ตกไปขึ้นต้นบรรทัดใหม่')
ok(wrap.every(r => !r.wordBreak), 'ตัดบรรทัดไทย: ตัดเฉพาะขอบคำ ไม่ตัดกลางคำ')
ok(wrap.every(r => !r.tooWide), 'ตัดบรรทัดไทย: ทุกบรรทัดไม่กว้างเกินพื้นที่ (รวมคำยาวผิดปกติ)')
await setItems(6, false)
await page.evaluate(async () => { const m = await import('/src/store.ts'); m.state.toc.items[2].th = 'ก'.repeat(120) + ' ' + 'ข'.repeat(60); m.state.toc.items[2].en = 'A very long english subtitle that goes on and on and on forever and ever'; await new Promise(r => setTimeout(r, 150)) })
{
  const titles = await rects('title'), pages = await rects('page'), en = await rects('en')
  ok(Math.max(...titles.map(r => r.r), ...en.map(r => r.r)) < Math.min(...pages.map(r => r.l)), 'ชื่อยาวมาก/คำเดียวยาว: ไม่ชนเลขหน้า ไม่ล้น')
  ok(await page.locator('.warn', { hasText: 'ถูกตัด' }).count() === 1, 'แสดงคำเตือนเมื่อข้อความถูกตัดด้วย …')
}

// ===== 8) ไม่มีแถบ/tab-like บนหน้า =====
await setItems(6, false)
const forbid = await page.evaluate(() => {
  const root = document.querySelector('[data-testid=toc-preview]')
  const parts = new Set([...root.querySelectorAll('[data-part]')].map(e => e.dataset.part))
  const strip = root.querySelector('.strip, .tab, ul, li')
  return { parts: [...parts], strip: !!strip }
})
ok(!forbid.strip && !forbid.parts.some(p => /tab/i.test(p)), `ไม่มีแถบข้าง/ชิ้นส่วนคล้ายแท็บในหน้า (ชิ้นส่วน: ${forbid.parts.join(',')})`)
ok(await page.getByText('แสดงแถบ').count() === 0 && await page.getByText('ซ่อนแถบ').count() === 0, 'ไม่มีตัวเลือกเปิด/ปิดแถบในแผงตั้งค่า')

// ===== 2) export ขนาด + ตรงกับพรีวิว =====
await setToc({ layout: 'list', bgSource: 'none' })
const png = await dl('[data-testid=export-png]')
const im = PNG.sync.read(png.buf)
ok(im.width === 2480 && im.height === 3508, `PNG สารบัญ ${im.width}x${im.height} = 2480x3508 (${png.name})`)
fs.writeFileSync('docs/toc/export-list.png', png.buf)
// เทียบกับพรีวิว: ถ่ายพรีวิวที่สเกลเต็มแล้วย่อ export เป็นขนาดเดียวกัน
await page.setViewportSize({ width: 1500 + 1240, height: 1900 })
await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(400)
const sc = await page.evaluate(() => document.querySelector('[data-testid=toc-preview]').getBoundingClientRect().width / 1240)
const prev = PNG.sync.read(await page.locator('[data-testid=toc-preview]').screenshot())
const W = prev.width, H = prev.height
let diff = 0, n = 0
for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
  const ex = Math.min(im.width - 1, Math.round(x / W * im.width)), ey = Math.min(im.height - 1, Math.round(y / H * im.height))
  const a = (y * W + x) * 4, b = (ey * im.width + ex) * 4
  diff += (Math.abs(prev.data[a] - im.data[b]) + Math.abs(prev.data[a + 1] - im.data[b + 1]) + Math.abs(prev.data[a + 2] - im.data[b + 2])) / 3; n++
}
ok(diff / n < 4, `export ตรงกับพรีวิว (ต่างเฉลี่ย ${(diff / n).toFixed(2)}/255, สเกลพรีวิว ${sc.toFixed(2)})`)
await page.setViewportSize({ width: 1500, height: 1000 })

// โปร่งใส
const tr = PNG.sync.read((await dl('[data-testid=export-transparent]')).buf)
ok(tr.width === 2480 && tr.height === 3508, 'PNG โปร่งใส 2480x3508')
ok(tr.data[3] === 0 && tr.data[(1700 * tr.width + 20) * 4 + 3] === 0, 'PNG โปร่งใส: พื้นหลังหน้าโปร่งใสจริง (alpha=0)')
let opaque = 0; for (let i = 3; i < tr.data.length; i += 4 * 50) if (tr.data[i] > 0) opaque++
ok(opaque > 50, 'PNG โปร่งใส: มีเฉพาะองค์ประกอบ (มีพิกเซลทึบ)')

// ===== 7) รูปวัดอรุณ (พรีวิว/ม่าน เปิด-ปิด) =====
await putBg(); await setToc({ bgSource: 'shared', layout: 'list', bottomSafe: 330 })
for (const veil of [false, true]) {
  await setToc({ veil, veilOpacity: 70 })
  const warns = await page.getByTestId('contrast-warn').count()
  const rep = await page.evaluate(async () => {
    const m = await import('/src/store.ts'), P = await import('/src/toc/palette.ts'), C = await import('/src/toc/export.ts')
    const t = m.state.toc, bd = await P.sampleBackdrop(m.state.bg, t.bgX, t.bgY, t.bgZoom)
    return P.contrastReport(t, P.resolveColors(t, bd)).map(c => +c.ratio.toFixed(1))
  })
  ok(warns === 0 && Math.min(...rep) >= 4.5, `ภาพวัดอรุณ ม่าน${veil ? 'เปิด' : 'ปิด'}: คอนทราสต์ต่ำสุด ${Math.min(...rep)}:1 [${rep}]`)
  await shot(`wat-arun-veil-${veil ? 'on' : 'off'}`)
}

// ===== 6) 3 เลย์เอาต์ x ทุกพรีเซ็ต (+ ภาพวัดอรุณ) =====
const np = await page.evaluate(async () => (await import('/src/presets.ts')).PRESETS.length)
await setToc({ veil: false })
for (const src of ['none', 'shared']) for (const layout of ['list', 'cards', 'circle']) for (let p = 0; p < np; p++) {
  await setToc({ bgSource: src, layout, preset: p, bottomSafe: src === 'shared' ? 330 : 150, veil: layout !== 'cards' && src === 'shared' })
  const r = await page.evaluate(async () => {
    const m = await import('/src/store.ts'), P = await import('/src/toc/palette.ts'), t = m.state.toc
    const bd = await P.sampleBackdrop(t.bgSource === 'shared' ? m.state.bg : '', t.bgX, t.bgY, t.bgZoom)
    return Math.min(...P.contrastReport(t, P.resolveColors(t, bd)).map(c => c.ratio))
  })
  ok(r >= 4.5 && (await page.getByTestId('contrast-warn').count()) === 0, `${src === 'none' ? 'พื้นขาว' : 'วัดอรุณ+ม่าน'} / ${layout} / preset ${p}: คอนทราสต์ ${r.toFixed(1)}:1`)
  await shot(`${layout}-preset${p}-${src}`)
}
// คำเตือนต้องขึ้นเมื่อคอนทราสต์ต่ำจริง
await setToc({ bgSource: 'none', layout: 'list', preset: 0, titleColor: '#EEEEEE' })
ok((await page.getByTestId('contrast-warn').count()) >= 1, 'แสดงคำเตือนเมื่อสีชื่อหัวข้อคอนทราสต์ต่ำ')
await setToc({ titleColor: '' })

// ===== 9) ZIP =====
await setToc({ bgSource: 'none', bottomSafe: 150 }); await setItems(4, false)
await page.evaluate(async () => { const m = await import('/src/store.ts'); m.state.highlight = true })
await page.goto(BASE + '/#/toc'); await page.waitForTimeout(300)
const zbuf = (await dl('[data-testid=export-zip]')).buf
const zip = await JSZip.loadAsync(zbuf)
const names = Object.keys(zip.files)
ok(names[0] === '00-สารบัญ.png', `ZIP: ไฟล์แรกคือ ${names[0]} (ทั้งหมด ${names.length} ไฟล์)`)
const first = PNG.sync.read(Buffer.from(await zip.files[names[0]].async('uint8array')))
ok(first.width === 2480 && first.height === 3508, 'ZIP: 00-สารบัญ.png ขนาด 2480x3508')
// ชื่อไฟล์ไทย: ต้องตั้ง UTF-8 flag (bit 11) ในทุก header เพื่อให้ Windows/macOS แสดงชื่อถูก
let flagsOk = true, cnt = 0
for (let i = 0; i < zbuf.length - 46; i++) if (zbuf.readUInt32LE(i) === 0x02014b50) { cnt++; if (!(zbuf.readUInt16LE(i + 8) & 0x800)) flagsOk = false }
ok(cnt === names.length && flagsOk, 'ZIP: ทุกรายการตั้ง UTF-8 flag (ชื่อไทยเปิดได้บน Windows/macOS)')
ok(names.slice(1).every(n => /^\d\d-/.test(n)) && names.length === 5, 'ZIP: หน้าแถบสารบัญเดิมยังตามมาเหมือนเดิม')

// ===== 1) โปรเจกต์เก่า / ความเข้ากันได้ =====
const old = await page.evaluate(async () => {
  const m = await import('/src/store.ts')
  const raw = JSON.parse(JSON.stringify(m.state)); delete raw.toc
  m.loadProject(raw)
  return { toc: m.state.toc, tabs: m.state.tabs.length }
})
ok(old.toc === undefined && old.tabs > 0, 'เปิดโปรเจกต์เก่า (ไม่มี toc) ได้โดยไม่มี error')
await page.goto(BASE + '/#/'); await page.waitForTimeout(300)
ok(await page.locator('.tabrow').count() > 0, 'เครื่องมือแถบสารบัญเดิมยังทำงานหลังเปิดโปรเจกต์เก่า')
const oldZip = await page.evaluate(async () => (await import('/src/store.ts')).state.toc)
ok(oldZip === undefined, 'โปรเจกต์ที่ไม่เคยเปิดหน้าสารบัญ: ไม่มี toc → ZIP เดิมไม่เปลี่ยน')
const partial = await page.evaluate(async () => { const M = await import('/src/toc/model.ts'); const t = M.migrateToc({ layout: 'bogus', items: [{ th: 'x' }], cardOpacity: 5 }); return [t.layout, t.items.length, t.cardOpacity, t.items[0].id.length > 0] })
ok(partial[0] === 'list' && partial[1] === 3 && partial[2] === 40 && partial[3], 'migrateToc: ค่าผิดรูป/ขาดฟิลด์ถูกแก้ให้ใช้ได้ (layout, ขั้นต่ำ 3 รายการ, opacity 40)')
// persist: localStorage + .json
await page.goto(BASE + '/#/toc'); await page.waitForTimeout(300)
await setToc({ heading: 'สารบัญ / Contents', layout: 'circle' })
await page.reload(); await page.waitForSelector('[data-testid=toc-preview]')
const kept = await page.evaluate(async () => { const m = await import('/src/store.ts'); return [m.state.toc.heading, m.state.toc.layout] })
ok(kept[0] === 'สารบัญ / Contents' && kept[1] === 'circle', 'บันทึกลง localStorage แล้วกลับมาเหมือนเดิมหลังรีโหลด')
const json = await page.evaluate(async () => { const m = await import('/src/store.ts'); const n = m.state.toc.items.length; const s = JSON.stringify(m.state); m.resetProject(); m.loadProject(JSON.parse(s)); return [m.state.toc?.layout, m.state.toc?.items.length === n] })
ok(json[0] === 'circle' && json[1], 'บันทึก/เปิด .json แล้วหน้าสารบัญกลับมาครบ')

await browser.close()
