import { createApp, h, nextTick, type Component } from 'vue'
import { toPng } from 'html-to-image'

// ตัวช่วย export กลางที่ใช้ร่วมกันระหว่างเครื่องมือแถบสารบัญกับ Quote Page Maker
export async function loadFonts(specs: string[]) {
  await Promise.all(specs.map(s => document.fonts.load(s, 'กขค ก็ ที่ “ ” Abc 01')))
  await document.fonts.ready
}

// mount คอมโพเนนต์นอกจอแบบไม่มี transform / UI ตัวแก้ไข แล้วเรียก fn กับ root node
export async function withOffscreen<T>(comp: Component, props: Record<string, unknown>, fn: (node: HTMLElement) => Promise<T>): Promise<T> {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none'
  document.body.appendChild(host)
  const app = createApp({ render: () => h(comp, props) })
  app.mount(host)
  try {
    await nextTick()
    return await fn(host.firstElementChild as HTMLElement)
  } finally {
    app.unmount(); host.remove()
  }
}

export async function nodeToPng(node: HTMLElement, o: { width: number; height: number; pixelRatio: number }): Promise<Blob> {
  const opt = { ...o, cacheBust: false }
  await toPng(node, opt) // วอร์มอัพ: รอบแรกฟอนต์/รูปอาจไม่ครบ
  return await (await fetch(await toPng(node, opt))).blob()
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// อัปโหลดรูป -> data URL (กัน canvas tainted) ย่อด้านยาวไม่เกิน 3508 px; PNG คง alpha ไว้
export function readImage(f: File): Promise<{ src: string; w: number; h: number }> {
  return new Promise((ok, no) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return no(new Error('รองรับเฉพาะ PNG/JPG/WebP'))
    const r = new FileReader()
    r.onerror = () => no(r.error)
    r.onload = () => {
      const img = new Image()
      img.onerror = () => no(new Error('เปิดรูปไม่ได้'))
      img.onload = () => {
        const k = Math.min(1, 3508 / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        ok({ src: f.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .92), w: c.width, h: c.height })
      }
      img.src = r.result as string
    }
    r.readAsDataURL(f)
  })
}
