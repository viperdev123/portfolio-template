<script setup lang="ts">
import type { Theme } from './types'
import type { Field } from './fields'
import { getPath, setPath } from './fields'
import ColorField from './ColorField.vue'

// วาดช่องตั้งค่าจากสคีมา (ใช้กับองค์ประกอบ)
const props = defineProps<{ target: any; fields: Field[]; theme: Theme }>()
const get = (f: Field) => getPath(props.target, f.k)
const set = (f: Field, v: unknown) => setPath(props.target, f.k, v)
const num = (e: Event) => Number((e.target as HTMLInputElement).value)
</script>

<template>
  <template v-for="f in fields" :key="f.k + f.label">
    <template v-if="!f.show || f.show(target)">
      <ColorField v-if="f.t === 'color'" :model-value="get(f)" :theme="theme" :label="f.label" @update:model-value="set(f, $event)" />
      <label v-else-if="f.t === 'check'" class="f row">{{ f.label }}<input type="checkbox" :checked="get(f)" @change="set(f, ($event.target as HTMLInputElement).checked)"></label>
      <label v-else-if="f.t === 'select'" class="f">{{ f.label }}
        <select :value="get(f)" @change="set(f, typeof f.opts![0][0] === 'number' ? num($event) : ($event.target as HTMLSelectElement).value)">
          <option v-for="o in f.opts" :key="o[0]" :value="o[0]">{{ o[1] }}</option>
        </select>
      </label>
      <label v-else-if="f.t === 'num'" class="f row">{{ f.label }}<input type="number" class="n" :value="Math.round(get(f))" :min="f.min" @input="set(f, num($event))"></label>
      <label v-else class="f">{{ f.label }} <span class="v">{{ Math.round(get(f) * 100) / 100 }}</span>
        <input type="range" :value="get(f)" :min="f.min" :max="f.max" :step="f.step" @input="set(f, num($event))">
      </label>
    </template>
  </template>
</template>
