import { computed, reactive, ref, watch } from 'vue'
import type { El, Page, Project, Theme } from './types'
import { newPage, uid } from './elements'
import { THEMES } from './theme'
import { applyTemplate } from './templates'
import { bbox } from './geom'

// state แยกจากเครื่องมือแถบสารบัญโดยสิ้นเชิง (คนละ key / คนละไฟล์ .json)
const KEY = 'quote-maker:v1'
const AKEY = 'quote-maker:v1:assets'
const PKEY = 'quote-maker:presets:v1'

function initial(): Project {
  const p = newPage('หน้า 1')
  applyTemplate(p, 'text-only')
  return { pages: [p], current: p.id }
}
const read = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }

export const project = reactive<Project>(read(KEY, initial()))
export const assets = reactive<Record<string, string>>(read(AKEY, {}))
export const customThemes = ref<Theme[]>(read(PKEY, []))
export const ui = reactive<{ sel: string | null; warn: string }>({ sel: null, warn: '' })

export const page = computed<Page>(() => project.pages.find(p => p.id === project.current) ?? project.pages[0])
export const selected = computed<El | null>(() => page.value.elements.find(e => e.id === ui.sel) ?? null)

// ---------- undo / redo (snapshot ของ project; รูปเก็บแยกใน assets จึงไม่บวมตามจำนวนขั้น) ----------
const snap = () => JSON.stringify(project)
let stack = [snap()], idx = 0, timer: ReturnType<typeof setTimeout> | undefined
export const hist = reactive({ canUndo: false, canRedo: false })
const upd = () => { hist.canUndo = idx > 0; hist.canRedo = idx < stack.length - 1 }

function commit() {
  clearTimeout(timer); timer = undefined
  const cur = snap()
  if (cur === stack[idx]) return
  stack = stack.slice(0, idx + 1); stack.push(cur)
  if (stack.length > 51) stack.shift() // ย้อนได้ 50 ขั้น
  idx = stack.length - 1; upd()
}
function restore() {
  const p: Project = JSON.parse(stack[idx])
  project.pages = p.pages; project.current = p.current
  if (!selected.value) ui.sel = null
  upd()
}
export function undo() { if (timer) commit(); if (idx > 0) { idx--; restore() } }
export function redo() { if (idx < stack.length - 1) { idx++; restore() } }

const used = () => {
  const ids = new Set<string>()
  project.pages.forEach(p => { if (p.bg.asset) ids.add(p.bg.asset); p.elements.forEach(e => e.kind === 'image' && e.asset && ids.add(e.asset)) })
  return ids
}
const pick = () => Object.fromEntries([...used()].filter(k => assets[k]).map(k => [k, assets[k]]))
let saveT: ReturnType<typeof setTimeout> | undefined
watch(snap, s => {
  if (s !== stack[idx]) { clearTimeout(timer); timer = setTimeout(commit, 300) }
  clearTimeout(saveT)
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, s); ui.warn = '' } catch { /* ignore */ }
    try { localStorage.setItem(AKEY, JSON.stringify(pick())) } catch { ui.warn = 'รูปใหญ่เกินที่เบราว์เซอร์จะจำให้อัตโนมัติ — ใช้ "บันทึกโปรเจกต์ (.json)" เพื่อเก็บรูป' }
  }, 400)
})
watch(customThemes, v => { try { localStorage.setItem(PKEY, JSON.stringify(v)) } catch { /* ignore */ } }, { deep: true })
watch(() => Object.keys(assets).length, () => { saveT = setTimeout(() => {
  try { localStorage.setItem(AKEY, JSON.stringify(pick())) } catch { ui.warn = 'รูปใหญ่เกินที่เบราว์เซอร์จะจำให้อัตโนมัติ — ใช้ "บันทึกโปรเจกต์ (.json)" เพื่อเก็บรูป' }
}, 400) })

// ---------- ไฟล์โปรเจกต์ ----------
export const toJSON = () => JSON.stringify({ app: 'quote-maker', version: 1, project, assets: pick() })
export function fromJSON(text: string) {
  const d = JSON.parse(text)
  if (d?.app !== 'quote-maker' || d.version !== 1 || !Array.isArray(d.project?.pages) || !d.project.pages.length) throw new Error('ไม่ใช่ไฟล์โปรเจกต์ Quote Page Maker')
  project.pages = d.project.pages; project.current = d.project.current
  Object.keys(assets).forEach(k => delete assets[k]); Object.assign(assets, d.assets ?? {})
  if (!project.pages.some(p => p.id === project.current)) project.current = project.pages[0].id
  ui.sel = null; stack = [snap()]; idx = 0; upd()
}
export function reset() {
  const p = initial()
  project.pages = p.pages; project.current = p.current
  Object.keys(assets).forEach(k => delete assets[k]); ui.sel = null
  commit()
}

export const addAsset = (src: string) => { const id = 'a' + uid(); assets[id] = src; return id }

// ---------- องค์ประกอบ ----------
const els = () => page.value.elements
export function addEl(e: El) { els().push(e); ui.sel = e.id }
export function delEl(id = ui.sel) { const a = els(), i = a.findIndex(e => e.id === id); if (i >= 0) { a.splice(i, 1); ui.sel = null } }
export function dupEl() {
  const a = els(), i = a.findIndex(e => e.id === ui.sel); if (i < 0) return
  const c: El = JSON.parse(JSON.stringify(a[i]))
  c.id = uid(); c.name += ' สำเนา'; c.x += 30; c.y += 30; c.tpl = false; delete c.slot
  a.splice(i + 1, 0, c); ui.sel = c.id
}
export function order(op: 'front' | 'back' | 'up' | 'down') {
  const a = els(), i = a.findIndex(e => e.id === ui.sel); if (i < 0) return
  const j = { front: a.length - 1, back: 0, up: Math.min(i + 1, a.length - 1), down: Math.max(i - 1, 0) }[op]
  const [e] = a.splice(i, 1); a.splice(j, 0, e)
}
export function moveLayer(from: number, to: number) { const a = els(); const [e] = a.splice(from, 1); a.splice(to, 0, e) }
export function align(op: 'l' | 'c' | 'r' | 't' | 'm' | 'b') {
  const e = selected.value; if (!e) return
  const b = bbox(e)
  if (op === 'l') e.x -= b.x
  if (op === 'c') e.x += 620 - (b.x + b.w / 2)
  if (op === 'r') e.x += 1240 - (b.x + b.w)
  if (op === 't') e.y -= b.y
  if (op === 'm') e.y += 877 - (b.y + b.h / 2)
  if (op === 'b') e.y += 1754 - (b.y + b.h)
}
export function nudge(dx: number, dy: number) { const e = selected.value; if (e && !e.locked) { e.x += dx; e.y += dy } }

// ---------- หน้า ----------
export function addPage() { const p = newPage(`หน้า ${project.pages.length + 1}`, page.value.theme); applyTemplate(p, 'text-only'); project.pages.push(p); project.current = p.id; ui.sel = null }
export function dupPage() {
  const c: Page = JSON.parse(JSON.stringify(page.value))
  c.id = uid(); c.name += ' สำเนา'; c.elements.forEach(e => (e.id = uid()))
  project.pages.splice(project.pages.indexOf(page.value) + 1, 0, c); project.current = c.id; ui.sel = null
}
export function delPage() {
  if (project.pages.length < 2) return
  const i = project.pages.indexOf(page.value); project.pages.splice(i, 1)
  project.current = project.pages[Math.min(i, project.pages.length - 1)].id; ui.sel = null
}
export function movePage(from: number, to: number) {
  if (to < 0 || to >= project.pages.length) return
  const [p] = project.pages.splice(from, 1); project.pages.splice(to, 0, p)
}

// ---------- ชุดสี ----------
export function setTheme(t: Theme, all: boolean) {
  for (const p of all ? project.pages : [page.value]) p.theme = { ...t, mids: [...t.mids] }
}
export function saveCustomTheme(name: string) {
  const t = page.value.theme
  customThemes.value.push({ ...t, mids: [...t.mids], id: 'c' + uid(), name: name || `ชุดสีของฉัน ${customThemes.value.length + 1}` })
}
export const allThemes = computed(() => [...THEMES, ...customThemes.value])
