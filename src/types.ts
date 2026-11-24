import type { Toc } from './toc/model'

// rTop/rBottom: ความโค้งมุมนอกบน/ล่างของแถบนี้ (px); ไม่ตั้ง = ใช้ค่ารวม radius
export interface Tab { id: string; num: string; th: string; th2?: string; color: string; rTop?: number; rBottom?: number }

export interface Project {
  tabs: Tab[]
  active: number
  side: 'left' | 'right'
  top: number        // % จากขอบบน
  height: number     // % ของความสูงหน้า
  width: number      // px (หน้า 1240 กว้าง)
  thSize: number
  numSize: number
  numGap: number     // px ระหว่างเส้นใต้เลขกับชื่อ
  font: 'Noto Sans Thai' | 'Sarabun'
  textColor: string
  numColor: string
  numLineColor: string // เส้นขีดใต้เลข
  numLineLen: number   // ความยาวเส้น (% ของความกว้างแถบ)
  numLineThick: number // ความหนาเส้น (px)
  activeColor: string
  activeTextColor: string
  radius: number
  shadow: boolean
  reserve: boolean   // เว้นคอลัมน์ให้แถบ ไม่ให้พื้นหลังอยู่ใต้แถบ
  highlight: boolean // ไฮไลต์แถบ active (ค่าเริ่มต้นปิด: ทุกแถบเหมือนกัน)
  cutLine: boolean   // เส้นประสำหรับตัด
  bgX: number        // object-position %
  bgY: number
  bgZoom: number
  bg: string         // data URL หรือ ''
  toc?: Toc          // หน้าสารบัญ (ไม่มีในโปรเจกต์เก่า)
}

export const PAGE_W = 1240
export const PAGE_H = 1754
export const ACTIVE_RATIO = 1.36
export const GUTTER_PAD = 0 // แถบชิดรูป ไม่มีช่องว่างขาว
export const stripW = (p: { width: number; highlight: boolean }) =>
  Math.round(p.width * (p.highlight ? ACTIVE_RATIO : 1))
export const gutterW = (p: { width: number; highlight: boolean; reserve: boolean }) =>
  p.reserve ? stripW(p) + GUTTER_PAD : 0
