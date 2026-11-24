<script setup lang="ts">
import { computed, ref } from 'vue'
import { moveLayer, page, ui } from './store'

// รายการเลเยอร์ (บนสุด = หน้าสุด) เปลี่ยนชื่อด้วยดับเบิลคลิก ลากเรียงได้
const list = computed(() => page.value.elements.map((e, i) => ({ e, i })).reverse())
const renaming = ref<string | null>(null)
let from = -1
const icon = { text: 'T', image: '▣', shape: '◆', quote: '“', deco: '✦' } as const
</script>

<template>
  <ul class="layers" aria-label="เลเยอร์">
    <li v-for="{ e, i } in list" :key="e.id" :class="{ on: e.id === ui.sel, off: e.hidden }" draggable="true"
        @dragstart="from = i" @dragover.prevent @drop.prevent="moveLayer(from, i)" @click="ui.sel = e.id">
      <span class="ic" aria-hidden="true">{{ icon[e.kind] }}</span>
      <input v-if="renaming === e.id" v-model="e.name" class="nm" autofocus aria-label="ชื่อเลเยอร์" @click.stop @blur="renaming = null" @keydown.enter="renaming = null">
      <button v-else class="nm" type="button" @dblclick.stop="renaming = e.id" @click.stop="ui.sel = e.id">{{ e.name }}</button>
      <button type="button" :aria-pressed="e.hidden" :aria-label="e.hidden ? 'แสดง' : 'ซ่อน'" :title="e.hidden ? 'แสดง' : 'ซ่อน'" @click.stop="e.hidden = !e.hidden">{{ e.hidden ? '🚫' : '👁' }}</button>
      <button type="button" :aria-pressed="e.locked" :aria-label="e.locked ? 'ปลดล็อก' : 'ล็อก'" :title="e.locked ? 'ปลดล็อก' : 'ล็อก'" @click.stop="e.locked = !e.locked">{{ e.locked ? '🔒' : '🔓' }}</button>
    </li>
    <li v-if="!list.length" class="empty">ยังไม่มีองค์ประกอบ — เพิ่มจากแถบเครื่องมือด้านบน</li>
  </ul>
</template>

<style scoped>
.layers { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; max-height: 220px; overflow: auto; }
li { display: flex; gap: 4px; align-items: center; border: 1px solid var(--line); border-radius: 6px; padding: 2px 4px; background: #fff; }
li.on { border-color: var(--gold); background: #FFF9EA; }
li.off .nm { opacity: .5; }
.ic { width: 18px; text-align: center; color: var(--navy); }
.nm { flex: 1; min-width: 0; text-align: left; border: 0; background: none; padding: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
li button { padding: 2px 6px; border-color: transparent; }
.empty { color: #667; font-size: 13px; }
</style>
