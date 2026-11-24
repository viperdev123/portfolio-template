<script setup lang="ts">
import { computed } from 'vue'
import { TOKENS, type Theme } from './types'
import { resolve } from './theme'

// เลือกสีจาก token ของชุดสี (เปลี่ยนชุดสีแล้วตาม) หรือสีกำหนดเอง
const props = defineProps<{ modelValue: string; theme: Theme; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const hex = computed(() => { const v = resolve(props.modelValue, props.theme); return /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000' })
</script>

<template>
  <div class="cf">
    <span class="cf-l">{{ label }}</span>
    <div class="cf-r" role="group" :aria-label="label">
      <button v-for="[k, n] in TOKENS" :key="k" type="button" class="chip" :class="{ on: modelValue === '@' + k }"
              :style="{ background: resolve('@' + k, theme) }" :title="n" :aria-label="n" :aria-pressed="modelValue === '@' + k"
              @click="emit('update:modelValue', '@' + k)"></button>
      <input type="color" :value="hex" :aria-label="label + ' (กำหนดเอง)'" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)">
    </div>
  </div>
</template>

<style scoped>
.cf { display: grid; gap: 4px; font-size: 13px; }
.cf-r { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.chip { width: 22px; height: 22px; padding: 0; border-radius: 50%; border: 1px solid #8895b8; }
.chip.on { outline: 3px solid var(--gold); outline-offset: 1px; }
</style>
