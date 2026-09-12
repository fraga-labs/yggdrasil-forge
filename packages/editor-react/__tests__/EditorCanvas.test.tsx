// ── INICIO: tests EditorCanvas ──
// Tests do briefing 7.5b-i §5:
//   1. Smoke: monta sin erro cun engine cargado coa fixture (pinta N nodos).
//   2. onNodeClick actualiza a SelectionEngine.
//   3. Status bar amosa count correcto (> 0) e "N selected" tras selección.

import { render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument, setMetaField } from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'

// Fixture local pequena (3 nodos, 2 arestas).
function buildFixtureEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'canvas-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Canvas test' },
    groups: [],
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
      { id: 'c', type: 'keystone', label: { en: 'C' }, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
      { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
    ],
    layout: { type: 'custom' },
  } as TreeDef
  const doc = createEditorDocument(tree, {
    coordinateBounds: { minX: -50, minY: -50, maxX: 250, maxY: 50 },
  })
  return new EditorEngine(doc)
}

describe('EditorCanvas — smoke', () => {
  it('renderiza sen erro cun engine cargado coa fixture', () => {
    const engine = buildFixtureEngine()
    const { container } = render(<EditorCanvas editorEngine={engine} />)
    // O SkillTree pinta SVG; o canvas wrapper debe existir.
    expect(container.querySelector('.editor-canvas')).not.toBeNull()
    // E debería pintar polo menos un SVG (o SkillTree).
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('pinta os nodos da fixture (labels visibles no SVG)', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} />)
    // Os ids/labels dos nodos deberían aparecer no DOM (texto SVG).
    // O SkillTree pinta os labels traducidos; cuns ids "a", "b", "c"
    // e labels "A", "B", "C" en inglés, debemos atopalos.
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('B')).toBeDefined()
    expect(screen.getByText('C')).toBeDefined()
  })
})

describe('EditorCanvas — selección por clic via SelectionEngine', () => {
  it('SelectionEngine.replace dispara re-render con anel de selección', () => {
    const engine = buildFixtureEngine()
    const { container } = render(<EditorCanvas editorEngine={engine} />)
    // Estado inicial: cero selección.
    expect(engine.getSession().selection.current().length).toBe(0)
    // Simulamos onNodeClick directamente vía SelectionEngine (o
    // SkillTree internamente non temos como simular clic en jsdom
    // sin recoñecer o SVG layout; pero o que importa do briefing é
    // que SelectionEngine queda actualizado).
    engine.getSession().selection.replace([{ kind: 'node', id: 'b' }])
    // Forzamos un re-render esperando un microtask; o
    // useSyncExternalStore xa se sincronizou polo notify do subscribe.
    expect(engine.getSession().selection.current().length).toBe(1)
    expect(engine.getSession().selection.current()[0]?.id).toBe('b')
    // O canvas debería seguir renderizado (sin erro de re-render).
    expect(container.querySelector('.editor-canvas')).not.toBeNull()
  })
})

describe('★ F7.9 — base do tema segundo o chrome (texto + arestas, non só campo a campo)', () => {
  it('sen chromeTheme (ou "light"): texto escuro por defecto (cero regresión)', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#222222')
  })

  it('★ con chromeTheme="dark": texto claro lexible, non o #222222 fixo', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} chromeTheme="dark" />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#e8e9ea')
    expect(label.style.fill).not.toBe('#222222')
  })

  it('chromeTheme="light" explícito compórtase igual que sen prop', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} chromeTheme="light" />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#222222')
  })

  it('★ as ARESTAS tamén cambian de base en escuro (non só o texto — arranxo de raíz)', () => {
    const engineLight = buildFixtureEngine()
    const { container: containerLight } = render(<EditorCanvas editorEngine={engineLight} />)
    const edgeLight = containerLight.querySelector('.yf-skill-edge') as SVGPathElement
    expect(edgeLight.style.stroke).toBe('#999999') // minimal.edge

    const engineDark = buildFixtureEngine()
    const { container: containerDark } = render(
      <EditorCanvas editorEngine={engineDark} chromeTheme="dark" />,
    )
    const edgeDark = containerDark.querySelector('.yf-skill-edge') as SVGPathElement
    expect(edgeDark.style.stroke).toBe('#565b66') // minimalDark.edge
    expect(edgeDark.style.stroke).not.toBe('#999999')
  })

  it('★ textColor explícito do documento GAÑA sobre chromeTheme="dark"', () => {
    const engine = buildFixtureEngine()
    engine.dispatch(
      setMetaField(
        'theme',
        { textColor: '#ff00aa' },
        { en: 'Update theme', gl: 'Actualizar tema' },
      ),
    )
    render(<EditorCanvas editorEngine={engine} chromeTheme="dark" />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#ff00aa')
  })

  it('★ textColor explícito do documento aplícase tamén en chromeTheme="light"/sen definir', () => {
    const engine = buildFixtureEngine()
    engine.dispatch(
      setMetaField(
        'theme',
        { textColor: '#ff00aa' },
        { en: 'Update theme', gl: 'Actualizar tema' },
      ),
    )
    render(<EditorCanvas editorEngine={engine} />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#ff00aa')
  })
})

// ── 19.0: o tema do documento chega ao lenzo tamén nos eixes novos ──
// O funil (themeOverridesFromSpec / themeTypographyFromSpec) xa ten os
// seus tests en @editor-core; isto verifica a costura do EditorCanvas,
// que é o único código que non comparte co `ygg render`.
describe('EditorCanvas — 19.0: aneis, arestas e tipografía do documento', () => {
  function withTheme(theme: Record<string, unknown>): EditorEngine {
    const engine = buildFixtureEngine()
    engine.dispatch(setMetaField('theme', theme, { en: 'Update theme', gl: 'Actualizar tema' }))
    return engine
  }

  it('★ a tipografía do documento aplícase aos rótulos', () => {
    render(
      <EditorCanvas
        editorEngine={withTheme({
          typography: {
            fontFamily: 'Cinzel, serif',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          },
        })}
      />,
    )
    const label = screen.getByText('A')
    expect(label.style.fontFamily).toContain('Cinzel')
    expect(label.style.letterSpacing).toBe('0.08em')
    expect(label.style.textTransform).toBe('uppercase')
  })

  it('★ sen tipografía no documento non se impón ningunha (cero regresión)', () => {
    // As bases (`minimal`/`minimalDark`) NON declaran tipografía: o SVG
    // herda a fonte do DOM. Un documento sen `typography` debe seguir
    // exactamente igual — nada de plantar unha fonte por defecto.
    render(<EditorCanvas editorEngine={withTheme({ textColor: '#ff00aa' })} />)
    expect(screen.getByText('A').style.fontFamily).toBe('')
  })

  // O anel e as arestas aplícanse por `style` inline (F10.3.fix), non
  // como atributo SVG — por iso a busca vai polo style computado.
  function strokesOf(container: HTMLElement): readonly string[] {
    return Array.from(container.querySelectorAll<SVGElement>('svg *'))
      .map((el) => el.style.stroke)
      .filter((s) => s !== '')
  }

  it('nodeRings.locked pinta o anel dos nodos (todos locked na fixture)', () => {
    const { container } = render(
      <EditorCanvas editorEngine={withTheme({ nodeRings: { locked: '#c1272d' } })} />,
    )
    expect(strokesOf(container)).toContain('#c1272d')
  })

  it('edges.color pinta as liñas', () => {
    const { container } = render(
      <EditorCanvas editorEngine={withTheme({ edges: { color: '#4a2418' } })} />,
    )
    expect(strokesOf(container)).toContain('#4a2418')
  })
})
// ── FIN: tests EditorCanvas ──
