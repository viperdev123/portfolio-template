import { reactive, watch } from 'vue'
import type { Project, Tab } from './types'
import { PRESETS } from './presets'
import { migrateToc, type Toc } from './toc/model'
import { download } from './shared/export'

const KEY = 'ptm-project-v1'
const NAMES = ['ประวัติส่วนตัว', 'ประวัติการศึกษา', 'ผลงานและเกียรติบัตร', 'ประสบการณ์ฝึกสอน']

export const uid = () => Math.random().toString(36).slice(2, 9)
export const tabNum = (t: Tab, i: number) => t.num || String(i + 1).padStart(2, '0')

export function defaults(): Project {
  const p = PRESETS[0]
  return {
    tabs: NAMES.map((th, i): Tab => ({ id: uid(), num: '', th, color: p.tabs[i] })),
    active: 0, side: 'right', top: 8, height: 82, width: 105,
    thSize: 23, numSize: 34, numGap: 20, numLineLen: 56, numLineThick: 1, font: 'Noto Sans Thai',
    textColor: p.textColor, numColor: p.numColor, numLineColor: p.numLineColor, activeColor: p.activeColor,
    activeTextColor: p.activeTextColor,
    radius: 27, shadow: true, reserve: true, cutLine: true, highlight: false, bgX: 50, bgY: 50, bgZoom: 1, bg: '',
  }
}

export function applyPreset(s: Project, i: number) {
  const { tabs, name, ...rest } = PRESETS[i]
  Object.assign(s, rest)
  s.tabs.forEach((t, k) => (t.color = tabs[k % tabs.length]))
}

function load(): Project {
  const d = defaults()
  try {
    const raw = localStorage.getItem(KEY)
    const bg = localStorage.getItem(KEY + '-bg')
    if (raw) Object.assign(d, JSON.parse(raw))
    if (bg) d.bg = bg
    // หน้าสารบัญ: โปรเจกต์เก่าไม่มีฟิลด์นี้ (undefined); ถ้ามีให้เติมค่าที่ขาดให้ครบ
    if (d.toc) { d.toc = migrateToc(d.toc); d.toc.bg = localStorage.getItem(KEY + '-tocbg') ?? '' }
  } catch { /* ข้อมูลเสียหรือถูกบล็อก ใช้ค่าเริ่มต้น */ }
  return d
}

export const state = reactive<Project>(load())
export const saveWarn = reactive({ msg: '' })

// undo/redo + บันทึกอัตโนมัติ: JSON ไม่รวมรูป (รูปแยกเก็บคนละคีย์ เพื่อให้การตั้งค่าบันทึกได้เสมอแม้รูปใหญ่เกินโควตา)
// ใน history รูปเป็น string อ้างอิงเดิม จึงไม่กินหน่วยความจำซ้ำตามจำนวนขั้น
type Snap = { j: string; bg: string; tb?: string }
const snap = (): Snap => ({ j: JSON.stringify({ ...state, bg: '', toc: state.toc && { ...state.toc, bg: '' } }), bg: state.bg, tb: state.toc?.bg })
const same = (a: Snap, b: Snap) => a.j === b.j && a.bg === b.bg && a.tb === b.tb
let stack = [snap()], idx = 0, timer: ReturnType<typeof setTimeout> | undefined
export const hist = reactive({ canUndo: false, canRedo: false })
const upd = () => { hist.canUndo = idx > 0; hist.canRedo = idx < stack.length - 1 }

function commit() {
  clearTimeout(timer); timer = undefined
  const cur = snap()
  if (same(cur, stack[idx])) return
  stack = stack.slice(0, idx + 1); stack.push(cur)
  if (stack.length > 51) stack.shift() // ย้อนได้ 50 ขั้น
  idx = stack.length - 1; upd()
}
function restore() {
  const s = stack[idx], { toc, ...rest } = JSON.parse(s.j)
  Object.assign(state, rest, { bg: s.bg })
  // ขั้นที่ยังไม่มีหน้าสารบัญ: ไม่ลบของที่สร้างไปแล้ว (TocApp ถืออ็อบเจกต์นี้อยู่)
  if (toc) setToc({ ...toc, bg: s.tb ?? '' })
  upd()
}
export function undo() { if (timer) commit(); if (idx > 0) { idx--; restore() } }
export function redo() { if (idx < stack.length - 1) { idx++; restore() } }
export function onUndoKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || !(e.ctrlKey || e.metaKey)) return // ช่องกรอกใช้ undo ของเบราว์เซอร์
  const k = e.key.toLowerCase()
  if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
  else if (k === 'y') { e.preventDefault(); redo() }
}

watch(snap, v => {
  try { localStorage.setItem(KEY, v.j) } catch { /* ignore */ }
  if (!same(v, stack[idx])) { clearTimeout(timer); timer = setTimeout(commit, 300) }
})
watch(() => state.bg, v => {
  try {
    saveWarn.msg = ''
    v ? localStorage.setItem(KEY + '-bg', v) : localStorage.removeItem(KEY + '-bg')
  } catch { saveWarn.msg = 'รูปใหญ่เกินที่เบราว์เซอร์จะจำให้อัตโนมัติ — ใช้ "บันทึกโปรเจกต์ (.json)" แทน' }
})

watch(() => state.toc?.bg, v => {
  try { v ? localStorage.setItem(KEY + '-tocbg', v) : localStorage.removeItem(KEY + '-tocbg') } catch { /* รูปใหญ่เกินโควตา: ยังเก็บใน .json ได้ */ }
})

// คงอ็อบเจกต์ toc เดิมไว้ถ้ามี เพราะ TocApp ถือ reference อยู่
function setToc(v?: Toc) { if (v && state.toc) Object.assign(state.toc, v); else state.toc = v }

export function loadProject(p: Partial<Project>) {
  const { toc, ...rest } = p
  Object.assign(state, defaults(), rest)
  setToc(toc ? migrateToc(toc) : undefined)
}
export function resetProject() { Object.assign(state, defaults()); state.toc = undefined }

export function parseProject(text: string): Partial<Project> {
  let p
  try { p = JSON.parse(text) } catch { throw new Error('ไฟล์โปรเจกต์ไม่ถูกต้อง') }
  if (p?.app === 'quote-maker') throw new Error('ไฟล์นี้เป็นของ Quote Page Maker — เปิดที่แท็บ Quote Page Maker')
  if (!Array.isArray(p?.tabs)) throw new Error('ไฟล์โปรเจกต์ไม่ถูกต้อง (ไม่ใช่ไฟล์ของแถบสารบัญ/หน้าสารบัญ)')
  return p
}
export const saveProject = () => download(new Blob([JSON.stringify(state)], { type: 'application/json' }), 'portfolio-project.json')
