import { PRESETS } from '../presets'
import { ensureContrast, hex, lum, over, parse, WHITE, worst, type RGB } from './color'
import type { Toc } from './model'
import { PAGE_H, PAGE_W } from '../types'

export const CREAM = '#FFFAEC'
// mean = สีเฉลี่ย, lo/hi = เฉลี่ยของพิกเซล 10% ที่มืดสุด/สว่างสุด (กันกรณีรูปมีลายมืดเล็ก ๆ ใต้ตัวอักษร)
export interface Region { mean: RGB; lo: RGB; hi: RGB }
export interface Backdrop { head: Region; list: Region }
export interface Colors {
  heading: string; title: string; page: string; num: string; sub: string; accent: string
  cream: string; headSet: RGB[]; listSet: RGB[]
}
const flat = (c: RGB): Region => ({ mean: c, lo: c, hi: c })

// พื้นหลังจริงที่ตัวอักษรวางอยู่: ใต้การ์ด/ม่านอ่านง่ายคือครีมทึบบางส่วนทับพื้นเฉลี่ยของรูป
export function listBackdrop(t: Toc, bgList: RGB): RGB {
  if (t.layout === 'cards') return over(parse(CREAM), bgList, t.cardOpacity / 100)
  if (t.veil) return over(parse(CREAM), bgList, t.veilOpacity * .85 / 100) // ขอบม่านจางกว่ากลาง: ใช้ค่าต่ำสุดของเกรเดียนต์
  return bgList
}

export function resolveColors(t: Toc, bd: Backdrop): Colors {
  const P = PRESETS[t.preset] ?? PRESETS[0]
  const dark = P.tabs[0], gold = P.activeColor
  const listSet = [bd.list.mean, bd.list.lo, bd.list.hi].map(c => listBackdrop(t, c)) // [0] = พื้นเฉลี่ย
  const headSet = [bd.head.mean, bd.head.lo, bd.head.hi]
  const pick = (set: RGB[]) => worst(dark, set) >= 4.5 ? dark : worst('#FFFFFF', set) >= 4.5 ? '#FFFFFF' : worst(dark, set) >= worst('#FFFFFF', set) ? dark : '#FFFFFF'
  const title = t.titleColor || pick(listSet)
  return {
    heading: t.headingColor || pick(headSet),
    title, page: title,
    num: t.numColor || ensureContrast(gold, listSet),
    sub: ensureContrast(hex(over(parse(title), listSet[0], .75)), listSet),
    accent: t.ruleColor || gold,
    cream: CREAM, headSet, listSet,
  }
}

export interface Check { label: string; ratio: number; ok: boolean }
export function contrastReport(t: Toc, c: Colors): Check[] {
  const mk = (label: string, fg: string, bg: RGB[]): Check => { const ratio = worst(fg, bg); return { label, ratio, ok: ratio >= 4.5 } }
  const out = [mk('หัวเรื่อง', c.heading, c.headSet), mk('ชื่อหัวข้อ', c.title, c.listSet)]
  if (t.showPage) out.push(mk('เลขหน้า', c.page, c.listSet))
  const nums = new Set<string>([c.num])
  if (t.perItemColor) t.items.forEach(i => i.color && nums.add(i.color))
  for (const n of nums) out.push(mk('เลขลำดับ ' + n.toUpperCase(), n, c.listSet))
  return out
}

// ค่าเฉลี่ยสีของรูปพื้นหลังในบริเวณหัวเรื่องและรายการ (จำลอง object-fit:cover + ตำแหน่ง + ซูมแบบเดียวกับตอนวาด)
const W = 124, H = Math.round(W * PAGE_H / PAGE_W)
export type Rect = readonly [number, number, number, number] // x, y, w, h เป็นพิกเซลหน้า 1240x1754
const HEAD: Rect = [200, 120, 840, 160]
export const listRect = (g: { groupTop: number; groupH: number }): Rect => [64, g.groupTop - 44, 1112, g.groupH + 88]
export async function sampleBackdrop(src: string, x: number, y: number, zoom: number, list: Rect = [120, 330, 1000, 1270]): Promise<Backdrop> {
  const none = { head: flat(WHITE), list: flat(WHITE) }
  if (!src) return none
  const img = new Image(); img.src = src
  try { await img.decode() } catch { return none }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
  const k = Math.max(W / img.width, H / img.height), dw = img.width * k, dh = img.height * k
  const ox = (W - dw) * x / 100, oy = (H - dh) * y / 100, px = W * x / 100, py = H * y / 100
  g.save(); g.translate(px, py); g.scale(zoom, zoom); g.translate(-px, -py)
  g.drawImage(img, ox, oy, dw, dh); g.restore()
  const region = ([rx, ry, rw, rh]: Rect): Region => {
    const s = W / PAGE_W
    const x0 = Math.max(0, Math.round(rx * s)), y0 = Math.max(0, Math.round(ry * s))
    const d = g.getImageData(x0, y0, Math.max(1, Math.min(W - x0, Math.round(rw * s))), Math.max(1, Math.min(H - y0, Math.round(rh * s)))).data
    const px: RGB[] = []
    for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]])
    px.sort((a, b) => lum(a) - lum(b))
    const avg = (a: RGB[]): RGB => [0, 1, 2].map(k => a.reduce((s2, p) => s2 + p[k], 0) / a.length) as RGB
    const k = Math.max(1, Math.round(px.length * .1))
    return { mean: avg(px), lo: avg(px.slice(0, k)), hi: avg(px.slice(-k)) }
  }
  return { head: region(HEAD), list: region(list) }
}
