// ── INICIO: tests animations ──
import { describe, expect, it } from 'vitest'
import { buildAnimationsCSS } from '../src/animations.js'

describe('buildAnimationsCSS', () => {
  it('devolve string non vacío con @keyframes yf-pulse', () => {
    const css = buildAnimationsCSS('test-id')
    expect(css.length).toBeGreaterThan(0)
    expect(css).toContain('@keyframes yf-pulse')
  })

  it('contén scope prefix [data-theme-id="..."]', () => {
    const css = buildAnimationsCSS('my-theme-123')
    expect(css).toContain('[data-theme-id="my-theme-123"]')
  })

  it('★ 19.2 — o pulse apunta ao estado VISUAL, non ao cru do motor', () => {
    const css = buildAnimationsCSS('t')
    // `data-state` leva o estado gardado, que NUNCA vale "unlockable"
    // (o motor só o escribe cun efecto modify_node_state). Mentres o
    // selector apuntou alí, este pulso non disparou nin unha vez.
    expect(css).toContain('[data-visual-state="unlockable"]')
    expect(css).not.toContain('[data-state="unlockable"]')
    expect(css).toContain('animation: yf-pulse')
  })

  it('contén transition de stroke (anel) no .yf-skill-node__shape', () => {
    const css = buildAnimationsCSS('t')
    expect(css).toContain('.yf-skill-node__shape')
    expect(css).toContain('transition: stroke')
    // F10.3 plano: cero filter/drop-shadow nos nodos.
    expect(css).not.toContain('drop-shadow')
  })

  it('contén cursor: pointer no [role="button"]', () => {
    const css = buildAnimationsCSS('t')
    expect(css).toContain('[role="button"]')
    expect(css).toContain('cursor: pointer')
  })

  it('contén comments delimitadores ANIMATION BLOCK START/END', () => {
    const css = buildAnimationsCSS('t')
    expect(css).toContain('/* ANIMATION BLOCK START */')
    expect(css).toContain('/* ANIMATION BLOCK END */')
  })

  it('contén media query @media (prefers-reduced-motion: reduce)', () => {
    const css = buildAnimationsCSS('test-id')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('aplica transition: none e animation: none no override reducido', () => {
    const css = buildAnimationsCSS('test-id')
    expect(css).toContain('transition: none')
    expect(css).toContain('animation: none')
  })

  it('usa !important nas regras de override', () => {
    const css = buildAnimationsCSS('test-id')
    const matches = css.match(/!important/g)
    expect(matches).not.toBeNull()
    expect(matches?.length).toBeGreaterThanOrEqual(2)
  })
})
// ── FIN: tests animations ──
