import { FONTS, QUOTE_STYLES } from './fonts'

// สคีมาช่องตั้งค่าของแต่ละชนิดองค์ประกอบ (path เช่น 'shadow.blur')
export interface Field {
  k: string; label: string; t: 'range' | 'num' | 'color' | 'select' | 'check'
  min?: number; max?: number; step?: number; opts?: [string | number, string][]; show?: (e: any) => boolean
}
const r = (k: string, label: string, min: number, max: number, step = 1, show?: Field['show']): Field => ({ k, label, t: 'range', min, max, step, show })
const col = (k: string, label: string, show?: Field['show']): Field => ({ k, label, t: 'color', show })
const chk = (k: string, label: string): Field => ({ k, label, t: 'check' })
const sel = (k: string, label: string, opts: Field['opts'], show?: Field['show']): Field => ({ k, label, t: 'select', opts, show })
const shadow = (p = 'shadow'): Field[] => [
  chk(`${p}.on`, 'เงา'),
  r(`${p}.x`, 'เงา: แนวนอน', -60, 60, 1, e => e[p].on), r(`${p}.y`, 'เงา: แนวตั้ง', -60, 60, 1, e => e[p].on),
  r(`${p}.blur`, 'เงา: ความเบลอ', 0, 80, 1, e => e[p].on), col(`${p}.color`, 'เงา: สี', e => e[p].on),
]

export const COMMON: Field[] = [
  { k: 'x', label: 'X', t: 'num' }, { k: 'y', label: 'Y', t: 'num' }, { k: 'w', label: 'กว้าง', t: 'num', min: 8 }, { k: 'h', label: 'สูง', t: 'num', min: 8 },
  r('rot', 'หมุน (องศา)', -180, 180, 1), r('opacity', 'ความโปร่งใส', 0, 1, .01),
]

export const BY_KIND: Record<string, Field[]> = {
  text: [
    sel('font', 'ฟอนต์', FONTS.map(f => [f, f])),
    r('size', 'ขนาด (px)', 10, 300), sel('weight', 'น้ำหนัก', [[400, 'ปกติ'], [600, 'กึ่งหนา'], [700, 'หนา']]),
    chk('italic', 'ตัวเอียง'), r('lineHeight', 'ระยะบรรทัด', .8, 3, .05), r('spacing', 'ระยะห่างตัวอักษร', -5, 40, .5),
    sel('align', 'จัดข้อความ', [['left', 'ชิดซ้าย'], ['center', 'กลาง'], ['right', 'ชิดขวา'], ['justify', 'เต็มบรรทัด']]),
    sel('valign', 'จัดแนวตั้ง', [['top', 'บน'], ['middle', 'กลาง'], ['bottom', 'ล่าง']]),
    col('color', 'สีข้อความ', e => !e.grad.on), chk('grad.on', 'สีไล่เฉด (ทอง)'),
    col('grad.c1', 'ไล่เฉด: สีต้น', e => e.grad.on), col('grad.c2', 'ไล่เฉด: สีปลาย', e => e.grad.on),
    r('subScale', 'ขนาดชื่อผู้กล่าว (สัดส่วน)', .2, 1, .05), col('subColor', 'สีชื่อผู้กล่าว'),
    ...shadow(), r('stroke.w', 'เส้นขอบตัวอักษร (px)', 0, 20, .5), col('stroke.color', 'สีเส้นขอบ', e => e.stroke.w > 0),
    chk('autoFit', 'ย่อขนาดอัตโนมัติให้พอดีกล่อง'),
  ],
  image: [
    sel('mask', 'รูปร่างมาสก์', [['none', 'สี่เหลี่ยม'], ['rounded', 'มุมโค้ง'], ['circle', 'วงกลม'], ['arch', 'ซุ้มโค้ง']]),
    r('zoom', 'ซูมครอป', 1, 4, .01), r('ox', 'ตำแหน่งครอป X (%)', 0, 100), r('oy', 'ตำแหน่งครอป Y (%)', 0, 100),
    chk('border.on', 'กรอบ'), r('border.w', 'กรอบ: ความหนา', 1, 60, 1, e => e.border.on), col('border.color', 'กรอบ: สี', e => e.border.on),
    ...shadow(),
    r('adj.brightness', 'ความสว่าง (%)', 0, 200), r('adj.contrast', 'คอนทราสต์ (%)', 0, 200), r('adj.saturate', 'ความอิ่มสี (%)', 0, 200), r('adj.blur', 'เบลอ (px)', 0, 30, .5),
    col('tint.color', 'โทนสีทับ (ปรับเข้าธีม)'), r('tint.amt', 'โทนสีทับ (%)', 0, 100),
    sel('feather.mode', 'ขอบจาง: แบบ', [['radial', 'วงรี (radial)'], ['linear', 'ทั้ง 4 ขอบ (linear)'], ['bottom', 'ขอบล่าง']]), r('feather.amt', 'ขอบจาง (%)', 0, 60),
  ],
  shape: [
    sel('shape', 'ชนิด', [['rect', 'สี่เหลี่ยม'], ['rounded', 'สี่เหลี่ยมมุมโค้ง'], ['circle', 'วงกลม'], ['arch', 'ซุ้มโค้ง'], ['line', 'เส้น']]),
    col('fill', 'สีพื้น', e => !e.grad.on), chk('grad.on', 'ไล่เฉด'), col('grad.c1', 'ไล่เฉด: สีต้น', e => e.grad.on), col('grad.c2', 'ไล่เฉด: สีปลาย', e => e.grad.on),
    r('grad.angle', 'ไล่เฉด: มุม', 0, 360, 1, e => e.grad.on),
    r('stroke.w', 'เส้นขอบ (px)', 0, 40), col('stroke.color', 'สีเส้นขอบ', e => e.stroke.w > 0),
    r('radius', 'ความโค้งมุม', 0, 300, 1, e => e.shape === 'rounded'), ...shadow(),
  ],
  quote: [
    sel('style', 'สไตล์', QUOTE_STYLES.map((s, i) => [i, s.name])), chk('closing', 'เครื่องหมายปิด (”)'),
    col('color', 'สี', e => !e.grad.on), chk('grad.on', 'สีไล่เฉด'), col('grad.c1', 'ไล่เฉด: สีต้น', e => e.grad.on), col('grad.c2', 'ไล่เฉด: สีปลาย', e => e.grad.on),
  ],
  deco: [
    col('color', 'สี'), col('color2', 'สีที่ 2', e => e.deco === 'goldline' || e.deco === 'sparkle'),
    r('param', 'ความหนาเส้น', 1, 20, 1, e => e.deco === 'ring'), r('param', 'ระยะห่างจุด', 12, 80, 1, e => e.deco === 'dots'),
  ],
}

export const getPath = (o: any, p: string) => p.split('.').reduce((a, k) => a?.[k], o)
export function setPath(o: any, p: string, v: unknown) {
  const ks = p.split('.'), last = ks.pop()!
  ks.reduce((a, k) => a[k], o)[last] = v
}
