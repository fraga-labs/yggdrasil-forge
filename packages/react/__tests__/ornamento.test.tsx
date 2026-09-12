// ── INICIO: tests dos ornamentos (19.8) ──
// Dúas pezas dos mockups fundacionais que faltaban: o nome da comarca
// FLOTANDO no medio (non pegado ao bordo) e o marco dobre nos nodos
// grandes. As dúas son opt-in: sen pedilas, o markup non cambia.

import { render } from '@testing-library/react'
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { type RegionSpec, SkillRegions } from '../src/SkillRegions.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { ORNATE_CLASS } from '../src/nodeGeometry.js'
import type { Theme } from '../src/theme-types.js'
import { minimalDark } from '../src/themes/minimalDark.js'

// ── O nome da comarca ──

const REXION: RegionSpec = { id: 'r', label: 'A XEADA', tag: 'xeada', color: '#4a7fa8' }
const NODOS: NodeDef[] = [
  { id: 'a', type: 'small', label: 'a', tags: ['xeada'] } as NodeDef,
  { id: 'b', type: 'small', label: 'b', tags: ['xeada'] } as NodeDef,
]
const POS = new Map([
  ['a', { x: 0, y: 0 }],
  ['b', { x: 400, y: 300 }],
])

function rexions(regionLabel?: 'top' | 'center') {
  return render(
    <ThemeProvider theme={minimalDark}>
      <svg role="img" aria-label="proba">
        <SkillRegions
          regions={[REXION]}
          nodes={NODOS}
          nodePositions={POS}
          {...(regionLabel !== undefined && { regionLabel })}
        />
      </svg>
    </ThemeProvider>,
  )
}

describe('★ 19.8 — o nome da comarca', () => {
  it('por defecto vai pegado ao bordo de arriba (cero regresión)', () => {
    const { container } = rexions()
    const t = container.querySelector('.yf-skill-regions text')
    // Coa bbox de (0,0)-(400,300) e padding 32, o bordo superior é -32.
    expect(Number(t?.getAttribute('y'))).toBeLessThan(0)
  })

  it('★ `center` põeo no MEDIO da comarca', () => {
    const { container } = rexions('center')
    const t = container.querySelector('.yf-skill-regions text')
    // Centro vertical da bbox: (-32 + 332) / 2 = 150.
    expect(Number(t?.getAttribute('y'))).toBeCloseTo(150, 0)
  })

  it('★ 19.10: `top` tamén leva a COR DA COMARCA e escala co mapa', () => {
    // Antes ía sempre a 13 px e na cor do texto. Nun atlas de 1.100
    // unidades iso é unha etiqueta de UI perdida, e non dicía de que
    // comarca era. No mockup cada nome vai tinguido coma a súa terra.
    const t = rexions().container.querySelector<SVGElement>('.yf-skill-regions text')
    expect(t?.style.fill).toBe('#4a7fa8')
    // Bbox: 400 de ancho + 2×(16 de radio + 32 de padding) = 496.
    // 496 × 0.05 = 24,8, que topa no máximo de 24 — un nome de comarca
    // non debe competir co título do mapa.
    expect(Number.parseFloat(t?.style.fontSize ?? '0')).toBe(24)
  })

  it('★ 19.10: nun documento pequeno o tamaño non cambia (clamp inferior de 13)', () => {
    const { container } = render(
      <ThemeProvider theme={minimalDark}>
        <svg role="img" aria-label="proba">
          <SkillRegions
            regions={[REXION]}
            nodes={NODOS}
            nodePositions={
              new Map([
                ['a', { x: 0, y: 0 }],
                ['b', { x: 40, y: 30 }],
              ])
            }
          />
        </svg>
      </ThemeProvider>,
    )
    const t = container.querySelector<SVGElement>('.yf-skill-regions text')
    expect(Number.parseFloat(t?.style.fontSize ?? '0')).toBe(13)
  })

  it('★ `center` pinta máis grande que `top`: é rótulo de mapa, non etiqueta', () => {
    const arriba = rexions().container.querySelector<SVGElement>('.yf-skill-regions text')
    const medio = rexions('center').container.querySelector<SVGElement>('.yf-skill-regions text')
    expect(medio?.style.fill).toBe('#4a7fa8')
    expect(Number.parseFloat(medio?.style.fontSize ?? '0')).toBeGreaterThan(
      Number.parseFloat(arriba?.style.fontSize ?? '0'),
    )
  })

  it('vai DEBAIXO dos nodos: as rexións píntanse antes, así que non tapan', () => {
    // Contrato estrutural: o grupo de rexións existe e é o que leva o
    // rótulo; a orde de pintado gárdaa o SkillTree.
    const { container } = rexions('center')
    expect(container.querySelector('[data-testid="skill-regions"]')).not.toBeNull()
  })
})

// ── O marco ornamental ──

const tema = (ornateMinRadius?: number): Theme => ({
  ...minimalDark,
  sizes: { ...minimalDark.sizes, ...(ornateMinRadius !== undefined && { ornateMinRadius }) },
})

function nodo(size: number, ornateMinRadius?: number) {
  return render(
    <ThemeProvider theme={tema(ornateMinRadius)}>
      <svg role="img" aria-label="proba">
        <SkillNode
          node={{ id: 'n', type: 'keystone', label: 'N', size } as NodeDef}
          instance={undefined}
          position={{ x: 0, y: 0 }}
        />
      </svg>
    </ThemeProvider>,
  )
}

describe('★ 19.8 — o marco ornamental', () => {
  it('★ sen `ornateMinRadius` ningún nodo o leva (cero regresión)', () => {
    expect(nodo(40).container.querySelector(`.${ORNATE_CLASS}`)).toBeNull()
  })

  it('★ un nodo grande lévao; un pequeno non', () => {
    expect(nodo(40, 24).container.querySelector(`.${ORNATE_CLASS}`)).not.toBeNull()
    expect(nodo(13, 24).container.querySelector(`.${ORNATE_CLASS}`)).toBeNull()
  })

  it('★ o marco vai FÓRA do corpo e sen recheo: é un marco, non un borde', () => {
    const { container } = nodo(40, 24)
    const marco = container.querySelector<SVGElement>(`.${ORNATE_CLASS}`)
    expect(marco?.style.fill).toBe('none')
    // Mesma forma (hexágono en keystone) pero maior que o corpo.
    const corpo = container.querySelector('.yf-skill-node__shape')
    expect(marco?.tagName).toBe(corpo?.tagName)
  })

  it('★ clase propia: non dobra o pulso nin conta como un segundo shape', () => {
    const { container } = nodo(40, 24)
    expect(container.querySelectorAll('.yf-skill-node__shape')).toHaveLength(1)
  })
})
// ── FIN: tests dos ornamentos ──
