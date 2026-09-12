// ── INICIO: tests de LEXIBILIDADE (19.10) ──
// Tres arranxos que veñen de mirar o render do atlas da galería contra o
// mockup fundacional. Os tres tiñan probas verdes e aínda así o debuxo
// estaba mal, así que aquí fíxase o que se ve, non o que se chama:
//
//   1. Os nodos grandes pintan ENRIBA. En SVG non hai z-index: manda a
//      orde do documento, e un nodo pequeno emitido despois tapáballe o
//      rótulo a un grande («Mestre de Ribeira» saía cortado).
//   2. O rótulo leva HALO da cor do fondo, para lerse sobre arestas e
//      tintes de comarca.
//   3. A táboa de radios é UNHA: `core` é a fonte e `react` reexpórtaa.
//      Dúas copias sincronizadas a man é como o motor quedou cego ao
//      tamaño dos nodos.

import { render } from '@testing-library/react'
import {
  DEFAULT_RADIUS_BY_TYPE as RADIOS_CORE,
  type TreeDef,
  TreeEngine,
  resolveRadius as resolveRadiusCore,
} from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { SkillTree } from '../src/SkillTree.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { DEFAULT_RADIUS_BY_TYPE, resolveRadius } from '../src/nodeGeometry.js'
import type { Theme } from '../src/theme-types.js'
import { minimal } from '../src/themes/minimal.js'
import { minimalDark } from '../src/themes/minimalDark.js'

// ── 1. Orde de pintado ──

/**
 * Árbore co nodo GRANDE declarado PRIMEIRO — a orde que rompía o
 * debuxo, porque os pequenos emitidos despois caíanlle enriba.
 */
function arboreConGrande(): TreeDef {
  return {
    id: 'orde',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Orde',
    nodes: [
      { id: 'grande', type: 'ascendancy', label: 'Grande', size: 44 },
      { id: 'p1', type: 'small', label: 'p1', size: 15 },
      { id: 'p2', type: 'small', label: 'p2', size: 15 },
    ],
    edges: [
      { id: 'e1', source: 'grande', target: 'p1', type: 'dependency' },
      { id: 'e2', source: 'p1', target: 'p2', type: 'dependency' },
    ],
    layout: { type: 'radial', radius: 120 },
  } as unknown as TreeDef
}

const ids = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('[data-node-id]')].map((e) => e.getAttribute('data-node-id') ?? '')

describe('★ 19.10 — os nodos grandes pintan ENRIBA', () => {
  it('★★ o grande vai ao FINAL do markup, aínda que no documento vaia primeiro', () => {
    const { container } = render(<SkillTree engine={new TreeEngine(arboreConGrande())} />)
    const orde = ids(container)
    expect(orde[0]).not.toBe('grande')
    expect(orde[orde.length - 1]).toBe('grande')
  })

  it('★ a orde final é por radio ascendente (o fito enriba de todo)', () => {
    const { container } = render(<SkillTree engine={new TreeEngine(arboreConGrande())} />)
    expect(ids(container)).toEqual(['p1', 'p2', 'grande'])
  })

  it('★★ entre iguais pinta de ABAIXO a ARRIBA: o de abaixo non tapa o rótulo do de arriba', () => {
    // O rótulo colga por debaixo do nodo, así que o veciño de abaixo é
    // quen llo come. Defecto visto na ficha `gaia-cards`, con «Dubhe»
    // cortado polo nodo «Merak», que está xusto debaixo.
    const tree = {
      id: 'vertical',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'V',
      nodes: [
        { id: 'arriba', type: 'small', label: 'Arriba', size: 16, position: { x: 0, y: 0 } },
        { id: 'abaixo', type: 'small', label: 'Abaixo', size: 16, position: { x: 8, y: 40 } },
      ],
      edges: [{ id: 'e', source: 'arriba', target: 'abaixo', type: 'dependency' }],
      layout: { type: 'custom' },
    } as unknown as TreeDef
    const { container } = render(<SkillTree engine={new TreeEngine(tree)} />)
    // `abaixo` primeiro; así o rótulo de `arriba` píntase despois e gaña.
    expect(ids(container)).toEqual(['abaixo', 'arriba'])
  })

  it('con radio e y iguais consérvase a orde do documento (render determinista)', () => {
    const tree = {
      id: 'empate',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'E',
      nodes: [
        { id: 'un', type: 'small', label: 'un', size: 16, position: { x: 0, y: 0 } },
        { id: 'dous', type: 'small', label: 'dous', size: 16, position: { x: 60, y: 0 } },
      ],
      edges: [],
      layout: { type: 'custom' },
    } as unknown as TreeDef
    const { container } = render(<SkillTree engine={new TreeEngine(tree)} />)
    expect(ids(container)).toEqual(['un', 'dous'])
  })

  it('entre nodos do MESMO radio a orde é estable (render determinista)', () => {
    const { container } = render(<SkillTree engine={new TreeEngine(arboreConGrande())} />)
    const orde = ids(container)
    expect(orde.indexOf('p1')).toBeLessThan(orde.indexOf('p2'))
  })
})

// ── 2. O halo do rótulo ──

function nodoConRotulo(): HTMLElement {
  const { container } = render(
    <ThemeProvider theme={minimalDark}>
      <svg role="img" aria-label="proba">
        <SkillNode
          node={{ id: 'n', type: 'keystone', label: 'Mestre de Temporais', size: 30 } as never}
          instance={undefined}
          position={{ x: 0, y: 0 }}
        />
      </svg>
    </ThemeProvider>,
  )
  return container
}

describe('★ 19.10 — o rótulo lese sempre: halo da cor do fondo', () => {
  it('★★ o texto leva trazo da cor do lenzo pintado por debaixo do recheo', () => {
    const t = nodoConRotulo().querySelector<SVGElement>('.yf-skill-node__label')
    // `paint-order: stroke` é o que fai que o trazo non engorde o glifo:
    // píntase primeiro e o recheo tápalle o interior.
    expect(t?.style.paintOrder).toBe('stroke')
    expect(Number.parseFloat(t?.style.strokeWidth ?? '0')).toBeGreaterThan(0)
  })

  it('★★ NINGÚN tema base define `background`: sen fallback o halo sería código morto', () => {
    // Esta é a proba que faltaba no 19.0 co `nodeStroke`. Se algún día
    // os temas base pasan a traer `background`, este test avisa de que
    // a rama de fallback xa non é a que se exercita.
    expect(minimalDark.colors.background).toBeUndefined()
    expect(minimal.colors.background).toBeUndefined()
    const t = nodoConRotulo().querySelector<SVGElement>('.yf-skill-node__label')
    expect(t?.style.stroke).toBe(minimalDark.colors.mesh)
  })

  it('★ cando o DOCUMENTO declara `background`, o halo é esa cor', () => {
    const tema: Theme = {
      ...minimalDark,
      colors: { ...minimalDark.colors, background: '#14151a' },
    }
    const { container } = render(
      <ThemeProvider theme={tema}>
        <svg role="img" aria-label="proba">
          <SkillNode
            node={{ id: 'n', type: 'keystone', label: 'Mestre', size: 30 } as never}
            instance={undefined}
            position={{ x: 0, y: 0 }}
          />
        </svg>
      </ThemeProvider>,
    )
    const t = container.querySelector<SVGElement>('.yf-skill-node__label')
    expect(t?.style.stroke).toBe('#14151a')
  })

  it('★ o halo vai SÓ no texto de fóra do nodo, non no que vai dentro do corpo', () => {
    const { container } = render(
      <ThemeProvider theme={minimalDark}>
        <svg role="img" aria-label="proba">
          <SkillNode
            node={{ id: 'n', type: 'keystone', label: 'N', size: 30, icon: '★' } as never}
            instance={undefined}
            position={{ x: 0, y: 0 }}
          />
        </svg>
      </ThemeProvider>,
    )
    // Inventario, non un selector concreto: o que se fixa é que ningún
    // outro elemento do nodo colleu halo por arrastre do `labelStyle`.
    const conHalo = [...container.querySelectorAll<SVGElement>('*')]
      // En jsdom `paintOrder` devolve `undefined` cando non se
      // declarou (non coñece a propiedade), así que compárase por
      // verdadeiro e non contra a cadea baleira.
      .filter((e) => Boolean(e.style.paintOrder))
      .map((e) => e.getAttribute('class'))
    expect(conHalo).toEqual(['yf-skill-node__label'])
  })

  it('sen tema non se inventa halo (nin peta)', () => {
    const { container } = render(
      <svg role="img" aria-label="proba">
        <SkillNode
          node={{ id: 'n', type: 'keystone', label: 'N', size: 30 } as never}
          instance={undefined}
          position={{ x: 0, y: 0 }}
        />
      </svg>,
    )
    const t = container.querySelector<SVGElement>('.yf-skill-node__label')
    expect(t?.style.stroke).toBe('')
  })
})

// ── 3. Unha soa táboa de radios ──

describe('★ 19.10 — o radio do nodo ten UNHA fonte da verdade', () => {
  it('★★ `react` reexporta a función de `core`: non é unha copia', () => {
    expect(resolveRadius).toBe(resolveRadiusCore)
    expect(DEFAULT_RADIUS_BY_TYPE).toBe(RADIOS_CORE)
  })

  it('`size` manda sobre o tipo, e é un RADIO absoluto', () => {
    expect(resolveRadius({ type: 'small', size: 44 } as never)).toBe(44)
    expect(resolveRadius({ type: 'small' } as never)).toBe(RADIOS_CORE.small)
  })
})
// ── FIN: tests de lexibilidade ──
