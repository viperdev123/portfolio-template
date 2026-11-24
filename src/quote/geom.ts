import type { Base } from './types'

/** กรอบสี่เหลี่ยมแนวแกนที่หุ้มองค์ประกอบ (รวมการหมุน) */
export function bbox(e: Base) {
  const r = (e.rot * Math.PI) / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r))
  const w = e.w * c + e.h * s, h = e.w * s + e.h * c, cx = e.x + e.w / 2, cy = e.y + e.h / 2
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}
