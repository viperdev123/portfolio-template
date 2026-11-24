<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PageCanvas from './components/PageCanvas.vue'
import { PAGE_H, PAGE_W, stripW, type Tab } from './types'
import { applyPreset, loadProject, resetProject, saveWarn, state as s, tabNum, uid } from './store'
import { PRESETS } from './presets'
import { exportPage, exportTabs, exportZip } from './export'

const stage = ref<HTMLElement>()
const file = ref<HTMLInputElement>()
const jf = ref<HTMLInputElement>()
const scale = ref(.4)
const showGuide = ref(true)
const busy = ref('')
const over = ref(false)
let ro: ResizeObserver

function fit() {
  const el = stage.value!
  const tall = getComputedStyle(el).position === 'sticky'
  const w = el.clientWidth - 32, h = el.clientHeight - 70
  scale.value = Math.max(.1, Math.min(w / PAGE_W, tall ? h / PAGE_H : Infinity))
}
onMounted(() => { fit(); ro = new ResizeObserver(fit); ro.observe(stage.value!) })
onBeforeUnmount(() => ro?.disconnect())

// ย่อรูปที่ยาวเกิน A4@300DPI และแปลงเป็น data URL (กัน canvas tainted + ลดขนาดที่เก็บ)
function readImage(f: File | undefined) {
  if (!f || !f.type.startsWith('image/')) return
  const r = new FileReader()
  r.onload = () => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 3508 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      s.bg = c.toDataURL('image/jpeg', .92)
    }
    img.src = r.result as string
  }
  r.readAsDataURL(f)
}
function onDrop(e: DragEvent) { over.value = false; readImage(e.dataTransfer?.files[0]) }
function onPick(e: Event) { readImage((e.target as HTMLInputElement).files?.[0]); (e.target as HTMLInputElement).value = '' }

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

async function run(name: string, fn: (p: typeof s) => Promise<void>) {
  busy.value = name
  try { await fn(s) } catch (e) { alert('Export ไม่สำเร็จ: ' + e) } finally { busy.value = '' }
}

function saveJson() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(s)], { type: 'application/json' }))
  a.download = 'portfolio-project.json'; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
async function openJson(e: Event) {
  const el = e.target as HTMLInputElement
  try { if (el.files?.[0]) loadProject(JSON.parse(await el.files[0].text())) } catch { alert('ไฟล์โปรเจกต์ไม่ถูกต้อง') }
  el.value = ''
}
function setR(t: Tab, k: 'rTop' | 'rBottom', e: Event) {
  const v = (e.target as HTMLInputElement).value
  t[k] = v === '' ? undefined : Math.max(0, Number(v))
}
const doReset = () => { if (confirm('รีเซ็ตทุกอย่างกลับค่าเริ่มต้น (รวมรูปพื้นหลัง)?')) resetProject() }

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
          <PageCanvas :p="s" :active="s.active" />
          <div v-if="showGuide" class="guide" :style="guide"></div>
        </div>
      </div>
      <p class="hint">A4 · {{ PAGE_W }}×{{ PAGE_H }} px → export 2480×3508 px (300 DPI) · กรอบประสีแดง = พื้นที่ที่แถบทับ (ไม่ติดไปกับไฟล์)</p>
    </main>

    <aside class="panel">
      <h1>Portfolio Tab Maker</h1>

      <details open>
        <summary>พื้นหลัง</summary>
        <div class="group">
          <label class="drop" :class="{ over }" tabindex="0" @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="onDrop"
                 @keydown.enter="file?.click()">
            {{ s.bg ? 'เปลี่ยนรูป (ลากมาวางหรือคลิก)' : 'ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์' }}
            <input ref="file" type="file" accept="image/*" hidden data-testid="bg-input" @change="onPick">
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
          <button class="primary" :disabled="!!busy" @click="run('page', exportPage)">บันทึกหน้านี้ (PNG)</button>
          <button class="primary" :disabled="!!busy" @click="run('tabs', exportTabs)">บันทึกเฉพาะแถบ (PNG โปร่งใส)</button>
          <button class="primary" :disabled="!!busy || !s.highlight" @click="run('zip', exportZip)">บันทึกทุกหน้า (ZIP)</button>
          <p v-if="!s.highlight" class="hint">ZIP ใช้ได้เมื่อเปิด "ไฮไลต์แถบ active" (ไม่งั้นทุกหน้าจะเหมือนกัน)</p>
          <p v-if="busy" class="hint">กำลังสร้างไฟล์…</p>
          <hr style="width:100%">
          <button @click="saveJson">บันทึกโปรเจกต์ (.json)</button>
          <label class="drop" tabindex="0" @keydown.enter="jf?.click()">เปิดโปรเจกต์
            <input ref="jf" type="file" accept=".json,application/json" hidden @change="openJson">
          </label>
          <button @click="doReset">Reset กลับค่าเริ่มต้น</button>
        </div>
      </details>
    </aside>
  </div>
</template>
