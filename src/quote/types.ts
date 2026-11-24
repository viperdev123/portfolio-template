export const PW = 1240
export const PH = 1754

// สี: '#rrggbb' หรือ token '@text' ที่แปลงตามชุดสีของหน้า (เปลี่ยนชุดสีแล้วทั้งหน้าเปลี่ยนตาม)
export type Color = string
export interface Theme {
  id: string; name: string
  bg1: string; bg2: string; mids: string[]
  accent: string; accent2: string; text: string; text2: string
}
export const TOKENS = [['text', 'ข้อความ'], ['text2', 'ข้อความรอง'], ['accent', 'ทอง 1'], ['accent2', 'ทอง 2'], ['bg1', 'พื้น 1'], ['bg2', 'พื้น 2']] as const

export interface Shadow { on: boolean; x: number; y: number; blur: number; color: Color }
export interface Base {
  id: string; name: string; x: number; y: number; w: number; h: number; rot: number
  locked: boolean; hidden: boolean; opacity: number
  tpl?: boolean; slot?: 'quote' | 'image'
}
export interface TextEl extends Base {
  kind: 'text'; text: string; sub: string; subScale: number; subColor: Color
  font: string; size: number; weight: number; italic: boolean; lineHeight: number; spacing: number
  color: Color; grad: { on: boolean; c1: Color; c2: Color }
  align: 'left' | 'center' | 'right' | 'justify'; valign: 'top' | 'middle' | 'bottom'
  shadow: Shadow; stroke: { w: number; color: Color }; autoFit: boolean
}
export interface ImageEl extends Base {
  kind: 'image'; asset: string; nw: number; nh: number
  mask: 'none' | 'rounded' | 'circle' | 'arch'
  zoom: number; ox: number; oy: number
  border: { on: boolean; color: Color; w: number }; shadow: Shadow
  adj: { brightness: number; contrast: number; saturate: number; blur: number }
  tint: { color: Color; amt: number }
  feather: { mode: 'radial' | 'linear' | 'bottom'; amt: number }
}
export interface ShapeEl extends Base {
  kind: 'shape'; shape: 'rect' | 'rounded' | 'circle' | 'arch' | 'line'
  fill: Color; grad: { on: boolean; c1: Color; c2: Color; angle: number }
  stroke: { w: number; color: Color }; radius: number; shadow: Shadow
}
export interface QuoteEl extends Base {
  kind: 'quote'; style: number; closing: boolean; color: Color; grad: { on: boolean; c1: Color; c2: Color }
}
export interface DecoEl extends Base {
  kind: 'deco'; deco: 'goldline' | 'ring' | 'dots' | 'sparkle'; color: Color; color2: Color; param: number
}
export type El = TextEl | ImageEl | ShapeEl | QuoteEl | DecoEl

export interface Bg {
  mode: 'none' | 'solid' | 'linear' | 'radial' | 'image'
  color: Color; stops: { color: Color; pos: number }[]; angle: number
  asset: string; x: number; y: number; zoom: number; opacity: number; tint: Color; tintAmt: number
}
export interface Page { id: string; name: string; theme: Theme; bg: Bg; elements: El[] }
export interface Project { pages: Page[]; current: string }
