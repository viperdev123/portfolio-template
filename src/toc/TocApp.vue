<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PAGE_H, PAGE_W } from '../types'
import { hist, loadProject, onUndoKey, parseProject, redo, saveProject, saveWarn, state, undo } from '../store'
import { useFit, useRememberPanels } from '../shared/ui'
import { PRESETS } from '../presets'
import { readImage } from '../shared/export'
import { exportZip } from '../export'
import { FONTS } from '../quote/fonts'
import TocCanvas from './TocCanvas.vue'
import { blankItem, defaultToc, filledBadge, filledPanel, LAYOUTS, MAX_ITEMS, MIN_ITEMS, specOf, type TocLayout } from './model'
import { ensureToc, importFromTabs } from './actions'
import { contrastReport, listRect, resolveColors, sampleBackdrop, type Backdrop } from './palette'
import { WHITE } from './color'
import { bgOf, exportToc, exportTocTransparent } from './export'
import { computeGeo, fontTick, measure } from './layout'

const t = ensureToc()
const stage = ref<HTMLElement>()
const jf = ref<HTMLInputElement>()
const bgf = ref<HTMLInputElement>()
const scale = useFit(stage, PAGE_W, PAGE_H)
const busy = ref('')
const err = ref('')
useRememberPanels()
onMounted(() => addEventListener('keydown', onUndoKey))
onBeforeUnmount(() => removeEventListener('keydown', onUndoKey))

// โหลดฟอนต์ที่เลือก แล้วให้เลย์เอาต์วัดข้อความใหม่
watch(() => [t.titleFont, t.headingFont, t.numFont], async () => {
  const fs = new Set([t.titleFont, t.headingFont, t.numFont || t.titleFont])
  await Promise.all([...fs].flatMap(f => ['400', '600', '700'].map(w => document.fonts.load(`${w} 30px '${f}'`, 'กขค 0123456789 ๐๑๒'))))
  fontTick.value++
}, { immediate: true })

const geo = computed(() => (fontTick.value, computeGeo(t, measure)))
const bg = computed(() => bgOf(t, state.bg))
const flat = { mean: WHITE, lo: WHITE, hi: WHITE }
const bd = ref<Backdrop>({ head: flat, list: flat })
let token = 0
watch([bg, () => t.bgX, () => t.bgY, () => t.bgZoom, () => geo.value.groupTop, () => geo.value.groupH], async () => {
  const my = ++token, r = await sampleBackdrop(bg.value, t.bgX, t.bgY, t.bgZoom, listRect(geo.value))
  if (my === token) bd.value = r
}, { immediate: true })
const colors = computed(() => resolveColors(t, bd.value))
const checks = computed(() => contrastReport(t, colors.value))
const bad = computed(() => checks.value.filter(c => !c.ok))

const add = () => { if (t.items.length < MAX_ITEMS) t.items.push(blankItem()) }
const del = (i: number) => { if (t.items.length > MIN_ITEMS) t.items.splice(i, 1) }
function move(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= t.items.length) return
  ;[t.items[i], t.items[j]] = [t.items[j], t.items[i]]
}
const doImport = () => { if (confirm('นำเข้าแทนที่รายการปัจจุบันทั้งหมดด้วยหมวดจากแถบสารบัญ? (คัดลอกครั้งเดียว ไม่เชื่อมต่อกัน)')) importFromTabs(t) }
const autoPage = (i: number) => String(t.startPage + i)

async function onBg(e: Event) {
  const el = e.target as HTMLInputElement
  err.value = ''
  try { if (el.files?.[0]) { t.bg = (await readImage(el.files[0])).src; t.bgSource = 'own' } } catch (x: any) { err.value = x.message }
  el.value = ''
}

async function run(fn: () => Promise<void>) {
  busy.value = 'กำลังสร้างไฟล์…'; err.value = ''
  try { await fn() } catch (e) { err.value = 'Export ไม่สำเร็จ: ' + e } finally { busy.value = '' }
}
const zip = () => run(() => exportZip(state, (d, n) => (busy.value = `กำลังสร้างไฟล์… ${d}/${n}`)))
async function openJson(e: Event) {
  const el = e.target as HTMLInputElement
  err.value = ''
  try {
    // ไฟล์ที่ไม่มีหน้าสารบัญ: ใช้ค่าเริ่มต้น (loadProject คงอ็อบเจกต์ t เดิมไว้)
    if (el.files?.[0]) { const p = parseProject(await el.files[0].text()); loadProject({ ...p, toc: p.toc ?? defaultToc() }) }
  } catch (x: any) { err.value = x.message }
  el.value = ''
}
const resetToc = () => { if (confirm('รีเซ็ตหน้าสารบัญกลับค่าเริ่มต้น (รวมรูปพื้นหลังของหน้านี้)?')) Object.assign(t, defaultToc()) }

const sp = computed(() => specOf(t))
const layoutIds = Object.keys(LAYOUTS) as TocLayout[]
const sliders = [
  ['headingSize', 'ขนาดหัวเรื่อง', 36, 120], ['titleSize', 'ขนาดชื่อหัวข้อ', 22, 60], ['numSize', 'ขนาดเลขลำดับ', 24, 110],
  ['rowGap', 'ระยะห่างระหว่างแถว (px)', 0, 80], ['bottomSafe', 'ระยะปลอดภัยด้านล่าง (px)', 40, 600], ['ruleThick', 'ความหนาเส้น (px)', 1, 8], ['radius', 'ความโค้งมุมการ์ด', 0, 60],
] as const
const colorFields = [
  ['headingColor', 'สีหัวเรื่อง'], ['titleColor', 'สีชื่อหัวข้อ'], ['numColor', 'สีเลขลำดับ'], ['ruleColor', 'สีเส้น/ตกแต่ง'],
] as const
</script>

<template>
  <div class="layout">
    <main class="stage" ref="stage">
      <div class="stage-box" :style="{ width: PAGE_W * scale + 'px', height: PAGE_H * scale + 'px' }">
        <div class="scaled" data-testid="toc-preview" :style="{ transform: `scale(${scale})`, width: PAGE_W + 'px', height: PAGE_H + 'px' }">
          <TocCanvas :toc="t" :bg="bg" :colors="colors" />
        </div>
      </div>
      <p class="hint">หน้าสารบัญ A4 · {{ PAGE_W }}×{{ PAGE_H }} px → export 2480×3508 px · ไม่มีแถบข้างบนหน้านี้</p>
    </main>

    <aside class="panel">
      <h1>หน้าสารบัญ</h1>
      <div class="undo">
        <button :disabled="!hist.canUndo" @click="undo" title="ย้อนกลับ (Ctrl+Z)">↶ ย้อน</button>
        <button :disabled="!hist.canRedo" @click="redo" title="ทำซ้ำ (Ctrl+Shift+Z)">↷ ทำซ้ำ</button>
      </div>
      <p v-if="err" class="warn" role="alert">{{ err }}</p>

      <details open>
        <summary>รายการ ({{ t.items.length }}/{{ MAX_ITEMS }})</summary>
        <div class="group">
          <button data-testid="import-tabs" @click="doImport">นำเข้าจากแถบสารบัญ</button>
          <div v-for="(it, i) in t.items" :key="it.id" class="tabrow" data-testid="toc-item">
            <div class="top">
              <b>{{ i + 1 }}</b><span style="flex:1"></span>
              <button @click="move(i, -1)" :disabled="i === 0" aria-label="เลื่อนขึ้น">↑</button>
              <button @click="move(i, 1)" :disabled="i === t.items.length - 1" aria-label="เลื่อนลง">↓</button>
              <button @click="del(i)" :disabled="t.items.length <= MIN_ITEMS" aria-label="ลบรายการ">ลบ</button>
            </div>
            <div class="grid">
              <input type="text" v-model="it.num" :placeholder="String(i + 1).padStart(2, '0')" aria-label="เลขลำดับ">
              <input type="text" v-model="it.th" placeholder="ชื่อไทย" aria-label="ชื่อไทย">
              <input type="text" v-model="it.page" :placeholder="autoPage(i)" aria-label="เลขหน้า" style="width:60px">
            </div>
            <input type="text" v-model="it.en" placeholder="ชื่ออังกฤษ (ไม่บังคับ)" aria-label="ชื่ออังกฤษ">
            <input type="text" v-model="it.desc" placeholder="คำอธิบายบรรทัดที่ 2 (ไม่บังคับ)" aria-label="คำอธิบาย">
            <label v-if="t.perItemColor" class="f row">{{ filledBadge(sp) ? 'สีป้ายเลขของรายการนี้' : 'สีเลขของรายการนี้' }}
              <span><input type="color" :value="it.color || colors.num" @input="it.color = ($event.target as HTMLInputElement).value">
                <button v-if="it.color" @click="it.color = ''">ล้าง</button></span></label>
          </div>
          <button @click="add" :disabled="t.items.length >= MAX_ITEMS">+ เพิ่มรายการ</button>
          <label class="f">หน้าเริ่มต้น (page offset)<input type="number" v-model.number="t.startPage" min="0" max="999" class="num"></label>
          <label class="f row">แสดงเลขหน้า<input type="checkbox" v-model="t.showPage"></label>
          <button @click="t.items.forEach(i => (i.page = ''))">เลขหน้าทั้งหมดกลับเป็นอัตโนมัติ</button>
          <label class="f">ตัวเลข
            <select v-model="t.numerals"><option value="thai">เลขไทย ๐๑ ๐๒</option><option value="arabic">เลขอารบิก 01 02</option></select>
          </label>
        </div>
      </details>

      <details open>
        <summary>เลย์เอาต์</summary>
        <div class="group">
          <div class="layouts">
            <button v-for="k in layoutIds" :key="k" :data-layout="k" :class="{ on: t.layout === k }" :aria-pressed="t.layout === k" @click="t.layout = k">
              <span class="lthumb" aria-hidden="true"><span class="lths"><TocCanvas :toc="{ ...t, layout: k }" :bg="bg" :colors="colors" /></span></span>
              <small>{{ LAYOUTS[k].name }}</small>
            </button>
          </div>
          <label class="f row">กระจายความสูงอัตโนมัติ<input type="checkbox" v-model="t.autoDistribute"></label>
          <label v-if="sp.panel && sp.panel !== 'outline'" class="f">ความทึบพื้นแถว <span class="v">{{ t.cardOpacity }}%</span><input type="range" v-model.number="t.cardOpacity" min="40" max="95"></label>
          <template v-if="!filledPanel(sp)">
            <label class="f row">ม่านช่วยอ่าน (reading veil)<input type="checkbox" data-testid="veil" v-model="t.veil"></label>
            <template v-if="t.veil">
              <label class="f">ความทึบม่าน <span class="v">{{ t.veilOpacity }}%</span><input type="range" v-model.number="t.veilOpacity" min="0" max="100"></label>
              <label class="f">ความฟุ้งของขอบ <span class="v">{{ t.veilFeather }}px</span><input type="range" v-model.number="t.veilFeather" min="0" max="200"></label>
            </template>
          </template>
          <p v-if="geo.f < 1" class="hint">ลดขนาดตัวอักษรอัตโนมัติเหลือ {{ Math.round(geo.f * 100) }}% เพื่อให้พอดีหน้า</p>
          <p v-if="geo.truncated" class="warn">มีข้อความยาวเกินจนถูกตัดด้วย … (ชื่อไทยสูงสุด 2 บรรทัด)</p>
        </div>
      </details>

      <details open>
        <summary>หัวเรื่อง</summary>
        <div class="group">
          <input type="text" v-model="t.heading" aria-label="ข้อความหัวเรื่อง">
          <label class="f">ฟอนต์หัวเรื่อง<select v-model="t.headingFont"><option v-for="f in FONTS" :key="f">{{ f }}</option></select></label>
          <label class="f">เส้นใต้หัวเรื่อง
            <select v-model="t.ornament"><option value="diamond">เส้นทองมีข้าวหลามตัดตรงกลาง</option><option value="double">เส้นคู่บาง</option><option value="none">ไม่มี</option></select>
          </label>
        </div>
      </details>

      <details open>
        <summary>ตัวอักษรและสี</summary>
        <div class="group">
          <div class="presets">
            <button v-for="(p, i) in PRESETS" :key="p.name" :class="{ primary: t.preset === i }" @click="t.preset = i">{{ p.name }}</button>
          </div>
          <label class="f">ฟอนต์ข้อความ<select v-model="t.titleFont"><option v-for="f in FONTS" :key="f">{{ f }}</option></select></label>
          <label class="f">ฟอนต์ตัวเลข<select v-model="t.numFont"><option value="">เหมือนข้อความ</option><option v-for="f in FONTS" :key="f">{{ f }}</option></select></label>
          <label class="f">น้ำหนักชื่อหัวข้อ<select v-model.number="t.titleWeight"><option :value="400">400</option><option :value="600">600</option><option :value="700">700</option></select></label>
          <label class="f">น้ำหนักตัวเลข<select v-model.number="t.numWeight"><option :value="400">400</option><option :value="600">600</option><option :value="700">700</option></select></label>
          <label v-for="[k, name, min, max] in sliders" :key="k" class="f">{{ name }} <span class="v">{{ t[k] }}</span>
            <input type="range" v-model.number="t[k]" :min="min" :max="max">
          </label>
          <label v-for="[k, name] in colorFields" :key="k" class="f row">{{ name }}
            <span><input type="color" :value="t[k] || (k === 'headingColor' ? colors.heading : k === 'titleColor' ? colors.title : k === 'numColor' ? colors.num : colors.accent)"
                         @input="t[k] = ($event.target as HTMLInputElement).value"><button v-if="t[k]" @click="t[k] = ''">ตามพรีเซ็ต</button></span></label>
          <label class="f row">สีเลขแยกรายการ<input type="checkbox" v-model="t.perItemColor"></label>
          <label class="f">เส้นนำสายตา
            <select v-model="t.leader"><option value="dots">จุดไข่ปลา</option><option value="dashes">เส้นประ</option><option value="none">ไม่มี</option></select>
          </label>
        </div>
      </details>

      <details open>
        <summary>ส่วนตกแต่ง (ของเลย์เอาต์นี้)</summary>
        <div class="group">
          <label v-if="sp.rule" class="f row">เส้นคั่นระหว่างแถว<input type="checkbox" v-model="t.ruleOn"></label>
          <label v-if="sp.panel === 'card' && sp.badge !== 'block'" class="f row">แถบสีด้านซ้ายของการ์ด<input type="checkbox" v-model="t.barOn"></label>
          <label v-if="sp.panel === 'card' || sp.panel === 'pill'" class="f row">เงาการ์ด<input type="checkbox" v-model="t.shadow"></label>
          <label v-if="sp.badge === 'ring'" class="f row">เส้นขอบวงกลม<input type="checkbox" v-model="t.circleOutline"></label>
          <label v-if="sp.cap && t.showPage" class="f row">เส้นขอบแคปซูลเลขหน้า<input type="checkbox" v-model="t.capsuleOutline"></label>
          <p class="hint">เส้นนำสายตาและความหนาเส้นอยู่ในหัวข้อ "ตัวอักษรและสี"</p>
        </div>
      </details>

      <details open>
        <summary>พื้นหลัง</summary>
        <div class="group">
          <label class="f">ที่มาของรูป
            <select v-model="t.bgSource" data-testid="bg-source">
              <option value="shared">ใช้รูปเดียวกับเครื่องมือแถบสารบัญ{{ state.bg ? '' : ' (ยังไม่มีรูป)' }}</option>
              <option value="own">รูปเฉพาะหน้านี้{{ t.bg ? '' : ' (ยังไม่ได้อัปโหลด)' }}</option>
              <option value="none">ไม่มีรูป (พื้นขาว)</option>
            </select>
          </label>
          <label class="drop" tabindex="0" @keydown.enter="bgf?.click()">อัปโหลดรูปเฉพาะหน้านี้<input ref="bgf" type="file" accept="image/png,image/jpeg,image/webp" hidden data-testid="toc-bg-input" @change="onBg"></label>
          <template v-if="bg">
            <label class="f">ซูม <span class="v">{{ t.bgZoom.toFixed(2) }}×</span><input type="range" v-model.number="t.bgZoom" min="1" max="3" step="0.01"></label>
            <label class="f">ตำแหน่งแนวนอน <span class="v">{{ t.bgX }}%</span><input type="range" v-model.number="t.bgX" min="0" max="100"></label>
            <label class="f">ตำแหน่งแนวตั้ง <span class="v">{{ t.bgY }}%</span><input type="range" v-model.number="t.bgY" min="0" max="100"></label>
          </template>
          <p v-if="saveWarn.msg" class="warn">{{ saveWarn.msg }}</p>
        </div>
      </details>

      <details open>
        <summary>ตรวจคอนทราสต์ (WCAG ≥ 4.5:1)</summary>
        <div class="group" data-testid="contrast">
          <p v-for="c in bad" :key="c.label" class="warn" data-testid="contrast-warn">⚠ {{ c.label }} คอนทราสต์ {{ c.ratio.toFixed(1) }}:1 ต่ำเกินไป — ลองเปิดม่านช่วยอ่านหรือเปลี่ยนสี</p>
          <p v-if="!bad.length" class="hint" data-testid="contrast-ok">✓ ผ่านทุกรายการ (ต่ำสุด {{ Math.min(...checks.map(c => c.ratio)).toFixed(1) }}:1)</p>
          <p class="hint">คำนวณจากสีเฉลี่ยของรูปพื้นหลังใต้ตัวอักษร (รวมผลของม่าน/การ์ด)</p>
        </div>
      </details>

      <details open>
        <summary>บันทึก</summary>
        <div class="group btns">
          <button class="primary" :disabled="!!busy" data-testid="export-png" @click="run(() => exportToc(t, state.bg))">หน้าสารบัญ (PNG)</button>
          <button class="primary" :disabled="!!busy" data-testid="export-transparent" @click="run(() => exportTocTransparent(t, state.bg))">หน้าสารบัญ (PNG พื้นหลังโปร่งใส)</button>
          <label class="f row">รวมหน้าสารบัญเป็นไฟล์แรกใน ZIP ทุกหน้า<input type="checkbox" v-model="t.inZip"></label>
          <button class="primary" :disabled="!!busy" data-testid="export-zip" @click="zip">บันทึกทุกหน้า (ZIP)</button>
          <p v-if="busy" class="hint" role="status">{{ busy }}</p>
          <hr style="width:100%">
          <button @click="saveProject">บันทึกโปรเจกต์ (.json)</button>
          <label class="drop" tabindex="0" @keydown.enter="jf?.click()">เปิดโปรเจกต์
            <input ref="jf" type="file" accept=".json,application/json" hidden @change="openJson">
          </label>
          <button @click="resetToc">รีเซ็ตหน้าสารบัญ</button>
        </div>
      </details>
    </aside>
  </div>
</template>

<style scoped>
input.num { width: 100%; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; font: inherit; }
.grid input[type=text]:first-child { width: 60px; }
.tabrow .grid { grid-template-columns: 60px 1fr 60px; }
.layouts { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 6px; }
.layouts button { display: grid; justify-items: center; gap: 4px; padding: 4px; }
.layouts button.on { outline: 3px solid var(--gold); }
.lthumb { width: 81px; height: 115px; overflow: hidden; display: block; background: #fff; }
.lths { display: block; transform: scale(.065); transform-origin: 0 0; width: 1240px; height: 1754px; pointer-events: none; }
</style>
