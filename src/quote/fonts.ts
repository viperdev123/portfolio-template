// ฟอนต์ไทยฝังผ่าน @fontsource (ไม่ใช้ CDN) Noto Sans Thai / Sarabun โหลดไว้แล้วใน main.ts
import '@fontsource/noto-serif-thai/thai-400.css'
import '@fontsource/noto-serif-thai/thai-700.css'
import '@fontsource/noto-serif-thai/latin-400.css'
import '@fontsource/noto-serif-thai/latin-700.css'
import '@fontsource/prompt/thai-400.css'
import '@fontsource/prompt/thai-700.css'
import '@fontsource/prompt/latin-400.css'
import '@fontsource/prompt/latin-700.css'
import '@fontsource/kanit/thai-400.css'
import '@fontsource/kanit/thai-700.css'
import '@fontsource/kanit/latin-400.css'
import '@fontsource/kanit/latin-700.css'
import '@fontsource/mitr/thai-400.css'
import '@fontsource/mitr/thai-700.css'
import '@fontsource/mitr/latin-400.css'
import '@fontsource/mitr/latin-700.css'
import '@fontsource/pridi/thai-400.css'
import '@fontsource/pridi/thai-700.css'
import '@fontsource/pridi/latin-400.css'
import '@fontsource/pridi/latin-700.css'
import '@fontsource/chonburi/thai-400.css'
import '@fontsource/chonburi/latin-400.css'

export const FONTS = ['Noto Sans Thai', 'Sarabun', 'Noto Serif Thai', 'Prompt', 'Kanit', 'Mitr', 'Pridi', 'Chonburi']

// สไตล์เครื่องหมายคำพูด: glyph มาจากฟอนต์ที่ฝังไว้เท่านั้น เพื่อให้ export ตรงพรีวิว
export const QUOTE_STYLES = [
  { name: 'เซริฟ', font: 'Noto Serif Thai', weight: 700, open: '“', close: '”', k: 1.5 },
  { name: 'Chonburi', font: 'Chonburi', weight: 400, open: '“', close: '”', k: 1.5 },
  { name: 'Prompt หนา', font: 'Prompt', weight: 700, open: '“', close: '”', k: 1.5 },
  { name: 'ตรง', font: 'Sarabun', weight: 700, open: '"', close: '"', k: 1.3 },
]
