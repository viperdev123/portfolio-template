export type RGB = [number, number, number]
export const WHITE: RGB = [255, 255, 255]

export function parse(c: string): RGB {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return [0, 0, 0]
  let h = m[1]; if (h.length === 3) h = h.replace(/./g, x => x + x)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
export const hex = (c: RGB) => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
const lin = (v: number) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }
export const lum = (c: RGB) => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2])
export function contrast(a: RGB | string, b: RGB | string): number {
  const la = lum(typeof a === 'string' ? parse(a) : a), lb = lum(typeof b === 'string' ? parse(b) : b)
  return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05)
}
// วาง fg ที่ความทึบ a ทับ bg
export const over = (fg: RGB, bg: RGB, a: number): RGB => [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)) as RGB

// คอนทราสต์ต่ำสุดเมื่อวางบนพื้นหลายแบบ (ค่าเฉลี่ย + ส่วนมืด/สว่างสุดของรูป)
export const worst = (fg: RGB | string, bgs: RGB[]) => Math.min(...bgs.map(b => contrast(fg, b)))

// ปรับ fg เข้าหาดำ/ขาว (ตามความสว่างของพื้นเฉลี่ย = bgs[0]) จนคอนทราสต์ต่ำสุด >= min
export function ensureContrast(fg: string, bgs: RGB[], min = 4.5): string {
  if (worst(fg, bgs) >= min) return fg
  const target: RGB = lum(bgs[0]) > .4 ? [0, 0, 0] : [255, 255, 255], f = parse(fg)
  for (let t = .04; t <= 1.0001; t += .04) {
    const c = over(target, f, t)
    if (worst(c, bgs) >= min) return hex(c)
  }
  return hex(target)
}
