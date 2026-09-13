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

/** Alias lexible para as probas que xa usan `pos` como variable local. */
const colocar = pos

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

describe('★ MeshLayout — un documento SEN agrupar dá unha tea, non un anel', () => {
  /**
   * Árbore que declara grupos pero NON lles asigna nodos: a pertenza
   * exprésase con `tags`, que é o eixe do TEMA. Pasa de verdade —
   * `lobo-de-inverno` da galería está así.
   */
  function senAgrupar(): TreeDef {
    const nodes: unknown[] = []
    const edges: unknown[] = []
    for (let i = 0; i < 18; i++) {
      nodes.push({
        id: `n${i}`,
        type: 'small',
        label: { gl: `n${i}` },
        tags: [i % 3 === 0 ? 'a' : 'b'],
      })
      if (i > 0) {
        edges.push({ id: `e${i}`, source: `n${i - 1}`, target: `n${i}`, type: 'dependency' })
      }
    }
    return {
      id: 'sen-agrupar',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: { gl: 'S' },
      groups: [
        { id: 'a', label: { gl: 'A' } },
        { id: 'b', label: { gl: 'B' } },
      ],
      nodes,
      edges,
      layout: { type: 'mesh', spacing: S, seed: 1 },
    } as unknown as TreeDef
  }

  it('★★ non saen todos ao mesmo radio: iso era o anel de «soltos»', () => {
    // Antes: os 18 nodos ían ao anel exterior repartindo 360°, e o
    // resultado era un círculo perfecto — un layout inútil, en
    // silencio, para quen pediu precisamente unha tea.
    const { nodes } = pos(senAgrupar())
    const radios = [...nodes.values()].map((p) => Math.hypot(p.x, p.y))
    const desviacion = Math.max(...radios) - Math.min(...radios)
    expect(desviacion).toBeGreaterThan(S)
  })

  it('★ e as arestas quedan CURTAS, que é o que este motor promete', () => {
    const { nodes } = pos(senAgrupar())
    const ids = [...nodes.keys()]
    let suma = 0
    let n = 0
    for (let i = 1; i < ids.length; i++) {
      const a = nodes.get(ids[i - 1] ?? '')
      const b = nodes.get(ids[i] ?? '')
      if (a === undefined || b === undefined) continue
      // Só as arestas da cadea, que son as declaradas.
      suma += Math.hypot(a.x - b.x, a.y - b.y)
      n++
    }
    // Nun anel de 18 nodos a distancia entre veciños era moito maior.
    expect(suma / Math.max(n, 1)).toBeLessThan(S * 3)
  })

  it('cun só nodo agrupado NON se toca o comportamento (os soltos seguen no anel)', () => {
    const tree = senAgrupar() as unknown as {
      nodes: { id: string; group?: string }[]
    }
    const primeiro = tree.nodes[0]
    if (primeiro !== undefined) primeiro.group = 'a'
    const { nodes } = pos(tree as unknown as TreeDef)
    expect(nodes.size).toBe(18)
  })
})

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

  it('★★ os nodos SEN GRUPO tampouco se solapan (o anel exterior reparte por ángulo)', () => {
    // Camiño que non tiña protección ningunha: os soltos colócanse nun
    // anel exterior dividindo os 360° entre eles, sen mirar canto miden.
    // Con vinte nodos de radio 44 o arco toca os 70 e precisan 88, así
    // que se pisaban de tres en tres. Medido: 20 pares solapados, o
    // peor por -19,8 unidades. O pase de separación é GLOBAL por isto:
    // se fose só por blob, estes nodos non o verían nunca.
    const nodes: unknown[] = []
    for (let i = 0; i < 6; i++) {
      nodes.push({ id: `g${i}`, type: 'small', label: { gl: `g${i}` }, group: 'g' })
    }
    for (let i = 0; i < 20; i++) {
      nodes.push({ id: `s${i}`, type: 'ascendancy', label: { gl: `s${i}` }, size: 44 })
    }
    const tree = {
      id: 'soltos',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: { gl: 'S' },
      groups: [{ id: 'g', label: { gl: 'G' } }],
      nodes,
      edges: [],
      layout: { type: 'mesh', spacing: 62, seed: 1 },
    } as unknown as TreeDef
    const { nodes: p } = pos(tree)
    const soltos = [...p.keys()].filter((id) => id.startsWith('s'))
    const malos: string[] = []
    for (let i = 0; i < soltos.length; i++) {
      for (let j = i + 1; j < soltos.length; j++) {
        const a = p.get(soltos[i] ?? '')
        const b = p.get(soltos[j] ?? '')
        if (a === undefined || b === undefined) continue
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 88) malos.push(`${soltos[i]}↔${soltos[j]}: ${d.toFixed(1)} < 88`)
      }
    }
    expect(malos).toEqual([])
  })

  it('segue determinista tras o pase de separación: mesma semente, mesmas posicións', () => {
    const a = pos(arboreDesigual()).nodes
    const b = pos(arboreDesigual()).nodes
    for (const [id, p] of a) expect(b.get(id)).toEqual(p)
  })
})
// ── 19.11: de anel de illas a TEA ──
// O atlas da galería líase como seis illas nun mar negro, non como o
// tecido continuo do mockup fundacional. A topoloxía xa estaba ben (o
// grafo é conexo: seis raios desde a raíz e un anel entre comarcas). O
// que fallaba era `colocarBlobs`, que mide cada comarca polo seu círculo
// CIRCUNSCRITO — e unha tea irregular non é un círculo. Medido no
// atlas: os círculos case se tocaban (folgo 6–65) pero as teas de
// verdade quedaban a **61–121** unidades, e arredor da raíz había un oco
// de **165**.
//
// O FIXTURE IMPORTA, e cústame admitir canto: a primeira versión desta
// proba usaba `arbore(6, 12)` —seis comarcas de doce pequenos iguais— e
// daba o MESMO número coa compactación activada e desactivada. Non
// probaba nada. Con nodos todos do mesmo tamaño o círculo circunscrito é
// unha boa aproximación da tea e non hai oco que pechar; o defecto
// nace da DESIGUALDADE de tamaños. Así que aquí repítese seis veces a
// comarca de `arboreDesigual`, que é a do atlas.
function atlasMiniatura(): TreeDef {
  const base = arboreDesigual(3)
  const nodes: unknown[] = [
    { id: 'raiz', type: 'root', label: { gl: 'R' }, size: 46, group: 'centro' },
  ]
  const edges: unknown[] = []
  const groups: unknown[] = [{ id: 'centro', label: { gl: 'C' } }]
  const comarcas = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']
  comarcas.forEach((c, k) => {
    groups.push({ id: c, label: { gl: c } })
    // Mesma orde de emisión que o orixinal: o mesh sementa por orde.
    for (const n of base.nodes) {
      nodes.push({ ...(n as object), id: `${c}-${n.id}`, group: c })
    }
    for (const e of base.edges) {
      edges.push({
        ...(e as object),
        id: `${c}-${e.id}`,
        source: `${c}-${e.source}`,
        target: `${c}-${e.target}`,
      })
    }
    // Raio desde a raíz e anel entre comarcas: a topoloxía do atlas.
    edges.push({ id: `raio-${c}`, source: 'raiz', target: `${c}-porta`, type: 'dependency' })
    const seguinte = comarcas[(k + 1) % comarcas.length]
    edges.push({
      id: `anel-${c}`,
      source: `${c}-p0`,
      target: `${seguinte}-p6`,
      type: 'dependency',
    })
  })
  return {
    id: 'mini-atlas',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Mini' },
    groups,
    nodes,
    edges,
    layout: { type: 'mesh', spacing: 62, seed: 3, centerGroupId: 'centro' },
  } as unknown as TreeDef
}

describe('★ MeshLayout — as comarcas forman unha TEA, non un arquipélago', () => {
  const ESPAZADO = 62

  /** Folgo bordo a bordo entre o nodo `a` e o máis próximo de `ids`. */
  const maisPreto = (
    pos: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
    raio: (id: string) => number,
    meus: readonly string[],
    outros: readonly string[],
  ): number => {
    let m = Number.POSITIVE_INFINITY
    for (const a of meus) {
      const pa = pos.get(a)
      if (pa === undefined) continue
      for (const b of outros) {
        const pb = pos.get(b)
        if (pb === undefined) continue
        m = Math.min(m, Math.hypot(pa.x - pb.x, pa.y - pb.y) - raio(a) - raio(b))
      }
    }
    return m
  }

  const raioMini = (id: string): number => {
    if (id === 'raiz') return 46
    const suf = id.slice(id.indexOf('-') + 1)
    return radioDe(suf)
  }

  it('★★ ningunha comarca queda a máis dun espazado da súa veciña máis próxima', () => {
    const tree = atlasMiniatura()
    const { nodes } = colocar(tree)
    const grupo = new Map(tree.nodes.map((n) => [n.id, n.group ?? '']))
    for (const g of new Set(grupo.values())) {
      const meus = tree.nodes.filter((n) => grupo.get(n.id) === g).map((n) => n.id)
      const outros = tree.nodes.filter((n) => grupo.get(n.id) !== g).map((n) => n.id)
      const preto = maisPreto(nodes, raioMini, meus, outros)
      // Un espazado é o hueco que hai DENTRO dunha comarca: pedir que a
      // costura non pase diso é a definición operativa de «tea».
      expect(preto, `a comarca ${g} queda illada (${preto.toFixed(1)})`).toBeLessThanOrEqual(
        ESPAZADO,
      )
    }
  })

  it('★★ o grupo central non queda nun oco', () => {
    // `colocarBlobs` «facía medrar o central para tocar o anel», pero un
    // blob dun SÓ membro non medra nada: o número inflábase e o burato
    // quedaba igual. No atlas iso eran 165 unidades de negro arredor da
    // raíz, xusto no medio da foto.
    const tree = atlasMiniatura()
    const { nodes } = colocar(tree)
    const resto = tree.nodes.filter((n) => n.group !== 'centro').map((n) => n.id)
    const preto = maisPreto(nodes, raioMini, ['raiz'], resto)
    expect(preto).toBeLessThanOrEqual(ESPAZADO)
  })

  it('★ a compactación move comarcas ENTEIRAS: por dentro non deforma nada', () => {
    // Se isto se rompese, gañaríase densidade estragando o que a
    // relaxación acaba de compoñer. Compróbase que ningún par de dentro
    // dunha comarca acaba solapado.
    const tree = atlasMiniatura()
    const { nodes } = colocar(tree)
    for (const g of ['c0', 'c2', 'c4']) {
      const ids = tree.nodes.filter((n) => n.group === g).map((n) => n.id)
      let peor = Number.POSITIVE_INFINITY
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          peor = Math.min(peor, maisPreto(nodes, raioMini, [ids[i] ?? ''], [ids[j] ?? '']))
        }
      }
      expect(peor, `a comarca ${g} colapsou`).toBeGreaterThan(-1)
    }
  })
})

// ── FIN: tests MeshLayout ──
