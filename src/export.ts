import { download, loadFonts, nodeToPng, withOffscreen } from './shared/export'
import JSZip from 'jszip'
import PageCanvas from './components/PageCanvas.vue'
import { PAGE_H, PAGE_W, type Project } from './types'
import { tabNum } from './store'

const FONT_WEIGHTS = ['400', '600', '700']

// วาดหน้าแบบไม่มี transform ในที่ซ่อน (นอกจอ) แล้ว export ที่ pixelRatio 2 => 2480x3508
async function render(p: Project, active: number, tabsOnly: boolean): Promise<Blob> {
  await loadFonts(FONT_WEIGHTS.map(w => `${w} 30px '${p.font}'`))
  return withOffscreen(PageCanvas, { p, active, tabsOnly }, async node => {
    if (p.bg && !tabsOnly) await (node.querySelector('img') as HTMLImageElement).decode()
    return nodeToPng(node, { pixelRatio: 2, width: PAGE_W, height: PAGE_H })
  })
}

const save = download

export const exportPage = async (p: Project) => save(await render(p, p.active, false), 'portfolio-page.png')
export const exportTabs = async (p: Project) => save(await render(p, p.active, true), 'portfolio-tabs.png')

// onProgress(ทำเสร็จ, ทั้งหมด) สำหรับแสดงความคืบหน้า
export async function exportZip(p: Project, onProgress?: (done: number, total: number) => void) {
  const zip = new JSZip(), total = p.tabs.length + (p.toc?.inZip ? 1 : 0)
  let done = 0
  const tick = () => onProgress?.(++done, total)
  // หน้าสารบัญเป็นไฟล์แรกของ ZIP (เฉพาะโปรเจกต์ที่มีหน้าสารบัญและไม่ได้ปิดตัวเลือกนี้ ไม่งั้นผลลัพธ์เหมือนเดิมทุกประการ)
  if (p.toc?.inZip) zip.file('00-สารบัญ.png', await (await import('./toc/export')).renderToc(p.toc, p.bg, false)); tick()
  for (let i = 0; i < p.tabs.length; i++) {
    const name = `${String(i + 1).padStart(2, '0')}-${(p.tabs[i].th || tabNum(p.tabs[i], i)).replace(/[\/:*?"<>|]/g, '_')}.png`
    // ZIP เปิดไฮไลต์แถบ active เสมอ ไม่งั้นทุกหน้าจะเหมือนกัน
    zip.file(name, await render({ ...p, highlight: true }, i, false)); tick()
  }
  save(await zip.generateAsync({ type: 'blob' }), 'portfolio-pages.zip')
}
