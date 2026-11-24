<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import './fonts'
import QuoteCanvas from './QuoteCanvas.vue'
import QuotePage from './QuotePage.vue'
import LayersPanel from './LayersPanel.vue'
import FieldList from './FieldList.vue'
import ColorField from './ColorField.vue'
import { BY_KIND, COMMON } from './fields'
import { DECOS, mkImage, mkQuote, mkShape, mkText } from './elements'
import { TEMPLATES, applyTemplate } from './templates'
import { THEMES, contrast, resolve, themeContrast } from './theme'
import { PH, PW, type Theme } from './types'
import {
  addEl, addPage, align, allThemes, assets, customThemes, delEl, delPage, dupEl, dupPage, fromJSON, hist, loadImageInto, movePage,
  nudge, order, page, project, redo, reset, saveCustomTheme, selected, setTheme, toJSON, ui, undo,
} from './store'
import { SIZES, exportPage, exportTransparent, exportZip, type SizeId } from './export'
import { download, readImage } from '../shared/export'
import { addAsset } from './store'

const stage = ref<HTMLElement>()
const zoom = ref<'fit' | number>('fit')
const fitScale = ref(.4)
const size = ref<SizeId>('a4')
const busy = ref('')
const themeName = ref('')
let ro: ResizeObserver

const scale = computed(() => (zoom.value === 'fit' ? fitScale.value : zoom.value / 100))
function fit() { const el = stage.value!; fitScale.value = Math.max(.1, Math.min((el.clientWidth - 32) / PW, (el.clientHeight - 32) / PH)) }

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase()
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
  else if (mod && k === 'y') { e.preventDefault(); redo() }
  else if (mod && k === 'd') { e.preventDefault(); dupEl() }
  else if (k === 'delete' || k === 'backspace') { if (ui.sel) { e.preventDefault(); delEl() } }
  else if (k.startsWith('arrow') && ui.sel) {
    e.preventDefault()
    const s = e.shiftKey ? 10 : 1
    nudge(k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0, k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0)
  }
}
onMounted(() => { fit(); ro = new ResizeObserver(fit); ro.observe(stage.value!); addEventListener('keydown', onKey) })
onBeforeUnmount(() => { ro?.disconnect(); removeEventListener('keydown', onKey) })

// ---------- เพิ่มองค์ประกอบ ----------
const addShape = (e: Event) => { const s = e.target as HTMLSelectElement; if (s.value) addEl(mkShape({ shape: s.value as any, name: s.selectedOptions[0].text, ...(s.value === 'line' ? { w: 400, h: 6 } : {}), ...(s.value === 'arch' ? { w: 360, h: 480 } : {}) })); s.value = '' }
const addDeco = (e: Event) => { const s = e.target as HTMLSelectElement; if (s.value) addEl((DECOS as any)[s.value].make()); s.value = '' }

// ---------- พื้นหลัง ----------
const bg = computed(() => page.value.bg)
async function pickBg(e: Event) {
  const i = e.target as HTMLInputElement, f = i.files?.[0]
  if (f) try { const r = await readImage(f); bg.value.asset = addAsset(r.src); bg.value.mode = 'image' } catch (x: any) { alert(x.message) }
  i.value = ''
}
const addStop = () => { if (bg.value.stops.length < 4) bg.value.stops.push({ color: '@accent', pos: 100 }) }
const delStop = (i: number) => { if (bg.value.stops.length > 2) bg.value.stops.splice(i, 1) }

// ---------- คำเตือน ----------
const sel = selected
const bgColors = computed(() => {
  const p = page.value, b = p.bg
  if (b.mode === 'solid') return [resolve(b.color, p.theme)]
  if (b.mode === 'linear' || b.mode === 'radial') return b.stops.map(s => resolve(s.color, p.theme))
  return []
})
const contrastWarn = computed(() => {
  const e = sel.value
  if (!e || e.kind !== 'text' || !bgColors.value.length) return ''
  const t = page.value.theme
  const cols = e.grad.on ? [resolve(e.grad.c1, t), resolve(e.grad.c2, t)] : [resolve(e.color, t)]
  const worst = Math.min(...cols.flatMap(c => bgColors.value.map(b => contrast(c, b))))
  return worst < 4.5 ? `คอนทราสต์ข้อความกับพื้นต่ำ (${worst.toFixed(1)}:1 ควรอย่างน้อย 4.5:1)` : ''
})
const dpiWarn = computed(() => {
  const e = sel.value
  if (!e || e.kind !== 'image' || !e.nw) return ''
  const dpi = Math.round(150 / (Math.max(e.w / e.nw, e.h / e.nh) * e.zoom))
  return dpi < 150 ? `ความละเอียดต่ำสำหรับพิมพ์ (~${dpi} DPI ที่ขนาดนี้) — ยัง export ได้` : ''
})
const lowContrastTheme = (t: Theme) => themeContrast(t) < 4.5
const swatch = (t: Theme) => `linear-gradient(135deg, ${t.bg1} 0 50%, ${t.accent} 50% 75%, ${t.text} 75%)`

// ---------- บันทึก ----------
async function run(name: string, fn: () => Promise<void>) {
  busy.value = name
  try { await fn() } catch (e) { alert('Export ไม่สำเร็จ: ' + e) } finally { busy.value = '' }
}
const saveJson = () => download(new Blob([toJSON()], { type: 'application/json' }), 'quote-project.json')
async function openJson(e: Event) {
  const el = e.target as HTMLInputElement
  try { if (el.files?.[0]) fromJSON(await el.files[0].text()) } catch (x: any) { alert(x.message || 'ไฟล์โปรเจกต์ไม่ถูกต้อง') }
  el.value = ''
}
const doReset = () => { if (confirm('รีเซ็ตโปรเจกต์ทั้งหมดกลับค่าเริ่มต้น?')) reset() }
const selFile = ref<HTMLInputElement>()
async function chooseImg(e: Event) {
  const i = e.target as HTMLInputElement, f = i.files?.[0], s = sel.value
  if (f && s?.kind === 'image') await loadImageInto(s, f).catch(x => alert(x.message))
  i.value = ''
}
</script>

<template>
  <div class="q-layout">
    <main class="q-stage">
      <div class="q-tools" role="toolbar" aria-label="เครื่องมือ">
        <button :disabled="!hist.canUndo" @click="undo" title="ย้อนกลับ (Ctrl+Z)">↶ ย้อน</button>
        <button :disabled="!hist.canRedo" @click="redo" title="ทำซ้ำ (Ctrl+Shift+Z)">↷ ทำซ้ำ</button>
        <span class="sep"></span>
        <button @click="addEl(mkText())">+ ข้อความ</button>
        <button @click="addEl(mkImage())">+ รูปภาพ</button>
        <select aria-label="เพิ่มรูปทรง" @change="addShape"><option value="">+ รูปทรง…</option><option value="rect">สี่เหลี่ยม</option><option value="rounded">สี่เหลี่ยมมุมโค้ง</option><option value="circle">วงกลม</option><option value="arch">ซุ้มโค้ง</option><option value="line">เส้น</option></select>
        <button @click="addEl(mkQuote())">+ “ ”</button>
        <select aria-label="เพิ่มลายตกแต่ง" @change="addDeco"><option value="">+ ลายตกแต่ง…</option><option v-for="(d, k) in DECOS" :key="k" :value="k">{{ d.name }}</option></select>
        <span class="sep"></span>
        <label class="zm">ซูม
          <select v-model="zoom" aria-label="ซูมพรีวิว"><option value="fit">พอดีหน้าจอ</option><option :value="50">50%</option><option :value="75">75%</option><option :value="100">100%</option></select>
        </label>
      </div>
      <div ref="stage" class="q-scroll"><div class="q-center"><QuoteCanvas :scale="scale" /></div></div>
      <div class="q-pages" aria-label="หน้า">
        <button v-for="(p, i) in project.pages" :key="p.id" class="th" :class="{ on: p.id === project.current }" :aria-label="`หน้า ${i + 1}`" :aria-pressed="p.id === project.current"
                @click="project.current = p.id; ui.sel = null">
          <span class="thb"><span class="ths"><QuotePage :page="p" :assets="assets" /></span></span>
          <small>{{ i + 1 }}</small>
        </button>
        <span class="sep"></span>
        <button @click="addPage">+ หน้า</button>
        <button @click="dupPage">ทำสำเนา</button>
        <button :disabled="project.pages.length < 2" @click="delPage">ลบหน้า</button>
        <button :disabled="project.pages.indexOf(page) === 0" @click="movePage(project.pages.indexOf(page), project.pages.indexOf(page) - 1)" aria-label="เลื่อนหน้าไปก่อน">◀</button>
        <button :disabled="project.pages.indexOf(page) === project.pages.length - 1" @click="movePage(project.pages.indexOf(page), project.pages.indexOf(page) + 1)" aria-label="เลื่อนหน้าไปหลัง">▶</button>
      </div>
    </main>

    <aside class="panel">
      <h1>Quote Page Maker</h1>
      <p v-if="ui.warn" class="warn">{{ ui.warn }}</p>

      <details open>
        <summary>หน้า / พื้นหลัง</summary>
        <div class="group">
          <label class="f">ชื่อหน้า<input type="text" v-model="page.name"></label>
          <div class="f">Template เริ่มต้น (เนื้อหาไม่หาย)</div>
          <div class="tpls"><button v-for="t in TEMPLATES" :key="t.id" :data-tpl="t.id" @click="applyTemplate(page, t.id)">{{ t.name }}</button></div>
          <label class="f">พื้นหลัง
            <select v-model="bg.mode" data-testid="bg-mode"><option value="solid">สีเดียว</option><option value="linear">ไล่เฉดเส้นตรง</option><option value="radial">ไล่เฉดวงกลม</option><option value="image">รูปที่อัปโหลด</option><option value="none">โปร่งใส</option></select>
          </label>
          <ColorField v-if="bg.mode === 'solid' || bg.mode === 'image'" v-model="bg.color" :theme="page.theme" :label="bg.mode === 'image' ? 'สีพื้นใต้รูป' : 'สีพื้น'" />
          <template v-if="bg.mode === 'linear' || bg.mode === 'radial'">
            <div v-for="(s, i) in bg.stops" :key="i" class="stop">
              <ColorField v-model="s.color" :theme="page.theme" :label="`จุดสี ${i + 1}`" />
              <label class="f">ตำแหน่ง {{ s.pos }}%<input type="range" v-model.number="s.pos" min="0" max="100"></label>
              <button v-if="bg.stops.length > 2" @click="delStop(i)" :aria-label="`ลบจุดสี ${i + 1}`">ลบ</button>
            </div>
            <button :disabled="bg.stops.length >= 4" @click="addStop">+ จุดสี (2-4)</button>
            <label v-if="bg.mode === 'linear'" class="f">มุม <span class="v">{{ bg.angle }}°</span><input type="range" v-model.number="bg.angle" min="0" max="360"></label>
          </template>
          <template v-if="bg.mode === 'image'">
            <label class="drop">{{ bg.asset ? 'เปลี่ยนรูปพื้นหลัง' : 'เลือกรูปพื้นหลัง' }}<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-testid="bg-file" @change="pickBg"></label>
            <label class="f">ซูม <span class="v">{{ bg.zoom }}×</span><input type="range" v-model.number="bg.zoom" min="1" max="4" step="0.01"></label>
            <label class="f">ตำแหน่ง X <span class="v">{{ bg.x }}%</span><input type="range" v-model.number="bg.x" min="0" max="100"></label>
            <label class="f">ตำแหน่ง Y <span class="v">{{ bg.y }}%</span><input type="range" v-model.number="bg.y" min="0" max="100"></label>
            <label class="f">ความโปร่งใส <span class="v">{{ bg.opacity }}</span><input type="range" v-model.number="bg.opacity" min="0" max="1" step="0.01"></label>
            <ColorField v-model="bg.tint" :theme="page.theme" label="โทนสีทับ" />
            <label class="f">โทนสีทับ <span class="v">{{ bg.tintAmt }}%</span><input type="range" v-model.number="bg.tintAmt" min="0" max="100"></label>
          </template>
          <p v-if="bg.mode === 'none'" class="hint">พื้นโปร่งใส (ในพรีวิวเห็นเป็นสีขาว)</p>
        </div>
      </details>

      <details open>
        <summary>องค์ประกอบ</summary>
        <div class="group">
          <LayersPanel />
          <template v-if="sel">
            <div class="acts">
              <button v-for="a in ([['l', '⇤', 'ชิดซ้าย'], ['c', '↔', 'กึ่งกลางแนวนอน'], ['r', '⇥', 'ชิดขวา'], ['t', '⤒', 'ชิดบน'], ['m', '↕', 'กึ่งกลางแนวตั้ง'], ['b', '⤓', 'ชิดล่าง']] as const)" :key="a[0]" :title="a[2]" :aria-label="a[2]" @click="align(a[0])">{{ a[1] }}</button>
            </div>
            <div class="acts">
              <button @click="order('front')">หน้าสุด</button><button @click="order('up')">ขึ้น</button><button @click="order('down')">ลง</button><button @click="order('back')">หลังสุด</button>
              <button @click="dupEl">ทำสำเนา</button><button @click="delEl()">ลบ</button>
            </div>
            <template v-if="sel.kind === 'text'">
              <label class="f">คำคม / ข้อความ<textarea v-model="sel.text" rows="4" data-testid="text-main"></textarea></label>
              <label class="f">ชื่อผู้กล่าว (บรรทัดเล็กใต้ข้อความ)<input type="text" v-model="sel.sub" data-testid="text-sub"></label>
            </template>
            <template v-if="sel.kind === 'image'">
              <label class="drop">{{ sel.asset ? 'เปลี่ยนรูป' : 'เลือกรูป' }}<input ref="selFile" type="file" accept="image/png,image/jpeg,image/webp" hidden data-testid="img-file" @change="chooseImg"></label>
            </template>
            <p v-if="contrastWarn" class="warn" role="status">{{ contrastWarn }}</p>
            <p v-if="dpiWarn" class="warn" role="status">{{ dpiWarn }}</p>
            <FieldList :target="sel" :fields="COMMON" :theme="page.theme" />
            <FieldList :target="sel" :fields="BY_KIND[sel.kind]" :theme="page.theme" />
          </template>
          <p v-else class="hint">คลิกองค์ประกอบบนผืนผ้าใบหรือในรายการเพื่อแก้ไข · ดับเบิลคลิกข้อความ/รูปเพื่อแก้ไข</p>
        </div>
      </details>

      <details open>
        <summary>ชุดสี</summary>
        <div class="group">
          <p class="hint">กดเลือก = ใช้กับหน้าปัจจุบัน (สีที่กำหนดเองรายองค์ประกอบยังอยู่)</p>
          <div class="themes">
            <div v-for="t in allThemes" :key="t.id" class="theme" :class="{ on: page.theme.id === t.id }">
              <button :data-theme="t.id" class="sw" :style="{ background: swatch(t) }" :aria-label="`ใช้ชุดสี ${t.name}`" @click="setTheme(t, false)"></button>
              <span class="tn">{{ t.name }}</span>
              <small v-if="lowContrastTheme(t)" class="warn">คอนทราสต์ต่ำ</small>
              <button v-if="t.id.startsWith('c')" class="x" aria-label="ลบชุดสี" @click="customThemes = customThemes.filter(c => c.id !== t.id)">×</button>
            </div>
          </div>
          <button data-testid="theme-all" @click="setTheme(page.theme, true)">ใช้ชุดสีของหน้านี้กับทุกหน้า</button>
          <label class="f">บันทึกชุดสีปัจจุบันเป็นของฉัน<input type="text" v-model="themeName" placeholder="ชื่อชุดสี"></label>
          <button @click="saveCustomTheme(themeName); themeName = ''">บันทึกชุดสี</button>
          <template v-for="c in customThemes" :key="c.id"><label class="f">เปลี่ยนชื่อ<input type="text" v-model="c.name"></label></template>
        </div>
      </details>

      <details open>
        <summary>บันทึก</summary>
        <div class="group btns">
          <label class="f">ขนาดไฟล์
            <select v-model="size" data-testid="size"><option v-for="(s, k) in SIZES" :key="k" :value="k">{{ s.label }}</option></select>
          </label>
          <button class="primary" :disabled="!!busy" @click="run('page', () => exportPage(page, assets, size))">บันทึกหน้านี้ (PNG)</button>
          <button class="primary" :disabled="!!busy" @click="run('tr', () => exportTransparent(page, assets, size))">บันทึกพื้นโปร่งใส (PNG)</button>
          <button class="primary" :disabled="!!busy" @click="run('zip', () => exportZip(project.pages, assets, size))">บันทึกทุกหน้า (ZIP)</button>
          <p v-if="busy" class="hint">กำลังสร้างไฟล์…</p>
          <hr style="width:100%">
          <button @click="saveJson">บันทึกโปรเจกต์ (.json)</button>
          <label class="drop" tabindex="0" @keydown.enter="($event.currentTarget as HTMLElement).querySelector('input')!.click()">เปิดโปรเจกต์<input type="file" accept=".json,application/json" hidden data-testid="open-json" @change="openJson"></label>
          <button @click="doReset">Reset กลับค่าเริ่มต้น</button>
        </div>
      </details>
    </aside>
  </div>
</template>
