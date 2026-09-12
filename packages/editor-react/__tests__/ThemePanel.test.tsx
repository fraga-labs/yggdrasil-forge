// ── INICIO: tests ThemePanel (7.5e §7) ──
// Verifica:
//   - Preset Tintado dispatchse ao motor cun clic → doc.meta.theme = Tintado.
//   - Editar unha cor de recheo dispatchse.
//   - Editar cor de rexión existente dispatchse (só cor).
//   - Poñer URL de fondo dispatchse setMetaField('background', ...).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import {
  EditorEngine,
  createEditorDocument,
  getThemePreset,
  setNodeField,
} from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { PRESET_TINTADO, ThemePanel } from '../src/panels/ThemePanel.js'

afterEach(() => cleanup())

function buildEngine(regionsPreloaded = false): EditorEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    nodes: [{ id: 'foo', type: 'notable', label: { en: 'Foo' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(
    createEditorDocument(tree, {
      ...(regionsPreloaded && {
        theme: {
          regions: [{ id: 'r1', label: 'R1', tag: 't1', color: '#f00000' }],
        },
      }),
    }),
  )
}

describe('★ ThemePanel — Preset Tintado en 3 clics (7.5e §7)', () => {
  it('clic no chip "Tintado" → doc.meta.theme = PRESET_TINTADO', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    const chip = screen.getByRole('button', { name: /Tintado/i })
    act(() => {
      fireEvent.click(chip)
    })
    expect(engine.getDocument().meta.theme).toEqual(PRESET_TINTADO)
    expect(engine.canUndo()).toBe(true)
  })

  it('clic en Neutro → preset "neutro"', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    const chip = screen.getByRole('button', { name: /Neutro/i })
    act(() => {
      fireEvent.click(chip)
    })
    expect(engine.getDocument().meta.theme?.preset).toBe('neutro')
  })

  it('★ tras aplicar Tintado, o chip aparece como activo (visual feedback)', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    const chip = screen.getByRole('button', { name: /Tintado/i })
    expect(chip.className).not.toContain('editor-theme-panel__chip--active')
    act(() => {
      fireEvent.click(chip)
    })
    // Re-obter tras re-render.
    const chipAfter = screen.getByRole('button', { name: /Tintado/i })
    expect(chipAfter.className).toContain('editor-theme-panel__chip--active')
  })
})

describe('ThemePanel — Recheo por estado', () => {
  it('cambiar cor de locked → theme.nodeFills.locked dispatchse', () => {
    const engine = buildEngine()
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const lockedInput = container.querySelector('#theme-fill-locked') as HTMLInputElement
    expect(lockedInput).toBeDefined()
    act(() => {
      fireEvent.change(lockedInput, { target: { value: '#123456' } })
    })
    act(() => {
      fireEvent.blur(lockedInput)
    })
    expect(engine.getDocument().meta.theme?.nodeFills?.locked).toBe('#123456')
  })
})

describe('★ 7.13 — ThemePanel: Rexións v2', () => {
  it('con rexión preloaded → aparece na lista (label como TextWidget)', () => {
    const engine = buildEngine(true)
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const labelInput = container.querySelector('#theme-region-r1-label') as HTMLInputElement
    expect(labelInput).not.toBeNull()
    expect(labelInput.value).toBe('R1')
    expect(screen.getByText(/tag: t1/i)).toBeDefined()
  })

  it('cambiar cor da rexión → só se actualiza a cor (id/label/tag intactos)', () => {
    const engine = buildEngine(true)
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const colorInput = container.querySelector('#theme-region-r1') as HTMLInputElement
    expect(colorInput).toBeDefined()
    act(() => {
      fireEvent.change(colorInput, { target: { value: '#00ff00' } })
    })
    act(() => {
      fireEvent.blur(colorInput)
    })
    const region = engine.getDocument().meta.theme?.regions?.[0]
    expect(region?.color).toBe('#00ff00')
    expect(region?.id).toBe('r1')
    expect(region?.label).toBe('R1')
    expect(region?.tag).toBe('t1')
  })

  it('★ editar a etiqueta dunha rexión dispatchea o novo label', () => {
    const engine = buildEngine(true)
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const labelInput = container.querySelector('#theme-region-r1-label') as HTMLInputElement
    act(() => fireEvent.change(labelInput, { target: { value: 'Guerreiro' } }))
    act(() => fireEvent.blur(labelInput))
    expect(engine.getDocument().meta.theme?.regions?.[0]?.label).toBe('Guerreiro')
  })

  it('sen rexións definidas → hint informativo', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    expect(screen.getByText(/Sen rexións definidas/i)).toBeDefined()
  })

  it('★ "Engadir rexión" crea unha fila nova con id libre e etiqueta "Nova rexión"', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    act(() => fireEvent.click(screen.getByText('Engadir rexión')))
    const regions = engine.getDocument().meta.theme?.regions
    expect(regions).toHaveLength(1)
    expect(regions?.[0]?.id).toBe('rexion-1')
    expect(regions?.[0]?.label).toBe('Nova rexión')
    expect(regions?.[0]?.tag).toBe('rexion-1')
  })

  it('engadir dúas rexións seguidas xera ids libres distintos', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    act(() => fireEvent.click(screen.getByText('Engadir rexión')))
    act(() => fireEvent.click(screen.getByText('Engadir rexión')))
    const regions = engine.getDocument().meta.theme?.regions
    expect(regions?.map((r) => r.id)).toEqual(['rexion-1', 'rexion-2'])
  })

  it('★ "Eliminar" quita SÓ o tinte — non toca tags dos nodos', () => {
    const engine = buildEngine(true)
    engine.dispatch(setNodeField('foo', 'tags', ['t1']))
    render(<ThemePanel editorEngine={engine} />)
    act(() => fireEvent.click(screen.getByRole('button', { name: /Eliminar rexión/ })))
    expect(engine.getDocument().meta.theme?.regions).toEqual([])
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'foo')?.tags).toEqual(['t1'])
  })

  it('★ botóns "Asignar/Quitar da selección" só aparecen con selección ≥1', () => {
    const engine = buildEngine(true)
    render(<ThemePanel editorEngine={engine} />)
    expect(screen.queryByText('Asignar á selección')).toBeNull()
    expect(screen.queryByText('Quitar da selección')).toBeNull()
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    expect(screen.getByText('Asignar á selección')).toBeDefined()
    expect(screen.getByText('Quitar da selección')).toBeDefined()
  })

  it('★ "Asignar á selección" engade o tag aos nodos seleccionados, un só undo', () => {
    const engine = buildEngine(true)
    render(<ThemePanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    act(() => fireEvent.click(screen.getByText('Asignar á selección')))
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'foo')?.tags).toEqual(['t1'])
    expect(engine.canUndo()).toBe(true)
    engine.undo()
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'foo')?.tags).toBeUndefined()
  })

  it('"Quitar da selección" quita o tag dos nodos seleccionados', () => {
    const engine = buildEngine(true)
    render(<ThemePanel editorEngine={engine} />)
    act(() => engine.dispatch(setNodeField('foo', 'tags', ['t1'])))
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    act(() => fireEvent.click(screen.getByText('Quitar da selección')))
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'foo')?.tags).toBeUndefined()
  })
})

describe('ThemePanel — Fondo', () => {
  it('escribir URL → doc.meta.background.src actualízase', () => {
    const engine = buildEngine()
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const bgInput = container.querySelector('#theme-background-src') as HTMLInputElement
    act(() => {
      fireEvent.change(bgInput, { target: { value: 'https://example/bg.png' } })
    })
    act(() => {
      fireEvent.blur(bgInput)
    })
    expect(engine.getDocument().meta.background?.src).toBe('https://example/bg.png')
  })

  it('borrar contido do URL → background pásase a undefined', () => {
    const engine = buildEngine()
    // Setup: background xa presente.
    engine.dispatch({
      type: 'setup',
      mutate(draft) {
        ;(draft.meta as { background?: { src: string } }).background = { src: 'x' }
      },
    })
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const bgInput = container.querySelector('#theme-background-src') as HTMLInputElement
    expect(bgInput.value).toBe('x')
    act(() => {
      fireEvent.change(bgInput, { target: { value: '' } })
    })
    act(() => {
      fireEvent.blur(bgInput)
    })
    expect(engine.getDocument().meta.background).toBeUndefined()
  })
})

describe('★ 7.8.2 — control directo de cor de texto', () => {
  it('editar a cor de texto dispatchea theme.textColor', () => {
    const engine = buildEngine()
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const textInput = container.querySelector('#theme-text-color') as HTMLInputElement
    act(() => {
      fireEvent.change(textInput, { target: { value: '#e8e9ea' } })
    })
    act(() => {
      fireEvent.blur(textInput)
    })
    expect(engine.getDocument().meta.theme?.textColor).toBe('#e8e9ea')
  })

  it('botón "Automático" só aparece cando hai textColor definido', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    expect(screen.queryByRole('button', { name: /Automático/i })).toBeNull()
  })

  it('★ botón "Automático" quita textColor (volve á heurística)', () => {
    const engine = buildEngine()
    engine.dispatch({
      type: 'setup',
      mutate(draft) {
        ;(draft.meta as { theme?: { textColor?: string } }).theme = { textColor: '#ff00aa' }
      },
    })
    render(<ThemePanel editorEngine={engine} />)
    const resetBtn = screen.getByRole('button', { name: /Automático/i })
    act(() => {
      fireEvent.click(resetBtn)
    })
    expect(engine.getDocument().meta.theme?.textColor).toBeUndefined()
  })
})

describe('★ ThemePanel — fichas desde o rexistro (7.19)', () => {
  it('renderiza unha ficha por preset do rexistro, na súa orde', () => {
    render(<ThemePanel editorEngine={buildEngine()} />)
    for (const label of [
      'Tintado',
      'Neutro',
      'Pergamiño',
      'Néon',
      'Bosque',
      // 19.0 — os catro dos mockups.
      'Forxa',
      'Gótico',
      'Sci-fi',
      'Escolar',
      'Atlas',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeDefined()
    }
  })

  it('★ 19.0 — clic en «Gótico» dispatcha tamén anel, arestas e fonte', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Gótico' }))
    })
    const theme = engine.getDocument().meta.theme
    expect(theme).toEqual(getThemePreset('gotico')?.spec)
    expect(theme?.nodeRings?.maxed).toBe('#c1272d')
    expect(theme?.edges?.active).toBe('#6e2620')
    expect(theme?.typography?.textTransform).toBe('uppercase')
  })

  it('clic en «Pergamiño» → dispatch do spec completo do rexistro, chip activo', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Pergamiño' }))
    })
    const theme = engine.getDocument().meta.theme
    expect(theme).toEqual(getThemePreset('pergamino')?.spec)
    expect(theme?.preset).toBe('pergamino')
    expect(theme?.textColor).toBe('#3b2f1d')
    // As 5 cores de estado veñen co preset (spec completo).
    expect(Object.keys(theme?.nodeFills ?? {})).toHaveLength(5)
  })
})
// ── FIN: tests ThemePanel ──
