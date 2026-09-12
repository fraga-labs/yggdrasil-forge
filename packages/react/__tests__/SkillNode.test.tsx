import { fireEvent, render } from '@testing-library/react'
// ── INICIO: tests SkillNode ──
import { describe, expect, it, vi } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'
import { minimal } from '../src/themes/minimal.js'

function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}

describe('SkillNode — aria-label + keyboard + resolveLabel', () => {
  it('aria-label inclúe estado', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A' }}
          instance={{ id: 'a', state: 'locked', currentTier: 0 }}
          position={{ x: 0, y: 0 }}
          onClick={vi.fn()}
        />
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    expect(g.getAttribute('aria-label')).toBe('A, locked')
  })

  it('keyDown Enter dispara onClick', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'x', type: 'small', label: 'X' }}
          instance={{ id: 'x', state: 'unlockable', currentTier: 0 }}
          position={{ x: 0, y: 0 }}
          onClick={handleClick}
        />
      </svg>,
    )
    const g = q(container, '[data-node-id="x"]')
    fireEvent.keyDown(g, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalledWith('x')
  })

  it('keyDown Space dispara onClick', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'y', type: 'small', label: 'Y' }}
          instance={{ id: 'y', state: 'locked', currentTier: 0 }}
          position={{ x: 0, y: 0 }}
          onClick={handleClick}
        />
      </svg>,
    )
    fireEvent.keyDown(q(container, '[data-node-id="y"]'), { key: ' ' })
    expect(handleClick).toHaveBeenCalledWith('y')
  })

  it('keyDown Escape NON dispara onClick', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'z', type: 'small', label: 'Z' }}
          instance={{ id: 'z', state: 'locked', currentTier: 0 }}
          position={{ x: 0, y: 0 }}
          onClick={handleClick}
        />
      </svg>,
    )
    fireEvent.keyDown(q(container, '[data-node-id="z"]'), { key: 'Escape' })
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('resolveLabel fallback con locale non gl/es/en', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'n1', type: 'small', label: { fr: 'Français' } }}
          instance={undefined}
          position={{ x: 0, y: 0 }}
        />
      </svg>,
    )
    const label = q(container, '.yf-skill-node__label')
    expect(label.textContent).toBe('Français')
  })

  it('resolveLabel fallback final a node.id con label vacío', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'fallback-id', type: 'small', label: {} }}
          instance={undefined}
          position={{ x: 0, y: 0 }}
        />
      </svg>,
    )
    const label = q(container, '.yf-skill-node__label')
    expect(label.textContent).toBe('fallback-id')
  })
})

describe('SkillNode — long press (7.10)', () => {
  it('onLongPress dispara tras 700ms de pointerDown sostido', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A' }}
          instance={undefined}
          position={{ x: 0, y: 0 }}
          onLongPress={onLongPress}
        />
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    fireEvent.pointerDown(g)
    vi.advanceTimersByTime(699)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledWith('a')
    vi.useRealTimers()
  })

  it('pointerUp antes de 700ms cancela o long press', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A' }}
          instance={undefined}
          position={{ x: 0, y: 0 }}
          onLongPress={onLongPress}
        />
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    fireEvent.pointerDown(g)
    vi.advanceTimersByTime(500)
    fireEvent.pointerUp(g)
    vi.advanceTimersByTime(1000)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('pointerCancel cancela o long press', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A' }}
          instance={undefined}
          position={{ x: 0, y: 0 }}
          onLongPress={onLongPress}
        />
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    fireEvent.pointerDown(g)
    vi.advanceTimersByTime(400)
    fireEvent.pointerCancel(g)
    vi.advanceTimersByTime(1000)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('longPressDuration customizado respéctase (300ms)', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A' }}
          instance={undefined}
          position={{ x: 0, y: 0 }}
          onLongPress={onLongPress}
          longPressDuration={300}
        />
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    fireEvent.pointerDown(g)
    vi.advanceTimersByTime(299)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('coexistencia onClick + onLongPress: tap rápido dispara onClick', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A' }}
          instance={undefined}
          position={{ x: 0, y: 0 }}
          onClick={onClick}
          onLongPress={onLongPress}
        />
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    fireEvent.pointerDown(g)
    vi.advanceTimersByTime(200)
    fireEvent.pointerUp(g)
    fireEvent.click(g)
    vi.advanceTimersByTime(1000)
    expect(onLongPress).not.toHaveBeenCalled()
    expect(onClick).toHaveBeenCalledWith('a')
    vi.useRealTimers()
  })
})
// ── FIN: tests SkillNode ──

// ── 19.4: labelMinRadius — a densidade de atlas ──
describe('★ 19.4 — os nodos pequenos non levan rótulo', () => {
  const tema = (labelMinRadius?: number): Theme => ({
    ...minimal,
    sizes: { ...minimal.sizes, ...(labelMinRadius !== undefined && { labelMinRadius }) },
  })
  const pinta = (size: number, labelMinRadius?: number) =>
    render(
      <ThemeProvider theme={tema(labelMinRadius)}>
        <svg role="img" aria-label="proba">
          <SkillNode
            node={{ id: 'n', type: 'small', label: 'Sal Mariña', size } as never}
            instance={undefined}
            position={{ x: 0, y: 0 }}
          />
        </svg>
      </ThemeProvider>,
    )

  it('cun raio por baixo do limiar, o <text> do rótulo non se pinta', () => {
    const { container } = pinta(13, 20)
    expect(container.querySelector('.yf-skill-node__label')).toBeNull()
  })

  it('cun raio por riba do limiar, pintase coma sempre', () => {
    const { container } = pinta(42, 20)
    expect(container.querySelector('.yf-skill-node__label')?.textContent).toBe('Sal Mariña')
  })

  it('★ sen labelMinRadius, TODOS levan rótulo (cero regresión)', () => {
    const { container } = pinta(13)
    expect(container.querySelector('.yf-skill-node__label')?.textContent).toBe('Sal Mariña')
  })

  it('★ o rótulo agóchase só á vista: o aria-label segue completo', () => {
    // O `aria-label` só se emite en nodos INTERACTIVOS (os que levan
    // onClick): é aí onde a accesibilidade importa, e aí o texto segue
    // enteiro aínda que non se pinte.
    const { container } = render(
      <ThemeProvider theme={tema(20)}>
        <svg role="img" aria-label="proba">
          <SkillNode
            node={{ id: 'n', type: 'small', label: 'Sal Mariña', size: 13 } as never}
            instance={undefined}
            position={{ x: 0, y: 0 }}
            onClick={() => undefined}
          />
        </svg>
      </ThemeProvider>,
    )
    expect(container.querySelector('.yf-skill-node__label')).toBeNull()
    const g = container.querySelector('[data-node-id="n"]')
    expect(g?.getAttribute('aria-label') ?? '').toContain('Sal Mariña')
  })

  it('★★ 19.10: e nun render ESTÁTICO o nome vai nun <title>', () => {
    // O `aria-label` só sae nos nodos interactivos, así que nun
    // `ygg render` (cero handlers) o texto oculto desaparecía por
    // completo: medido no atlas da galería, 90 dos 97 nodos quedaban sen
    // nome ningún, nin tooltip nin nome accesible. En SVG o `<title>` é
    // o mecanismo estándar para iso, e dá tamén o tooltip nativo.
    const { container } = pinta(13, 20)
    expect(container.querySelector('.yf-skill-node__label')).toBeNull()
    expect(container.querySelector('title')?.textContent).toBe('Sal Mariña')
  })

  it('★ cun rótulo á vista NON se engade <title>: markup de máis é markup de máis', () => {
    const { container } = pinta(42, 20)
    expect(container.querySelector('.yf-skill-node__label')?.textContent).toBe('Sal Mariña')
    expect(container.querySelector('title')).toBeNull()
  })
})
