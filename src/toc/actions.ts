import { state, tabNum } from '../store'
import { blankItem, defaultToc, MAX_ITEMS, MIN_ITEMS, uid, type Toc } from './model'

// สร้างข้อมูลหน้าสารบัญเมื่อผู้ใช้เปิดแท็บครั้งแรก (โปรเจกต์เก่าจะไม่มี toc จนกว่าจะเข้าหน้านี้)
export function ensureToc(): Toc {
  if (!state.toc) state.toc = defaultToc()
  return state.toc
}

// คัดลอกครั้งเดียวจากเครื่องมือแถบสารบัญ: เลขลำดับ + ชื่อหมวด (+ บรรทัดที่ 2 เป็นคำอธิบาย) ไม่มีลิงก์สดหลังจากนั้น
export function importFromTabs(t: Toc) {
  const items = state.tabs.slice(0, MAX_ITEMS).map((tab, i) => ({ ...blankItem(), id: uid(), num: tabNum(tab, i), th: tab.th, desc: tab.th2 ?? '' }))
  while (items.length < MIN_ITEMS) items.push(blankItem())
  t.items = items
}
