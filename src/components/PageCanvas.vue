<script setup lang="ts">
import { computed } from 'vue'
import { ACTIVE_RATIO, gutterW, stripW, PAGE_H, PAGE_W, type Project } from '../types'
import { tabNum } from '../store'

// หน้ากระดาษขนาดคงที่ 1240x1754 px ไม่มี transform ในตัวเอง (พรีวิวย่อด้วย wrapper ภายนอก)
const props = defineProps<{ p: Project; active: number; tabsOnly?: boolean }>()

const right = computed(() => props.p.side === 'right')
const strip = computed(() => ({
  top: props.p.top + '%', height: props.p.height + '%',
  width: stripW(props.p) + 'px', [props.p.side]: '0',
}))

function tabStyle(i: number) {
  const p = props.p, on = p.highlight && i === props.active
  const rt = (p.tabs[i].rTop ?? p.radius) + 'px', rb = (p.tabs[i].rBottom ?? p.radius) + 'px', dx = right.value ? '' : '-'
  const c = p.tabs[i].color
  return {
    width: p.width * (on ? ACTIVE_RATIO : 1) + 'px',
    [p.side]: '0',
    borderRadius: right.value ? `0 ${rt} ${rb} 0` : `${rt} 0 0 ${rb}`, // มุมโค้งอยู่ด้านนอก แถบเริ่มจากด้านใน
    background: on ? p.activeColor : c,
    color: on ? p.activeTextColor : p.textColor,
    boxShadow: p.shadow ? `${dx}4px 5px 12px -4px rgba(0,16,67,.55)` : 'none',
    gap: p.numGap + 'px', padding: `${p.numSize * .8}px 0 ${p.numSize * .5}px`,
  }
}
</script>

<template>
  <div class="page" :class="{ transparent: tabsOnly }"
       :style="{ width: PAGE_W + 'px', height: PAGE_H + 'px', fontFamily: `'${p.font}', 'Noto Sans Thai', sans-serif` }">
    <div v-if="p.bg && !tabsOnly" class="bgbox" :style="{ [p.side]: gutterW(p) + 'px' }">
      <img class="bg" :src="p.bg" alt=""
           :style="{ objectPosition: `${p.bgX}% ${p.bgY}%`, transformOrigin: `${p.bgX}% ${p.bgY}%`, transform: `scale(${p.bgZoom})` }">
    </div>
    <div v-if="p.reserve && p.cutLine && !tabsOnly" class="cut" :style="{ [p.side]: gutterW(p) - (right ? 0 : 2) + 'px' }"></div>
    <ul class="strip" :style="strip">
      <li v-for="(t, i) in p.tabs" :key="t.id">
        <div class="tab" :class="{ on: p.highlight && i === active }" :style="tabStyle(i)">
          <span class="num" :style="{ fontSize: p.numSize + 'px', borderBottomColor: p.numLineColor, borderBottomWidth: p.numLineThick + 'px', width: p.numLineLen + '%', color: p.highlight && i === active ? p.activeTextColor : p.numColor }"><span class="n">{{ tabNum(t, i) }}</span></span>
          <span class="label">
            <span class="th" :style="{ fontSize: p.thSize + 'px' }">{{ t.th }}</span>
            <span v-if="t.th2" class="th" :style="{ fontSize: p.thSize + 'px' }">{{ t.th2 }}</span>
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page { position: relative; overflow: hidden; background: #fff; flex: none; }
.page.transparent { background: transparent; }
.bgbox { position: absolute; top: 0; bottom: 0; left: 0; right: 0; overflow: hidden; }
.cut { position: absolute; top: 0; bottom: 0; width: 2px; border-left: 2px dashed #888; box-sizing: border-box; }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.strip { position: absolute; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
.strip li { flex: 1; min-height: 0; position: relative; }
.tab { position: absolute; top: 0; bottom: 0; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
.num { font-weight: 700; line-height: 1; padding-bottom: 14px; border-bottom: 1px solid; display: flex; justify-content: center; }
.n { writing-mode: vertical-rl; } /* เลขหันทางเดียวกับชื่อ */
.label { writing-mode: vertical-rl; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; line-height: 1.1; white-space: nowrap; }
.th { font-weight: 700; }
</style>
