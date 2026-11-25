import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

// ย่อพรีวิวหน้า w×h ให้พอดีกล่อง stage; จอกว้าง (stage เป็น sticky) พอดีทั้งกว้างและสูง จอแคบพอดีแค่ความกว้าง
export function useFit(stage: Ref<HTMLElement | undefined>, w: number, h: number) {
  const scale = ref(.4)
  const fit = () => {
    const el = stage.value!
    const tall = getComputedStyle(el).position === 'sticky'
    scale.value = Math.max(.1, Math.min((el.clientWidth - 32) / w, tall ? (el.clientHeight - 70) / h : Infinity))
  }
  let ro: ResizeObserver
  onMounted(() => { fit(); ro = new ResizeObserver(fit); ro.observe(stage.value!) })
  onBeforeUnmount(() => ro?.disconnect())
  return scale
}

// จำว่าผู้ใช้ปิดหัวข้อไหนในแผงด้านขวา (แยกตามเครื่องมือ); key = route + ชื่อหัวข้อที่ตัดตัวนับในวงเล็บออก
const KEY = 'panels-closed:v1'
let closed: string[] = []
try { closed = JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { /* ใช้ค่าเริ่มต้น: เปิดทุกหัวข้อ */ }
const idOf = (d: HTMLDetailsElement) => location.hash.split('?')[0] + '|' + (d.querySelector('summary')?.textContent ?? '').replace(/\s*\(.*\)\s*$/, '').trim()

addEventListener('toggle', e => {
  const d = e.target
  if (!(d instanceof HTMLDetailsElement) || !d.closest('.panel')) return
  const id = idOf(d)
  closed = closed.filter(x => x !== id).concat(d.open ? [] : [id])
  try { localStorage.setItem(KEY, JSON.stringify(closed)) } catch { /* ignore */ }
}, true)

export function useRememberPanels() {
  onMounted(() => document.querySelectorAll<HTMLDetailsElement>('.panel details').forEach(d => { if (closed.includes(idOf(d))) d.open = false }))
}
