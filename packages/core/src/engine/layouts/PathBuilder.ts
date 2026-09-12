// ── INICIO: PathBuilder ──
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import type { EdgePath, LayoutResult } from './LayoutResult.js'

/**
 * Estilo de curva para edges.
 *
 * - `'straight'`: liña recta (2 puntos). Compatible cos edges
 *   producidos por IdentityLayout/RadialLayout/TreeLayout (4.1-4.4).
 * - `'diagonal-vertical'`: cubic Bézier con tangentes verticais.
 *   Ideal para TreeLayout top-down/bottom-up.
 * - `'diagonal-horizontal'`: cubic Bézier con tangentes horizontais.
 *   Ideal para TreeLayout left-right/right-left.
 * - `'radial'`: cubic Bézier en coordenadas polares (control points
 *   no medio do segmento). Ideal para RadialLayout.
 * - `'orthogonal'`: polyline (L-shape ou S-shape). Patrón "Manhattan".
 * - `'arc'`: cubic Bézier cunha combadura LIXEIRA perpendicular ao
 *   segmento, proporcional á súa lonxitude. É o único estilo sen nesgo
 *   de dirección: os cinco anteriores asumen unha orientación dominante
 *   (vertical, horizontal, radial ou Manhattan) e nunha MALLA, onde as
 *   arestas van a todas as direccións, iso produce eses S raros nas
 *   perpendiculares ao nesgo. Aquí a curva depende só da propia aresta,
 *   así que unha tea de centos de liñas curva toda igual de suave — o
 *   «curved bezier edges, no straight flowchart lines» dos mockups.
 * - `'octilinear'`: polyline cun tramo recto (H ou V) e un tramo a 45°.
 *   Look PCB / metro / Deus Ex. Bo para posicións fixas con
 *   conexións locais (IdentityLayout en exemplos cyber). Degenera a
 *   recta se as posicións están aliñadas en H ou V.
 */
export type CurveStyle =
  | 'straight'
  | 'diagonal-vertical'
  | 'diagonal-horizontal'
  | 'radial'
  | 'arc'
  | 'orthogonal'
  | 'octilinear'

/**
 * Opcións para PathBuilder.
 *
 * - `tension`: para cubic Bézier, controla "intensidade" das
 *   tangentes (0..1). Default 0.5.
 * - `centerX/centerY`: centro do layout (para 'radial'). Default 0.
 * - `cornerRatio`: para 'orthogonal', posición do "corner" como
 *   fracción (0..1). Default 0.5 (midpoint).
 * - `arcBow`: para 'arc', combadura como fracción da lonxitude da
 *   aresta. Default 0.12 (un 12% — visible pero lonxe de parecer un
 *   arco). `arcMaxBow` acóutaa en unidades de layout para que unha
 *   aresta moi longa non se converta nunha bóveda.
 */
export interface PathBuilderOptions {
  readonly tension?: number
  /** Combadura de `'arc'` como fracción da lonxitude. Default 0.12. */
  readonly arcBow?: number
  /** Tope absoluto da combadura de `'arc'`. Default 90. */
  readonly arcMaxBow?: number
  readonly centerX?: number
  readonly centerY?: number
  readonly cornerRatio?: number
}

/**
 * Función pura que transforma os edges dun LayoutResult aplicando un
 * estilo de curva. Devolve un novo LayoutResult con `edges`
 * actualizado; o resto (nodes, bounds, layoutType, mesh) intacto.
 */
export function buildPaths(
  layoutResult: LayoutResult,
  style: CurveStyle,
  options: PathBuilderOptions = {},
): LayoutResult {
  const tension = options.tension ?? 0.5
  const centerX = options.centerX ?? 0
  const centerY = options.centerY ?? 0
  const cornerRatio = options.cornerRatio ?? 0.5
  const arcBow = options.arcBow ?? 0.12
  const arcMaxBow = options.arcMaxBow ?? 90

  const newEdges = new Map<string, EdgePath>()
  for (const [edgeId, oldPath] of layoutResult.edges) {
    const points = oldPath.points
    if (points.length < 2) {
      newEdges.set(edgeId, oldPath)
      continue
    }
    const source = points[0]
    const target = points[points.length - 1]
    /* v8 ignore start -- defensivo: o `points.length < 2` previo garante
       length >= 2, polo que points[0] e points[last] sempre existen.
       Guarda esixida por noUncheckedIndexedAccess. */
    if (source === undefined || target === undefined) {
      newEdges.set(edgeId, oldPath)
      continue
    }
    /* v8 ignore stop */
    const newPath = buildPath(style, source, target, {
      tension,
      centerX,
      centerY,
      cornerRatio,
      arcBow,
      arcMaxBow,
    })
    newEdges.set(edgeId, newPath)
  }

  return {
    ...layoutResult,
    edges: newEdges,
  }
}

/** Helper: constrúe un EdgePath para un par source/target. */
function buildPath(
  style: CurveStyle,
  source: Position,
  target: Position,
  opts: {
    tension: number
    centerX: number
    centerY: number
    cornerRatio: number
    arcBow: number
    arcMaxBow: number
  },
): EdgePath {
  switch (style) {
    case 'straight':
      return { points: [source, target], kind: 'line' }

    case 'diagonal-vertical': {
      const dy = target.y - source.y
      const c1: Position = {
        x: source.x,
        y: source.y + dy * opts.tension,
      }
      const c2: Position = {
        x: target.x,
        y: target.y - dy * opts.tension,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'diagonal-horizontal': {
      const dx = target.x - source.x
      const c1: Position = {
        x: source.x + dx * opts.tension,
        y: source.y,
      }
      const c2: Position = {
        x: target.x - dx * opts.tension,
        y: target.y,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'radial': {
      const mid: Position = {
        x: (source.x + target.x) / 2,
        y: (source.y + target.y) / 2,
      }
      const c1: Position = {
        x: source.x + (mid.x - source.x) * opts.tension,
        y: source.y + (mid.y - source.y) * opts.tension,
      }
      const c2: Position = {
        x: target.x + (mid.x - target.x) * opts.tension,
        y: target.y + (mid.y - target.y) * opts.tension,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'arc': {
      // Combadura PERPENDICULAR: o único estilo que non asume dirección.
      const dx = target.x - source.x
      const dy = target.y - source.y
      const len = Math.hypot(dx, dy)
      // Aresta degenerada (mesmo punto): recta, sen dividir por cero.
      if (len < 1e-6) return { points: [source, target], kind: 'line' }
      const bow = Math.min(len * opts.arcBow, opts.arcMaxBow)
      // Normal unitaria ao segmento. O signo é sempre o mesmo, así que
      // unha tea curva de forma coherente en vez de ao chou.
      const nx = -dy / len
      const ny = dx / len
      const c1: Position = {
        x: source.x + dx / 3 + nx * bow,
        y: source.y + dy / 3 + ny * bow,
      }
      const c2: Position = {
        x: source.x + (dx * 2) / 3 + nx * bow,
        y: source.y + (dy * 2) / 3 + ny * bow,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'orthogonal': {
      const cornerX = source.x + (target.x - source.x) * opts.cornerRatio
      if (opts.cornerRatio === 0 || opts.cornerRatio === 1) {
        const lcorner: Position =
          opts.cornerRatio === 0 ? { x: source.x, y: target.y } : { x: target.x, y: source.y }
        return { points: [source, lcorner, target], kind: 'polyline' }
      }
      const corner: Position = { x: cornerX, y: source.y }
      const corner2: Position = { x: cornerX, y: target.y }
      return {
        points: [source, corner, corner2, target],
        kind: 'polyline',
      }
    }
    case 'octilinear': {
      // Octilinear: un tramo recto (H ou V, dominante) + un tramo a
      // 45°. Look PCB / Deus Ex. Degenera a recta se aliñado en H/V.
      //
      // Algoritmo: o tramo recto vai polo eixe dominante (o de maior
      // |delta|) ata deixar só |Δ menor| pendente; logo péchase a 45°
      // (porque os deltas restantes son iguais en valor absoluto).
      const EPS = 1e-6
      const dx = target.x - source.x
      const dy = target.y - source.y
      if (Math.abs(dx) < EPS || Math.abs(dy) < EPS) {
        // Aliñado en H ou V → liña recta sen recodo.
        return { points: [source, target], kind: 'polyline' }
      }
      const sx = Math.sign(dx)
      const sy = Math.sign(dy)
      const mid: Position =
        Math.abs(dx) >= Math.abs(dy)
          ? { x: target.x - sx * Math.abs(dy), y: source.y } // dominante-H: recto H, logo 45°
          : { x: source.x, y: target.y - sy * Math.abs(dx) } // dominante-V: recto V, logo 45°
      return { points: [source, mid, target], kind: 'polyline' }
    }
  }
}

/**
 * Aplica routing por-edge a un `LayoutResult` segundo o contrato de
 * datos (F10.4b).
 *
 * Para cada edge do `treeDef`, resolve o estilo como
 * `edge.style?.routing ?? treeDef.layout.curve`. Se o estilo resolto
 * está definido **e** non é `'straight'`, reconstrúe o path do edge co
 * helper interno `buildPath`. Calquera outro caso (sen routing
 * resolto, `'straight'`, ou edge sen path no layout) → deixa o path
 * tal cal.
 *
 * Inmutable: devolve un novo `LayoutResult` cun novo Map de edges. Os
 * paths non modificados reutilízanse por referencia (sen clonado
 * innecesario).
 *
 * O centro para `'radial'` (centerX/centerY) calcúlase desde os bounds
 * do propio layout. `tension`/`cornerRatio` toman os defaults
 * (mesmo comportamento que `buildPaths`).
 */
export function applyEdgeRouting(
  layoutResult: LayoutResult,
  treeDef: TreeDef,
  options: PathBuilderOptions = {},
): LayoutResult {
  const layoutCurve = treeDef.layout.curve
  // Fast path: cero edges teñen routing resolto → ningún cambio.
  // Iteramos edges para saber se hai algo que facer; común en árbores
  // que non opt-in (retrocompatibilidade total: paths rectos).
  let anyResolved = false
  for (const edge of treeDef.edges) {
    const resolved = edge.style?.routing ?? layoutCurve
    if (resolved !== undefined && resolved !== 'straight') {
      anyResolved = true
      break
    }
  }
  if (!anyResolved) return layoutResult

  const tension = options.tension ?? 0.5
  const cornerRatio = options.cornerRatio ?? 0.5
  const arcBow = options.arcBow ?? 0.12
  const arcMaxBow = options.arcMaxBow ?? 90
  // Centro derivado dos bounds (consistente con 'radial' de buildPaths).
  const { bounds } = layoutResult
  const centerX = options.centerX ?? (bounds.minX + bounds.maxX) / 2
  const centerY = options.centerY ?? (bounds.minY + bounds.maxY) / 2

  const newEdges = new Map<string, EdgePath>()
  for (const [edgeId, oldPath] of layoutResult.edges) {
    newEdges.set(edgeId, oldPath)
  }

  for (const edge of treeDef.edges) {
    const resolved = edge.style?.routing ?? layoutCurve
    if (resolved === undefined || resolved === 'straight') continue
    const oldPath = layoutResult.edges.get(edge.id)
    /* v8 ignore start -- defensivo: o layout produce paths para tódolos edges */
    if (oldPath === undefined) continue
    /* v8 ignore stop */
    const pts = oldPath.points
    /* v8 ignore start -- defensivo: paths sempre teñen polo menos 2 puntos */
    if (pts.length < 2) continue
    /* v8 ignore stop */
    const source = pts[0]
    const target = pts[pts.length - 1]
    /* v8 ignore start -- defensivo: length>=2 garántese arriba */
    if (source === undefined || target === undefined) continue
    /* v8 ignore stop */
    newEdges.set(
      edge.id,
      buildPath(resolved, source, target, {
        tension,
        centerX,
        centerY,
        cornerRatio,
        arcBow,
        arcMaxBow,
      }),
    )
  }

  return { ...layoutResult, edges: newEdges }
}
// ── FIN: PathBuilder ──
