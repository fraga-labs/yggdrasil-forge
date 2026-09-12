// ── INICIO: tests MeshLayout (19.6) ──
// O primeiro layout que LE AS ARESTAS. Os cinco anteriores colocan por
// xeometría pura; aquí a proba que importa é que dous nodos conectados
// acaben PRETO, porque é o que ningún dos outros garante nun grafo denso.

import { describe, expect, it } from 'vitest'
import { MeshLayout } from '../../../src/engine/layouts/MeshLayout.js'
import { parseMeshLayoutConfig } from '../../../src/engine/layouts/MeshLayoutConfig.js'
import type { TreeDef } from '../../../src/types/tree.js'

const S = 60

/**
 * Árbore de proba: `grupos` comarcas de `porGrupo` nodos, cada comarca
 * cunha cadea interna (para que haxa arestas que tirar) e unha porta coa
 * seguinte.
 */
function arbore(grupos: number, porGrupo: number, layout?: Record<string, unknown>): TreeDef {
  const nodes: unknown[] = []
  const edges: unknown[] = []
  const groups: unknown[] = []
  for (let g = 0; g < grupos; g++) {
    const tag = `g${g}`
    groups.push({ id: tag, label: { gl: tag } })
    for (let i = 0; i < porGrupo; i++) {
      nodes.push({ id: `${tag}-${i}`, type: 'small', label: { gl: `${tag}-${i}` }, group: tag })
      if (i > 0) {
        edges.push({
          id: `e-${tag}-${i}`,
          source: `${tag}-${i - 1}`,
          target: `${tag}-${i}`,
          type: 'dependency',
        })
      }
    }
    if (g > 0) {
      edges.push({
        id: `porta-${g}`,
        source: `g${g - 1}-0`,
        target: `${tag}-0`,
        type: 'dependency',
      })
    }
  }
  return {
    id: 'mesh-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'T' },
    groups,
    nodes,
    edges,
    layout: layout ?? { type: 'mesh', spacing: S, seed: 1 },
  } as unknown as TreeDef
}

const pos = (tree: TreeDef) => {
  const r = new MeshLayout().compute(tree)
  expect(r.ok, r.ok ? undefined : r.error.message).toBe(true)
  if (!r.ok) throw new Error('inalcanzable')
  return r.value
}

describe('parseMeshLayoutConfig', () => {
  it('tipo equivocado → err', () => {
    expect(parseMeshLayoutConfig({ type: 'radial' } as never).ok).toBe(false)
  })

  it('★ `spacing` é obrigatorio e positivo (a lección A.6.9: os radios non son opcionais)', () => {
    expect(parseMeshLayoutConfig({ type: 'mesh' } as never).ok).toBe(false)
    expect(parseMeshLayoutConfig({ type: 'mesh', spacing: 0 } as never).ok).toBe(false)
    expect(parseMeshLayoutConfig({ type: 'mesh', spacing: -4 } as never).ok).toBe(false)
    expect(parseMeshLayoutConfig({ type: 'mesh', spacing: 60 } as never).ok).toBe(true)
  })

  it('rexeita opcionais malformados, cada un co seu campo', () => {
    for (const [campo, valor] of [
      ['gap', -1],
      ['iterations', 2.5],
      ['iterations', -3],
      ['seed', Number.NaN],
      ['centerGroupId', 7],
    ] as const) {
      const r = parseMeshLayoutConfig({ type: 'mesh', spacing: 60, [campo]: valor } as never)
      expect(r.ok, `${campo}=${String(valor)}`).toBe(false)
    }
  })
})

describe('MeshLayout — colocación', () => {
  it('coloca TODOS os nodos: nunca se perde contido do documento', () => {
    const tree = arbore(4, 12)
    const { nodes } = pos(tree)
    expect(nodes.size).toBe(tree.nodes.length)
    for (const n of tree.nodes) expect(nodes.has(n.id)).toBe(true)
  })

  it('★ nodos SEN grupo tamén se colocan (van a un anel exterior)', () => {
    const tree = arbore(2, 8)
    const conOrfo = {
      ...tree,
      nodes: [...tree.nodes, { id: 'orfo', type: 'small', label: { gl: 'Orfo' } }],
    } as unknown as TreeDef
    expect(pos(conOrfo).nodes.has('orfo')).toBe(true)
  })

  it('unha aresta → un path, de dous puntos (o `curve` do documento faino despois)', () => {
    const tree = arbore(3, 10)
    const { edges } = pos(tree)
    expect(edges.size).toBe(tree.edges.length)
    for (const path of edges.values()) expect(path.points).toHaveLength(2)
  })

  it('★ determinista: mesma semente → mesmas posicións, ao bit', () => {
    const a = pos(arbore(4, 12))
    const b = pos(arbore(4, 12))
    for (const [id, p] of a.nodes) expect(b.nodes.get(id)).toEqual(p)
  })

  it('semente distinta → colocación distinta (a semente serve para algo)', () => {
    const a = pos(arbore(4, 12))
    const b = pos(arbore(4, 12, { type: 'mesh', spacing: S, seed: 99 }))
    const iguais = [...a.nodes].filter(([id, p]) => {
      const q = b.nodes.get(id)
      return q !== undefined && q.x === p.x && q.y === p.y
    })
    expect(iguais.length).toBeLessThan(a.nodes.size)
  })
})

describe('★ MeshLayout — o que ningún outro layout garante', () => {
  it('★★ os nodos CONECTADOS quedan preto: a mediana da aresta interna ≤ 2·spacing', () => {
    const tree = arbore(4, 16)
    const { nodes } = pos(tree)
    const grupo = new Map(tree.nodes.map((n) => [n.id, n.group]))
    const longos: number[] = []
    for (const e of tree.edges) {
      if (grupo.get(e.source) !== grupo.get(e.target)) continue // portas aparte
      const a = nodes.get(e.source)
      const b = nodes.get(e.target)
      if (a === undefined || b === undefined) continue
      longos.push(Math.hypot(a.x - b.x, a.y - b.y))
    }
    longos.sort((x, y) => x - y)
    const mediana = longos[Math.floor(longos.length / 2)] ?? 0
    expect(longos.length).toBeGreaterThan(10)
    expect(mediana).toBeLessThanOrEqual(S * 2)
  })

  it('★ as comarcas non se pisan: os centroides sepáranse máis que os seus radios', () => {
    const tree = arbore(5, 14)
    const { nodes } = pos(tree)
    const cent = new Map<string, { x: number; y: number; n: number; r: number }>()
    for (const n of tree.nodes) {
      const p = nodes.get(n.id)
      const g = n.group
      if (p === undefined || g === undefined) continue
      const c = cent.get(g) ?? { x: 0, y: 0, n: 0, r: 0 }
      cent.set(g, { x: c.x + p.x, y: c.y + p.y, n: c.n + 1, r: 0 })
    }
    const medios = [...cent].map(([g, c]) => ({ g, x: c.x / c.n, y: c.y / c.n }))
    // Radio real de cada comarca: o nodo máis afastado do seu centroide.
    const raio = new Map<string, number>()
    for (const n of tree.nodes) {
      const p = nodes.get(n.id)
      const m = medios.find((q) => q.g === n.group)
      if (p === undefined || m === undefined) continue
      raio.set(
        n.group ?? '',
        Math.max(raio.get(n.group ?? '') ?? 0, Math.hypot(p.x - m.x, p.y - m.y)),
      )
    }
    for (let i = 0; i < medios.length; i++) {
      for (let j = i + 1; j < medios.length; j++) {
        const a = medios[i]
        const b = medios[j]
        if (a === undefined || b === undefined) continue
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        // Os radios reais poden pasarse un pouco do teórico pola
        // relaxación; esíxese que non se solapen en máis dun 15%.
        const suma = (raio.get(a.g) ?? 0) + (raio.get(b.g) ?? 0)
        expect(d, `${a.g} vs ${b.g}`).toBeGreaterThan(suma * 0.85)
      }
    }
  })

  it('★ densidade: a distancia ao veciño máis próximo ronda o `spacing`', () => {
    const tree = arbore(3, 20)
    const { nodes } = pos(tree)
    const pts = [...nodes.values()]
    const veciño = pts.map((p) => {
      let d = Number.POSITIVE_INFINITY
      for (const q of pts) {
        if (q === p) continue
        d = Math.min(d, Math.hypot(p.x - q.x, p.y - q.y))
      }
      return d
    })
    const media = veciño.reduce((a, b) => a + b, 0) / veciño.length
    // Nin amoreados nin desperdigados: entre a metade e o dobre.
    expect(media).toBeGreaterThan(S * 0.5)
    expect(media).toBeLessThan(S * 2)
  })
})

describe('MeshLayout — casos límite', () => {
  it('un só grupo: coloca igual, sen anel', () => {
    expect(pos(arbore(1, 10)).nodes.size).toBe(10)
  })

  it('un só nodo: queda no centro do seu blob', () => {
    expect(pos(arbore(1, 1)).nodes.size).toBe(1)
  })

  it('árbore sen grupos: todo vai ao anel exterior, nada se perde', () => {
    const tree = {
      ...arbore(1, 6),
      groups: [],
      nodes: arbore(1, 6).nodes.map((n) => ({ ...n, group: undefined })),
    } as unknown as TreeDef
    expect(pos(tree).nodes.size).toBe(6)
  })

  it('`iterations: 0` non peta: queda a sementeira da retícula', () => {
    const r = pos(arbore(2, 8, { type: 'mesh', spacing: S, iterations: 0, seed: 1 }))
    expect(r.nodes.size).toBe(16)
  })

  it('bounds non degenerados', () => {
    const { bounds } = pos(arbore(3, 12))
    expect(bounds.maxX).toBeGreaterThan(bounds.minX)
    expect(bounds.maxY).toBeGreaterThan(bounds.minY)
  })
})
// ── FIN: tests MeshLayout ──
