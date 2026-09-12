// ── INICIO: nodeGeometry ──
// Módulo compartido por SkillNode e SkillTree para resolver forma/raio
// dun NodeDef segundo type/shape/size, e xerar o elemento SVG correspondente.
//
// Sen hooks → sen `'use client'`. Devolve JSX → .tsx.

import type { NodeDef, NodeShape, NodeType } from '@yggdrasil-forge/core'
import type { CSSProperties, JSX } from 'react'

export const FALLBACK_RADIUS = 24
export const SHAPE_CLASS = 'yf-skill-node__shape'
/**
 * Clase do MARCO exterior (19.8). Distinta da do shape a propósito: o
 * pulso de `animations.ts` e as consultas existentes apuntan a
 * `SHAPE_CLASS`, e un segundo elemento coa mesma clase dobraría a
 * animación e rompería tests que contan un só shape por nodo.
 */
export const ORNATE_CLASS = 'yf-skill-node__ornate'

const DEFAULT_SHAPE_BY_TYPE: Readonly<Record<NodeType, NodeShape>> = {
  root: 'circle',
  small: 'circle',
  notable: 'circle',
  keystone: 'hexagon',
  mastery: 'diamond',
  ascendancy: 'octagon',
  cluster: 'circle',
  gateway: 'diamond',
  milestone: 'square',
  subtree_anchor: 'hexagon',
  custom: 'circle',
}

const DEFAULT_RADIUS_BY_TYPE: Readonly<Record<NodeType, number>> = {
  root: 40,
  small: 16,
  notable: 26,
  keystone: 34,
  mastery: 30,
  ascendancy: 32,
  cluster: 22,
  gateway: 26,
  milestone: 24,
  subtree_anchor: 28,
  custom: 24,
}

export function resolveShape(node: NodeDef): NodeShape {
  return node.shape ?? DEFAULT_SHAPE_BY_TYPE[node.type] ?? 'circle'
}

export function resolveRadius(node: NodeDef): number {
  return node.size ?? DEFAULT_RADIUS_BY_TYPE[node.type] ?? FALLBACK_RADIUS
}

/** Puntos dun polígono regular de `sides` lados, raio `r`, rotación en graos. */
function polygonPoints(sides: number, r: number, rotationDeg: number): string {
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const a = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

/**
 * Elemento SVG da forma do nodo. O `style` opcional aplícase como
 * inline CSS no elemento (F10.3.fix: tematización inline desde
 * `useTheme()` no consumidor; `fill`/`stroke`/`strokeWidth` viaxan
 * coma propiedades CSS — non atributos — para conservar transicións).
 */
export function renderNodeShape(
  shape: NodeShape,
  r: number,
  style?: CSSProperties,
  className: string = SHAPE_CLASS,
): JSX.Element {
  const styleProp = style !== undefined ? { style } : {}
  switch (shape) {
    case 'square':
      return (
        <rect x={-r} y={-r} width={r * 2} height={r * 2} className={className} {...styleProp} />
      )
    case 'diamond':
      return <polygon points={polygonPoints(4, r, -90)} className={className} {...styleProp} />
    case 'hexagon':
      return <polygon points={polygonPoints(6, r, -90)} className={className} {...styleProp} />
    case 'octagon':
      return <polygon points={polygonPoints(8, r, -67.5)} className={className} {...styleProp} />
    default:
      return <circle r={r} className={className} {...styleProp} />
  }
}
// ── FIN: nodeGeometry ──
