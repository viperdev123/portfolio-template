// ตัดบรรทัดไทย: ใส่ ZWSP หลังคำ (Intl.Segmenter) ให้ขึ้นบรรทัดใหม่ได้เฉพาะระหว่างคำ ไม่ตัดกลางคำ/ไม่แยกสระวรรณยุกต์
const seg = typeof Intl !== 'undefined' && (Intl as any).Segmenter ? new (Intl as any).Segmenter('th', { granularity: 'word' }) : null
const cache = new Map<string, string>()

export function thaiWrap(t: string): string {
  if (!seg || !t) return t
  let r = cache.get(t)
  if (r === undefined) {
    r = ''
    for (const s of seg.segment(t)) r += s.segment + (s.isWordLike ? '​' : '')
    if (cache.size > 500) cache.clear()
    cache.set(t, r)
  }
  return r
}
