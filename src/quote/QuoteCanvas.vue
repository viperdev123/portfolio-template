<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import QuotePage from './QuotePage.vue'
import { assets, dropImage, loadImageInto, page, ui } from './store'
import { bbox } from './geom'
import { PH, PW, type El, type ImageEl } from './types'

// ตัวแก้ไขบนผืนผ้าใบ: ลาก/ย่อขยาย/หมุน/snap ทำบน overlay แยกจากหน้า (หน้าจึงไม่มี UI ติดไปตอน export)
const props = defineProps<{ scale: number }>()
const stage = ref<HTMLElement>()
const fileIn = ref<HTMLInputElement>()
const editing = ref<string | null>(null)
const guides = ref<{ x?: number; y?: number }[]>([])
const sel = computed(() => page.value.elements.find(e => e.id === ui.sel) ?? null)
const pickFor = ref<ImageEl | null>(null)

const boxOf = (e: El) => ({ left: e.x + 'px', top: e.y + 'px', width: e.w + 'px', height: e.h + 'px', transform: `rotate(${e.rot}deg)` })
const toPage = (ev: PointerEvent) => {
  const r = stage.value!.getBoundingClientRect()
  return { x: (ev.clientX - r.left) / props.scale, y: (ev.clientY - r.top) / props.scale }
}

type Drag = { mode: 'move' | 'resize' | 'rotate'; h: [number, number]; p0: { x: number; y: number }; g: { x: number; y: number; w: number; h: number; rot: number }; el: El }
let drag: Drag | null = null

function begin(ev: PointerEvent, el: El, mode: Drag['mode'], h: [number, number] = [0, 0]) {
  ev.stopPropagation(); ev.preventDefault()
  ui.sel = el.id
  if (el.locked) return
  drag = { mode, h, p0: toPage(ev), g: { x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rot }, el }
  addEventListener('pointermove', onMove); addEventListener('pointerup', end, { once: true })
}
function end() { drag = null; guides.value = []; removeEventListener('pointermove', onMove) }
onBeforeUnmount(end)

function snapTargets(ex: El) {
  const xs = [0, PW / 2, PW], ys = [0, PH / 2, PH]
  for (const o of page.value.elements) {
    if (o === ex || o.hidden) continue
    const b = bbox(o); xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h)
  }
  return { xs, ys }
}
function snap(vals: number[], targets: number[], thr: number) {
  let best: { d: number; t: number } | null = null
  for (const v of vals) for (const t of targets) { const d = t - v; if (Math.abs(d) < thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t } }
  return best
}

function onMove(ev: PointerEvent) {
  if (!drag) return
  const { el, g, h } = drag, p = toPage(ev), dx = p.x - drag.p0.x, dy = p.y - drag.p0.y
  if (drag.mode === 'move') {
    const b0 = bbox({ ...el, ...g } as El), { xs, ys } = snapTargets(el), thr = 6 / props.scale
    let mx = dx, my = dy
    const sx = snap([b0.x + dx, b0.x + dx + b0.w / 2, b0.x + dx + b0.w], xs, thr)
    const sy = snap([b0.y + dy, b0.y + dy + b0.h / 2, b0.y + dy + b0.h], ys, thr)
    if (sx) mx += sx.d
    if (sy) my += sy.d
    guides.value = [...(sx ? [{ x: sx.t }] : []), ...(sy ? [{ y: sy.t }] : [])]
    el.x = Math.round((g.x + mx) * 10) / 10; el.y = Math.round((g.y + my) * 10) / 10
  } else if (drag.mode === 'rotate') {
    const cx = g.x + g.w / 2, cy = g.y + g.h / 2
    let a = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90
    if (ev.shiftKey) a = Math.round(a / 15) * 15
    el.rot = Math.round(((a + 540) % 360 - 180) * 10) / 10
  } else {
    const r = (g.rot * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r)
    const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos
    let w = g.w + h[0] * lx, hh = g.h + h[1] * ly
    if (ev.shiftKey && h[0] && h[1]) { const k = Math.max(w / g.w, hh / g.h); w = g.w * k; hh = g.h * k }
    w = Math.max(8, w); hh = Math.max(8, hh)
    const ox = (h[0] * (w - g.w)) / 2, oy = (h[1] * (hh - g.h)) / 2
    const cx = g.x + g.w / 2 + ox * cos - oy * sin, cy = g.y + g.h / 2 + ox * sin + oy * cos
    el.w = Math.round(w); el.h = Math.round(hh); el.x = Math.round(cx - el.w / 2); el.y = Math.round(cy - el.h / 2)
  }
}

function dbl(el: El) {
  if (el.locked) return
  if (el.kind === 'text') editing.value = el.id
  if (el.kind === 'image') { pickFor.value = el; fileIn.value?.click() }
}
async function picked(ev: Event) {
  const i = ev.target as HTMLInputElement, f = i.files?.[0]
  if (f && pickFor.value) await loadImageInto(pickFor.value, f).catch(e => (ui.warn = e.message))
  i.value = ''
}
async function onDrop(ev: DragEvent) {
  const f = ev.dataTransfer?.files[0]; if (!f) return
  const id = (ev.target as HTMLElement).closest('[data-id]')?.getAttribute('data-id')
  await dropImage(f, page.value.elements.find(e => e.id === id)).catch(e => (ui.warn = e.message))
}

const handles: [number, number, string][] = [[-1, -1, 'nwse'], [0, -1, 'ns'], [1, -1, 'nesw'], [1, 0, 'ew'], [1, 1, 'nwse'], [0, 1, 'ns'], [-1, 1, 'nesw'], [-1, 0, 'ew']]
const hs = computed(() => 16 / props.scale)
const empty = (e: El) => e.kind === 'image' && !assets[e.asset]
</script>

<template>
  <div class="qc-box" :style="{ width: PW * scale + 'px', height: PH * scale + 'px' }">
    <div ref="stage" class="qc-stage" data-testid="qc-stage" :style="{ transform: `scale(${scale})`, width: PW + 'px', height: PH + 'px' }"
         @pointerdown="ui.sel = null" @dragover.prevent @drop.prevent="onDrop">
      <QuotePage :page="page" :assets="assets" />
      <template v-for="e in page.elements" :key="e.id">
        <div v-if="!e.hidden" class="hit" :data-id="e.id" :class="{ off: e.locked, empty: empty(e) }" :style="boxOf(e)"
             @pointerdown="begin($event, e, 'move')" @dblclick.stop="dbl(e)">
          <span v-if="empty(e)" class="ph" :style="{ fontSize: 24 / scale + 'px' }">ลากรูปมาวาง / ดับเบิลคลิกเพื่อเลือกรูป</span>
        </div>
      </template>
      <div v-for="(g, i) in guides" :key="i" class="guide" :style="g.x !== undefined ? { left: g.x + 'px', top: 0, bottom: 0, width: 1 / scale + 'px' } : { top: g.y + 'px', left: 0, right: 0, height: 1 / scale + 'px' }"></div>
      <div v-if="sel && !sel.hidden" class="sel" :style="{ ...boxOf(sel), outlineWidth: 2 / scale + 'px' }">
        <template v-if="!sel.locked">
          <i v-for="h in handles" :key="h[0] + ',' + h[1]" class="hd" :style="{ left: (h[0] + 1) * 50 + '%', top: (h[1] + 1) * 50 + '%', width: hs + 'px', height: hs + 'px', cursor: h[2] + '-resize', borderWidth: 2 / scale + 'px' }"
             @pointerdown="begin($event, sel, 'resize', [h[0], h[1]])"></i>
          <i class="hd rot" :style="{ left: '50%', top: -34 / scale + 'px', width: hs + 'px', height: hs + 'px', borderWidth: 2 / scale + 'px' }" @pointerdown="begin($event, sel, 'rotate')"></i>
        </template>
      </div>
      <textarea v-if="editing && sel?.kind === 'text' && sel.id === editing" v-model="sel.text" class="edit" autofocus
                :style="{ ...boxOf(sel), fontFamily: `'${sel.font}'`, fontSize: sel.size + 'px', fontWeight: sel.weight, lineHeight: sel.lineHeight, textAlign: sel.align === 'justify' ? 'left' : sel.align }"
                @pointerdown.stop @blur="editing = null" @keydown.esc="editing = null" @vue:mounted="($event.el as HTMLTextAreaElement).focus()"></textarea>
    </div>
    <input ref="fileIn" type="file" accept="image/png,image/jpeg,image/webp" hidden data-testid="canvas-file" @change="picked">
  </div>
</template>

<style scoped>
.qc-box { position: relative; flex: none; box-shadow: 0 10px 40px -8px rgba(0, 16, 67, .45); background: #fff; }
.qc-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; touch-action: none; user-select: none; }
.hit { position: absolute; cursor: move; touch-action: none; }
.hit.off { cursor: default; pointer-events: none; }
.hit.empty { outline: 2px dashed rgba(255, 61, 113, .8); display: flex; align-items: center; justify-content: center; text-align: center; background: rgba(128, 128, 128, .15); }
.ph { color: #ff3d71; font-weight: 700; padding: 8px; }
.sel { position: absolute; outline: solid #1e90ff; pointer-events: none; }
.hd { position: absolute; transform: translate(-50%, -50%); background: #fff; border: solid #1e90ff; border-radius: 3px; pointer-events: auto; touch-action: none; }
.hd.rot { border-radius: 50%; cursor: grab; }
.guide { position: absolute; background: #ff3d71; pointer-events: none; }
.edit { position: absolute; background: rgba(255, 255, 255, .9); color: #000; border: 2px solid #1e90ff; resize: none; padding: 0; margin: 0; z-index: 5; }
</style>
