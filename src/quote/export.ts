import { defineComponent, h } from 'vue'
import JSZip from 'jszip'
import { download, loadFonts, nodeToPng, withOffscreen } from '../shared/export'
import QuotePage from './QuotePage.vue'
import { QUOTE_STYLES } from './fonts'
import { resolve } from './theme'
import { PH, PW, type Page } from './types'

export const SIZES = {
  a4: { label: 'A4 300 DPI (2480×3508)', w: 2480, h: 3508 },
  a4_150: { label: 'A4 150 DPI (1240×1754)', w: 1240, h: 1754 },
  social: { label: 'โซเชียล 1080×1350', w: 1080, h: 1350 },
} as const
export type SizeId = keyof typeof SIZES

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function fontSpecs(p: Page) {
  const s = new Set<string>()
  for (const e of p.elements) {
    if (e.kind === 'text') { s.add(`${e.weight} 40px '${e.font}'`); s.add(`400 40px '${e.font}'`) }
    if (e.kind === 'quote') { const q = QUOTE_STYLES[e.style] ?? QUOTE_STYLES[0]; s.add(`${q.weight} 40px '${q.font}'`) }
  }
  return [...s]
}

async function render(p: Page, assets: Record<string, string>, size: SizeId, transparent: boolean): Promise<Blob> {
  await loadFonts(fontSpecs(p))
  const { w, h: hh } = SIZES[size]
  let comp: any = QuotePage, props: Record<string, unknown> = { page: p, assets, transparent }
  if (size === 'social') {
    // หน้าอัตราส่วนต่างกัน: ย่อทั้งหน้าให้พอดีความสูง (contain) แล้ววางกึ่งกลาง ขอบข้างเติมสีพื้น
    const k = Math.min(w / PW, hh / PH), first = p.bg.stops[0]?.color ?? p.bg.color
    const barBg = transparent || p.bg.mode === 'none' ? 'transparent' : resolve(first, p.theme)
    comp = defineComponent({ render: () => h('div', { style: { width: w + 'px', height: hh + 'px', position: 'relative', overflow: 'hidden', background: barBg } },
      [h('div', { style: { position: 'absolute', left: (w - PW * k) / 2 + 'px', top: (hh - PH * k) / 2 + 'px', width: PW + 'px', height: PH + 'px', transform: `scale(${k})`, transformOrigin: '0 0' } },
        [h(QuotePage, { page: p, assets, transparent })])]) })
    props = {}
  }
  return withOffscreen(comp, props, async node => {
    await sleep(60) // ให้ auto-fit ของข้อความทำงานหลังฟอนต์พร้อม
    await Promise.all([...node.querySelectorAll('img')].map(i => i.decode().catch(() => undefined)))
    await sleep(30)
    // width/height = ขนาด CSS ของ node; pixelRatio ทำให้ได้ขนาดไฟล์ปลายทางพอดี
    const cssW = size === 'social' ? w : PW, cssH = size === 'social' ? hh : PH
    return nodeToPng(node, { width: cssW, height: cssH, pixelRatio: w / cssW })
  })
}

export const exportPage = async (p: Page, a: Record<string, string>, s: SizeId) => download(await render(p, a, s, false), 'quote-page.png')
export const exportTransparent = async (p: Page, a: Record<string, string>, s: SizeId) => download(await render(p, a, s, true), 'quote-elements.png')
export async function exportZip(pages: Page[], a: Record<string, string>, s: SizeId, onProgress?: (done: number, total: number) => void) {
  const zip = new JSZip()
  for (let i = 0; i < pages.length; i++) {
    zip.file(`${String(i + 1).padStart(2, '0')}-คำคม.png`, await render(pages[i], a, s, false))
    onProgress?.(i + 1, pages.length)
  }
  download(await zip.generateAsync({ type: 'blob' }), 'quote-pages.zip')
}
