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
// ── 19.10: o layout LE O TAMAÑO dos nodos ──
//
// O defecto que isto fixa era real e vísteo no atlas da galería: o
// `mesh` colocaba todo como puntos co mesmo hueco `spacing`, así que un
// nodo de radio 44 saía por riba dos seus veciños pequenos. Tres pares
// solapados, o peor por 10,6 unidades.

/**
 * Unha COMARCA do atlas da galería, copiada de
 * `tools/galeria/atlas-fisterra.mjs`: radios de 15 a 44, anel de doce
 * pequenos con cordas cada tres, unha porta enganchada a un de cada
 * catro e dous keystones en lados opostos que soben á ascendencia.
 *
 * A fidelidade importa: cunha versión máis floxa (sen porta nin
 * cordas) o defecto NON aparece, e a proba pasaría sen probar nada.
 * Aquí é a densidade a que crea a presión que facía solapar os corpos.
 */
function arboreDesigual(seed = 3): TreeDef {
  // A ORDE importa e por iso vai copiada tamén: o `mesh` sementa os
  // membros por orde, do centro do blob cara fóra, así que o xerador do
  // atlas pon a ascendencia no medio e intercala os outros grandes
  // entre os pequenos. Coa orde «todos os grandes primeiro» o defecto
  // tampouco aparece.
  const grande = { id: 'grande', type: 'ascendancy', label: { gl: 'G' }, size: 44, group: 'g' }
  const claveA = { id: 'clave-a', type: 'keystone', label: { gl: 'A' }, size: 30, group: 'g' }
  const porta = { id: 'porta', type: 'notable', label: { gl: 'P' }, size: 26, group: 'g' }
  const claveB = { id: 'clave-b', type: 'keystone', label: { gl: 'B' }, size: 30, group: 'g' }
  const pequeno = (i: number): unknown => ({
    id: `p${i}`,
    type: 'small',
    label: { gl: `p${i}` },
    size: 15,
    group: 'g',
  })
  const intercalado = [claveA, porta, claveB]
  const nodes: unknown[] = [grande]
  const edges: unknown[] = []
  for (let i = 0; i < 12; i++) {
    nodes.push(pequeno(i))
    if ((i + 1) % 4 === 0) {
      const g = intercalado.shift()
      if (g !== undefined) nodes.push(g)
    }
  }
  for (let i = 0; i < 12; i++) {
    edges.push({ id: `anel-${i}`, source: `p${i}`, target: `p${(i + 1) % 12}`, type: 'dependency' })
    if (i % 3 === 0) {
      edges.push({
        id: `corda-${i}`,
        source: `p${i}`,
        target: `p${(i + 4) % 12}`,
        type: 'dependency',
      })
    }
    if (i % 4 === 0) {
      edges.push({ id: `porta-${i}`, source: 'porta', target: `p${i}`, type: 'dependency' })
    }
  }
  for (const j of [0, 1, 2]) {
    edges.push({ id: `ka-${j}`, source: `p${j}`, target: 'clave-a', type: 'dependency' })
    edges.push({ id: `kb-${j}`, source: `p${j + 6}`, target: 'clave-b', type: 'dependency' })
  }
  edges.push({ id: 'ga', source: 'clave-a', target: 'grande', type: 'dependency' })
  edges.push({ id: 'gb', source: 'clave-b', target: 'grande', type: 'dependency' })
  return {
    id: 'desigual',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'D' },
    groups: [{ id: 'g', label: { gl: 'G' } }],
    nodes,
    edges,
    layout: { type: 'mesh', spacing: 62, seed },
  } as unknown as TreeDef
}

const RADIOS: Readonly<Record<string, number>> = {
  grande: 44,
  'clave-a': 30,
  'clave-b': 30,
  porta: 26,
}
const radioDe = (id: string): number => RADIOS[id] ?? 15

describe('★ MeshLayout — os corpos NON se solapan', () => {
  it('★★ en CATORCE sementes, ningún par de corpos se solapa', () => {
    // Barrido, non un caso solto: o solape depende do jitter, e con
    // sorte unha semente concreta sae limpa aínda co motor roto. Sen o
    // pase final de separación isto falla nas sementes 6 e 7 (a 6 por
    // -1,06 unidades, a 7 con dous pares), que é exactamente o que se
    // vía no atlas da galería.
    const malos: string[] = []
    for (let seed = 1; seed <= 14; seed++) {
      const { nodes } = pos(arboreDesigual(seed))
      const ids = [...nodes.keys()]
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = nodes.get(ids[i] ?? '')
          const b = nodes.get(ids[j] ?? '')
          if (a === undefined || b === undefined) continue
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          const toque = radioDe(ids[i] ?? '') + radioDe(ids[j] ?? '')
          if (d < toque) {
            malos.push(`seed ${seed} ${ids[i]}↔${ids[j]}: ${d.toFixed(1)} < ${toque}`)
          }
        }
      }
    }
    expect(malos).toEqual([])
  })

  it('★ o hueco medra co tamaño: o grande queda máis lonxe dos veciños que un pequeno', () => {
    const { nodes } = pos(arboreDesigual())
    const dist = (a: string, b: string): number => {
      const pa = nodes.get(a)
      const pb = nodes.get(b)
      if (pa === undefined || pb === undefined) throw new Error('sen posición')
      return Math.hypot(pa.x - pb.x, pa.y - pb.y)
    }
    const preto = (id: string): number =>
      Math.min(...[...nodes.keys()].filter((o) => o !== id).map((o) => dist(id, o)))
    expect(preto('grande')).toBeGreaterThan(preto('p0') * 1.2)
  })

  it('a separación non custa unha morea de iteracións: chega co default', () => {
    // A alternativa era subir `iterations` de 220 a 1.200, e iso medido
    // son 2,65 s a 1.500 nodos en vez de 0,74 s. O pase final vale o
    // mesmo que unha iteración.
    const r = new MeshLayout().compute(arboreDesigual(6))
    expect(r.ok).toBe(true)
  })

  it('segue determinista tras o pase de separación: mesma semente, mesmas posicións', () => {
    const a = pos(arboreDesigual()).nodes
    const b = pos(arboreDesigual()).nodes
    for (const [id, p] of a) expect(b.get(id)).toEqual(p)
  })
})
// ── FIN: tests MeshLayout ──
