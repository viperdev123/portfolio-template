<script setup lang="ts">
import { computed } from 'vue'
import type { Page } from './types'
import { PH, PW } from './types'
import { resolve } from './theme'
import { bgCss } from './bg'
import ElementView from './ElementView.vue'

// หน้า 1240x1754 px คงที่ ไม่มี transform และไม่มี UI ตัวแก้ไข (ใช้ทั้งพรีวิว thumbnail และ export)
const props = defineProps<{ page: Page; assets: Record<string, string>; transparent?: boolean }>()
const c = (v: string) => resolve(v, props.page.theme)

const root = computed(() => ({ width: PW + 'px', height: PH + 'px', ...(props.transparent ? {} : bgCss(props.page)) }))
const b = computed(() => props.page.bg)
</script>

<template>
  <div class="qp" :style="root">
    <template v-if="!transparent && b.mode === 'image' && assets[b.asset]">
      <img class="bgimg" :src="assets[b.asset]" alt=""
           :style="{ objectPosition: `${b.x}% ${b.y}%`, transformOrigin: `${b.x}% ${b.y}%`, transform: `scale(${b.zoom})`, opacity: b.opacity }">
      <div v-if="b.tintAmt > 0" class="bgimg" :style="{ background: c(b.tint), opacity: b.tintAmt / 100 * .6 }"></div>
    </template>
    <ElementView v-for="e in page.elements" :key="e.id" :el="e" :theme="page.theme" :assets="assets" />
  </div>
</template>

<style scoped>
.qp { position: relative; overflow: hidden; flex: none; }
.bgimg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
</style>
