// ── INICIO: MeshLayout (19.6) ──
// O primeiro layout que LE AS ARESTAS.
//
// Os cinco anteriores colocan por xeometría pura (anel, filas,
// columnas) sen mirar o grafo. Nun grafo denso con lazos — o estilo
// «tela de araña» dos mockups fundacionais — iso produce cordas que
// cruzan o debuxo, porque dous nodos conectados poden acabar en puntas
// opostas do círculo. Aquí as arestas son unha FORZA: os nodos
// conectados atráense ata quedar á distancia `spacing`.
//
// Pasos:
//   1. Un blob por grupo; o seu raio derívase de cantos nodos ten.
//   2. O grupo central no medio; o resto nun anel cuxo radio medra ata
//      que dúas veciñas non se solapen. Logo o central medra para
//      encher o medio.
//   3. Sementeira determinista: retícula triangular recortada ao blob,
//      cun jitter de semente fixa.
//   4. Relaxación: atracción pola aresta (só dentro do grupo) +
//      repulsión local + tirón suave cara ao centro do blob, con
//      arrefriado.
//
// **Non crea arestas**: un LayoutEngine só coloca. A topoloxía é dato
// do documento (receita de xeración en `tools/malla-proto/`).
//
// **Determinista**: cero `Math.random`, cero reloxo. Mesma entrada e
// mesma `seed` → mesmas posicións, ao bit.

import { type Result, ok } from '@yggdrasil-forge/common'
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import { computeBounds } from './BoundsCalculator.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { EdgePath, LayoutResult } from './LayoutResult.js'
import { parseMeshLayoutConfig } from './MeshLayoutConfig.js'

/** Xerador determinista (mulberry32). */
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Blob {
  readonly id: string
  readonly memberIds: readonly string[]
  cx: number
  cy: number
  raio: number
}

/** Raio que precisa un blob para caber `n` nodos ao espazado `s`. */
function raioPara(n: number, s: number): number {
  return Math.sqrt((Math.max(n, 1) * s * s * 0.866) / Math.PI) * 1.18
}

export class MeshLayout implements LayoutEngine {
  readonly type = 'mesh'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    const parsed = parseMeshLayoutConfig(treeDef.layout)
    if (!parsed.ok) return parsed
    const cfg = parsed.value
    const s = cfg.spacing
    const gap = cfg.gap ?? s * 0.1
    const iteracions = cfg.iterations ?? 220
    const rng = makeRng(cfg.seed ?? 1)

    const blobs = this.buildBlobs(treeDef, cfg.centerGroupId, s)
    this.colocarBlobs(blobs, gap)

    const positions = new Map<string, Position>()
    // Arestas internas por grupo: as que cruzan grupos non tiran, ou os
    // blobs colapsarían uns sobre outros.
    const porNodo = new Map<string, string>()
    for (const b of blobs) for (const id of b.memberIds) porNodo.set(id, b.id)

    for (const blob of blobs) {
      const dentro: Array<[string, string]> = []
      for (const e of treeDef.edges) {
        if (porNodo.get(e.source) === blob.id && porNodo.get(e.target) === blob.id) {
          dentro.push([e.source, e.target])
        }
      }
      for (const [id, p] of this.relaxar(blob, dentro, s, iteracions, rng)) {
        positions.set(id, p)
      }
    }

    // Os nodos sen grupo (se os houbese) van nun anel exterior, para non
    // desaparecer: nunca se perde contido do documento.
    const soltos = treeDef.nodes.filter((n) => !positions.has(n.id))
    if (soltos.length > 0) {
      const rMax = Math.max(...blobs.map((b) => Math.hypot(b.cx, b.cy) + b.raio), s)
      soltos.forEach((n, i) => {
        const ang = (2 * Math.PI * i) / soltos.length
        positions.set(n.id, {
          x: Math.round((rMax + s * 2) * Math.cos(ang) * 10) / 10,
          y: Math.round((rMax + s * 2) * Math.sin(ang) * 10) / 10,
        })
      })
    }

    const edges = new Map<string, EdgePath>()
    for (const edge of treeDef.edges) {
      const a = positions.get(edge.source)
      const b = positions.get(edge.target)
      if (a !== undefined && b !== undefined) edges.set(edge.id, { points: [a, b] })
    }

    const parcial: LayoutResult = {
      nodes: positions,
      edges,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      layoutType: 'mesh',
    }
    return ok({ ...parcial, bounds: computeBounds(parcial, { padding: s }) })
  }

  /**
   * Un blob por `GroupDef` (na súa orde), co central primeiro. Os nodos
   * sen grupo quedan fóra a propósito: colócanse aparte en `compute`.
   */
  private buildBlobs(treeDef: TreeDef, centerGroupId: string | undefined, s: number): Blob[] {
    const groups = treeDef.groups ?? []
    const asignados = new Set<string>()
    const blobs: Blob[] = []
    for (const g of groups) {
      const explicitos = new Set<string>(g.nodeIds ?? [])
      const ids: string[] = []
      for (const n of treeDef.nodes) {
        if ((n.group === g.id || explicitos.has(n.id)) && !asignados.has(n.id)) {
          ids.push(n.id)
          asignados.add(n.id)
        }
      }
      blobs.push({ id: g.id, memberIds: ids, cx: 0, cy: 0, raio: raioPara(ids.length, s) })
    }
    // O central á cabeza: `colocarBlobs` trata sempre o primeiro como o
    // do medio.
    const idx = centerGroupId === undefined ? 0 : blobs.findIndex((b) => b.id === centerGroupId)
    if (idx > 0) {
      const [c] = blobs.splice(idx, 1)
      if (c !== undefined) blobs.unshift(c)
    }
    return blobs
  }

  /**
   * O primeiro blob no (0,0); o resto nun anel cuxo radio medra ata que
   * dúas veciñas non se solapen. Logo o central medra para tocar o anel:
   * sen ese último paso queda un baleiro no medio, porque o radio do
   * anel fíxano as de fóra.
   */
  private colocarBlobs(blobs: Blob[], gap: number): void {
    const fora = blobs.length - 1
    if (fora <= 0) return
    const raios = blobs.map((b) => b.raio)
    let D = Math.max(...raios.slice(1)) * 2
    for (let i = 0; i < 600; i++) {
      const entre = 2 * D * Math.sin(Math.PI / fora)
      let peor = 0
      for (let k = 1; k < fora; k++) {
        peor = Math.max(peor, (raios[k] ?? 0) + (raios[k + 1] ?? 0))
      }
      // Cun só blob exterior non hai par veciño: o bucle non entra e
      // queda o D inicial, que xa non solapa con nada.
      if (fora < 2 || entre >= peor + gap) break
      D *= 1.02
    }
    for (let k = 0; k < fora; k++) {
      const ang = -Math.PI / 2 + (2 * Math.PI * k) / fora
      const b = blobs[k + 1]
      if (b !== undefined) {
        b.cx = D * Math.cos(ang)
        b.cy = D * Math.sin(ang)
      }
    }
    const central = blobs[0]
    if (central !== undefined) {
      central.raio = Math.max(central.raio, D - Math.max(...raios.slice(1)) - gap)
    }
  }

  /**
   * Sementeira na retícula + relaxación por forzas. Devolve as posicións
   * dos membros do blob.
   */
  private relaxar(
    blob: Blob,
    arestas: ReadonlyArray<readonly [string, string]>,
    s: number,
    iteracions: number,
    rng: () => number,
  ): Map<string, Position> {
    const n = blob.memberIds.length
    const out = new Map<string, Position>()
    if (n === 0) return out
    if (n === 1) {
      const only = blob.memberIds[0]
      if (only !== undefined) out.set(only, { x: blob.cx, y: blob.cy })
      return out
    }

    // 1. Puntos da retícula triangular, os `n` máis próximos ao centro
    //    (blob compacto), cun jitter determinista.
    const cand: Array<[number, number, number]> = []
    const alcance = Math.ceil(blob.raio / s) + 2
    for (let i = -alcance; i <= alcance; i++) {
      for (let j = -alcance; j <= alcance; j++) {
        const x = j * s + (i % 2 === 0 ? 0 : s / 2)
        const y = i * s * 0.866
        cand.push([x * x + y * y, x, y])
      }
    }
    cand.sort((a, b) => a[0] - b[0])
    const xs = new Float64Array(n)
    const ys = new Float64Array(n)
    for (let k = 0; k < n; k++) {
      const c = cand[k] ?? [0, 0, 0]
      xs[k] = blob.cx + c[1] + (rng() * 2 - 1) * s * 0.22
      ys[k] = blob.cy + c[2] + (rng() * 2 - 1) * s * 0.22
    }

    // 2. Forzas. A repulsión só mira pares próximos (rejilla de celas),
    //    así que unha pasada é lineal no número de nodos e non
    //    cuadrática: iso é o que fai o layout viable a centos de nodos.
    const indice = new Map<string, number>()
    blob.memberIds.forEach((id, k) => indice.set(id, k))
    const pares: Array<[number, number]> = []
    for (const [a, b] of arestas) {
      const ia = indice.get(a)
      const ib = indice.get(b)
      if (ia !== undefined && ib !== undefined && ia !== ib) pares.push([ia, ib])
    }
    const cela = s * 1.2
    const fx = new Float64Array(n)
    const fy = new Float64Array(n)

    for (let paso = 0; paso < iteracions; paso++) {
      const arrefrio = 1 - paso / Math.max(iteracions, 1)
      fx.fill(0)
      fy.fill(0)

      // Repulsión local por celas: unha pasada é lineal no número de
      // nodos e non cuadrática. Iso é o que fai o layout viable a
      // centos de nodos.
      const balde = new Map<string, number[]>()
      for (let k = 0; k < n; k++) {
        const chave = `${Math.floor((xs[k] ?? 0) / cela)}:${Math.floor((ys[k] ?? 0) / cela)}`
        const lista = balde.get(chave)
        if (lista === undefined) balde.set(chave, [k])
        else lista.push(k)
      }
      for (let k = 0; k < n; k++) {
        const xk = xs[k] ?? 0
        const yk = ys[k] ?? 0
        const cx = Math.floor(xk / cela)
        const cy = Math.floor(yk / cela)
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (const m of balde.get(`${cx + dx}:${cy + dy}`) ?? []) {
              if (m === k) continue
              const vx = xk - (xs[m] ?? 0)
              const vy = yk - (ys[m] ?? 0)
              const d = Math.hypot(vx, vy)
              if (d > 1e-6 && d < s) {
                const empuxe = ((s - d) / d) * 0.5
                fx[k] = (fx[k] ?? 0) + vx * empuxe
                fy[k] = (fy[k] ?? 0) + vy * empuxe
              }
            }
          }
        }
      }

      // Atracción pola aresta cara á distancia obxectivo.
      for (const [a, b] of pares) {
        const vx = (xs[b] ?? 0) - (xs[a] ?? 0)
        const vy = (ys[b] ?? 0) - (ys[a] ?? 0)
        const d = Math.hypot(vx, vy)
        if (d < 1e-6) continue
        const tira = ((d - s) / d) * 0.12
        fx[a] = (fx[a] ?? 0) + vx * tira
        fy[a] = (fy[a] ?? 0) + vy * tira
        fx[b] = (fx[b] ?? 0) - vx * tira
        fy[b] = (fy[b] ?? 0) - vy * tira
      }

      // Tirón cara ao centro: mantén o blob xunto e dentro do raio.
      for (let k = 0; k < n; k++) {
        const vx = blob.cx - (xs[k] ?? 0)
        const vy = blob.cy - (ys[k] ?? 0)
        const d = Math.hypot(vx, vy)
        if (d > blob.raio * 0.92 && d > 1e-6) {
          const tira = ((d - blob.raio * 0.92) / d) * 0.35
          fx[k] = (fx[k] ?? 0) + vx * tira
          fy[k] = (fy[k] ?? 0) + vy * tira
        }
      }

      const tope = s * 0.5 * arrefrio + s * 0.02
      for (let k = 0; k < n; k++) {
        const gx = fx[k] ?? 0
        const gy = fy[k] ?? 0
        const d = Math.hypot(gx, gy)
        const escala = d > tope && d > 1e-6 ? tope / d : 1
        xs[k] = (xs[k] ?? 0) + gx * escala
        ys[k] = (ys[k] ?? 0) + gy * escala
      }
    }

    blob.memberIds.forEach((id, k) => {
      out.set(id, {
        x: Math.round((xs[k] ?? 0) * 10) / 10,
        y: Math.round((ys[k] ?? 0) * 10) / 10,
      })
    })
    return out
  }
}
// ── FIN: MeshLayout ──
