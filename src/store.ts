import { reactive, watch } from 'vue'
import type { Project, Tab } from './types'
import { PRESETS } from './presets'
import { migrateToc } from './toc/model'

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

// รูปแยกเก็บคนละคีย์ เพื่อให้การตั้งค่าบันทึกได้เสมอแม้รูปใหญ่เกินโควตา
watch(() => ({ ...state, bg: '', toc: state.toc && { ...state.toc, bg: '' } }), v => {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ }
}, { deep: true })
watch(() => state.bg, v => {
  try {
    saveWarn.msg = ''
    v ? localStorage.setItem(KEY + '-bg', v) : localStorage.removeItem(KEY + '-bg')
  } catch { saveWarn.msg = 'รูปใหญ่เกินที่เบราว์เซอร์จะจำให้อัตโนมัติ — ใช้ "บันทึกโปรเจกต์ (.json)" แทน' }
})

watch(() => state.toc?.bg, v => {
  try { v ? localStorage.setItem(KEY + '-tocbg', v) : localStorage.removeItem(KEY + '-tocbg') } catch { /* รูปใหญ่เกินโควตา: ยังเก็บใน .json ได้ */ }
})

export function loadProject(p: Partial<Project>) {
  Object.assign(state, defaults(), p)
  state.toc = p.toc ? migrateToc(p.toc) : undefined
}
export function resetProject() { Object.assign(state, defaults()); state.toc = undefined }
