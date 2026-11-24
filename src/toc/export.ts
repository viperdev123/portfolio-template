import { download, loadFonts, nodeToPng, withOffscreen } from '../shared/export'
import { PAGE_H, PAGE_W } from '../types'
import TocCanvas from './TocCanvas.vue'
import type { Toc } from './model'
import { computeGeo, measure } from './layout'
import { listRect, resolveColors, sampleBackdrop } from './palette'

export const bgOf = (t: Toc, shared: string) => (t.bgSource === 'shared' ? shared : t.bgSource === 'own' ? t.bg : '')

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// วาดหน้าสารบัญแบบไม่มี transform ในที่ซ่อน แล้ว export ที่ pixelRatio 2 => 2480x3508
export async function renderToc(t: Toc, sharedBg: string, transparent: boolean): Promise<Blob> {
  const fonts = new Set([t.titleFont, t.headingFont, t.numFont || t.titleFont])
  await loadFonts([...fonts].flatMap(f => ['400', '600', '700'].map(w => `${w} 40px '${f}'`)))
  const bg = bgOf(t, sharedBg)
  const colors = resolveColors(t, await sampleBackdrop(bg, t.bgX, t.bgY, t.bgZoom, listRect(computeGeo(t, measure))))
  return withOffscreen(TocCanvas, { toc: t, bg, colors, transparent }, async node => {
    await Promise.all([...node.querySelectorAll('img')].map(i => i.decode().catch(() => undefined)))
    await sleep(40)
    return nodeToPng(node, { pixelRatio: 2, width: PAGE_W, height: PAGE_H })
  })
}

export const exportToc = async (t: Toc, bg: string) => download(await renderToc(t, bg, false), 'portfolio-contents.png')
export const exportTocTransparent = async (t: Toc, bg: string) => download(await renderToc(t, bg, true), 'portfolio-contents-elements.png')
