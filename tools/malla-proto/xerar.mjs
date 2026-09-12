#!/usr/bin/env node
// ── INICIO: prototipo do layout de MALLA ("tela de araña") ──
//
// Xera un documento Yggdrasil co estilo de atlas dos mockups
// fundacionais: comarcas como mallas planares densas e irregulares,
// portas entre veciñas e un núcleo no medio.
//
// **Que é isto e que non é**: é un PROTOTIPO deliberado, fóra de
// `packages/`, para pechar o algoritmo antes de levalo ao motor como
// motor de layout. Hoxe escribe as `position` no documento (layout
// `custom`); cando o algoritmo viva en @core, un documento poderá pedir
// `layout: { type: 'mesh', ... }` e non levar coordenadas, coma xa pasa
// con `clustered-radial`.
//
// **O algoritmo**, por pasos (isto é o que hai que portar):
//   1. Raio de cada comarca DERIVADO do número de nodos que pide
//      (área da retícula triangular, cun folgo para o bordo irregular).
//   2. Colocación: a primeira no centro; o resto nun anel cuxo radio
//      crece ata que dúas veciñas non se solapen. Logo a central medra
//      ata tocar o anel — sen iso queda un baleiro no medio.
//   3. Puntos: retícula triangular recortada por un raio modulado con
//      tres senoides (bordo orgánico, non circular) + jitter.
//   4. Relaxación: catro pasadas separando os pares que quedaron
//      demasiado xuntos. Iguala o espazado sen perder a irregularidade
//      (unha retícula perfecta parece papel milimetrado).
//   5. Malla: árbore de expansión mínima (garante conexo e arestas
//      curtas) + extras curtas ata unha cota, **con tope de grao 4**.
//      As extras son o que crea os LAZOS: sen elas é unha árbore, e
//      unha árbore non parece unha tea.
//   6. Portas: o par de nodos máis próximo entre dúas comarcas veciñas,
//      unido; as dúas puntas ascenden a `notable` para que a pasaxe se
//      vexa.
//   7. Prerrequisito estilo PoE: cada nodo pide `any` sobre os seus
//      veciños — «conectado a calquera adxacente».
//
// A densidade vén de ter MOITOS nodos por comarca (espazado pequeno),
// non de subir o grao: con grao 6 a tea vólvese unha mancha.
//
// Uso:  node tools/malla-proto/xerar.mjs [saida.json]

import { writeFileSync } from 'node:fs'

const S = 60 // espazado da retícula
const JIT = 0.26 // jitter relativo
const EXTRA = 0.95 // fracción de arestas extra sobre a MST
const TOPE_GRAO = 4
const GAP = 6 // folgo entre blobs veciños

/** Xerador determinista (mulberry32): a mesma semente, o mesmo atlas. */
function rng(semente) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const R = rng(7)

// (tag, gl, en, cor, nodos que pide). Nin coordenadas nin raio.
const COMARCAS = [
  ['cerna', 'A Cerna', 'Ancestral Core', '#a8903e', 22],
  ['xeada', 'A Xeada', 'Frozen Expanse', '#4a7fa8', 38],
  ['norte', 'O Norte Ermo', 'Northern Wastes', '#3f6f9f', 40],
  ['tormenta', 'Os Picos', 'Storm Peaks', '#7a5aa8', 36],
  ['volcan', 'As Brasas', 'Volcanic Reaches', '#a84a3a', 38],
  ['verde', 'O Val Verde', 'Verdant Hollow', '#4a9a5a', 38],
  ['area', 'O Areal', 'Sandsworn Wastes', '#b08d3e', 34],
  ['fondo', 'Os Fondais', 'Shadowed Depths', '#5a6a9a', 36],
]

const ICONAS = [
  'norse-sparkle',
  'norse-rune-fehu',
  'norse-rune-algiz',
  'norse-rune-tiwaz',
  'norse-ice-crystal',
  'norse-leaf',
  'norse-fire',
  'logic-star',
  'logic-rune',
  'forge-rivet',
  'forge-nut',
  'norse-moon',
]

/** Paso 1: raio que precisa un blob para caber `n` nodos ao espazado S. */
const raioPara = (n) => Math.sqrt((n * S * S * 0.866) / Math.PI) * 1.18
/** Inverso: cantos nodos caben nun blob dese raio. */
const nodosPara = (r) => Math.max(6, Math.floor((Math.PI * (r / 1.18) ** 2) / (S * S * 0.866)))

/** Paso 2: centros e raios, todo derivado dos tamaños. */
function colocar(defs) {
  const raios = defs.map(([, , , , n]) => raioPara(n))
  const fora = defs.length - 1
  let D = Math.max(...raios.slice(1)) * 2
  for (let i = 0; i < 600; i++) {
    const entre = 2 * D * Math.sin(Math.PI / fora)
    let peor = 0
    for (let k = 1; k < fora; k++) peor = Math.max(peor, raios[k] + raios[k + 1])
    if (entre >= peor + GAP) break
    D *= 1.02
  }
  const pos = [[0, 0]]
  for (let k = 0; k < fora; k++) {
    const ang = -Math.PI / 2 + (2 * Math.PI * k) / fora
    pos.push([D * Math.cos(ang), D * Math.sin(ang)])
  }
  // A central enche o que quede libre: se non, baleiro no medio.
  raios[0] = Math.max(raios[0], D - Math.max(...raios.slice(1)) - GAP)
  return { pos, raios }
}

/** Pasos 3 e 4: puntos do blob, recortados e relaxados. */
function puntos(cx, cy, raio) {
  const fase = [R() * Math.PI * 2, R() * Math.PI * 2, R() * Math.PI * 2]
  const pts = []
  const filas = Math.floor((raio * 2.4) / (S * 0.866)) + 1
  const cols = Math.floor((raio * 2.4) / S) + 1
  for (let i = -filas; i <= filas; i++) {
    for (let j = -cols; j <= cols; j++) {
      const x = j * S + (i % 2 ? S / 2 : 0)
      const y = i * S * 0.866
      const d = Math.hypot(x, y)
      if (d < 1e-6) {
        pts.push([cx, cy])
        continue
      }
      const ang = Math.atan2(y, x)
      const rr =
        raio *
        (0.8 +
          0.13 * Math.sin(2 * ang + fase[0]) +
          0.09 * Math.sin(3 * ang + fase[1]) +
          0.06 * Math.sin(5 * ang + fase[2]))
      if (d <= rr) {
        pts.push([cx + x + (R() * 2 - 1) * S * JIT, cy + y + (R() * 2 - 1) * S * JIT])
      }
    }
  }
  const MIN = S * 0.82
  for (let paso = 0; paso < 4; paso++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j][0] - pts[i][0]
        const dy = pts[j][1] - pts[i][1]
        const d = Math.hypot(dx, dy)
        if (d > 1e-6 && d < MIN) {
          const e = (MIN - d) / 2
          pts[i][0] -= (dx / d) * e
          pts[i][1] -= (dy / d) * e
          pts[j][0] += (dx / d) * e
          pts[j][1] += (dy / d) * e
        }
      }
    }
  }
  // O máis próximo ao centro vai ao índice 0: alí pousa a ascendencia.
  let k = 0
  let mellor = Number.POSITIVE_INFINITY
  pts.forEach(([x, y], i) => {
    const d = (x - cx) ** 2 + (y - cy) ** 2
    if (d < mellor) {
      mellor = d
      k = i
    }
  })
  ;[pts[0], pts[k]] = [pts[k], pts[0]]
  return pts
}

/** Paso 5: MST + extras curtas con tope de grao. */
function malla(pts) {
  const n = pts.length
  const lim = (S * 1.55) ** 2
  const cand = []
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const d = (pts[a][0] - pts[b][0]) ** 2 + (pts[a][1] - pts[b][1]) ** 2
      if (d <= lim) cand.push([d, a, b])
    }
  }
  cand.sort((x, y) => x[0] - y[0])
  const pai = [...Array(n).keys()]
  const find = (inicio) => {
    let x = inicio
    while (pai[x] !== x) {
      pai[x] = pai[pai[x]]
      x = pai[x]
    }
    return x
  }
  const mst = []
  const grao = new Array(n).fill(0)
  const usadas = new Set()
  for (const [, a, b] of cand) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) {
      pai[ra] = rb
      mst.push([a, b])
      usadas.add(`${a}-${b}`)
      grao[a]++
      grao[b]++
    }
  }
  const extra = []
  const cota = Math.floor(mst.length * EXTRA)
  for (const [, a, b] of cand) {
    if (extra.length >= cota) break
    if (usadas.has(`${a}-${b}`)) continue
    if (grao[a] < TOPE_GRAO && grao[b] < TOPE_GRAO) {
      extra.push([a, b])
      grao[a]++
      grao[b]++
    }
  }
  return [...mst, ...extra]
}

const mestura = (cor, base, t) => {
  const c = [1, 3, 5].map((i) => Number.parseInt(cor.slice(i, i + 2), 16))
  const b = [1, 3, 5].map((i) => Number.parseInt(base.slice(i, i + 2), 16))
  return `#${c
    .map((v, i) =>
      Math.round(b[i] + (v - b[i]) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

// ── Construción ──
const { pos, raios } = colocar(COMARCAS)
COMARCAS[0][4] = nodosPara(raios[0])

const nodes = []
const edges = []
const grupos = []
const tintes = []
const porTag = {}
const addEdge = (s, t) =>
  edges.push({ id: `e${edges.length}`, source: s, target: t, type: 'dependency' })

COMARCAS.forEach(([tag, gl, en, cor], k) => {
  grupos.push({ id: tag, label: { gl, en }, color: cor })
  tintes.push({ id: `r-${tag}`, label: gl, tag, color: cor })
  const pts = puntos(pos[k][0], pos[k][1], raios[k])
  const pares = malla(pts)
  const keys = new Set([
    1 + Math.floor(R() * (pts.length - 1)),
    1 + Math.floor(R() * (pts.length - 1)),
  ])
  const ids = []
  porTag[tag] = []
  pts.forEach(([x, y], i) => {
    const id = `${tag}-${i}`
    ids.push(id)
    const grande = i === 0
    const clave = !grande && keys.has(i)
    const n = {
      id,
      type: grande ? 'ascendancy' : clave ? 'keystone' : 'small',
      size: grande ? 42 : clave ? 25 : 13,
      icon: grande ? 'norse-triquetra' : clave ? 'logic-crown' : ICONAS[(i * 7) % ICONAS.length],
      // Os pequenos LEVAN rótulo real: agóchao o tema con
      // `sizes.labelMinRadius`, así que segue no aria-label.
      label: { gl: grande ? gl : `${gl} · ${i}`, en: grande ? en : `${en} · ${i}` },
      position: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 },
      color: mestura(cor, '#0c0e15', grande ? 0.34 : clave ? 0.26 : 0.17),
      tags: [tag],
      group: tag,
      costPerTier: [[{ resourceId: 'punto', amount: 1 }]],
    }
    nodes.push(n)
    porTag[tag].push(n)
  })
  for (const [a, b] of pares) addEdge(ids[a], ids[b])
})

// Paso 6: portas entre veciñas do anel (a cerna toca todas).
const fora = COMARCAS.slice(1).map(([t]) => t)
const veciñas = [
  ...fora.map((t) => [COMARCAS[0][0], t]),
  ...fora.map((t, k) => [t, fora[(k + 1) % fora.length]]),
]
for (const [a, b] of veciñas) {
  let mellor = Number.POSITIVE_INFINITY
  let par = null
  for (const na of porTag[a]) {
    for (const nb of porTag[b]) {
      const d = (na.position.x - nb.position.x) ** 2 + (na.position.y - nb.position.y) ** 2
      if (d < mellor) {
        mellor = d
        par = [na, nb]
      }
    }
  }
  addEdge(par[0].id, par[1].id)
  for (const n of par) {
    if (n.type === 'small') {
      n.type = 'notable'
      n.size = 18
      n.icon = 'logic-gate'
    }
  }
}

// Paso 7: «conectado a calquera adxacente».
const veci = {}
for (const e of edges) {
  veci[e.source] = veci[e.source] ?? []
  veci[e.source].push(e.target)
  veci[e.target] = veci[e.target] ?? []
  veci[e.target].push(e.source)
}
for (const n of nodes) {
  const vs = (veci[n.id] ?? []).slice(0, 4)
  if (vs.length > 0) {
    n.prerequisites = {
      type: 'any',
      conditions: vs.map((v) => ({ type: 'node_unlocked', nodeId: v })),
    }
  }
}
const raiz = nodes.find((n) => n.id === 'cerna-0')
raiz.type = 'root'
raiz.size = 54
raiz.icon = 'norse-world-tree'
// A raíz non pide nada: é a porta de entrada da árbore enteira.
raiz.prerequisites = undefined

const doc = {
  tree: {
    id: 'malla-proto',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { gl: 'Prototipo de malla', en: 'Mesh prototype' },
    description: {
      gl: 'Prototipo do estilo de atlas: comarcas como mallas densas con lazos, portas entre veciñas e curva `arc`.',
      en: 'Atlas-style prototype: shires as dense looped meshes, gateways between neighbours, `arc` curves.',
    },
    groups: grupos,
    resources: [
      { id: 'punto', label: { gl: 'Punto', en: 'Point' }, color: '#d8b15a', initial: 600 },
    ],
    nodes,
    edges,
    // `arc`: combadura lixeira perpendicular, o único estilo sen nesgo
    // de dirección — imprescindible nunha malla.
    layout: { type: 'custom', curve: 'arc' },
  },
  editor: {
    formatVersion: '1.0.0',
    theme: {
      preset: 'forxa',
      nodeFills: {
        locked: '#0e1018',
        unlockable: '#1c2436',
        unlocked: '#2a2416',
        maxed: '#3d3018',
        inProgress: '#1f2130',
      },
      nodeRings: {
        locked: '#2e3140',
        unlockable: '#d8b15a',
        unlocked: '#e6c77a',
        maxed: '#f2e2b0',
        inProgress: '#8a7a4a',
      },
      edges: { color: '#9a8550', active: '#f0d48a' },
      textColor: '#f0e6d2',
      iconColor: '#9a9276',
      regionShape: 'hull',
      // `labelMinRadius`: os centos de nodos pequenos non levan texto.
      sizes: { strokeWidth: 1.3, ringWidth: 1.4, fontSize: 13, labelMinRadius: 26 },
      regions: tintes,
    },
  },
}

const saida = process.argv[2] ?? 'malla-proto.json'
writeFileSync(saida, `${JSON.stringify(doc, null, 1)}\n`, 'utf8')
console.log(`malla-proto: ${nodes.length} nodos, ${edges.length} arestas → ${saida}`)
// ── FIN: prototipo do layout de malla ──
