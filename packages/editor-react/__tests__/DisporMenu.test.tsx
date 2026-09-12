// ── INICIO: tests «Dispor» (7.16, Cambio 2) ──
// Wiring UI: o menú coce posicións nunha transacción (un undo devolve
// todo), só existe en Autoría + vista grafo, e o convite aparece cando
// ≥30% dos nodos non teñen posición. A xeometría real (encaixe fit,
// aspecto de cada algoritmo) vai ao gate visual + E2E (A.6.43).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { TreeEngine } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'
import type { ProbaSession } from '../src/proba/useProbaSession.js'

afterEach(() => cleanup())

function buildEngine(opts?: { senPosicion?: boolean; layout?: TreeDef['layout'] }): EditorEngine {
  const withPos = opts?.senPosicion !== true
  const tree: TreeDef = {
    id: 'dispor-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Dispor test' },
    nodes: [
      { id: 'a', type: 'small', label: { gl: 'A' }, ...(withPos && { position: { x: 0, y: 0 } }) },
      {
        id: 'b',
        type: 'small',
        label: { gl: 'B' },
        ...(withPos && { position: { x: 100, y: 0 } }),
      },
      {
        id: 'c',
        type: 'small',
        label: { gl: 'C' },
        ...(withPos && { position: { x: 0, y: 100 } }),
      },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
      { id: 'e2', source: 'a', target: 'c', type: 'dependency' },
    ],
    layout: opts?.layout ?? { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

const positions = (engine: EditorEngine) =>
  new Map(engine.getDocument().tree.nodes.map((n) => [n.id, n.position]))

describe('7.16 — menú Dispor', () => {
  it('★ dispor Radial coce posicións nunha transacción; UN undo devolve todo', () => {
    const engine = buildEngine()
    const before = positions(engine)
    render(<EditorCanvas editorEngine={engine} />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Dispor' }))
    })
    act(() => {
      // 7.18: o nome accesible inclúe a liña de axuda → match por prefixo.
      fireEvent.click(screen.getByRole('menuitem', { name: /^Radial Aneis/ }))
    })

    const after = positions(engine)
    expect(after).not.toEqual(before)
    for (const [, pos] of after) expect(pos).toBeDefined()
    // layout.type segue custom (cocer, non vivir).
    expect(engine.getDocument().tree.layout.type).toBe('custom')

    // UN undo → todas as posicións previas.
    engine.undo()
    expect(positions(engine)).toEqual(before)
  })

  it('o menú lista TODOS os algoritmos, cada un coa súa axuda (7.18)', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Dispor' }))
    })
    // Etiqueta + condición de uso xuntas no nome accesible: a axuda é
    // contido real (doutrina «explícase só»), tamén para lectores de
    // pantalla.
    const expected: readonly [RegExp, string][] = [
      [/^Radial Aneis/, 'Aneis por profundidade desde a raíz.'],
      [/^Árbore \(por niveis\)/, 'Ideal cando cada nodo ten UN só pai'],
      [/^Capas \(para DAGs\)/, 'Para nodos con varios pais ou requisitos múltiples.'],
      [/^Radial por grupos/, 'Precisa grupos definidos'],
      [/^Constelación/, 'Para grafos soltos sen xerarquía clara.'],
      // 19.6: o layout de malla. Se se engade outro motor, este test
      // esixe que traia a súa condición de uso escrita.
      [/^Malla \(tea de araña\)/, 'Para grafos densos con lazos'],
    ]
    const items = screen.getAllByRole('menuitem')
    expect(items).toHaveLength(expected.length)
    for (const [name, help] of expected) {
      const item = screen.getByRole('menuitem', { name })
      expect(item.textContent).toContain(help)
    }
  })

  it('en Proba non hai Dispor (a toolbar enteira non existe)', () => {
    const engine = buildEngine()
    const session: ProbaSession = {
      treeEngine: new TreeEngine(engine.getDocument().tree),
      reset: () => undefined,
    }
    render(<EditorCanvas editorEngine={engine} probaSession={session} />)
    expect(screen.queryByRole('button', { name: 'Dispor' })).toBeNull()
  })

  it('en vista tarxetas non hai Dispor', () => {
    render(<EditorCanvas editorEngine={buildEngine()} view="cards" />)
    expect(screen.queryByRole('button', { name: 'Dispor' })).toBeNull()
  })
})

describe('7.16 — convite tras importar (≥30% sen posición)', () => {
  it('★ aparece coa árbore sen posicións; un algoritmo a un clic; e coloca', () => {
    const engine = buildEngine({ senPosicion: true })
    render(<EditorCanvas editorEngine={engine} />)
    expect(screen.getByText(/nodos sen posición — ¿Dispor\?/)).toBeDefined()

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^Árbore \(por niveis\)/ }))
    })
    // Colocados todos → o convite desaparece só (condición falsa).
    for (const [, pos] of positions(engine)) expect(pos).toBeDefined()
    expect(screen.queryByText(/sen posición — ¿Dispor\?/)).toBeNull()
  })

  it('non aparece se todos os nodos teñen posición', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    expect(screen.queryByText(/sen posición — ¿Dispor\?/)).toBeNull()
  })

  it('★★ 19.10: NON aparece se o documento declara un layout VIVO', () => {
    // Un documento con `layout: mesh` non leva coordenadas a propósito
    // — colócao o motor ao pintar. O convite tapaba o lenzo dicindo que
    // había nodos «sen posición» cando estaban todos colocados; vísteo
    // ao abrir o atlas da galería no editor.
    const engine = buildEngine({
      senPosicion: true,
      layout: { type: 'mesh', spacing: 66, seed: 1 } as TreeDef['layout'],
    })
    render(<EditorCanvas editorEngine={engine} />)
    expect(screen.queryByText(/sen posición — ¿Dispor\?/)).toBeNull()
  })

  it('e SI aparece con `custom`, onde os nodos quedan de verdade sen colocar', () => {
    const engine = buildEngine({ senPosicion: true })
    render(<EditorCanvas editorEngine={engine} />)
    expect(screen.getByText(/sen posición — ¿Dispor\?/)).toBeDefined()
  })

  it('o ✕ pecha o convite sen tocar nada', () => {
    const engine = buildEngine({ senPosicion: true })
    const before = positions(engine)
    render(<EditorCanvas editorEngine={engine} />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Pechar o convite' }))
    })
    expect(screen.queryByText(/sen posición — ¿Dispor\?/)).toBeNull()
    expect(positions(engine)).toEqual(before)
  })
})
// ── FIN: tests «Dispor» ──
