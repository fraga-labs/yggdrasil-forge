// ── INICIO: tests do regionShape='hull' (helper puro + render) ──
// O ficheiro SkillRegions.test.tsx existente non se toca → guard de
// regresión: o default 'box' segue funcionando exactamente igual.
// Aquí cubrimos só o que engade o blob.

import { render } from '@testing-library/react'
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillRegions, computeRegionHullPath } from '../src/SkillRegions.js'

/** Helper: NodeDef mínimo con tags + size. */
function n(id: string, x: number, y: number, tag: string): NodeDef {
  // Posición non se pasa polo NodeDef (vai en positions), polo que x/y
  // son só argumentos do test (úsanse para construír o Map de positions).
  void x
  void y
  return {
    id,
    type: 'small',
    label: id,
    tags: [tag],
    size: 24,
  }
}

function pos(
  entries: ReadonlyArray<[string, number, number]>,
): Map<string, { readonly x: number; readonly y: number }> {
  const m = new Map<string, { readonly x: number; readonly y: number }>()
  for (const [id, x, y] of entries) m.set(id, { x, y })
  return m
}

describe('computeRegionHullPath (helper puro)', () => {
  it('4 nodos en abano: path comeza con M, contén C e remata en Z', () => {
    const nodes: NodeDef[] = [
      n('a', 100, 0, 't'),
      n('b', 0, 100, 't'),
      n('c', -100, 0, 't'),
      n('d', 0, -100, 't'),
    ]
    const positions = pos([
      ['a', 100, 0],
      ['b', 0, 100],
      ['c', -100, 0],
      ['d', 0, -100],
    ])
    const d = computeRegionHullPath('t', nodes, positions, 16)
    expect(d).not.toBeNull()
    if (d === null) return
    expect(d.startsWith('M')).toBe(true)
    expect(d.includes(' C ')).toBe(true)
    expect(d.trimEnd().endsWith('Z')).toBe(true)
  })

  it('un só nodo: produce un path pechado válido (sen degenerar)', () => {
    const nodes: NodeDef[] = [n('solo', 0, 0, 't')]
    const positions = pos([['solo', 0, 0]])
    const d = computeRegionHullPath('t', nodes, positions, 16)
    expect(d).not.toBeNull()
    if (d === null) return
    expect(d.startsWith('M')).toBe(true)
    expect(d.trimEnd().endsWith('Z')).toBe(true)
    // A mostraxe de K=10 puntos no perímetro do círculo dá un hull
    // con polo menos 3 vértices → debe usar segmentos C, non fallback.
    expect(d.includes(' C ')).toBe(true)
  })

  it('0 nodos co tag: devolve null', () => {
    const nodes: NodeDef[] = [n('a', 0, 0, 'outro')]
    const positions = pos([['a', 0, 0]])
    expect(computeRegionHullPath('non-existe', nodes, positions, 16)).toBeNull()
    expect(computeRegionHullPath('outro', [], positions, 16)).toBeNull()
  })

  it('hull engloba: bbox numérico do path inclúe os centros dos nodos', () => {
    const centers: ReadonlyArray<[string, number, number]> = [
      ['a', 100, 0],
      ['b', 0, 100],
      ['c', -100, 0],
      ['d', 0, -100],
    ]
    const nodes: NodeDef[] = centers.map(([id, x, y]) => n(id, x, y, 't'))
    const positions = pos(centers)
    const d = computeRegionHullPath('t', nodes, positions, 16)
    expect(d).not.toBeNull()
    if (d === null) return
    // Extracción aproximada das coordenadas do path (segmentos M/L/C
    // teñen "x y" en pares). É unha cota inferior do bbox real, pero
    // é suficiente para asertar enclose.
    const tokens = d.split(/[\s,MLCZ]+/u).filter((t) => t.length > 0)
    const nums = tokens.map(Number).filter((v) => Number.isFinite(v))
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i] as number
      const y = nums[i + 1] as number
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    for (const [, cx, cy] of centers) {
      expect(cx, `centro x=${cx} fora do bbox do hull`).toBeGreaterThanOrEqual(minX)
      expect(cx).toBeLessThanOrEqual(maxX)
      expect(cy).toBeGreaterThanOrEqual(minY)
      expect(cy).toBeLessThanOrEqual(maxY)
    }
  })
})

describe('SkillRegions render con regionShape', () => {
  const nodes: NodeDef[] = [
    n('a', 100, 0, 't'),
    n('b', 0, 100, 't'),
    n('c', -100, 0, 't'),
    n('d', 0, -100, 't'),
  ]
  const positions = pos([
    ['a', 100, 0],
    ['b', 0, 100],
    ['c', -100, 0],
    ['d', 0, -100],
  ])
  const regions = [{ id: 't', label: 'T', tag: 't', color: '#abcdef' }] as const

  it('regionShape="hull" renderiza <path> (e non <rect>) para a forma', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillRegions
          regions={regions}
          nodePositions={positions}
          nodes={nodes}
          regionShape="hull"
        />
      </svg>,
    )
    const region = container.querySelector('.yf-skill-region')
    expect(region, 'region renderizada').not.toBeNull()
    expect(region?.querySelector('path'), 'path renderizado').not.toBeNull()
    expect(region?.querySelector('rect'), 'sen rect cando shape=hull').toBeNull()
  })

  it('regionShape="box" (explícito) renderiza <rect>, como o default', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} regionShape="box" />
      </svg>,
    )
    const region = container.querySelector('.yf-skill-region')
    expect(region?.querySelector('rect')).not.toBeNull()
    expect(region?.querySelector('path')).toBeNull()
  })

  it('default (sen prop regionShape) é box → renderiza <rect>', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillRegions regions={regions} nodePositions={positions} nodes={nodes} />
      </svg>,
    )
    const region = container.querySelector('.yf-skill-region')
    expect(region?.querySelector('rect')).not.toBeNull()
    expect(region?.querySelector('path')).toBeNull()
  })
})
// ── 19.10: a silueta non fai espigas ──
//
// Os vértices deste blob veñen dun convex hull sobre puntos mostreados
// nos CÍRCULOS dos nodos, así que están moi desigualmente espazados:
// medido no atlas da galería, lados de 10 unidades pegados a lados de
// 187 (razóns de 12x a 19x). Coa parametrización uniforme a tanxente
// hérdaa o lado longo e aplícase no curto, e o brazo de control chegaba
// a medir 3,3 veces a corda: iso vese como esquinas e mordidas na
// silueta. Estes dous tests fixan a cura (centrípeta) e o seu prezo
// (ningún: coa mostraxe uniforme dá exactamente o mesmo path).

interface Punto {
  readonly x: number
  readonly y: number
}
interface Segmento {
  readonly p0: Punto
  readonly c1: Punto
  readonly c2: Punto
  readonly p1: Punto
}

/** Parsea o `d` (só M + C…) en segmentos de Bézier cúbica. */
function segmentos(d: string): Segmento[] {
  const nums = (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number)
  const out: Segmento[] = []
  let p0: Punto = { x: nums[0] ?? 0, y: nums[1] ?? 0 }
  for (let i = 2; i + 5 < nums.length; i += 6) {
    const p1 = { x: nums[i + 4] ?? 0, y: nums[i + 5] ?? 0 }
    out.push({
      p0,
      c1: { x: nums[i] ?? 0, y: nums[i + 1] ?? 0 },
      c2: { x: nums[i + 2] ?? 0, y: nums[i + 3] ?? 0 },
      p1,
    })
    p0 = p1
  }
  return out
}

const dist = (a: Punto, b: Punto): number => Math.hypot(a.x - b.x, a.y - b.y)

describe('★ 19.10 — a silueta do blob non fai espigas', () => {
  /** Un nodo grande e tres pequenos lonxe: espazado de vértices moi desigual. */
  const desigual = (): { d: string } => {
    const nodes: NodeDef[] = [
      { id: 'g', type: 'ascendancy', label: 'g', tags: ['t'], size: 44 } as NodeDef,
      { id: 'a', type: 'small', label: 'a', tags: ['t'], size: 15 } as NodeDef,
      { id: 'b', type: 'small', label: 'b', tags: ['t'], size: 15 } as NodeDef,
      { id: 'c', type: 'small', label: 'c', tags: ['t'], size: 15 } as NodeDef,
    ]
    const d = computeRegionHullPath(
      't',
      nodes,
      pos([
        ['g', 0, 0],
        ['a', 240, 20],
        ['b', 120, 210],
        ['c', -200, 150],
      ]),
      32,
    )
    if (d === null) throw new Error('sen path')
    return { d }
  }

  it('o caso de proba é de verdade desigual (senón non probaría nada)', () => {
    const segs = segmentos(desigual().d)
    const lados = segs.map((s) => dist(s.p0, s.p1))
    const razon = Math.max(...lados) / Math.min(...lados)
    expect(razon).toBeGreaterThan(5)
  })

  it('★★ ningún brazo de control supera a súa corda', () => {
    // Brazo > corda é literalmente unha espiga: o control sae máis alá
    // do vértice seguinte. O san é ⅓ da corda. Coa parametrización
    // uniforme este mesmo caso dá razóns por riba de 2.
    const segs = segmentos(desigual().d)
    const peor = Math.max(
      ...segs.map(
        (s) => Math.max(dist(s.c1, s.p0), dist(s.c2, s.p1)) / Math.max(dist(s.p0, s.p1), 1e-9),
      ),
    )
    expect(peor).toBeLessThan(1)
  })

  it('★★ cun só nodo (mostraxe uniforme) o path é EXACTAMENTE o da fórmula uniforme', () => {
    // O hull dun nodo só son os puntos mostreados no seu círculo:
    // perfectamente equiespazados. Aí a centrípeta ten que reducirse
    // termo a termo a `p + (seguinte − anterior) / 6`, que era a
    // fórmula anterior. Isto é o que garante regresión cero.
    const nodes: NodeDef[] = [
      { id: 'u', type: 'notable', label: 'u', tags: ['t'], size: 30 } as NodeDef,
    ]
    const d = computeRegionHullPath('t', nodes, pos([['u', 10, 20]]), 24)
    if (d === null) throw new Error('sen path')
    const segs = segmentos(d)
    const verts = segs.map((s) => s.p0)
    const n = verts.length
    expect(n).toBeGreaterThanOrEqual(8)
    for (let i = 0; i < n; i++) {
      const p0 = verts[i]
      const p1 = verts[(i + 1) % n]
      const pm = verts[(i - 1 + n) % n]
      const pn = verts[(i + 2) % n]
      const seg = segs[i]
      if (p0 === undefined || p1 === undefined || pm === undefined || pn === undefined) continue
      if (seg === undefined) continue
      expect(seg.c1.x).toBeCloseTo(p0.x + (p1.x - pm.x) / 6, 6)
      expect(seg.c1.y).toBeCloseTo(p0.y + (p1.y - pm.y) / 6, 6)
      expect(seg.c2.x).toBeCloseTo(p1.x - (pn.x - p0.x) / 6, 6)
      expect(seg.c2.y).toBeCloseTo(p1.y - (pn.y - p0.y) / 6, 6)
    }
  })

  it('dous nodos coincidentes non petan nin dan NaN (lado de lonxitude cero)', () => {
    const nodes: NodeDef[] = [
      { id: 'a', type: 'small', label: 'a', tags: ['t'], size: 20 } as NodeDef,
      { id: 'b', type: 'small', label: 'b', tags: ['t'], size: 20 } as NodeDef,
    ]
    const d = computeRegionHullPath(
      't',
      nodes,
      pos([
        ['a', 0, 0],
        ['b', 0, 0],
      ]),
      16,
    )
    expect(d).not.toBeNull()
    expect(d).not.toContain('NaN')
  })
})
// ── FIN: tests regionShape='hull' ──
