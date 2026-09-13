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
    //
    // A cor de proba é MÁIS CLARA que o tinte do resto do ficheiro a
    // propósito: #4a7fa8 ao 80% sobre este lenzo queda en 2,9:1 e o
    // xuízo de contraste levantaríao (con razón). Aquí próbase a
    // identidade, e iso pide unha cor que xa se lea.
    const clara: RegionSpec = { ...REXION, color: '#7fb2d8' }
    const { container } = render(
      <ThemeProvider theme={minimalDark}>
        <svg role="img" aria-label="proba">
          <SkillRegions regions={[clara]} nodes={NODOS} nodePositions={POS} />
        </svg>
      </ThemeProvider>,
    )
    const t = container.querySelector<SVGElement>('.yf-skill-regions text')
    expect(t?.style.fill).toBe('#7fb2d8')
    // Bbox: 400 de ancho + 2×(16 de radio + 32 de padding) = 496.
    // 496 × 0.05 = 24,8, que topa no máximo de 24 — un nome de comarca
    // non debe competir co título do mapa.
    expect(Number.parseFloat(t?.style.fontSize ?? '0')).toBe(24)
  })

  it('★★ 19.10: un tinte que NON se le sobre o lenzo corríxese no render', () => {
    // O camiño enteiro, non só o helper: unha rexión cun tinte escuro
    // sobre `minimalDark` ten que saír cunha cor distinta da declarada.
    // É a regresión que tiña o showcase gótico.
    const escura: RegionSpec = { id: 'r', label: 'CLAUSTRO', tag: 'xeada', color: '#3a2a2a' }
    const { container } = render(
      <ThemeProvider theme={minimalDark}>
        <svg role="img" aria-label="proba">
          <SkillRegions regions={[escura]} nodes={NODOS} nodePositions={POS} />
        </svg>
      </ThemeProvider>,
    )
    const t = container.querySelector<SVGElement>('.yf-skill-regions text')
    expect(t?.style.fill).not.toBe('#3a2a2a')
    // E o TINTE de fondo segue sendo o declarado: só se corrixe o texto.
    expect(container.querySelector('.yf-skill-regions rect')?.getAttribute('fill')).toBe('#3a2a2a')
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
// ── 19.11: o nome da comarca nunha TEA ──
// Ao xuntar as comarcas para que o atlas se lea como o tecido continuo
// do mockup, o bordo de arriba dunha comarca deixa de estar libre:
// pásao a ocupar a comarca de enriba. No atlas tapáronse dous dos seis
// nomes. O preset `atlas` xa deixa dito que `center` se probou e se
// rectificou (a malla enche o blob e o nome sae cortado), así que o
// sitio segue sendo o bordo: o que cambia é CAL dos bordos.

const AZUL = '#4a7fa8'

/** Dúas comarcas pegadas: a de abaixo ten o bordo de arriba ocupado. */
function duasPegadas() {
  const rexionsSpec: RegionSpec[] = [
    { id: 'arriba', label: 'A COSTA', tag: 'costa', color: AZUL },
    { id: 'abaixo', label: 'O MAR', tag: 'mar', color: AZUL },
  ]
  const nodos: NodeDef[] = [
    { id: 'a1', type: 'small', label: 'a1', tags: ['costa'] } as NodeDef,
    { id: 'a2', type: 'small', label: 'a2', tags: ['costa'] } as NodeDef,
    { id: 'a3', type: 'small', label: 'a3', tags: ['costa'] } as NodeDef,
    { id: 'b1', type: 'small', label: 'b1', tags: ['mar'] } as NodeDef,
    { id: 'b2', type: 'small', label: 'b2', tags: ['mar'] } as NodeDef,
  ]
  // `a3` é a peza que fai a proba: está no MEDIO do ancho e ao fondo de
  // `costa`, xusto onde `mar` poría o seu nome. Sen el —e así o
  // escribín a primeira vez— o bordo superior de `mar` queda libre, a
  // regra correcta é non mover nada, e a proba fallaba por ter razón.
  const pos = new Map([
    ['a1', { x: 0, y: 0 }],
    ['a2', { x: 300, y: 40 }],
    ['a3', { x: 150, y: 120 }],
    ['b1', { x: 0, y: 150 }],
    ['b2', { x: 300, y: 330 }],
  ])
  return render(
    <ThemeProvider theme={minimalDark}>
      <svg role="img" aria-label="proba">
        <SkillRegions regions={rexionsSpec} nodes={nodos} nodePositions={pos} />
      </svg>
    </ThemeProvider>,
  )
}

describe('★ 19.11 — o nome da comarca busca onde cabe', () => {
  it('★★ a comarca de abaixo NON pon o nome no bordo que lle ocupa a veciña', () => {
    const { container } = duasPegadas()
    const textos = [...container.querySelectorAll('.yf-skill-region')].map((g) => ({
      id: g.getAttribute('data-region-id'),
      y: Number(g.querySelector('text')?.getAttribute('y')),
    }))
    const arriba = textos.find((t) => t.id === 'arriba')
    const abaixo = textos.find((t) => t.id === 'abaixo')
    expect(arriba).toBeDefined()
    expect(abaixo).toBeDefined()
    // A de arriba queda onde sempre (bordo superior, por riba de y=0).
    expect(arriba?.y ?? 0).toBeLessThan(0)
    // A de abaixo NON pode quedar no seu bordo superior (y≈108), que é
    // onde están os corpos de `costa`: ten que baixar.
    expect(abaixo?.y ?? 0).toBeGreaterThan(200)
  })

  it('★ os dous nomes non acaban no mesmo sitio', () => {
    const { container } = duasPegadas()
    const ys = [...container.querySelectorAll('.yf-skill-region text')].map((t) =>
      Number(t.getAttribute('y')),
    )
    expect(ys).toHaveLength(2)
    expect(Math.abs((ys[0] ?? 0) - (ys[1] ?? 0))).toBeGreaterThan(40)
  })
})

// ── FIN: tests dos ornamentos ──
