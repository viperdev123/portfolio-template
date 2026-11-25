import { ref } from 'vue'
import { filledPanel, specOf, type Toc, type TocItem } from './model'
import { PAGE_H, PAGE_W } from '../types'

// ---------- การวัดข้อความ (canvas) ----------
export const fontTick = ref(0) // เพิ่มค่าเมื่อฟอนต์โหลดเสร็จ เพื่อให้เลย์เอาต์คำนวณใหม่
if (typeof document !== 'undefined' && document.fonts) document.fonts.addEventListener('loadingdone', () => fontTick.value++)

let ctx: CanvasRenderingContext2D | null = null
export type Measure = (text: string, font: string, weight: number, px: number) => number
export const measure: Measure = (text, font, weight, px) => {
  ctx ??= document.createElement('canvas').getContext('2d')!
  ctx.font = `${weight} ${px}px '${font}', 'Noto Sans Thai', sans-serif`
  return ctx.measureText(text).width
}

// ---------- ตัดบรรทัดไทย: ตัดที่ขอบคำ (Intl.Segmenter) ไม่ตัดกลางคำ ไม่แยกสระ/วรรณยุกต์ ----------
const Seg = (Intl as any).Segmenter
const segW = Seg ? new Seg('th', { granularity: 'word' }) : null
const segG = Seg ? new Seg('th', { granularity: 'grapheme' }) : null
const words = (s: string): string[] => segW ? [...segW.segment(s)].map((x: any) => x.segment) : s.split(/(?<=\s)/)
const graphemes = (s: string): string[] => segG ? [...segG.segment(s)].map((x: any) => x.segment) : [...s]
const GLUE = /^[ๆฯ,.;:!?)\]}”’%…]+$/ // เครื่องหมายที่ห้ามขึ้นต้นบรรทัด ให้ติดกับคำก่อนหน้า

export function wrapText(text: string, maxW: number, width: (s: string) => number, maxLines: number): { lines: string[]; truncated: boolean } {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return { lines: [], truncated: false }
  const toks: string[] = []
  for (const w of words(clean)) GLUE.test(w) && toks.length ? (toks[toks.length - 1] += w) : toks.push(w)
  const lines: string[] = []
  let cur = ''
  for (let tok of toks) {
    if (width(cur + tok) <= maxW) { cur += tok; continue }
    if (cur.trim()) { lines.push(cur.trimEnd()); cur = '' }
    tok = tok.trimStart()
    if (width(tok) <= maxW) { cur = tok; continue }
    for (const g of graphemes(tok)) { // คำเดียวยาวเกินบรรทัด: ตัดตาม grapheme cluster เท่านั้น
      if (!cur || width(cur + g) <= maxW) cur += g
      else { lines.push(cur); cur = g }
    }
  }
  if (cur.trim()) lines.push(cur.trimEnd())
  if (lines.length <= maxLines) return { lines, truncated: false }
  const head = lines.slice(0, maxLines - 1)
  const gs = graphemes(lines.slice(maxLines - 1).join(' '))
  while (gs.length && width(gs.join('') + '…') > maxW) gs.pop()
  return { lines: [...head, gs.join('').trimEnd() + '…'], truncated: true }
}

export const localize = (s: string, numerals: Toc['numerals']) =>
  numerals === 'thai' ? s.replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[+d]) : s

// ---------- เรขาคณิต ----------
export interface RowGeo {
  item: TocItem; i: number; y: number; h: number
  numText: string; pageText: string
  th: string[]; en: string; desc: string
  thTop: number; enTop: number; descTop: number
  leader: { x: number; w: number; y: number } | null
}
export interface Geo {
  rows: RowGeo[]; f: number; rowH: number; gap: number; truncated: boolean
  tSize: number; nSize: number; eSize: number; dSize: number; pSize: number; lineH: number; eLine: number; dLine: number
  headTop: number; headLine: number; ornTop: number
  listL: number; listR: number; innerL: number; innerR: number
  numX: number; numW: number; titleX: number; titleW: number; pageX: number; pageW: number
  circleD: number; capH: number; barW: number
  groupTop: number; groupH: number; contentTop: number
  veil: { x: number; y: number; w: number; h: number } | null
}

export const LIST_L = 120, LIST_R = PAGE_W - 120

export function computeGeo(t: Toc, m: Measure): Geo {
  const n = t.items.length, sp = specOf(t), cards = !!sp.panel, circle = !!sp.badge && sp.badge !== 'block', block = sp.badge === 'block', cap = !!sp.cap
  const headTop = 150, headLine = Math.round(t.headingSize * 1.3)
  const ornTop = headTop + headLine + 14
  const contentTop = ornTop + (t.ornament === 'none' ? 0 : 28) + 70
  const BOTTOM = PAGE_H - t.bottomSafe
  const avail = BOTTOM - contentTop
  const numFont = t.numFont || t.titleFont
  const numText = (it: TocItem, i: number) => localize(it.num.trim() || String(i + 1).padStart(2, '0'), t.numerals)
  const pageText = (it: TocItem, i: number) => localize(it.page.trim() || String(t.startPage + i), t.numerals)

  const build = (f: number) => {
    const tSize = t.titleSize * f, nSize = t.numSize * f * (sp.big ? 1.5 : 1), eSize = tSize * .58, dSize = tSize * .56, pSize = tSize * 1.02
    const lineH = tSize * 1.32, eLine = eSize * 1.45, dLine = dSize * 1.45
    const cardPad = cards ? 38 : 0, barW = sp.panel === 'card' && !block && t.barOn ? 12 : 0
    const innerL = block ? LIST_L : LIST_L + barW + cardPad, innerR = LIST_R - cardPad
    const nums = t.items.map(numText), pages = t.items.map(pageText)
    const numTextW = Math.max(...nums.map(s => m(s, numFont, t.numWeight, nSize)))
    const circleD = circle ? Math.round(Math.max(nSize * 2.1, numTextW + nSize * .9)) : 0
    const numW = Math.ceil(circle ? circleD : block ? Math.max(nSize * 1.8, numTextW + nSize * .9) : numTextW)
    const pageTextW = t.showPage ? Math.ceil(Math.max(...pages.map(s => m(s, numFont, t.numWeight, pSize)))) : 0
    const capPad = cap && t.showPage ? pSize * .75 : 0
    const pageW = t.showPage ? Math.ceil(pageTextW + capPad * 2) : 0
    const capH = cap && t.showPage ? Math.round(pSize * 1.95) : 0
    const numGap = Math.max(26, nSize * .5) + (sp.big ? 20 : 0) // เลขใหญ่: เว้นที่ให้เส้นคั่นแนวตั้ง
    const titleX = innerL + numW + numGap
    const leaderMin = t.leader !== 'none' && t.showPage ? 80 : 24
    const titleW = innerR - pageW - (t.showPage ? 20 : 0) - titleX - leaderMin
    let truncated = false
    const blocks = t.items.map(it => {
      const th = wrapText(it.th, titleW, s => m(s, t.titleFont, t.titleWeight, tSize), 2)
      const en = wrapText(it.en, titleW, s => m(s, t.titleFont, 400, eSize), 1)
      const de = wrapText(it.desc, titleW, s => m(s, t.titleFont, 400, dSize), 1)
      truncated ||= th.truncated || en.truncated || de.truncated
      const h = Math.max(1, th.lines.length) * lineH + (en.lines.length ? eLine + 4 : 0) + (de.lines.length ? dLine + 4 : 0)
      return { th: th.lines, en: en.lines[0] ?? '', desc: de.lines[0] ?? '', h, lastW: m(th.lines[th.lines.length - 1] ?? '', t.titleFont, t.titleWeight, tSize) }
    })
    const padV = tSize * (cards ? .7 : .55)
    const need = Math.ceil(Math.max(
      Math.max(...blocks.map(x => x.h)) + padV * 2,
      circle ? Math.max(circleD, capH) + padV * 1.2 : nSize * 1.2 + padV,
    ))
    return { tSize, nSize, eSize, dSize, pSize, lineH, eLine, dLine, barW, innerL, innerR, nums, pages, numW, pageW, circleD, capH, titleX, titleW, blocks, need, truncated }
  }

  // ตัวหนังสือเล็กลงอัตโนมัติเมื่อมีเกิน 6 รายการ และลดเพิ่มจนพอดีพื้นที่
  let f = n > 6 ? Math.max(.62, 1 - (n - 6) * .08) : 1
  let b = build(f)
  while (n * b.need + (n - 1) * t.rowGap > avail && f > .4) { f -= .03; b = build(f) }

  const gap = t.rowGap
  let rowH = b.need
  if (t.autoDistribute) {
    const cap = Math.max(b.need, Math.round(b.tSize * 6.2)) // จำกัดความสูงสูงสุด ไม่ให้แถวยืดเมื่อรายการน้อย
    rowH = Math.max(b.need, Math.min(cap, Math.floor((avail - (n - 1) * gap) / n)))
  }
  const groupH = n * rowH + (n - 1) * gap
  const groupTop = Math.round(t.autoDistribute ? contentTop + (avail - groupH) / 2 : contentTop)

  const rows: RowGeo[] = t.items.map((item, i) => {
    const bl = b.blocks[i], y = groupTop + i * (rowH + gap)
    const thTop = y + (rowH - bl.h) / 2 // บล็อกข้อความจัดกึ่งกลางแนวตั้งเสมอ
    const enTop = thTop + bl.th.length * b.lineH + 4
    const descTop = enTop + (bl.en ? b.eLine : 0) + 4
    const lx = b.titleX + bl.lastW + 16, lr = b.innerR - b.pageW - 16
    const leader = t.leader !== 'none' && t.showPage && lr - lx >= 30
      ? { x: lx, w: lr - lx, y: thTop + (bl.th.length - 1) * b.lineH + b.lineH * .82 } : null
    return { item, i, y, h: rowH, numText: b.nums[i], pageText: b.pages[i], th: bl.th, en: bl.en, desc: bl.desc, thTop, enTop, descTop, leader }
  })

  return {
    rows, f, rowH, gap, truncated: b.truncated,
    tSize: b.tSize, nSize: b.nSize, eSize: b.eSize, dSize: b.dSize, pSize: b.pSize, lineH: b.lineH, eLine: b.eLine, dLine: b.dLine,
    headTop, headLine, ornTop, listL: LIST_L, listR: LIST_R, innerL: b.innerL, innerR: b.innerR,
    numX: b.innerL, numW: b.numW, titleX: b.titleX, titleW: b.titleW, pageX: b.innerR - b.pageW, pageW: b.pageW,
    circleD: b.circleD, capH: b.capH, barW: b.barW, groupTop, groupH, contentTop,
    veil: t.veil && !filledPanel(sp) ? { x: LIST_L - 56, y: groupTop - 44, w: LIST_R - LIST_L + 112, h: groupH + 88 } : null,
  }
}
