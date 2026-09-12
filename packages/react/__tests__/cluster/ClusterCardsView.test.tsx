// ── INICIO: tests ClusterCardsView (render + interaccións) ──
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ClusterCardsView,
  type ClusterGroup,
  listaQueRola,
} from '../../src/cluster/ClusterCardsView.js'

function makeGroups(): ClusterGroup[] {
  return [
    {
      id: 'g1',
      label: 'GRUPO 1',
      color: '#aabbcc',
      members: [
        { id: 'g1-a', label: 'Item A', currentTier: 0, maxTier: 3 },
        { id: 'g1-b', label: 'Item B', currentTier: 1, maxTier: 3 },
        { id: 'g1-c', label: 'Item C', currentTier: 3, maxTier: 3 },
      ],
    },
    {
      id: 'g2',
      label: 'GRUPO 2',
      color: '#ccbbaa',
      members: [{ id: 'g2-a', label: 'Item D', currentTier: 0, maxTier: 1 }],
    },
  ]
}

describe('ClusterCardsView — render', () => {
  it('renderiza unha tarxeta por grupo coas filas correspondentes', () => {
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />)
    const cards = container.querySelectorAll('.yf-cluster-card')
    expect(cards.length).toBe(2)
    const rows = container.querySelectorAll('.yf-cluster-row')
    expect(rows.length).toBe(4)
  })

  it('estados das filas: done/actual/locked aplican modificadores', () => {
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />)
    expect(container.querySelectorAll('.yf-cluster-row--locked').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.yf-cluster-row--actual').length).toBe(1)
    expect(container.querySelectorAll('.yf-cluster-row--done').length).toBe(1)
  })

  it('selectedNodeId aplica yf-cluster-row--selected', () => {
    const { container } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} selectedNodeId="g1-b" />,
    )
    const selected = container.querySelectorAll('.yf-cluster-row--selected')
    expect(selected.length).toBe(1)
  })

  it('click nunha fila chama onRowClick co id do membro', () => {
    const onClick = vi.fn()
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={onClick} />)
    const firstButton = container.querySelector(
      '.yf-cluster-row__button',
    ) as HTMLButtonElement | null
    expect(firstButton).not.toBeNull()
    if (firstButton === null) return
    fireEvent.click(firstButton)
    expect(onClick).toHaveBeenCalledWith('g1-a')
  })

  it('crown: renderízase só se hai crownLabel ou crownIcon', () => {
    const { container: noCrown } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />,
    )
    expect(noCrown.querySelector('.yf-cluster-crown')).toBeNull()

    const { container: withCrown } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} crownLabel="Centro" />,
    )
    expect(withCrown.querySelector('.yf-cluster-crown')).not.toBeNull()
    expect(withCrown.querySelector('.yf-cluster-crown__label')?.textContent).toBe('Centro')
  })

  it('positions: cando hai entrada para o groupId, úsase tal cal', () => {
    const { container } = render(
      <ClusterCardsView
        groups={makeGroups()}
        onRowClick={vi.fn()}
        positions={{ g1: { left: '10%', top: '20%' } }}
      />,
    )
    const cards = Array.from(container.querySelectorAll('.yf-cluster-card')) as HTMLElement[]
    // Primeira tarxeta = g1 (mesma orde que makeGroups)
    const g1 = cards[0]
    expect(g1?.style.left).toBe('10%')
    expect(g1?.style.top).toBe('20%')
  })

  it('positions ausente: anel automático coloca os grupos arredor do centro', () => {
    const { container } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} autoRadiusPercent={30} />,
    )
    const cards = Array.from(container.querySelectorAll('.yf-cluster-card')) as HTMLElement[]
    // Co anel automático, ningunha tarxeta queda en 50%/50% (raio > 0).
    for (const card of cards) {
      const left = card.style.left
      const top = card.style.top
      expect(left).not.toBe('')
      expect(top).not.toBe('')
    }
    // O primeiro grupo arranca arriba (-π/2) → top < 50%.
    const first = cards[0]
    const topPercent = Number.parseFloat(first?.style.top.replace('%', '') ?? '0')
    expect(topPercent).toBeLessThan(50)
  })

  it('badge: ✓ se done, ct/mt se non', () => {
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />)
    const badges = Array.from(container.querySelectorAll('.yf-cluster-row__badge')).map(
      (b) => b.textContent,
    )
    expect(badges).toContain('0/3')
    expect(badges).toContain('1/3')
    expect(badges).toContain('✓') // g1-c (3/3) e g2-a (1/1)
  })
})
// ── 19.10: o anel automático non pode solapar tarxetas ──
//
// O anel ía a un 36% do CONTEDOR sen mirar canto miden as tarxetas. Nun
// panel de 700×439 iso dá un semi-eixe vertical de 158 px, e unha
// tarxeta de 16 membros mide uns 460: pisábanse. Vísteo abrindo o atlas
// da galería (sete grupos) na vista tarxetas do editor.

/** `n` grupos de `filas` membros cada un. */
function aneis(n: number, filas: number): ClusterGroup[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `g${i}`,
    label: `G${i}`,
    color: '#888888',
    members: Array.from({ length: filas }, (_, j) => ({
      id: `g${i}-${j}`,
      label: `m${j}`,
      currentTier: 0,
      maxTier: 1,
    })),
  }))
}

/** Centro de cada tarxeta en píxeles, lido do `calc(50% + Npx)`. */
function centros(container: HTMLElement): { x: number; y: number }[] {
  return [...container.querySelectorAll<HTMLElement>('.yf-cluster-card')].map((e) => {
    const px = (v: string): number => {
      // O navegador normaliza `calc(50% + -792px)` a `calc(50% - 792px)`,
      // así que hai que aceptar os dous signos.
      const m = /calc\(50% ([+-]) ([\d.]+)px\)/.exec(v)
      if (m === null) throw new Error(`esperábase calc(50% ± Npx), recibín «${v}»`)
      return (m[1] === '-' ? -1 : 1) * Number(m[2])
    }
    return { x: px(e.style.left), y: px(e.style.top) }
  })
}

describe('★ ClusterCardsView — o anel automático NON solapa', () => {
  const W = 280 + 24
  // Alto REAL: a lista tope en seis filas e o resto rola dentro (19.10).
  const alto = (filas: number): number => 46 + Math.min(filas, 6) * 26 + 24

  it('★★ sete grupos de dezaseis membros: cero pares solapados', () => {
    // O caso real: o atlas da galería no editor.
    const { container } = render(<ClusterCardsView groups={aneis(7, 16)} onRowClick={vi.fn()} />)
    const cs = centros(container)
    const h = alto(16)
    const malos: string[] = []
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i]
        const b = cs[j]
        if (a === undefined || b === undefined) continue
        if (Math.abs(a.x - b.x) < W && Math.abs(a.y - b.y) < h) malos.push(`${i}↔${j}`)
      }
    }
    expect(malos).toEqual([])
  })

  it('★ mantense de dous a doce grupos e con tarxetas de calquera alto', () => {
    for (const n of [2, 3, 5, 8, 12]) {
      for (const filas of [1, 6, 20]) {
        const { container, unmount } = render(
          <ClusterCardsView groups={aneis(n, filas)} onRowClick={vi.fn()} />,
        )
        const cs = centros(container)
        const h = alto(filas)
        for (let i = 0; i < cs.length; i++) {
          for (let j = i + 1; j < cs.length; j++) {
            const a = cs[i]
            const b = cs[j]
            if (a === undefined || b === undefined) continue
            const separadas = Math.abs(a.x - b.x) >= W || Math.abs(a.y - b.y) >= h
            expect(separadas, `n=${n} filas=${filas} ${i}↔${j}`).toBe(true)
          }
        }
        unmount()
      }
    }
  })

  it('★★ unha tarxeta longa TOPA en seis filas e a lista rola: nada se agocha', () => {
    // O tope é o que fai que o taboleiro caiba. Sen el, sete comarcas de
    // dezaseis membros piden 2.070 px de alto e non caben nin no panel
    // do editor nin maximizado.
    const { container } = render(<ClusterCardsView groups={aneis(3, 16)} onRowClick={vi.fn()} />)
    const lista = container.querySelector<HTMLElement>('.yf-cluster-card__rows')
    expect(lista?.style.maxHeight).toBe(`${6 * 26}px`)
    expect(lista?.style.overflowY).toBe('auto')
    expect(lista?.hasAttribute('data-yf-scroll')).toBe(true)
    // E seguen estando as dezaseis filas: o tope é de vista, non de dato.
    expect(container.querySelectorAll('.yf-cluster-row')).toHaveLength(3 * 16)
  })

  it('★ unha tarxeta curta non leva tope nin scroll (markup de máis é markup de máis)', () => {
    const { container } = render(<ClusterCardsView groups={aneis(3, 4)} onRowClick={vi.fn()} />)
    const lista = container.querySelector<HTMLElement>('.yf-cluster-card__rows')
    expect(lista?.style.maxHeight).toBe('')
    expect(lista?.hasAttribute('data-yf-scroll')).toBe(false)
  })

  it('★ con `autoRadiusPercent` explícito consérvase o comportamento vello (en %)', () => {
    // Compatibilidade: quen o pasaba segue mandando, aínda que solape.
    const { container } = render(
      <ClusterCardsView groups={aneis(7, 16)} autoRadiusPercent={36} onRowClick={vi.fn()} />,
    )
    const primeira = container.querySelector<HTMLElement>('.yf-cluster-card')
    expect(primeira?.style.left).toMatch(/%$/)
  })

  it('as posicións explícitas seguen gañando sobre o anel', () => {
    const { container } = render(
      <ClusterCardsView
        groups={aneis(3, 4)}
        positions={{ g0: { left: '10%', top: '20%' } }}
        onRowClick={vi.fn()}
      />,
    )
    const primeira = container.querySelector<HTMLElement>('.yf-cluster-card')
    expect(primeira?.style.left).toBe('10%')
    expect(primeira?.style.top).toBe('20%')
  })
})
// ── 19.10: a roda do rato entre a lista e o lenzo ──
//
// Unha tarxeta con máis de seis membros rola por dentro. Se a roda fixese
// zoom sempre, esa lista sería un cul-de-sac: ves que hai máis e non hai
// como chegar. E se rolase sempre, o zoom do lenzo morrería enriba das
// tarxetas. A regra é a de calquera scroll aniñado.

describe('★ listaQueRola — a roda decide ben', () => {
  /** Lista falsa cun estado de scroll concreto. */
  function lista(scrollTop: number, scrollHeight: number, clientHeight = 156): HTMLElement {
    const el = document.createElement('ul')
    el.setAttribute('data-yf-scroll', '')
    Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
    Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
    el.scrollTop = scrollTop
    document.body.appendChild(el)
    return el
  }

  it('★★ no medio da lista, a roda é da LISTA (nos dous sentidos)', () => {
    const el = lista(60, 416)
    expect(listaQueRola(el, 100)).toBe(el)
    expect(listaQueRola(el, -100)).toBe(el)
  })

  it('★★ ao final da lista, a roda cara abaixo pasa ao LENZO (non queda trabada)', () => {
    const el = lista(260, 416)
    expect(listaQueRola(el, 100)).toBeNull()
    // pero cara arriba aínda hai onde rolar
    expect(listaQueRola(el, -100)).toBe(el)
  })

  it('★ no principio, a roda cara arriba pasa ao lenzo', () => {
    const el = lista(0, 416)
    expect(listaQueRola(el, -100)).toBeNull()
    expect(listaQueRola(el, 100)).toBe(el)
  })

  it('unha lista que NON desborda nunca colle a roda', () => {
    const el = lista(0, 100, 156)
    expect(listaQueRola(el, 100)).toBeNull()
  })

  it('fóra dunha lista (ou sen alvo) manda o lenzo', () => {
    expect(listaQueRola(document.createElement('div'), 100)).toBeNull()
    expect(listaQueRola(null, 100)).toBeNull()
  })

  it('funciona desde un fillo: o botón da fila está DENTRO da lista', () => {
    const el = lista(60, 416)
    const boton = document.createElement('button')
    el.appendChild(boton)
    expect(listaQueRola(boton, 100)).toBe(el)
  })
})
// ── FIN: tests ClusterCardsView ──

// ── 17.2: paridade de iconas — os tres camiños da cela ──
describe('17.2 — RowIcon: IconDef | string, nunca descarte silencioso', () => {
  const DATA_URI = 'data:image/svg+xml;base64,PHN2Zy8+'

  function makeIconGroups(): ClusterGroup[] {
    return [
      {
        id: 'g1',
        label: 'ICONAS',
        color: '#aabbcc',
        members: [
          {
            id: 'glyph',
            label: 'Glyph',
            icon: { viewBox: '0 0 24 24', paths: [{ d: 'M4 4L20 20', mode: 'stroke' as const }] },
            currentTier: 0,
            maxTier: 1,
          },
          { id: 'foto', label: 'Foto', icon: DATA_URI, currentTier: 0, maxTier: 1 },
          { id: 'emoji', label: 'Emoji', icon: '🔥', currentTier: 0, maxTier: 1 },
        ],
      },
    ]
  }

  it('IconDef → glyph SVG (como sempre)', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const cell = container.querySelectorAll('.yf-cluster-row__icon')[0]
    expect(cell?.querySelector('svg path')?.getAttribute('d')).toBe('M4 4L20 20')
  })

  it('string-imaxe (data-URI) → <img> con src, alt da label e lazy', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const img = container.querySelectorAll('.yf-cluster-row__icon')[1]?.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe(DATA_URI)
    expect(img?.getAttribute('alt')).toBe('Foto')
    expect(img?.getAttribute('loading')).toBe('lazy')
  })

  it('string-URL http(s) → <img> (mesmo criterio F11.3 có SkillNode)', () => {
    const groups: ClusterGroup[] = [
      {
        id: 'g1',
        label: 'URL',
        color: '#aabbcc',
        members: [
          {
            id: 'u',
            label: 'Retrato',
            icon: 'https://example.test/cara.png',
            currentTier: 0,
            maxTier: 1,
          },
        ],
      },
    ]
    const { container } = render(<ClusterCardsView groups={groups} onRowClick={vi.fn()} />)
    expect(container.querySelector('.yf-cluster-row__icon img')?.getAttribute('src')).toBe(
      'https://example.test/cara.png',
    )
  })

  it('calquera outro string → texto/emoji (nunca null silencioso)', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const cell = container.querySelectorAll('.yf-cluster-row__icon')[2]
    expect(cell?.textContent).toBe('🔥')
    expect(cell?.querySelector('img')).toBeNull()
    expect(cell?.querySelector('svg')).toBeNull()
  })

  it('snapshot da fila cos tres camiños', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const cells = [...container.querySelectorAll('.yf-cluster-row__icon')].map((c) => c.innerHTML)
    expect(cells).toMatchSnapshot()
  })
})
// ── FIN 17.2 ──

// ── 17.8: a icona do GRUPO na cabeceira — os tres camiños ──
describe('17.8 — icona de grupo na cabeceira da tarxeta', () => {
  const DATA_URI = 'data:image/svg+xml;base64,PHN2Zy8+'
  const membro = { id: 'm', label: 'M', currentTier: 0, maxTier: 1 }

  function grupoCon(icon: ClusterGroup['icon']): ClusterGroup[] {
    return [{ id: 'g', label: 'GRUPO', color: '#aabbcc', icon, members: [membro] }]
  }

  it('IconDef → glyph SVG na cabeceira', () => {
    const { container } = render(
      <ClusterCardsView
        groups={grupoCon({
          viewBox: '0 0 24 24',
          paths: [{ d: 'M2 2L22 22', mode: 'stroke' as const }],
        })}
        onRowClick={vi.fn()}
      />,
    )
    expect(container.querySelector('.yf-cluster-card__icon svg path')?.getAttribute('d')).toBe(
      'M2 2L22 22',
    )
  })

  it('data-URI → <img> na cabeceira (o caso TUERCA)', () => {
    const { container } = render(
      <ClusterCardsView groups={grupoCon(DATA_URI)} onRowClick={vi.fn()} />,
    )
    const img = container.querySelector('.yf-cluster-card__icon img')
    expect(img?.getAttribute('src')).toBe(DATA_URI)
  })

  it('emoji → texto; e sen icona, cabeceira sen oco', () => {
    const { container } = render(<ClusterCardsView groups={grupoCon('🍞')} onRowClick={vi.fn()} />)
    expect(container.querySelector('.yf-cluster-card__icon')?.textContent).toBe('🍞')

    const { container: sen } = render(
      <ClusterCardsView
        groups={[{ id: 'g', label: 'G', color: '#abc', members: [membro] }]}
        onRowClick={vi.fn()}
      />,
    )
    expect(sen.querySelector('.yf-cluster-card__icon')).toBeNull()
  })
})
// ── FIN 17.8 ──
