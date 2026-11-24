// รัน: npm run dev (อีกเทอร์มินัล) แล้ว npm run test:e2e
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import JSZip from 'jszip'
import fs from 'node:fs'

const URL = process.env.URL ?? 'http://localhost:5173'
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }
fs.mkdirSync('docs', { recursive: true })

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true })).newPage()
page.on('pageerror', e => console.log('PAGEERROR', e))
await page.goto(URL)
await page.setInputFiles('[data-testid=bg-input]', 'sample/background.jpg')
await page.waitForSelector('img.bg')
await page.screenshot({ path: 'docs/preview.png' })

const download = async name => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByText(name, { exact: false }).first().click()])
  return d.path().then(p => fs.readFileSync(p))
}
const check = (buf, tag) => { const png = PNG.sync.read(buf); ok(png.width === 2480 && png.height === 3508, `${tag} ${png.width}x${png.height}`); return png }

const full = check(await download('บันทึกหน้านี้'), 'page')
fs.writeFileSync('docs/export-page-01.png', PNG.sync.write(full))
const tabs = check(await download('บันทึกเฉพาะแถบ'), 'tabs-only')
fs.writeFileSync('docs/export-tabs-only.png', PNG.sync.write(tabs))
const a = (x, y) => tabs.data[(y * tabs.width + x) * 4 + 3]
ok(a(10, 10) === 0 && a(tabs.width - 5, 3400) === 0 && a(tabs.width - 20, 500) === 255, 'tabs-only alpha: พื้นโปร่ง แถบทึบ')

await page.getByText('ไฮไลต์แถบ active').first().click()
const zip = await JSZip.loadAsync(await download('บันทึกทุกหน้า'))
const names = Object.keys(zip.files).sort()
console.log(names)
ok(names.length === 4, 'zip มี 4 ไฟล์')
for (const n of names) {
  const png = PNG.sync.read(await zip.files[n].async('nodebuffer'))
  ok(png.width === 2480 && png.height === 3508, `${n} ขนาด`)
  fs.writeFileSync('docs/zip-' + n.slice(0, 2) + '.png', PNG.sync.write(png))
}
await browser.close()
