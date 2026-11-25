<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PageCanvas from './components/PageCanvas.vue'
import { PAGE_H, PAGE_W, stripW, type Tab } from './types'
import { applyPreset, hist, loadProject, onUndoKey, parseProject, redo, resetProject, saveProject, saveWarn, state as s, tabNum, uid, undo } from './store'
import { PRESETS } from './presets'
import { exportPage, exportTabs, exportZip } from './export'
import { readImage } from './shared/export'
import { useFit, useRememberPanels } from './shared/ui'

const stage = ref<HTMLElement>()
const file = ref<HTMLInputElement>()
const jf = ref<HTMLInputElement>()
const scale = useFit(stage, PAGE_W, PAGE_H)
const showGuide = ref(true)
const busy = ref('')
const err = ref('')
const over = ref(false)
useRememberPanels()
onMounted(() => addEventListener('keydown', onUndoKey))
onBeforeUnmount(() => removeEventListener('keydown', onUndoKey))

async function setBg(f: File | undefined) {
  if (!f) return
  err.value = ''
  try { s.bg = (await readImage(f)).src } catch (e: any) { err.value = e.message }
}
function onDrop(e: DragEvent) { over.value = false; setBg(e.dataTransfer?.files[0]) }
function onPick(e: Event) { setBg((e.target as HTMLInputElement).files?.[0]); (e.target as HTMLInputElement).value = '' }

const addTab = () => {
  if (s.tabs.length >= 8) return
  const c = PRESETS.find(p => p.activeColor === s.activeColor)?.tabs ?? PRESETS[0].tabs
  s.tabs.push({ id: uid(), num: '', th: 'หมวดใหม่', color: c[s.tabs.length % c.length] })
}
function delTab(i: number) {
  if (s.tabs.length <= 1) return
  s.tabs.splice(i, 1)
  s.active = Math.min(s.active, s.tabs.length - 1)
}
function move(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= s.tabs.length) return
  ;[s.tabs[i], s.tabs[j]] = [s.tabs[j], s.tabs[i]]
  if (s.active === i) s.active = j; else if (s.active === j) s.active = i
}

// คลิกแถบในพรีวิว = เลือกเป็น active แล้วเลื่อนแผงไปที่แถวนั้น
function pickTab(e: MouseEvent) {
  const li = (e.target as HTMLElement).closest('li')
  if (!li) return
  const i = [...li.parentElement!.children].indexOf(li)
  s.active = i
  const row = document.querySelectorAll<HTMLElement>('.tabrow')[i]
  row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  row?.querySelector<HTMLInputElement>('input[aria-label="ชื่อไทย"]')?.focus({ preventScroll: true })
}

// ประมาณความยาวชื่อ (แนวตั้ง) เทียบพื้นที่ที่เหลือในแถบหลังหักเลขลำดับ เส้น และ padding ตาม PageCanvas
const ctx = document.createElement('canvas').getContext('2d')!
const overflow = computed(() => {
  const tabH = s.height / 100 * PAGE_H / s.tabs.length
  return s.tabs.flatMap((t, i) => {
    ctx.font = `700 ${s.numSize}px '${s.font}'`
    const room = tabH - s.numSize * 1.3 - ctx.measureText(tabNum(t, i)).width - 14 - s.numLineThick - s.numGap
    ctx.font = `700 ${s.thSize}px '${s.font}'`
    return [t.th, t.th2].some(x => x && ctx.measureText(x).width > room) ? [t.th || tabNum(t, i)] : []
  })
})

async function run(fn: (p: typeof s) => Promise<void>) {
  busy.value = 'กำลังสร้างไฟล์…'; err.value = ''
  try { await fn(s) } catch (e) { err.value = 'Export ไม่สำเร็จ: ' + e } finally { busy.value = '' }
}
const zip = () => run(p => exportZip(p, (d, n) => (busy.value = `กำลังสร้างไฟล์… ${d}/${n}`)))

async function openJson(e: Event) {
  const el = e.target as HTMLInputElement
  err.value = ''
  try { if (el.files?.[0]) loadProject(parseProject(await el.files[0].text())) } catch (x: any) { err.value = x.message }
  el.value = ''
}
function setR(t: Tab, k: 'rTop' | 'rBottom', e: Event) {
  const v = (e.target as HTMLInputElement).value
  t[k] = v === '' ? undefined : Math.max(0, Number(v))
}
const doReset = () => { if (confirm('รีเซ็ตทุกอย่างกลับค่าเริ่มต้น (รวมรูปพื้นหลัง)? กด "ย้อน" เพื่อเอาคืนได้')) resetProject() }

const guide = computed(() => ({
  top: s.top + '%', height: s.height + '%', width: stripW(s) + 'px', [s.side]: 0,
}))
const sliders = [
  ['top', 'ตำแหน่งแนวตั้ง (% จากขอบบน)', 0, 60],
  ['height', 'ความสูงรวมของแถบ (%)', 20, 100],
  ['width', 'ความกว้างแถบ (px)', 50, 200],
  ['thSize', 'ขนาดตัวอักษรไทย', 14, 60],
  ['numSize', 'ขนาดเลขลำดับ', 14, 70],
  ['numLineLen', 'ความยาวเส้นขีดใต้เลข (% ของแถบ)', 10, 100],
  ['numLineThick', 'ความหนาเส้นขีดใต้เลข (px)', 0, 10],
  ['numGap', 'ระยะระหว่างเลขกับตัวอักษร (px)', 0, 150],
  ['radius', 'ความโค้งมุม (ค่ารวม ใช้กับแถบที่ไม่ได้ตั้งเอง)', 0, 80],
] as const
const colors = [
  ['textColor', 'สีตัวอักษร'], ['numColor', 'สีเลขลำดับ'], ['numLineColor', 'สีเส้นขีดใต้เลข'], ['activeColor', 'สีแถบ active'], ['activeTextColor', 'สีตัวอักษรแถบ active'],
] as const
</script>

<template>
  <div class="layout">
    <main class="stage" ref="stage">
      <div class="stage-box" :style="{ width: PAGE_W * scale + 'px', height: PAGE_H * scale + 'px' }">
        <div class="scaled" data-testid="preview" :style="{ transform: `scale(${scale})`, width: PAGE_W + 'px', height: PAGE_H + 'px' }">
          <PageCanvas :p="s" :active="s.active" @click="pickTab" />
          <div v-if="showGuide" class="guide" :style="guide"></div>
        </div>
      </div>
      <p class="hint">A4 · {{ PAGE_W }}×{{ PAGE_H }} px → export 2480×3508 px (300 DPI) · กรอบประสีแดง = พื้นที่ที่แถบทับ (ไม่ติดไปกับไฟล์)</p>
    </main>

    <aside class="panel">
      <h1>Portfolio Tab Maker</h1>
      <div class="undo">
        <button :disabled="!hist.canUndo" @click="undo" title="ย้อนกลับ (Ctrl+Z)">↶ ย้อน</button>
        <button :disabled="!hist.canRedo" @click="redo" title="ทำซ้ำ (Ctrl+Shift+Z)">↷ ทำซ้ำ</button>
      </div>
      <p v-if="err" class="warn" role="alert">{{ err }}</p>

      <details open>
        <summary>พื้นหลัง</summary>
        <div class="group">
          <label class="drop" :class="{ over }" tabindex="0" @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="onDrop"
                 @keydown.enter="file?.click()">
            {{ s.bg ? 'เปลี่ยนรูป (ลากมาวางหรือคลิก)' : 'ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์' }}
            <input ref="file" type="file" accept="image/png,image/jpeg,image/webp" hidden data-testid="bg-input" @change="onPick">
          </label>
          <template v-if="s.bg">
            <label class="f">ซูม <span class="v">{{ s.bgZoom.toFixed(2) }}×</span><input type="range" v-model.number="s.bgZoom" min="1" max="3" step="0.01"></label>
            <label class="f">ตำแหน่งแนวนอน <span class="v">{{ s.bgX }}%</span><input type="range" v-model.number="s.bgX" min="0" max="100"></label>
            <label class="f">ตำแหน่งแนวตั้ง <span class="v">{{ s.bgY }}%</span><input type="range" v-model.number="s.bgY" min="0" max="100"></label>
            <button @click="s.bg = ''; s.bgZoom = 1; s.bgX = s.bgY = 50">ลบรูปพื้นหลัง</button>
          </template>
          <p v-if="saveWarn.msg" class="warn">{{ saveWarn.msg }}</p>
        </div>
      </details>

      <details open>
        <summary>แถบ ({{ s.tabs.length }}/8)</summary>
        <div class="group">
          <div v-for="(t, i) in s.tabs" :key="t.id" class="tabrow" :class="{ on: i === s.active }">
            <div class="top">
              <label v-if="s.highlight"><input type="radio" name="active" :checked="i === s.active" @change="s.active = i"> active</label>
              <span style="flex:1"></span>
              <button @click="move(i, -1)" :disabled="i === 0" aria-label="เลื่อนขึ้น">↑</button>
              <button @click="move(i, 1)" :disabled="i === s.tabs.length - 1" aria-label="เลื่อนลง">↓</button>
              <button @click="delTab(i)" :disabled="s.tabs.length <= 1" aria-label="ลบแถบ">ลบ</button>
            </div>
            <div class="grid">
              <input type="text" v-model="t.num" :placeholder="tabNum(t, i)" aria-label="เลขลำดับ">
              <input type="text" v-model="t.th" placeholder="ชื่อไทย" aria-label="ชื่อไทย">
              <input type="color" v-model="t.color" aria-label="สีพื้นของแถบ">
            </div>
            <input type="text" v-model="t.th2" placeholder="บรรทัดที่ 2 (ไม่บังคับ)" aria-label="บรรทัดที่ 2">
            <div class="radii">
              <label>โค้งบน <input type="number" min="0" max="200" :value="t.rTop" :placeholder="String(s.radius)" @input="setR(t, 'rTop', $event)"></label>
              <label>โค้งล่าง <input type="number" min="0" max="200" :value="t.rBottom" :placeholder="String(s.radius)" @input="setR(t, 'rBottom', $event)"></label>
              <button v-if="t.rTop !== undefined || t.rBottom !== undefined" @click="t.rTop = t.rBottom = undefined">ใช้ค่ารวม</button>
            </div>
          </div>
          <p v-if="overflow.length" class="warn" role="status">ชื่อยาวเกินแถบ: {{ overflow.join(', ') }} — ลดขนาดตัวอักษรไทย หรือเพิ่มความสูงรวมของแถบ</p>
          <button @click="addTab" :disabled="s.tabs.length >= 8">+ เพิ่มแถบ</button>
        </div>
      </details>

      <details open>
        <summary>สไตล์</summary>
        <div class="group">
          <div class="presets">
            <button v-for="(p, i) in PRESETS" :key="p.name" @click="applyPreset(s, i)">{{ p.name }}</button>
          </div>
          <label class="f">ด้านของหน้า
            <select v-model="s.side"><option value="right">ขวา</option><option value="left">ซ้าย</option></select>
          </label>
          <label class="f">ฟอนต์
            <select v-model="s.font"><option>Noto Sans Thai</option><option>Sarabun</option></select>
          </label>
          <label v-for="[k, name, min, max] in sliders" :key="k" class="f">{{ name }} <span class="v">{{ s[k] }}</span>
            <input type="range" v-model.number="s[k]" :min="min" :max="max">
          </label>
          <label v-for="[k, name] in colors" :key="k" class="f row">{{ name }}<input type="color" v-model="s[k]"></label>
          <label class="f row">เว้นคอลัมน์ให้แถบ (พื้นหลังไม่ทับแถบ)<input type="checkbox" v-model="s.reserve"></label>
          <label class="f row">ไฮไลต์แถบ active (ค่าเริ่มต้น: ทุกแถบเหมือนกัน)<input type="checkbox" v-model="s.highlight"></label>
          <label class="f row">เส้นประสำหรับตัด<input type="checkbox" v-model="s.cutLine" :disabled="!s.reserve"></label>
          <label class="f row">เงาของแถบ<input type="checkbox" v-model="s.shadow"></label>
          <label class="f row">แสดงกรอบพื้นที่แถบในพรีวิว<input type="checkbox" v-model="showGuide"></label>
        </div>
      </details>

      <details open>
        <summary>บันทึก</summary>
        <div class="group btns">
          <button class="primary" :disabled="!!busy" @click="run(exportPage)">บันทึกหน้านี้ (PNG)</button>
          <button class="primary" :disabled="!!busy" @click="run(exportTabs)">บันทึกเฉพาะแถบ (PNG โปร่งใส)</button>
          <button class="primary" :disabled="!!busy" @click="zip">บันทึกทุกหน้า (ZIP)</button>
          <p class="hint">ZIP ไฮไลต์แถบของแต่ละหน้าให้อัตโนมัติ</p>
          <p v-if="busy" class="hint" role="status">{{ busy }}</p>
          <hr style="width:100%">
          <button @click="saveProject">บันทึกโปรเจกต์ (.json)</button>
          <label class="drop" tabindex="0" @keydown.enter="jf?.click()">เปิดโปรเจกต์
            <input ref="jf" type="file" accept=".json,application/json" hidden @change="openJson">
          </label>
          <button @click="doReset">Reset กลับค่าเริ่มต้น</button>
        </div>
      </details>
    </aside>
  </div>
</template>
