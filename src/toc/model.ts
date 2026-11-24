import { PRESETS } from '../presets'

export type TocLayout = 'list' | 'cards' | 'circle'
export interface TocItem {
  id: string
  num: string    // '' = ลำดับอัตโนมัติ 01, 02…
  th: string
  en: string
  desc: string
  page: string   // '' = เติมอัตโนมัติจากลำดับ + หน้าเริ่มต้น
  color: string  // '' = ใช้สีเลขรวม
}

// ฟิลด์สีที่เป็น '' = ตามพรีเซ็ต (+ ปรับคอนทราสต์อัตโนมัติ)
export interface Toc {
  items: TocItem[]
  layout: TocLayout
  preset: number
  numerals: 'thai' | 'arabic'
  startPage: number
  showPage: boolean
  heading: string
  headingFont: string
  headingSize: number
  headingColor: string
  ornament: 'diamond' | 'double' | 'none'
  titleFont: string
  numFont: string          // '' = ฟอนต์เดียวกับข้อความ
  titleSize: number
  numSize: number
  titleWeight: number
  numWeight: number
  titleColor: string
  numColor: string
  perItemColor: boolean
  rowGap: number
  bottomSafe: number       // ระยะปลอดภัยด้านล่าง (px) ที่รายการต้องไม่ล้ำ
  autoDistribute: boolean
  leader: 'dots' | 'dashes' | 'none'
  ruleOn: boolean
  ruleColor: string        // '' = สีทองของพรีเซ็ต; ใช้กับเส้นคั่น เส้นใต้หัวเรื่อง เส้นนำ วงกลม แถบการ์ด
  ruleThick: number
  radius: number
  shadow: boolean
  cardOpacity: number      // 40-95
  barOn: boolean
  circleOutline: boolean
  capsuleOutline: boolean
  veil: boolean
  veilOpacity: number
  veilFeather: number
  bgSource: 'shared' | 'own' | 'none'
  bg: string
  bgX: number
  bgY: number
  bgZoom: number
  inZip: boolean
}

export const MIN_ITEMS = 3
export const MAX_ITEMS = 10
export const uid = () => Math.random().toString(36).slice(2, 9)
export const blankItem = (): TocItem => ({ id: uid(), num: '', th: 'หัวข้อใหม่', en: '', desc: '', page: '', color: '' })

export function defaultToc(): Toc {
  const it = (th: string, en: string): TocItem => ({ ...blankItem(), th, en })
  return {
    items: [
      it('ประวัติส่วนตัว', 'Personal Profile'), it('ประวัติการศึกษา', 'Education'),
      it('ผลงานและเกียรติบัตร', 'Achievements & Certificates'), it('ประสบการณ์ฝึกสอน', 'Teaching Experience'),
      it('กิจกรรมและจิตอาสา', 'Activities & Volunteering'), it('ภาคผนวก', 'Appendix'),
    ],
    layout: 'list', preset: 0, numerals: 'thai', startPage: 1, showPage: true,
    heading: 'สารบัญ', headingFont: 'Noto Sans Thai', headingSize: 72, headingColor: '', ornament: 'diamond',
    titleFont: 'Noto Sans Thai', numFont: '', titleSize: 38, numSize: 66, titleWeight: 600, numWeight: 700,
    titleColor: '', numColor: '', perItemColor: false,
    rowGap: 20, bottomSafe: 150, autoDistribute: true, leader: 'dots', ruleOn: true, ruleColor: '', ruleThick: 2,
    radius: 26, shadow: true, cardOpacity: 80, barOn: true, circleOutline: true, capsuleOutline: true,
    veil: false, veilOpacity: 70, veilFeather: 60,
    bgSource: 'shared', bg: '', bgX: 50, bgY: 50, bgZoom: 1, inZip: true,
  }
}

const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)

// รับข้อมูลจากโปรเจกต์เก่า/ไฟล์ .json ที่อาจขาดฟิลด์หรือค่าผิดรูป แล้วเติมค่าเริ่มต้นให้ครบ
export function migrateToc(raw: unknown): Toc {
  const d = defaultToc()
  if (!raw || typeof raw !== 'object') return d
  const r = { ...d, ...(raw as Partial<Toc>) } as Toc
  r.items = Array.isArray((raw as Toc).items) && (raw as Toc).items.length
    ? (raw as Toc).items.slice(0, MAX_ITEMS).map(i => ({ ...blankItem(), ...i, id: i?.id || uid() }))
    : d.items
  while (r.items.length < MIN_ITEMS) r.items.push(blankItem())
  if (!['list', 'cards', 'circle'].includes(r.layout)) r.layout = 'list'
  r.preset = Math.round(num(r.preset, 0, 0, PRESETS.length - 1))
  r.cardOpacity = num(r.cardOpacity, 80, 40, 95)
  r.bottomSafe = num(r.bottomSafe, 150, 40, 600)
  r.veilOpacity = num(r.veilOpacity, 70, 0, 100)
  r.veilFeather = num(r.veilFeather, 60, 0, 200)
  r.bgZoom = num(r.bgZoom, 1, 1, 3)
  r.startPage = Math.round(num(r.startPage, 1, 0, 999))
  r.bg = typeof r.bg === 'string' ? r.bg : ''
  return r
}
