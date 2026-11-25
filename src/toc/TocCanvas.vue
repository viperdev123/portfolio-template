<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_H, PAGE_W } from '../types'
import { filledBadge, specOf, type Toc } from './model'
import { onFill, ZEBRA, type Colors } from './palette'
import { parse } from './color'
import { computeGeo, fontTick, measure } from './layout'

// หน้าสารบัญ 1240x1754 px คงที่ ไม่มี transform / ไม่มี UI ตัวแก้ไข / ไม่มีแถบข้าง
// ตำแหน่งทุกชิ้นคำนวณเป็นพิกัดตายตัวจาก computeGeo จึงตรงกันทั้งพรีวิวและไฟล์ export
const props = defineProps<{ toc: Toc; bg: string; colors: Colors; transparent?: boolean }>()
const t = computed(() => props.toc)
const g = computed(() => (fontTick.value, computeGeo(props.toc, measure)))
const ff = (f: string) => `'${f}', 'Noto Sans Thai', sans-serif`
const rgba = (hex: string, a: number) => { const [r, gg, b] = parse(hex); return `rgba(${r},${gg},${b},${a})` }
const numFont = computed(() => ff(t.value.numFont || t.value.titleFont))
const px = (v: number) => v + 'px'
const sp = computed(() => specOf(props.toc))
const fill = (i: number) => (t.value.perItemColor && t.value.items[i].color) || props.colors.accent // สีป้ายทึบ/แถบข้างการ์ด
const numColor = (i: number) => filledBadge(sp.value) ? t.value.numColor || onFill(fill(i), props.colors.ink)
  : (t.value.perItemColor && t.value.items[i].color) || props.colors.num
function panelStyle(r: { i: number; y: number; h: number }) {
  const p = sp.value.panel, c = props.colors
  const base = { left: px(g.value.listL), top: px(r.y), width: px(g.value.listR - g.value.listL), height: px(r.h),
    borderRadius: px(p === 'pill' ? r.h / 2 : p === 'zebra' ? 0 : t.value.radius) }
  if (p === 'outline') return { ...base, border: `${t.value.ruleThick}px solid ${c.accent}` }
  return { ...base, background: rgba(c.cream, t.value.cardOpacity / 100 * (p === 'zebra' && r.i % 2 ? ZEBRA : 1)),
    boxShadow: t.value.shadow && p !== 'zebra' ? '0 6px 18px rgba(0,16,67,.18)' : 'none' }
}
const leaderStyle = computed(() => ({ borderTop: `${t.value.ruleThick + 1}px ${t.value.leader === 'dashes' ? 'dashed' : 'dotted'} ${props.colors.accent}` }))
const veilStyle = computed(() => {
  const v = g.value.veil!, o = t.value.veilOpacity / 100, lo = o * .85, c = props.colors.cream
  return {
    left: px(v.x), top: px(v.y), width: px(v.w), height: px(v.h), borderRadius: '44px',
    background: `linear-gradient(180deg, ${rgba(c, lo)}, ${rgba(c, o)} 50%, ${rgba(c, lo)})`,
    boxShadow: t.value.veilFeather ? `0 0 ${t.value.veilFeather}px ${t.value.veilFeather * .55}px ${rgba(c, lo)}` : 'none', // ขอบฟุ้งด้วยเงา ไม่ใช้ backdrop-filter/mask
  }
})
</script>

<template>
  <div class="toc" :style="{ width: px(PAGE_W), height: px(PAGE_H), background: transparent ? 'transparent' : '#fff', fontFamily: ff(t.titleFont) }">
    <div v-if="bg && !transparent" class="bgbox">
      <img class="bg" :src="bg" alt=""
           :style="{ objectPosition: `${t.bgX}% ${t.bgY}%`, transformOrigin: `${t.bgX}% ${t.bgY}%`, transform: `scale(${t.bgZoom})` }">
    </div>

    <!-- หัวเรื่อง -->
    <div class="a head" data-part="heading"
         :style="{ left: '120px', width: px(PAGE_W - 240), top: px(g.headTop), height: px(g.headLine), lineHeight: px(g.headLine), fontSize: px(t.headingSize), fontFamily: ff(t.headingFont), color: colors.heading }">{{ t.heading }}</div>
    <template v-if="t.ornament === 'diamond'">
      <div class="a" data-part="ornament" :style="{ left: px(PAGE_W / 2 - 230), top: px(g.ornTop + 12), width: '200px', height: px(t.ruleThick), background: colors.accent }"></div>
      <div class="a" data-part="ornament" :style="{ left: px(PAGE_W / 2 + 30), top: px(g.ornTop + 12), width: '200px', height: px(t.ruleThick), background: colors.accent }"></div>
      <div class="a" data-part="ornament" :style="{ left: px(PAGE_W / 2 - 10), top: px(g.ornTop + 12 + t.ruleThick / 2 - 10), width: '20px', height: '20px', background: colors.accent, transform: 'rotate(45deg)' }"></div>
    </template>
    <template v-else-if="t.ornament === 'double'">
      <div class="a" data-part="ornament" :style="{ left: px(PAGE_W / 2 - 230), top: px(g.ornTop + 6), width: '460px', height: px(t.ruleThick), background: colors.accent }"></div>
      <div class="a" data-part="ornament" :style="{ left: px(PAGE_W / 2 - 230), top: px(g.ornTop + 6 + t.ruleThick + 6), width: '460px', height: px(t.ruleThick), background: colors.accent }"></div>
    </template>

    <!-- ม่านช่วยอ่าน -->
    <div v-if="g.veil" class="a" data-part="veil" :style="veilStyle"></div>

    <template v-for="r in g.rows" :key="r.item.id">
      <!-- การ์ด -->
      <div v-if="sp.panel" class="a card" data-part="card" :style="panelStyle(r)">
        <div v-if="g.barW" class="bar" data-part="bar" :style="{ width: px(g.barW), background: fill(r.i) }"></div>
        <div v-if="sp.badge === 'block'" class="bar nblk" data-part="circle" :style="{ width: px(g.numW), background: fill(r.i) }">
          <span class="n" :style="{ fontFamily: numFont, fontWeight: t.numWeight, fontSize: px(g.nSize), color: numColor(r.i) }">{{ r.numText }}</span>
        </div>
      </div>
      <!-- เส้นคั่นระหว่างแถว (แบบรายการ) -->
      <div v-if="sp.rule && t.ruleOn && r.i < g.rows.length - 1" class="a" data-part="rule"
           :style="{ left: px(g.listL), width: px(g.listR - g.listL), top: px(r.y + r.h + g.gap / 2 - t.ruleThick / 2), height: px(t.ruleThick), background: colors.accent }"></div>

      <!-- เลขลำดับ -->
      <!-- เส้นไทม์ไลน์: ต่อจากใต้วงกลมนี้ถึงบนวงกลมถัดไป -->
      <div v-if="sp.line && r.i < g.rows.length - 1" class="a" data-part="tline"
           :style="{ left: px(g.numX + g.circleD / 2 - t.ruleThick / 2), top: px(r.y + (r.h + g.circleD) / 2), width: px(t.ruleThick), height: px(r.h + g.gap - g.circleD), background: colors.accent }"></div>
      <div v-if="sp.big" class="a" data-part="divider"
           :style="{ left: px(g.titleX - 24), top: px(r.y + r.h * .2), width: px(t.ruleThick), height: px(r.h * .6), background: colors.accent }"></div>
      <template v-if="sp.badge === 'block'"><!-- เลขอยู่ในการ์ดแล้ว --></template>
      <div v-else-if="sp.badge" class="a circ" data-part="circle"
           :style="{ left: px(g.numX), top: px(r.y + (r.h - g.circleD) / 2), width: px(g.circleD), height: px(g.circleD),
                     borderRadius: sp.badge === 'square' ? '22%' : '50%', background: sp.badge === 'ring' ? 'transparent' : fill(r.i),
                     border: sp.badge === 'ring' && t.circleOutline ? `${t.ruleThick}px solid ${colors.accent}` : 'none' }">
        <span class="n" :style="{ fontFamily: numFont, fontWeight: t.numWeight, fontSize: px(g.nSize), color: numColor(r.i) }">{{ r.numText }}</span>
      </div>
      <div v-else class="a nrow" data-part="num"
           :style="{ left: px(g.numX), top: px(r.y), width: px(g.numW), height: px(r.h) }">
        <span class="n" :style="{ fontFamily: numFont, fontWeight: t.numWeight, fontSize: px(g.nSize), color: numColor(r.i) }">{{ r.numText }}</span>
      </div>

      <!-- ชื่อ (ทุกบรรทัดเป็นกล่องแยก ขึ้นบรรทัดตามคำที่คำนวณไว้) -->
      <div v-for="(ln, k) in r.th" :key="k" class="a line" data-part="title"
           :style="{ left: px(g.titleX), top: px(r.thTop + k * g.lineH), height: px(g.lineH), lineHeight: px(g.lineH), fontSize: px(g.tSize), fontWeight: t.titleWeight, color: colors.title }">{{ ln }}</div>
      <div v-if="r.en" class="a line" data-part="en"
           :style="{ left: px(g.titleX), top: px(r.enTop), height: px(g.eLine), lineHeight: px(g.eLine), fontSize: px(g.eSize), color: colors.sub }">{{ r.en }}</div>
      <div v-if="r.desc" class="a line" data-part="desc"
           :style="{ left: px(g.titleX), top: px(r.descTop), height: px(g.dLine), lineHeight: px(g.dLine), fontSize: px(g.dSize), color: colors.sub }">{{ r.desc }}</div>

      <div v-if="r.leader" class="a" data-part="leader" :style="{ left: px(r.leader.x), width: px(r.leader.w), top: px(r.leader.y), height: 0, ...leaderStyle }"></div>

      <!-- เลขหน้า -->
      <template v-if="t.showPage">
        <div v-if="sp.cap" class="a cap" data-part="page"
             :style="{ left: px(g.pageX), top: px(r.y + (r.h - g.capH) / 2), width: px(g.pageW), height: px(g.capH), borderRadius: px(g.capH / 2),
                       border: t.capsuleOutline ? `${t.ruleThick}px solid ${colors.accent}` : 'none' }">
          <span class="n" :style="{ fontFamily: numFont, fontWeight: t.numWeight, fontSize: px(g.pSize), color: colors.page }">{{ r.pageText }}</span>
        </div>
        <div v-else class="a prow" data-part="page" :style="{ left: px(g.pageX), top: px(r.y), width: px(g.pageW), height: px(r.h) }">
          <span class="n" :style="{ fontFamily: numFont, fontWeight: t.numWeight, fontSize: px(g.pSize), color: colors.page }">{{ r.pageText }}</span>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.toc { position: relative; overflow: hidden; flex: none; }
.a { position: absolute; box-sizing: border-box; }
.bgbox { position: absolute; inset: 0; overflow: hidden; }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.head { text-align: center; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.line { white-space: nowrap; }
.card { overflow: hidden; }
.bar { position: absolute; left: 0; top: 0; bottom: 0; }
.nrow, .prow, .circ, .cap { display: flex; align-items: center; }
.nrow { justify-content: flex-start; }
.prow { justify-content: flex-end; }
.circ, .cap { justify-content: center; }
.nblk { display: flex; align-items: center; justify-content: center; }
.n { line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
</style>
