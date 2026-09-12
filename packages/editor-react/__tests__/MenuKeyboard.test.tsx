// ── INICIO: tests navegación por teclado dos menús (auto-2) ──
// WAI-ARIA menu button nos tres menús: foco inicial, frechas con volta,
// Home/End, Escape devolve o foco ao trigger, Tab pecha.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'
import { FileMenu } from '../src/shell/FileMenu.js'
import { PanelsMenu } from '../src/shell/PanelsMenu.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'kb',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'KB' },
    nodes: [{ id: 'a', type: 'small', label: { gl: 'A' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

const key = (k: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key: k })

describe('FileMenu — teclado', () => {
  function openFile(): { onNew: ReturnType<typeof vi.fn> } {
    const onNew = vi.fn()
    render(<FileMenu onNew={onNew} onImport={() => undefined} onExport={() => undefined} />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Ficheiro' }))
    })
    return { onNew }
  }

  it('ao abrir, o foco vai á primeira entrada', () => {
    openFile()
    expect(document.activeElement).toBe(screen.getAllByRole('menuitem')[0])
  })

  it('ArrowDown/ArrowUp percorren con volta; Home/End van aos extremos', () => {
    openFile()
    const items = screen.getAllByRole('menuitem')
    act(() => key('ArrowDown'))
    expect(document.activeElement).toBe(items[1])
    act(() => key('ArrowUp'))
    act(() => key('ArrowUp'))
    expect(document.activeElement).toBe(items[items.length - 1]) // volta
    act(() => key('Home'))
    expect(document.activeElement).toBe(items[0])
    act(() => key('End'))
    expect(document.activeElement).toBe(items[items.length - 1])
  })

  it('Escape pecha E devolve o foco ao botón Ficheiro', () => {
    openFile()
    act(() => key('Escape'))
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ficheiro' }))
  })

  it('Tab pecha o menú', () => {
    openFile()
    act(() => key('Tab'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('Enter na entrada enfocada activa a acción (nativo do botón)', () => {
    const { onNew } = openFile()
    act(() => {
      fireEvent.click(document.activeElement as HTMLElement)
    })
    expect(onNew).toHaveBeenCalledOnce()
  })
})

describe('PanelsMenu — teclado (menuitemcheckbox tamén navega)', () => {
  it('foco inicial na primeira ficha e ArrowDown avanza', () => {
    render(
      <PanelsMenu
        panels={[
          { id: 'a', title: 'A', component: () => null, defaultLocation: 'left' },
          { id: 'b', title: 'B', component: () => null, defaultLocation: 'left' },
        ]}
        visiblePanelIds={['a']}
        onTogglePanel={() => undefined}
        onResetLayout={() => undefined}
      />,
    )
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Paneis' }))
    })
    const first = screen.getAllByRole('menuitemcheckbox')[0]
    expect(document.activeElement).toBe(first)
    act(() => key('ArrowDown'))
    expect(document.activeElement).toBe(screen.getAllByRole('menuitemcheckbox')[1])
  })
})

describe('DisporMenu — teclado', () => {
  it('abrir enfoca «Radial»; End vai ao ÚLTIMO; Escape volve ao trigger', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Dispor' }))
    })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /^Radial Aneis/ }))
    act(() => key('End'))
    // 19.6: o último pasou a ser «Malla»; o que este test fixa é que
    // End vai ao final da lista, non un nome concreto.
    const items = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(items[items.length - 1])
    act(() => key('Escape'))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dispor' }))
  })
})
// ── FIN: tests navegación por teclado dos menús ──
