<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { El, Theme } from './types'
import { resolve } from './theme'
import { QUOTE_STYLES } from './fonts'
import { thaiWrap } from './thai'

// แสดงองค์ประกอบ 1 ชิ้นที่ตำแหน่งจริงบนหน้า 1240x1754 (ใช้ทั้งพรีวิวและ export)
const props = defineProps<{ el: El; theme: Theme; assets: Record<string, string> }>()
const c = (v: string) => resolve(v, props.theme)
const e = computed(() => props.el)

const box = computed(() => ({
  left: e.value.x + 'px', top: e.value.y + 'px', width: e.value.w + 'px', height: e.value.h + 'px',
  transform: `rotate(${e.value.rot}deg)`, opacity: e.value.opacity,
}))
const shadowCss = (s: { on: boolean; x: number; y: number; blur: number; color: string }) =>
  s.on ? `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${c(s.color)})` : 'none'
const gradCss = (g: { c1: string; c2: string }, ang = 135) => `linear-gradient(${ang}deg, ${c(g.c1)}, ${c(g.c2)})`

// ---------- ข้อความ + auto-fit ----------
const inner = ref<HTMLElement>()
const fs = ref(0)
const t = computed(() => (e.value.kind === 'text' ? e.value : null))
function fit() {
  const el = t.value, n = inner.value
  if (!el || !n) return
  if (!el.autoFit) { n.style.setProperty('--fs', el.size + 'px'); fs.value = el.size; return }
  const ok = (s: number) => { n.style.setProperty('--fs', s + 'px'); return n.offsetHeight <= el.h && n.scrollWidth <= el.w + 1 }
  let lo = 8, hi = el.size
  if (ok(hi)) { fs.value = hi; return }
  while (hi - lo > .5) { const m = (lo + hi) / 2; ok(m) ? (lo = m) : (hi = m) }
  n.style.setProperty('--fs', lo + 'px'); fs.value = lo
}
const fitKey = computed(() => { const x = t.value; return x ? [x.text, x.sub, x.w, x.h, x.size, x.font, x.weight, x.italic, x.lineHeight, x.spacing, x.subScale, x.autoFit, x.align].join('|') : '' })
watch(fitKey, () => nextTick(fit), { flush: 'post' })
const refit = () => nextTick(fit)
onMounted(() => { fit(); document.fonts.ready.then(refit); document.fonts.addEventListener('loadingdone', refit) })
onBeforeUnmount(() => document.fonts.removeEventListener('loadingdone', refit))

const textStyle = computed(() => {
  const x = t.value!
  const grad = x.grad.on
  return {
    '--fs': (fs.value || x.size) + 'px', fontFamily: `'${x.font}', 'Noto Sans Thai', sans-serif`, fontWeight: x.weight,
    fontStyle: x.italic ? 'italic' : 'normal', lineHeight: x.lineHeight, letterSpacing: x.spacing + 'px', textAlign: x.align,
    filter: shadowCss(x.shadow),
    justifyContent: { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[x.valign],
  }
})
const mainStyle = computed(() => {
  const x = t.value!
  return {
    ...(x.grad.on ? { backgroundImage: gradCss(x.grad), WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' } : { color: c(x.color) }),
    ...(x.stroke.w > 0 ? { WebkitTextStroke: `${x.stroke.w}px ${c(x.stroke.color)}`, paintOrder: 'stroke fill' } : {}),
  }
})

// ---------- รูป ----------
const im = computed(() => (e.value.kind === 'image' ? e.value : null))
const radius = computed(() => {
  const x = im.value!
  return { none: '0', rounded: Math.min(x.w, x.h) * .12 + 'px', circle: '50%', arch: `${x.w / 2}px ${x.w / 2}px 0 0` }[x.mask]
})
const maskCss = computed(() => {
  const f = im.value!.feather, a = f.amt
  if (a <= 0) return {}
  let m: string, extra = {}
  if (f.mode === 'radial') m = `radial-gradient(closest-side, #000 ${100 - a}%, transparent 100%)`
  else if (f.mode === 'bottom') m = `linear-gradient(to bottom, #000 ${100 - a}%, transparent 100%)`
  else {
    const p = Math.min(a, 50), g = (d: string) => `linear-gradient(${d}, transparent 0, #000 ${p}%, #000 ${100 - p}%, transparent 100%)`
    m = `${g('to right')}, ${g('to bottom')}`
    extra = { maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }
  }
  return { maskImage: m, WebkitMaskImage: m, ...extra }
})
const imgFilter = computed(() => {
  const a = im.value!.adj
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%)${a.blur ? ` blur(${a.blur}px)` : ''}`
})

// ---------- ลายตกแต่ง / รูปทรง ----------
const shape = computed(() => {
  const s = e.value.kind === 'shape' ? e.value : null
  if (!s) return {}
  const r = { rect: '0', rounded: s.radius + 'px', circle: '50%', arch: `${s.w / 2}px ${s.w / 2}px 0 0`, line: '0' }[s.shape]
  return {
    borderRadius: r, boxSizing: 'border-box' as const,
    background: s.grad.on ? gradCss(s.grad, s.grad.angle) : c(s.fill),
    border: s.stroke.w > 0 ? `${s.stroke.w}px solid ${c(s.stroke.color)}` : 'none', filter: shadowCss(s.shadow),
  }
})
const q = computed(() => {
  const x = e.value.kind === 'quote' ? e.value : null
  if (!x) return null
  const st = QUOTE_STYLES[x.style] ?? QUOTE_STYLES[0]
  return {
    glyph: x.closing ? st.close : st.open,
    style: {
      fontFamily: `'${st.font}', sans-serif`, fontWeight: st.weight, fontSize: x.h * st.k + 'px', lineHeight: .9,
      ...(x.grad.on ? { backgroundImage: gradCss(x.grad), WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: c(x.color) }),
    },
  }
})
const deco = computed(() => {
  const d = e.value.kind === 'deco' ? e.value : null
  if (!d) return {}
  if (d.deco === 'goldline') return { background: `linear-gradient(90deg, transparent, ${c(d.color)}, ${c(d.color2)}, ${c(d.color)}, transparent)` }
  if (d.deco === 'ring') return { border: `${d.param}px solid ${c(d.color)}`, borderRadius: '50%', boxSizing: 'border-box' as const }
  if (d.deco === 'dots') return { backgroundImage: `radial-gradient(circle, ${c(d.color)} 2.5px, transparent 3px)`, backgroundSize: `${d.param}px ${d.param}px` }
  return {}
})
</script>

<template>
  <div v-if="!e.hidden" class="el" :style="box">
    <div v-if="e.kind === 'text'" class="qt" :style="textStyle">
      <div ref="inner" class="qt-in">
        <div class="qt-main" :style="mainStyle">{{ thaiWrap(e.text) }}</div>
        <div v-if="e.sub" class="qt-sub" :style="{ fontSize: 'calc(var(--fs) * ' + e.subScale + ')', color: c(e.subColor), fontWeight: 400, marginTop: '.4em' }">{{ thaiWrap(e.sub) }}</div>
      </div>
    </div>

    <div v-else-if="e.kind === 'image'" class="qi" :style="{ filter: shadowCss(e.shadow) }">
      <div class="qi-clip" :style="{ borderRadius: radius, ...maskCss }">
        <img v-if="assets[e.asset]" :src="assets[e.asset]" alt=""
             :style="{ objectPosition: `${e.ox}% ${e.oy}%`, transformOrigin: `${e.ox}% ${e.oy}%`, transform: `scale(${e.zoom})`, filter: imgFilter }">
        <div v-if="e.tint.amt > 0" class="fill" :style="{ background: c(e.tint.color), opacity: e.tint.amt / 100 * .6 }"></div>
      </div>
      <div v-if="e.border.on" class="fill" :style="{ borderRadius: radius, boxShadow: `inset 0 0 0 ${e.border.w}px ${c(e.border.color)}` }"></div>
    </div>

    <div v-else-if="e.kind === 'shape'" class="fill" :style="shape"></div>

    <div v-else-if="e.kind === 'quote' && q" class="qq" :style="q.style">{{ q.glyph }}</div>

    <template v-else-if="e.kind === 'deco'">
      <svg v-if="e.deco === 'sparkle'" class="fill" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs><linearGradient :id="'sp' + e.id" x1="0" y1="0" x2="1" y2="1"><stop offset="0" :stop-color="c(e.color)" /><stop offset="1" :stop-color="c(e.color2)" /></linearGradient></defs>
        <path d="M50 0C54 36 64 46 100 50C64 54 54 64 50 100C46 64 36 54 0 50C36 46 46 36 50 0Z" :fill="`url(#sp${e.id})`" />
      </svg>
      <div v-else class="fill" :style="deco"></div>
    </template>
  </div>
</template>

<style scoped>
.el { position: absolute; }
.fill { position: absolute; inset: 0; }
.qt { width: 100%; height: 100%; display: flex; flex-direction: column; font-size: var(--fs); white-space: pre-wrap; overflow-wrap: break-word; }
.qt-in { width: 100%; }
.qt-main { font-size: var(--fs); }
.qi { width: 100%; height: 100%; position: relative; }
.qi-clip { position: absolute; inset: 0; overflow: hidden; }
.qi-clip img { width: 100%; height: 100%; object-fit: cover; display: block; }
.qq { white-space: nowrap; display: inline-block; }
</style>
