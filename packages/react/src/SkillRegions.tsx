// ── INICIO: SkillRegions (Capa 2 — rexións por tag) ──
// Renderiza tintes de fondo por columna/rexión, calculando o bounding box
// dos nodos cuxo array `tags` inclúe `region.tag`. Aplícase dentro do
// `<g transform>` do viewport, ANTES de edges e nodos (z-order: rexións
// → edges → nodos).
//
// Render: dous modos vía `regionShape` (default `'box'`, regresión cero).
//   - `'box'`: `<rect>` do bbox (comportamento legado).
//   - `'hull'`: `<path>` orgánico (Catmull-Rom pechado sobre o convex
//      hull dunha mostraxe de círculos). Útil sobre fondos imaxe onde os
//      `<rect>` se solapan e se lavan.
// Cero acoplamento ao motor: o consumidor pasa os specs e nós resolvemos
// posicións.
import type { NodeDef } from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { useTheme } from './ThemeProvider.js'
import { CONTRASTE_MINIMO, corLexible } from './colorContrast.js'
import { resolveRadius } from './nodeGeometry.js'

/**
 * Especificación dunha rexión visual (Capa 2 — rexións + Theme Lab).
 *
 * Cada rexión é un grupo de nodos identificados por un tag compartido
 * no `tags` do `NodeDef`. O renderer pinta un `<rect>` con tinte detrás
 * dos edges e nodos cuxo bbox engloba a tódolos nodos do grupo.
 *
 * Cero schema en `@core`: o `RegionSpec` é unha prop de `@react`, polo
 * que o consumidor pode definir grupos sen migrar o seu TreeDef. Iso
 * permite iterar grupos sen mudar o motor.
 */
export interface RegionSpec {
  /** Identificador interno (key para React + selector no Theme Lab). */
  readonly id: string
  /** Etiqueta lexible da rexión (ex. "Guerreiro"). */
  readonly label: string
  /** Tag que un `NodeDef.tags` debe incluír para pertencer á rexión. */
  readonly tag: string
  /** Cor do tinte. Aplícase con baixa opacidade (~0.12) sobre o canvas. */
  readonly color: string
}

/**
 * Forma do tinte da rexión.
 *
 * - `'box'` (default): `<rect>` do bbox dos nodos da rexión, redondeado.
 *   Comportamento legado; regresión cero sobre consumidores existentes.
 * - `'hull'`: `<path>` orgánico (blob) que segue a forma real do
 *   conxunto de nodos. Pétalos que NON se solapan entre clusters en
 *   abano e que tinguen só a zona real do grupo. Útil con fondos
 *   imaxe nos que os rect se lavan.
 */
export type RegionShape = 'box' | 'hull'

/**
 * Onde vai o nome da rexión (19.8).
 *
 * - `'top'`: no bordo superior, coa cor da comarca e discreto — é o
 *   trato do mockup do atlas, e vai na banda de `padding` que queda
 *   entre o bordo do tinte e o primeiro nodo, así que non o tapa
 *   ninguén. Default, e o
 *   comportamento de sempre.
 * - `'center'`: **flotando no medio**, grande e coa cor da propia
 *   rexión. É o dos mockups fundacionais, e a esa escala ten sentido:
 *   cun atlas de varias comarcas, un rótulo no bordo lese como se fose
 *   doutra cousa. Vai DEBAIXO dos nodos (as rexións píntanse antes), así
 *   que non tapa nada.
 */
export type RegionLabelPlacement = 'top' | 'center'

interface SkillRegionsProps {
  /** Especificacións das rexións (orde de render = orde no array). */
  readonly regions: readonly RegionSpec[]
  /** Posicións dos nodos no espazo do layout (de `computeLayout`). */
  readonly nodePositions: ReadonlyMap<string, { readonly x: number; readonly y: number }>
  /** Definicións dos nodos do TreeDef (para ler `tags` e `radius`). */
  readonly nodes: readonly NodeDef[]
  /** Padding (en unidades do layout) ao redor do bbox da rexión. Default 32. */
  readonly padding?: number
  /** Opacidade do tinte. Default 0.12 (baixa, para non tapar). */
  readonly tintOpacity?: number
  /**
   * Forma do tinte. Default `'box'` (regresión cero). `'hull'` activa
   * o blob orgánico (Catmull-Rom pechado sobre convex hull mostraxado).
   */
  readonly regionShape?: RegionShape
  /** Onde vai o nome da rexión. Default `'top'` (regresión cero). */
  readonly regionLabel?: RegionLabelPlacement
}

interface ComputedRegion {
  readonly spec: RegionSpec
  readonly bbox: {
    readonly minX: number
    readonly minY: number
    readonly maxX: number
    readonly maxY: number
  }
  /** Path do hull-blob (só cando regionShape === 'hull'). */
  readonly hullPath: string | null
}

/** Punto 2D inmutable usado polos helpers de hull. */
interface Point {
  readonly x: number
  readonly y: number
}

/**
 * Calcula o bounding box dos nodos cuxo `tags` inclúe `tag`, expandido
 * por `radius + padding` en cada lado. Devolve `null` se non hai nodos
 * dese tag (a rexión non se debuxa nese caso).
 */
function computeRegionBbox(
  tag: string,
  nodes: readonly NodeDef[],
  positions: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
  padding: number,
): ComputedRegion['bbox'] | null {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let found = false

  for (const node of nodes) {
    if (node.tags === undefined || !node.tags.includes(tag)) continue
    const pos = positions.get(node.id)
    if (pos === undefined) continue
    const r = resolveRadius(node)
    if (pos.x - r < minX) minX = pos.x - r
    if (pos.y - r < minY) minY = pos.y - r
    if (pos.x + r > maxX) maxX = pos.x + r
    if (pos.y + r > maxY) maxY = pos.y + r
    found = true
  }

  if (!found) return null
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
}

/** Número de puntos de mostraxe por cada círculo (nodo) para enclose robusto. */
const HULL_SAMPLE_POINTS = 10

/**
 * Convex hull dunha nube de puntos polo algoritmo Monotone Chain (Andrew).
 * Devolve os vértices en sentido antihorario (con eixe Y cara abaixo, é
 * a orde "horaria" visual — irrelevante para `fill`; relevante para que
 * o Catmull-Rom pechado non se inverta).
 *
 * Implementación estándar; deduplicación implícita por ordenación.
 */
function monotoneChainHull(input: readonly Point[]): Point[] {
  if (input.length <= 1) return input.slice()
  const ps = [...input].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Point, a: Point, b: Point): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  // Lower hull
  const lower: Point[] = []
  for (const p of ps) {
    while (lower.length >= 2) {
      const a = lower[lower.length - 2]
      const b = lower[lower.length - 1]
      if (a === undefined || b === undefined) break
      if (cross(a, b, p) <= 0) lower.pop()
      else break
    }
    lower.push(p)
  }

  // Upper hull
  const upper: Point[] = []
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]
    if (p === undefined) continue
    while (upper.length >= 2) {
      const a = upper[upper.length - 2]
      const b = upper[upper.length - 1]
      if (a === undefined || b === undefined) break
      if (cross(a, b, p) <= 0) upper.pop()
      else break
    }
    upper.push(p)
  }

  // Concatenar sen duplicar puntos de inicio/fin.
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Expoñente da parametrización: 0.5 = centrípeta. */
const CATMULL_ALPHA = 0.5

/**
 * Devolve un path SVG `d` pechado e suavizado (Catmull-Rom cúbico) que
 * conecta os vértices en orde, formando un blob orgánico.
 *
 * **Parametrización centrípeta** (19.10), non uniforme. A uniforme
 * calcula a tanxente nun vértice como `(seguinte − anterior) / 2`, e iso
 * só vale se os lados miden parecido. Os vértices deste blob veñen dun
 * convex hull sobre puntos mostreados nos círculos dos nodos, así que
 * hai lados de 10 unidades pegados a lados de 187 — razóns de 12x a 19x
 * medidas no atlas da galería. Nesas condicións a tanxente hérdaa o lado
 * LONGO e aplícase no CURTO: o brazo de control chegaba a medir 3,3
 * veces a corda (63 segmentos deformados dos ~100), e iso vese como
 * espigas e mordidas na silueta.
 *
 * A centrípeta escala cada tanxente co espazado local. Con lados iguais
 * redúcese termo a termo á fórmula uniforme de antes — regresión cero
 * por construción, e hai proba.
 */
function catmullRomClosedPath(verts: readonly Point[]): string {
  const n = verts.length
  if (n === 0) return ''
  const first = verts[0]
  if (first === undefined) return ''

  // Intervalos de nó: a lonxitude de cada lado elevada a `alpha`. O
  // mínimo evita dividir por cero con dous vértices coincidentes (o
  // hull pode dalos cando dous nodos se tocan).
  const t: number[] = []
  for (let i = 0; i < n; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % n]
    if (a === undefined || b === undefined) {
      t.push(1)
      continue
    }
    t.push(Math.max(Math.hypot(b.x - a.x, b.y - a.y) ** CATMULL_ALPHA, 1e-6))
  }

  // Tanxente en cada vértice: media das dúas cordas PESADA polo
  // espazado do lado oposto. É o que impide que o lado longo mande no
  // curto.
  const m: Point[] = []
  for (let i = 0; i < n; i++) {
    const pm = verts[(i - 1 + n) % n]
    const p = verts[i]
    const pn = verts[(i + 1) % n]
    const tPrev = t[(i - 1 + n) % n] ?? 1
    const tNext = t[i] ?? 1
    if (pm === undefined || p === undefined || pn === undefined) {
      m.push({ x: 0, y: 0 })
      continue
    }
    const suma = tPrev + tNext
    m.push({
      x: (((p.x - pm.x) / tPrev) * tNext + ((pn.x - p.x) / tNext) * tPrev) / suma,
      y: (((p.y - pm.y) / tPrev) * tNext + ((pn.y - p.y) / tNext) * tPrev) / suma,
    })
  }

  let d = `M ${first.x} ${first.y}`
  for (let i = 0; i < n; i++) {
    const p0 = verts[i]
    const p1 = verts[(i + 1) % n]
    const m0 = m[i]
    const m1 = m[(i + 1) % n]
    const dt = t[i] ?? 1
    if (p0 === undefined || p1 === undefined || m0 === undefined || m1 === undefined) continue
    const c1x = p0.x + (m0.x * dt) / 3
    const c1y = p0.y + (m0.y * dt) / 3
    const c2x = p1.x - (m1.x * dt) / 3
    const c2y = p1.y - (m1.y * dt) / 3
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p1.x} ${p1.y}`
  }
  d += ' Z'
  return d
}

/**
 * Devolve o `d` dun path pechado e suavizado (blob) que engloba os nodos
 * da rexión, ou `null` se non hai nodos co `tag` ou ningún ten posición.
 *
 * Algoritmo:
 *   1. Mostraxe de `HULL_SAMPLE_POINTS` puntos no círculo de cada nodo
 *      (centro=posición, raio=`resolveRadius(node)`). Iso garante que o
 *      hull engloba os círculos enteiros, non só os centros — robusto
 *      mesmo cun só nodo.
 *   2. Convex hull (Monotone chain).
 *   3. Padding cara fóra: cada vértice desprázase `padding * 0.5` na
 *      dirección centroide→vértice (separación leve sobre o círculo).
 *   4. Catmull-Rom pechado → Bézier cúbico para suavizado.
 *   5. Se tras o hull quedan <3 vértices (improbable coa mostraxe),
 *      fallback ao path do bbox redondeado para non romper.
 */
export function computeRegionHullPath(
  tag: string,
  nodes: readonly NodeDef[],
  positions: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
  padding: number,
): string | null {
  // 1. Mostraxe de puntos no perímetro de cada círculo de nodo.
  const points: Point[] = []
  for (const node of nodes) {
    if (node.tags === undefined || !node.tags.includes(tag)) continue
    const pos = positions.get(node.id)
    if (pos === undefined) continue
    const r = resolveRadius(node)
    for (let k = 0; k < HULL_SAMPLE_POINTS; k++) {
      const theta = (2 * Math.PI * k) / HULL_SAMPLE_POINTS
      points.push({
        x: pos.x + r * Math.cos(theta),
        y: pos.y + r * Math.sin(theta),
      })
    }
  }
  if (points.length === 0) return null

  // 2. Convex hull.
  const hull = monotoneChainHull(points)
  if (hull.length < 3) {
    // Fallback raro: rect redondeado do bbox da nube. Coa mostraxe
    // K=10 práticamente nunca se chega aquí, pero protexémonos.
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const p of points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding
    // Path simple de rectángulo pechado.
    return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`
  }

  // 3. Padding desde centroide cara fóra.
  let cx = 0
  let cy = 0
  for (const p of hull) {
    cx += p.x
    cy += p.y
  }
  cx /= hull.length
  cy /= hull.length
  const expanded: Point[] = hull.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const dist = Math.hypot(dx, dy)
    if (dist === 0) return { x: p.x, y: p.y }
    const factor = (dist + padding * 0.5) / dist
    return { x: cx + dx * factor, y: cy + dy * factor }
  })

  // 4. Catmull-Rom pechado.
  return catmullRomClosedPath(expanded)
}

/**
 * Renderiza tintes de fondo por rexión. Aplícase dentro do `<g transform>`
 * do viewport e ANTES dos edges/nodos (z-order: rexións → edges → nodos).
 */
export function SkillRegions({
  regions,
  nodePositions,
  nodes,
  padding = 32,
  tintOpacity = 0.12,
  regionShape = 'box',
  regionLabel = 'top',
}: SkillRegionsProps): JSX.Element | null {
  const theme = useTheme()
  if (regions.length === 0) return null

  const computed: ComputedRegion[] = []
  for (const spec of regions) {
    const bbox = computeRegionBbox(spec.tag, nodes, nodePositions, padding)
    if (bbox === null) continue
    // O hull-blob só se computa cando se vai usar (evita traballo no
    // modo 'box' por defecto). A label segue colocada con bbox para
    // que sexa consistente entre modos.
    const hullPath =
      regionShape === 'hull' ? computeRegionHullPath(spec.tag, nodes, nodePositions, padding) : null
    computed.push({ spec, bbox, hullPath })
  }
  if (computed.length === 0) return null

  const textColor = theme?.colors.text ?? '#666666'
  // Lenzo efectivo, mesma cadea que o halo do rótulo en SkillNode:
  // `background` é opcional e ningún tema base o define.
  const fondo = theme?.colors.background ?? theme?.colors.mesh

  return (
    <g className="yf-skill-regions" data-testid="skill-regions" pointerEvents="none">
      {computed.map(({ spec, bbox, hullPath }) => {
        const width = bbox.maxX - bbox.minX
        const height = bbox.maxY - bbox.minY
        return (
          <g key={spec.id} className="yf-skill-region" data-region-id={spec.id}>
            {regionShape === 'hull' && hullPath !== null ? (
              <path
                d={hullPath}
                fill={spec.color}
                fillOpacity={tintOpacity}
                stroke={spec.color}
                strokeOpacity={tintOpacity * 1.5}
                strokeWidth={1.5}
              />
            ) : (
              <rect
                x={bbox.minX}
                y={bbox.minY}
                width={width}
                height={height}
                rx={12}
                ry={12}
                fill={spec.color}
                fillOpacity={tintOpacity}
                stroke={spec.color}
                strokeOpacity={tintOpacity * 1.5}
                strokeWidth={1}
              />
            )}
            <text
              x={bbox.minX + width / 2}
              y={regionLabel === 'center' ? bbox.minY + height / 2 : bbox.minY + 18}
              textAnchor="middle"
              style={
                regionLabel === 'center'
                  ? {
                      // Grande, coa cor da comarca e translúcido: é un
                      // rótulo de mapa, non unha etiqueta de UI. Ao ir
                      // debaixo dos nodos, a opacidade baixa é o que
                      // evita que compita con eles.
                      fontSize: Math.max(18, Math.min(46, width * 0.11)),
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      fill: spec.color,
                      fillOpacity: 0.5,
                    }
                  : {
                      // 19.10: coa cor da comarca e escalado co mapa,
                      // como no mockup do atlas. Antes ía sempre a 13 e
                      // na cor do texto: nun mapa de 1.100 unidades iso
                      // é unha etiqueta de UI perdida, e non dicía a
                      // que comarca pertence. O clamp inferior deixa os
                      // documentos pequenos exactamente coma antes.
                      fontSize: Math.max(13, Math.min(24, width * 0.05)),
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      // A cor da comarca SÓ se xa se le sobre o lenzo.
                      // As cores de rexión decláranse para tinguir un
                      // fondo ao 12%, e unha que vale para iso pode non
                      // valer para escribir: no showcase gótico
                      // «CLAUSTRO» (#3a2a2a) desaparecía.
                      // O 0.8 vai no cálculo: un texto translúcido ten
                      // o contraste da cor MESTURADA co fondo, non o da
                      // sólida.
                      fill: corLexible(spec.color, fondo, textColor, CONTRASTE_MINIMO, 0.8),
                      fillOpacity: 0.8,
                    }
              }
            >
              {spec.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
// ── FIN: SkillRegions ──
