import type { Bg, DecoEl, El, ImageEl, Page, QuoteEl, ShapeEl, TextEl, Theme } from './types'
import { THEMES } from './theme'

export const uid = () => Math.random().toString(36).slice(2, 9)
const sh = () => ({ on: false, x: 0, y: 6, blur: 16, color: '#000000' })
const base = (name: string, x: number, y: number, w: number, h: number) =>
  ({ id: uid(), name, x, y, w, h, rot: 0, locked: false, hidden: false, opacity: 1 })

export const mkText = (o: Partial<TextEl> = {}): TextEl => ({
  ...base('ข้อความ', 220, 700, 800, 300), kind: 'text', text: 'พิมพ์ข้อความของคุณ', sub: '', subScale: .5, subColor: '@text2',
  font: 'Noto Serif Thai', size: 56, weight: 700, italic: false, lineHeight: 1.5, spacing: 0,
  color: '@text', grad: { on: false, c1: '@accent', c2: '@accent2' }, align: 'center', valign: 'middle',
  shadow: sh(), stroke: { w: 0, color: '#000000' }, autoFit: false, ...o,
})
export const mkImage = (o: Partial<ImageEl> = {}): ImageEl => ({
  ...base('รูปภาพ', 320, 200, 600, 600), kind: 'image', asset: '', nw: 0, nh: 0, mask: 'none',
  zoom: 1, ox: 50, oy: 50, border: { on: false, color: '@accent', w: 6 }, shadow: sh(),
  adj: { brightness: 100, contrast: 100, saturate: 100, blur: 0 }, tint: { color: '@accent', amt: 0 },
  feather: { mode: 'radial', amt: 0 }, ...o,
})
export const mkShape = (o: Partial<ShapeEl> = {}): ShapeEl => ({
  ...base('รูปทรง', 420, 600, 400, 400), kind: 'shape', shape: 'rect', fill: '@accent',
  grad: { on: false, c1: '@accent', c2: '@accent2', angle: 135 }, stroke: { w: 0, color: '@accent' }, radius: 40, shadow: sh(), ...o,
})
export const mkQuote = (o: Partial<QuoteEl> = {}): QuoteEl => ({
  ...base('เครื่องหมายคำพูด', 540, 300, 160, 160), kind: 'quote', style: 0, closing: false, color: '@accent',
  grad: { on: false, c1: '@accent', c2: '@accent2' }, ...o,
})
export const mkDeco = (o: Partial<DecoEl> = {}): DecoEl => ({
  ...base('ลายตกแต่ง', 520, 900, 200, 4), kind: 'deco', deco: 'goldline', color: '@accent', color2: '@accent2', param: 2, ...o,
})

export const DECOS: Record<DecoEl['deco'], { name: string; make: () => DecoEl }> = {
  goldline: { name: 'เส้นทอง', make: () => mkDeco({ name: 'เส้นทอง' }) },
  ring: { name: 'วงกลมเส้นบาง', make: () => mkDeco({ name: 'วงกลมเส้นบาง', deco: 'ring', x: 420, y: 600, w: 400, h: 400, param: 2 }) },
  dots: { name: 'ชุดจุด', make: () => mkDeco({ name: 'ชุดจุด', deco: 'dots', x: 420, y: 600, w: 320, h: 200, param: 28 }) },
  sparkle: { name: 'ประกาย', make: () => mkDeco({ name: 'ประกาย', deco: 'sparkle', x: 560, y: 600, w: 120, h: 120 }) },
}

export const defaultBg = (): Bg => ({
  mode: 'linear', color: '@bg1', stops: [{ color: '@bg1', pos: 0 }, { color: '@bg2', pos: 100 }], angle: 160,
  asset: '', x: 50, y: 50, zoom: 1, opacity: 1, tint: '@accent', tintAmt: 0,
})
export const newPage = (name: string, theme: Theme = THEMES[0], elements: El[] = []): Page =>
  ({ id: uid(), name, theme: { ...theme, mids: [...theme.mids] }, bg: defaultBg(), elements })
