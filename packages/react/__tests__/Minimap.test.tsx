// ── INICIO: tests do Minimap (19.9) ──
// A peza dos mockups que non tiña nin unha liña. O que hai que fixar non
// é que se pinte: é que o RECTÁNGULO DIGA A VERDADE. Un minimapa cun
// rectángulo que mente é peor que non ter minimapa.

import { fireEvent, render } from '@testing-library/react'
import type { Bounds, NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it, vi } from 'vitest'
import { Minimap, type ViewBoxRect } from '../src/Minimap.js'
import type { RegionSpec } from '../src/SkillRegions.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { minimalDark } from '../src/themes/minimalDark.js'

const BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 500 }
const VB: ViewBoxRect = { x: -50, y: -50, w: 1100, h: 600 }
const NODOS: NodeDef[] = [
  { id: 'a', type: 'small', label: 'a', tags: ['norte'] } as NodeDef,
  { id: 'b', type: 'small', label: 'b', tags: ['sur'] } as NodeDef,
  { id: 'c', type: 'small', label: 'c' } as NodeDef,
]
const POS = new Map([
  ['a', { x: 0, y: 0 }],
  ['b', { x: 1000, y: 500 }],
  ['c', { x: 500, y: 250 }],
])
const REXIONS: RegionSpec[] = [
  { id: 'r1', label: 'Norte', tag: 'norte', color: '#3f6f9f' },
  { id: 'r2', label: 'Sur', tag: 'sur', color: '#a84a3a' },
]

function pinta(
  props: Partial<React.ComponentProps<typeof Minimap>> = {},
): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={minimalDark}>
      <svg role="img" aria-label="proba">
        <Minimap
          nodes={NODOS}
          nodePositions={POS}
          bounds={BOUNDS}
          viewBox={VB}
          viewport={{ panX: 0, panY: 0, zoom: 1 }}
          {...props}
        />
      </svg>
    </ThemeProvider>,
  )
}

const rect = (c: HTMLElement) => c.querySelector('[data-testid="minimap-viewport"]')

describe('Minimap — o marco e os puntos', () => {
  it('un punto por nodo COLOCADO (os sen posición non inventan un)', () => {
    const { container } = pinta()
    // 3 círculos de nodo; o marco e o rectángulo son <rect>.
    expect(container.querySelectorAll('.yf-minimap circle')).toHaveLength(3)
    const { container: c2 } = pinta({ nodePositions: new Map([['a', { x: 0, y: 0 }]]) })
    expect(c2.querySelectorAll('.yf-minimap circle')).toHaveLength(1)
  })

  it('★ conserva o aspecto do documento: un mapa ancho dá un minimapa ancho', () => {
    const { container } = pinta()
    const marco = container.querySelector('.yf-minimap rect')
    const w = Number(marco?.getAttribute('width'))
    const h = Number(marco?.getAttribute('height'))
    // bounds 1000×500 → aspecto 2:1.
    expect(w / h).toBeCloseTo(2, 2)
  })

  it('os puntos toman a cor da súa comarca; os sen comarca, a do texto', () => {
    const { container } = pinta({ regions: REXIONS })
    const cores = [...container.querySelectorAll('.yf-minimap circle')].map((c) =>
      c.getAttribute('fill'),
    )
    expect(cores).toContain('#3f6f9f')
    expect(cores).toContain('#a84a3a')
  })

  it('bounds degenerados → non se pinta nada (nunca un marco baleiro)', () => {
    const { container } = pinta({ bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } })
    expect(container.querySelector('.yf-minimap')).toBeNull()
  })
})

describe('★ Minimap — o rectángulo ten que DICIR A VERDADE', () => {
  it('★★ sen zoom vese todo: o rectángulo enche o marco', () => {
    const { container } = pinta()
    const marco = container.querySelector('.yf-minimap rect')
    const r = rect(container)
    expect(Number(r?.getAttribute('width'))).toBeCloseTo(Number(marco?.getAttribute('width')), 1)
  })

  it('★★ ao dobrar o zoom, o rectángulo mide a METADE', () => {
    // Compáranse zoom 2 e 4 a propósito: a zoom 1 a xanela visible é
    // MAIOR que o marco (o viewBox leva padding), así que o rectángulo
    // recórtase e o cociente xa non sería exacto. O recorte é
    // deliberado — próbase no test seguinte.
    const dous = rect(pinta({ viewport: { panX: 0, panY: 0, zoom: 2 } }).container)
    const catro = rect(pinta({ viewport: { panX: 0, panY: 0, zoom: 4 } }).container)
    expect(Number(catro?.getAttribute('width'))).toBeCloseTo(
      Number(dous?.getAttribute('width')) / 2,
      1,
    )
  })

  it('★ o rectángulo recórtase ao marco: cun zoom menor que o encadre non se escapa', () => {
    const { container } = pinta({ viewport: { panX: 0, panY: 0, zoom: 0.3 } })
    const marco = container.querySelector('.yf-minimap rect')
    const r = rect(container)
    const mmX = Number(marco?.getAttribute('x'))
    const mmW = Number(marco?.getAttribute('width'))
    expect(Number(r?.getAttribute('x'))).toBeGreaterThanOrEqual(mmX - 0.01)
    expect(Number(r?.getAttribute('x')) + Number(r?.getAttribute('width'))).toBeLessThanOrEqual(
      mmX + mmW + 0.01,
    )
  })

  it('o pan móveo: desprazar o lenzo móve o rectángulo', () => {
    const quedo = rect(pinta().container)
    const movido = rect(pinta({ viewport: { panX: -200, panY: 0, zoom: 1 } }).container)
    expect(Number(movido?.getAttribute('x'))).not.toBeCloseTo(Number(quedo?.getAttribute('x')), 1)
  })
})

describe('★ Minimap — clic para ir alí', () => {
  it('★ o clic NON chega ao lenzo: se non, iniciaría un pan e sería inusable', () => {
    const onNavigate = vi.fn()
    const arriba = vi.fn()
    const { container } = render(
      <ThemeProvider theme={minimalDark}>
        <svg role="img" aria-label="proba" onPointerDown={arriba}>
          <Minimap
            nodes={NODOS}
            nodePositions={POS}
            bounds={BOUNDS}
            viewBox={VB}
            viewport={{ panX: 0, panY: 0, zoom: 1 }}
            onNavigate={onNavigate}
          />
        </svg>
      </ThemeProvider>,
    )
    const marco = container.querySelector('.yf-minimap rect')
    if (marco !== null) fireEvent.pointerDown(marco)
    expect(arriba).not.toHaveBeenCalled()
  })

  it('★ sen CTM (jsdom) non navega, pero TAMPOUCO peta', () => {
    const onNavigate = vi.fn()
    const { container } = pinta({ onNavigate })
    const marco = container.querySelector('.yf-minimap rect')
    expect(() => {
      if (marco !== null) fireEvent.pointerDown(marco)
    }).not.toThrow()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('★★ con CTM, o clic no CENTRO do minimapa dá o centro do documento', () => {
    const onNavigate = vi.fn()
    const { container } = pinta({ onNavigate })
    const marco = container.querySelector<SVGRectElement>('.yf-minimap rect')
    const svg = container.querySelector('svg')
    if (marco === null || svg === null) throw new Error('sen marco')

    // CTM identidade: as coordenadas de cliente son as do SVG.
    const identidade = {
      inverse: () => ({}) as DOMMatrix,
    } as unknown as DOMMatrix
    // biome-ignore lint/suspicious/noExplicitAny: sonda de CTM en jsdom
    ;(svg as any).getScreenCTM = () => identidade
    // biome-ignore lint/suspicious/noExplicitAny: sonda de CTM en jsdom
    ;(svg as any).createSVGPoint = () => ({
      x: 0,
      y: 0,
      matrixTransform(): { x: number; y: number } {
        // Devolve o centro do marco do minimapa.
        return {
          x: Number(marco.getAttribute('x')) + Number(marco.getAttribute('width')) / 2,
          y: Number(marco.getAttribute('y')) + Number(marco.getAttribute('height')) / 2,
        }
      },
    })

    fireEvent.pointerDown(marco, { clientX: 0, clientY: 0 })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    const [x, y] = onNavigate.mock.calls[0] ?? []
    // Centro de bounds 0..1000 × 0..500.
    expect(x).toBeCloseTo(500, 0)
    expect(y).toBeCloseTo(250, 0)
  })
})
// ── FIN: tests do Minimap ──
