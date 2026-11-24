import type { Page } from './types'
import { resolve } from './theme'

export function bgCss(p: Page): Record<string, string> {
  const b = p.bg, col = (v: string) => resolve(v, p.theme)
  const stops = b.stops.map(s => `${col(s.color)} ${s.pos}%`).join(', ')
  if (b.mode === 'solid' || b.mode === 'image') return { background: col(b.color) }
  if (b.mode === 'linear') return { background: `linear-gradient(${b.angle}deg, ${stops})` }
  if (b.mode === 'radial') return { background: `radial-gradient(circle at 50% 40%, ${stops})` }
  return {}
}
