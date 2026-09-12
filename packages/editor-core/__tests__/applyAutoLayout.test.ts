// ── INICIO: tests applyAutoLayout (7.16, Cambio 1) ──
// A sonda A.6.9 como test PERMANENTE: cada algoritmo × cada árbore da
// galería debe dar `.ok` — un briefing vello asumiu `radius` opcional
// e saíu SVG en branco; isto impide a reincidencia.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Position } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import type { EditorDocument } from '../src/document/EditorDocument.js'
import { deserializeDocument } from '../src/document/serialize.js'
import { AUTO_LAYOUT_ALGOS, applyAutoLayout } from '../src/layout/applyAutoLayout.js'
import { adversarialDocument } from '../src/testing/adversarialFixture.js'

const GALLERY = join(__dirname, '..', '..', '..', 'examples', 'gallery')

function galleryDoc(file: string): EditorDocument {
  const result = deserializeDocument(readFileSync(join(GALLERY, file), 'utf8'))
  if (!result.ok) throw new Error(`galería rota: ${file}: ${result.error.message}`)
  return result.value
}

/** Aplica os comandos nun engine e devolve as posicións resultantes. */
function positionsAfter(doc: EditorDocument, algo: (typeof AUTO_LAYOUT_ALGOS)[number]) {
  const commands = applyAutoLayout(doc, algo)
  expect(commands.ok, `${algo} debe dar ok`).toBe(true)
  if (!commands.ok) throw new Error('unreachable')
  const engine = new EditorEngine(doc)
  const result = engine.transaction({ gl: `Dispor: ${algo}` }, (tx) => {
    for (const c of commands.value) tx.apply(c)
  })
  expect(result.ok).toBe(true)
  return { engine, positions: mapPositions(engine.getDocument()) }
}

function mapPositions(doc: EditorDocument): ReadonlyMap<string, Position | undefined> {
  return new Map(doc.tree.nodes.map((n) => [n.id, n.position]))
}

describe('applyAutoLayout — sonda A.6.9: cada algo × cada árbore → ok', () => {
  const files = ['panadeiro.json', 'adversarial.json', 'gaia-cards.json']
  for (const file of files) {
    for (const algo of AUTO_LAYOUT_ALGOS) {
      it(`${algo} × ${file} → ok e TODOS os nodos con posición`, () => {
        const doc = galleryDoc(file)
        const commands = applyAutoLayout(doc, algo)
        expect(commands.ok, commands.ok ? '' : (commands as { error: Error }).error.message).toBe(
          true,
        )
        if (!commands.ok) return
        // Un moveNode por nodo + o setMetaField do encadre (7.16b).
        expect(commands.value).toHaveLength(doc.tree.nodes.length + 1)
      })
    }
  }
})

describe('applyAutoLayout — determinismo e cocido', () => {
  it('★ determinista: mesma entrada → mesmas posicións', () => {
    const doc = galleryDoc('gaia-cards.json')
    const a = positionsAfter(doc, 'clustered-radial').positions
    const b = positionsAfter(galleryDoc('gaia-cards.json'), 'clustered-radial').positions
    expect(a).toEqual(b)
  })

  it('as posicións cocidas CAMBIAN respecto ás orixinais e layout.type queda custom', () => {
    const doc = galleryDoc('panadeiro.json')
    const before = mapPositions(doc)
    const { engine, positions: after } = positionsAfter(doc, 'radial')
    expect(after).not.toEqual(before)
    // Cocer, non vivir: o documento segue declarando layout custom.
    expect(engine.getDocument().tree.layout.type).toBe('custom')
  })

  // ── 19.10: cocer significa cocer ──
  //
  // Ata agora o `layout.type` non se tocaba. Se o documento declaraba un
  // layout VIVO, as posicións gardábanse e o renderer IGNORÁBAAS, porque
  // volve calcular ao pintar. Medido co atlas: `ygg layout --algo mesh`
  // escribía posicións afastadas unha mediana de 49 unidades (ata 163)
  // das que logo se pintaban. E no editor, arrastrar un nodo nun
  // documento así non facía nada visible.

  /** Documento co `layout` que se lle pase (vivo ou custom). */
  function docCon(layout: Record<string, unknown>): EditorDocument {
    const base = galleryDoc('panadeiro.json')
    return {
      ...base,
      tree: { ...base.tree, layout: layout as never },
    }
  }

  it('★★ cun layout VIVO, cocer deixa o documento en `custom`', () => {
    const doc = docCon({ type: 'mesh', spacing: 66, seed: 1 })
    const { engine } = positionsAfter(doc, 'mesh')
    expect(engine.getDocument().tree.layout.type).toBe('custom')
  })

  it('★ e un undo devolve o layout vivo xunto coas posicións (unha soa transacción)', () => {
    const doc = docCon({ type: 'mesh', spacing: 66, seed: 1 })
    const { engine } = positionsAfter(doc, 'mesh')
    engine.undo()
    expect(engine.getDocument().tree.layout.type).toBe('mesh')
  })

  it('cun documento xa `custom` NON se engade unha orde inerte', () => {
    const doc = galleryDoc('panadeiro.json')
    const r = applyAutoLayout(doc, 'radial')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Un moveNode por nodo + o setMetaField do encadre. Nada máis.
    expect(r.value).toHaveLength(doc.tree.nodes.length + 1)
  })

  it('cun layout vivo si se engade: unha orde máis', () => {
    const doc = docCon({ type: 'mesh', spacing: 66, seed: 1 })
    const r = applyAutoLayout(doc, 'mesh')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toHaveLength(doc.tree.nodes.length + 2)
  })

  it('★★ redispor co MESMO algoritmo respecta a afinación do autor', () => {
    // Se o documento xa pedía `mesh` cun `spacing` grande, «Dispor →
    // Malla» non pode significar «esquece o que axustaches»: antes
    // colléndose sempre os defaults (spacing 66).
    const apertado = positionsAfter(docCon({ type: 'mesh', spacing: 40, seed: 1 }), 'mesh')
    const amplo = positionsAfter(docCon({ type: 'mesh', spacing: 200, seed: 1 }), 'mesh')
    const extensión = (m: ReadonlyMap<string, Position | undefined>): number => {
      const xs = [...m.values()].flatMap((p) => (p === undefined ? [] : [p.x]))
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(extensión(amplo.positions)).toBeGreaterThan(extensión(apertado.positions) * 2)
  })

  it('★ o nodo SEN posición da adversarial queda colocado; un undo restaura TODO', () => {
    const doc = adversarialDocument()
    const before = mapPositions(doc)
    expect(before.get('sen-posicion')).toBeUndefined()

    const commands = applyAutoLayout(doc, 'tree')
    expect(commands.ok).toBe(true)
    if (!commands.ok) return
    const engine = new EditorEngine(doc)
    engine.transaction({ gl: 'Dispor: tree' }, (tx) => {
      for (const c of commands.value) tx.apply(c)
    })
    const after = mapPositions(engine.getDocument())
    expect(after.get('sen-posicion')).toBeDefined()

    // UN undo → todas as posicións previas dun golpe (incluído o
    // sen-posicion, que volve a estar sen posición).
    engine.undo()
    expect(mapPositions(engine.getDocument())).toEqual(before)
    expect(
      engine.getDocument().tree.nodes.find((n) => n.id === 'sen-posicion')?.position,
    ).toBeUndefined()
  })

  it('★ 7.16b: coordinateBounds actualízase e CONTÉN todas as posicións; undo restáurao', () => {
    const doc = galleryDoc('gaia-cards.json')
    const boundsBefore = doc.meta.coordinateBounds
    const { engine, positions } = positionsAfter(doc, 'clustered-radial')
    const after = engine.getDocument().meta.coordinateBounds
    expect(after).toBeDefined()
    if (after === undefined) return
    // Todos os nodos dentro do box novo (o síntoma do gate: nodos
    // fóra do viewBox e do alcance do pan — inalcanzables).
    for (const [id, pos] of positions) {
      expect(pos, id).toBeDefined()
      if (pos === undefined) continue
      expect(pos.x, `${id}.x`).toBeGreaterThanOrEqual(after.minX)
      expect(pos.x, `${id}.x`).toBeLessThanOrEqual(after.maxX)
      expect(pos.y, `${id}.y`).toBeGreaterThanOrEqual(after.minY)
      expect(pos.y, `${id}.y`).toBeLessThanOrEqual(after.maxY)
    }
    // Un undo devolve TAMÉN o encadre anterior (mesma transacción).
    engine.undo()
    expect(engine.getDocument().meta.coordinateBounds).toEqual(boundsBefore)
  })

  it('★ 7.18 layered × panadeiro (regra P4): magnitudes exactas — ambos pais na capa 0', () => {
    const doc = galleryDoc('panadeiro.json')
    const { positions } = positionsAfter(doc, 'layered')
    // Defaults 90/130 de defaultLayoutConfigs. Capa 0 [fariña,
    // levadura] → ±45 (levadura XA NON é unha raíz apartada como en
    // tree); capa 1 tras baricentro [masa_dulce, pan_básico] → ∓45;
    // churros centrado na capa 2. As dúas arestas de pan_básico baixan.
    expect(positions.get('fariña')).toEqual({ x: -45, y: 0 })
    expect(positions.get('levadura')).toEqual({ x: 45, y: 0 })
    expect(positions.get('masa_dulce')).toEqual({ x: -45, y: 130 })
    expect(positions.get('pan_básico')).toEqual({ x: 45, y: 130 })
    expect(positions.get('churros')).toEqual({ x: 0, y: 260 })
  })

  it('★ 7.18 layered con ciclo: err(CYCLE_DETECTED) do motor propágase, non se coloca lixo', () => {
    const cyclic = deserializeDocument(
      JSON.stringify({
        id: 'ciclo',
        schemaVersion: '1.0.0',
        version: '1.0.0',
        label: { gl: 'Ciclo' },
        nodes: [
          { id: 'a', type: 'small', label: { gl: 'A' } },
          { id: 'b', type: 'small', label: { gl: 'B' } },
        ],
        edges: [
          { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
          { id: 'e2', source: 'b', target: 'a', type: 'dependency' },
        ],
        layout: { type: 'custom' },
      }),
    )
    expect(cyclic.ok).toBe(true)
    if (!cyclic.ok) return
    const commands = applyAutoLayout(cyclic.value, 'layered')
    expect(commands.ok).toBe(false)
    if (!commands.ok) {
      expect((commands.error as { code?: string }).code).toBe('YGG_E006')
    }
  })

  it('árbore baleira → ok con cero comandos', () => {
    const empty = deserializeDocument(
      JSON.stringify({
        id: 'b',
        schemaVersion: '1.0.0',
        version: '1.0.0',
        label: { gl: 'b' },
        nodes: [],
        edges: [],
        layout: { type: 'custom' },
      }),
    )
    expect(empty.ok).toBe(true)
    if (!empty.ok) return
    for (const algo of AUTO_LAYOUT_ALGOS) {
      const commands = applyAutoLayout(empty.value, algo)
      expect(commands.ok, `${algo} con árbore baleira`).toBe(true)
      // Sen nodos tampouco hai encadre que cocer.
      if (commands.ok) expect(commands.value).toHaveLength(0)
    }
  })
})
// ── FIN: tests applyAutoLayout ──
