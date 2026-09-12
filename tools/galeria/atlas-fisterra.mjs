#!/usr/bin/env node
// ── INICIO: xerador do atlas da galería ──
//
// Escribe `examples/gallery/atlas-de-fisterra.json`. O CONTIDO (nomes,
// iconas, tipos, comarcas) vén da táboa de `nomes-atlas.mjs`; a
// ESTRUTURA e o aspecto constrúense aquí, para que o artefacto sexa
// reproducible e non un ficheiro que ninguén sabe refacer.
//
// **Por que existe**: a primeira versión (19.3) era un cúmulo de raios
// por comarca — unha porta no medio e doce nodos colgando. Estruturalmente
// unha estrela, e o mockup do atlas é unha TEA: nodos de grao 3-4,
// arestas curtas e lazos pechados. Aquí a comarca constrúese como web:
//
//   - Anel: cada nodo pequeno da comarca únese ao seguinte (pecha lazo).
//   - Cordas cada tres: dálle grao 3 sen amorear.
//   - A porta engánchase a catro deles, non a todos.
//   - Os keystones penduran de tres pequenos; a ascendencia, dos dous
//     keystones.
//   - Portas entre comarcas VECIÑAS no anel, non só coa raíz: iso é o
//     que converte seis illas nunha soa tea.
//
// A colocación NON vai no ficheiro: pídese `layout: mesh`, que le esas
// arestas e coloca para que saian curtas. O aspecto pídese co preset
// `atlas` máis `curve: 'arc'`.
//
// Uso:  node tools/galeria/atlas-fisterra.mjs

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
// `tools/` non é un paquete do workspace, así que o import vai ao dist
// por ruta relativa — mesmo trato que `render-gallery.mjs` co CLI.
// Require ter construído editor-core:
//   corepack pnpm turbo run build --filter @yggdrasil-forge/editor-core
import { THEME_PRESETS } from '../../packages/editor-core/dist/index.js'
import { GRUPOS, NODOS, TINTES } from './nomes-atlas.mjs'

const aquí = dirname(fileURLToPath(import.meta.url))
const saída = join(aquí, '..', '..', 'examples', 'gallery', 'atlas-de-fisterra.json')

const L = (gl, en) => ({ gl, en })
const custo = (res, n) => [{ resourceId: res, amount: n }]
const todos = (...ids) => ({
  type: 'all',
  conditions: ids.map((id) => ({ type: 'node_unlocked', nodeId: id })),
})

/**
 * Onde se engancha o keystone `i` no anel de `m` pequenos.
 *
 * Os dous keystones da comarca van a LADOS OPOSTOS do anel. Non é
 * estética gratuíta: como a aresta tira, dous keystones ancorados en
 * pequenos veciños acaban xuntos, e xuntos os seus rótulos písanse (na
 * Vila pasaba con «O Ferreiro» e «O Tratante»). Repartilos por
 * construción é máis fiable que buscar unha `seed` con sorte.
 */
const ancoraClave = (i, m) => (i * Math.floor(m / 2)) % m

// ── Contido, por comarca ──
const porGrupo = new Map(GRUPOS.map(([id]) => [id, []]))
let raíz = null
for (const fila of NODOS) {
  const [id, gl, en, icona, tipo, grupo] = fila
  if (tipo === 'root') {
    raíz = { id, gl, en, icona }
    continue
  }
  porGrupo.get(grupo)?.push({ id, gl, en, icona, tipo })
}
if (raíz === null) throw new Error('a táboa non trae raíz')

const nodes = []
const edges = []
const aresta = (s, t) => {
  edges.push({ id: `e-${s}-${t}`, source: s, target: t, type: 'dependency' })
}

// A raíz vai no seu propio grupo: o `mesh` manda os nodos SEN grupo a un
// anel exterior, e Fisterra ten que estar no medio.
const GRUPO_RAIZ = 'fisterra'
nodes.push({
  id: raíz.id,
  type: 'root',
  label: L(raíz.gl, raíz.en),
  description: L(
    'Onde remata a terra coñecida. Todo o demais é elección.',
    'Where the known land ends. Everything else is a choice.',
  ),
  icon: raíz.icona,
  size: 46,
  group: GRUPO_RAIZ,
  costPerTier: [custo('xornadas', 1)],
})

for (const [tag] of GRUPOS) {
  const membros = porGrupo.get(tag) ?? []
  const porta = membros.find((m) => m.tipo === 'notable')
  const claves = membros.filter((m) => m.tipo === 'keystone')
  const asc = membros.find((m) => m.tipo === 'ascendancy')
  const pequenos = membros.filter((m) => m.tipo === 'small')
  if (porta === undefined || asc === undefined || claves.length < 2) {
    throw new Error(`comarca ${tag} sen porta/claves/ascendencia`)
  }

  const meteNodo = (m, extra) => {
    nodes.push({
      id: m.id,
      type: m.tipo,
      label: L(m.gl, m.en),
      icon: m.icona,
      tags: [tag],
      group: tag,
      ...extra,
    })
  }

  // ── Orde de emisión = orde de sementeira do `mesh` ──
  //
  // O layout sementa os membros por orde, do centro do blob cara fóra.
  // Iso obriga a pensar a orde, e as dúas tentativas obvias fallan:
  // coa natural (porta, pequenos, claves, ascendencia) os tres grandes
  // caen amoreados na BEIRA; poñéndoos todos diante, amoréanse no
  // CENTRO. Nos dous casos os seus rótulos chocan.
  //
  // A que funciona: a ascendencia no medio e os demais grandes
  // INTERCALADOS entre os pequenos, así que caen en radios distintos e
  // quedan repartidos pola comarca, coma no mockup.
  const orde = [asc]
  const cada = Math.max(1, Math.floor(pequenos.length / 3))
  const grandes = [claves[0], porta, claves[1]]
  pequenos.forEach((m, i) => {
    orde.push(m)
    if ((i + 1) % cada === 0 && grandes.length > 0) {
      const g = grandes.shift()
      if (g !== undefined) orde.push(g)
    }
  })
  for (const g of grandes) orde.push(g)

  // Prerrequisitos e tamaños por tipo. As arestas van aparte: a orde de
  // emisión só goberna a colocación, non a semántica.
  for (const m of orde) {
    if (m === asc) {
      meteNodo(m, {
        size: 44,
        description: L(
          'Quen coñece esta terra como a palma da man.',
          'One who knows this land like the back of their hand.',
        ),
        costPerTier: [[...custo('xornadas', 5), ...custo('sona', 2)]],
        prerequisites: todos(claves[0].id, claves[1].id),
      })
    } else if (m === porta) {
      meteNodo(m, {
        size: 26,
        costPerTier: [custo('xornadas', 1)],
        prerequisites: todos(raíz.id),
      })
    } else if (m.tipo === 'keystone') {
      const i = claves.indexOf(m)
      meteNodo(m, {
        size: 30,
        costPerTier: [[...custo('xornadas', 3), ...custo('sona', 1)]],
        prerequisites: todos(
          pequenos[ancoraClave(i, pequenos.length)].id,
          pequenos[(ancoraClave(i, pequenos.length) + 2) % pequenos.length].id,
        ),
      })
    } else {
      const j = pequenos.indexOf(m)
      const anterior = pequenos[(j - 1 + pequenos.length) % pequenos.length]
      meteNodo(m, {
        size: 15,
        costPerTier: [custo('xornadas', 1)],
        // «Conectado a calquera veciño»: o criterio do propio mockup, e
        // o que permite entrar na comarca por onde queiras.
        prerequisites: {
          type: 'any',
          conditions: [porta.id, anterior.id].map((id) => ({
            type: 'node_unlocked',
            nodeId: id,
          })),
        },
      })
    }
  }

  // ── Arestas: o anel, as cordas e os enganches ──
  aresta(raíz.id, porta.id)
  pequenos.forEach((m, i) => {
    aresta(m.id, pequenos[(i + 1) % pequenos.length].id)
    if (i % 3 === 0) aresta(m.id, pequenos[(i + 4) % pequenos.length].id)
    if (i % 4 === 0) aresta(porta.id, m.id)
  })
  claves.forEach((k, i) => {
    const base = ancoraClave(i, pequenos.length)
    for (const j of [0, 1, 2]) aresta(pequenos[(base + j) % pequenos.length].id, k.id)
    aresta(k.id, asc.id)
  })
}

// Portas entre comarcas veciñas no anel: seis illas → unha tea.
const orde = GRUPOS.map(([id]) => id)
for (let i = 0; i < orde.length; i++) {
  const a = porGrupo.get(orde[i]) ?? []
  const b = porGrupo.get(orde[(i + 1) % orde.length]) ?? []
  const pa = a.filter((m) => m.tipo === 'small')[2]
  const pb = b.filter((m) => m.tipo === 'small')[7]
  if (pa !== undefined && pb !== undefined) aresta(pa.id, pb.id)
}

const atlas = THEME_PRESETS.find((p) => p.id === 'atlas')
if (atlas === undefined) throw new Error('falta o preset atlas')

const doc = {
  tree: {
    id: 'atlas-de-fisterra',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: L('O Atlas de Fisterra', 'The Finisterre Atlas'),
    description: L(
      'Seis comarcas arredor do cabo do mundo, con 97 nodos: o exemplo de ESCALA da galería.',
      "Six shires around the cape at the world's end, 97 nodes: the gallery's SCALE example.",
    ),
    groups: [
      { id: GRUPO_RAIZ, label: L('Fisterra', 'Finisterre'), color: '#d8b15a' },
      ...GRUPOS.map(([id, gl, en, color]) => ({ id, label: L(gl, en), color })),
    ],
    resources: [
      {
        id: 'xornadas',
        label: L('Xornadas', 'Days'),
        icon: 'norse-sun',
        color: '#d8b15a',
        initial: 30,
      },
      { id: 'sona', label: L('Sona', 'Renown'), icon: 'logic-crown', color: '#3ec6c6', initial: 6 },
    ],
    nodes,
    edges,
    // Sen posicións: colócao o motor. `mesh` é o único layout que le as
    // arestas, e `arc` a única curva sen nesgo de dirección — as dúas
    // cousas que o aspecto de tea precisa e que un preset non pode traer.
    layout: { type: 'mesh', spacing: 62, seed: 3, curve: 'arc', centerGroupId: GRUPO_RAIZ },
  },
  editor: {
    formatVersion: '1.0.0',
    // O preset `atlas` enteiro (a receita robusta para xeradores) máis os
    // tintes das comarcas, que son propios deste documento.
    theme: {
      ...atlas.spec,
      regions: TINTES.map(([tag, label, color]) => ({ id: `r-${tag}`, label, tag, color })),
    },
  },
}

writeFileSync(saída, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
console.log(`atlas-de-fisterra: ${nodes.length} nodos, ${edges.length} arestas → ${saída}`)
// ── FIN: xerador do atlas da galería ──
