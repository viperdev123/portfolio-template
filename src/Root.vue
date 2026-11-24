<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
import App from './App.vue'

// shortcut: hash route (#/quote) แทน vue-router, อัปเกรดเมื่อต้องการ path จริงที่ต้องตั้งค่า server
const QuoteApp = defineAsyncComponent(() => import('./quote/QuoteApp.vue'))
const quote = ref(location.hash.startsWith('#/quote'))
const sync = () => (quote.value = location.hash.startsWith('#/quote'))
addEventListener('hashchange', sync)
onBeforeUnmount(() => removeEventListener('hashchange', sync))
</script>

<template>
  <nav class="hdr" aria-label="เครื่องมือ">
    <b>Portfolio Tools</b>
    <a href="#/" :class="{ on: !quote }" :aria-current="!quote ? 'page' : undefined">แถบสารบัญ</a>
    <a href="#/quote" :class="{ on: quote }" :aria-current="quote ? 'page' : undefined">Quote Page Maker</a>
  </nav>
  <QuoteApp v-if="quote" />
  <App v-else />
</template>
