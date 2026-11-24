import type { El, ImageEl, Page, TextEl } from './types'
import { mkDeco, mkImage, mkQuote, mkShape, mkText } from './elements'

export const DEFAULT_QUOTE = 'ความสำเร็จไม่ใช่จุดหมายปลายทาง แต่คือการเดินทางที่เราไม่เคยหยุดเรียนรู้'
export const DEFAULT_SPEAKER = '— ชื่อผู้กล่าว'

// เนื้อหาที่ต้องคงไว้เมื่อเปลี่ยน template: ข้อความ ผู้กล่าว และรูป (รวมการครอป)
interface Content { text: string; sub: string; img?: ImageEl }

const quoteBox = (c: Content, o: Partial<TextEl>) =>
  mkText({ name: 'คำคม', slot: 'quote', tpl: true, text: c.text, sub: c.sub, autoFit: true, size: 56, ...o })
const photo = (c: Content, o: Partial<ImageEl>): ImageEl => {
  const keep = c.img ? { asset: c.img.asset, nw: c.img.nw, nh: c.img.nh, zoom: c.img.zoom, ox: c.img.ox, oy: c.img.oy } : {}
  return mkImage({ name: 'รูปภาพ', slot: 'image', tpl: true, ...o, ...keep })
}
const T = <E extends El>(e: E): E => ((e.tpl = true), e)

export const TEMPLATES: { id: string; name: string; build: (c: Content) => El[] }[] = [
  { id: 'top-photo', name: 'รูปบนครึ่งหน้า', build: c => [
    photo(c, { x: 0, y: 0, w: 1240, h: 900, feather: { mode: 'bottom', amt: 35 } }),
    T(mkQuote({ x: 540, y: 880, w: 160, h: 160 })),
    quoteBox(c, { x: 120, y: 1060, w: 1000, h: 520 }),
    T(mkDeco({ x: 520, y: 1650, w: 200, h: 4 })),
  ] },
  { id: 'arch', name: 'รูปในซุ้มโค้ง', build: c => [
    T(mkShape({ name: 'กรอบซุ้ม', shape: 'arch', x: 296, y: 110, w: 648, h: 860, fill: 'transparent', stroke: { w: 4, color: '@accent' } })),
    photo(c, { x: 316, y: 130, w: 608, h: 820, mask: 'arch' }),
    T(mkQuote({ x: 540, y: 990, w: 160, h: 160, style: 1 })),
    quoteBox(c, { x: 120, y: 1150, w: 1000, h: 480, size: 52 }),
  ] },
  { id: 'fade-bg', name: 'รูปเต็มจางกลืน', build: c => [
    photo(c, { x: 0, y: 0, w: 1240, h: 1754, feather: { mode: 'radial', amt: 40 }, opacity: .55, tint: { color: '@accent', amt: 20 } }),
    T(mkQuote({ x: 520, y: 400, w: 200, h: 200 })),
    quoteBox(c, { x: 120, y: 620, w: 1000, h: 640, size: 60 }),
    T(mkDeco({ deco: 'sparkle', x: 1000, y: 260, w: 120, h: 120 })),
  ] },
  { id: 'circle-left', name: 'รูปวงกลมซ้ายบน', build: c => [
    T(mkDeco({ deco: 'ring', x: 50, y: 50, w: 480, h: 480, param: 2 })),
    photo(c, { x: 80, y: 80, w: 420, h: 420, mask: 'circle', border: { on: true, color: '@accent', w: 6 } }),
    T(mkDeco({ deco: 'dots', x: 800, y: 120, w: 320, h: 200, param: 28 })),
    T(mkQuote({ x: 960, y: 560, w: 160, h: 160 })),
    quoteBox(c, { x: 200, y: 740, w: 920, h: 820, align: 'right', valign: 'top', size: 56 }),
  ] },
  { id: 'text-only', name: 'คำคมอย่างเดียว', build: c => [
    T(mkQuote({ x: 440, y: 240, w: 360, h: 360, grad: { on: true, c1: '@accent', c2: '@accent2' } })),
    quoteBox(c, { x: 120, y: 620, w: 1000, h: 760, size: 64 }),
    T(mkDeco({ x: 520, y: 1450, w: 200, h: 4 })),
    T(mkDeco({ deco: 'sparkle', x: 1000, y: 200, w: 100, h: 100 })),
  ] },
  { id: 'split', name: 'รูปซ้าย ข้อความขวา', build: c => [
    photo(c, { x: 0, y: 0, w: 620, h: 1754 }),
    T(mkShape({ name: 'เส้นแบ่ง', shape: 'rect', x: 660, y: 300, w: 4, h: 1154 })),
    T(mkQuote({ x: 710, y: 360, w: 140, h: 140 })),
    quoteBox(c, { x: 700, y: 540, w: 460, h: 760, align: 'left', valign: 'top', size: 48 }),
  ] },
]

export function applyTemplate(p: Page, id: string) {
  const t = TEMPLATES.find(x => x.id === id)!
  const q = p.elements.find(e => e.slot === 'quote') as TextEl | undefined
  const img = p.elements.find(e => e.slot === 'image') as ImageEl | undefined
  const els = t.build({ text: q?.text ?? DEFAULT_QUOTE, sub: q?.sub ?? DEFAULT_SPEAKER, img })
  p.elements = [...els, ...p.elements.filter(e => !e.tpl)]
}
