import type { Theme } from './types'

export const THEMES: Theme[] = [
  { id: 'navy-gold', name: 'Navy & Gold', bg1: '#001043', bg2: '#0A1B5C', mids: ['#14297A', '#1E3A8F', '#2A4494'], accent: '#E3B04B', accent2: '#F3D27A', text: '#FFFFFF', text2: '#DCE6F5' },
  { id: 'navy-light', name: 'Navy Light', bg1: '#FFFFFF', bg2: '#FAFAFA', mids: ['#8FA0CC', '#C5CEE8'], accent: '#E3B04B', accent2: '#F3D27A', text: '#0A1B5C', text2: '#44558F' },
  { id: 'emerald-gold', name: 'Emerald & Gold', bg1: '#0B3B2E', bg2: '#12503F', mids: [], accent: '#E3B04B', accent2: '#F3D27A', text: '#F6F0DC', text2: '#D8CFA6' },
  { id: 'charcoal-gold', name: 'Charcoal & Gold', bg1: '#14171F', bg2: '#232834', mids: [], accent: '#E3B04B', accent2: '#F3D27A', text: '#FFFFFF', text2: '#C9CEDA' },
  { id: 'ivory-navy', name: 'Ivory & Navy', bg1: '#F7F2E4', bg2: '#EFE8D2', mids: [], accent: '#C8953A', accent2: '#E3B04B', text: '#0A1B5C', text2: '#44558F' },
  { id: 'royal-soft', name: 'Royal Blue Soft', bg1: '#14297A', bg2: '#2A4494', mids: [], accent: '#F3D27A', accent2: '#F3D27A', text: '#FFFFFF', text2: '#DCE6F5' },
]

export const resolve = (c: string, t: Theme): string => (c.startsWith('@') ? (t as any)[c.slice(1)] : c)

function lum(hex: string) {
  const h = hex.replace('#', ''), f = h.length === 3 ? h.replace(/./g, '$&$&') : h
  const [r, g, b] = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255)
    .map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4))
  return .2126 * r + .7152 * g + .0722 * b
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + .05) / (y + .05)
}
/** คอนทราสต์ข้อความหลักกับพื้นทั้งสองสีของชุดสี (WCAG ต้อง >= 4.5) */
export const themeContrast = (t: Theme) => Math.min(contrast(t.text, t.bg1), contrast(t.text, t.bg2))
