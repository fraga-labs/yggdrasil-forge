// ── INICIO: tests do resplandor (19.7) ──
// Un glow non se pinta: fíltrase. Iso significa que teñen que casar DÚAS
// cousas — o `<filter>` no `<defs>` e o `filter="url(#…)"` do elemento —
// e que se non casan non hai erro ningún: simplemente non brilla. Estas
// probas fixan as dúas puntas.

import { render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillTree } from '../src/SkillTree.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { DEFAULT_GLOW_STATES, glowFilterId, glowRadiusOf, glowsForState } from '../src/glow.js'
import type { Theme } from '../src/theme-types.js'
import { minimalDark } from '../src/themes/minimalDark.js'

const tema = (effects?: Theme['effects']): Theme => ({
  ...minimalDark,
  ...(effects !== undefined && { effects }),
})

describe('glow — axudantes', () => {
  it('★ o id derívase do radio: as dúas puntas casan sen baixar props', () => {
    expect(glowFilterId(7)).toBe('yf-glow-70')
    expect(glowFilterId(2.5)).toBe('yf-glow-25')
    // Determinista: mesmo radio, mesmo id, servidor e cliente igual.
    expect(glowFilterId(7)).toBe(glowFilterId(7))
  })

  it('sen radio (ou 0) non hai resplandor', () => {
    expect(glowRadiusOf(tema())).toBeUndefined()
    expect(glowRadiusOf(tema({ glowRadius: 0 }))).toBeUndefined()
    expect(glowRadiusOf(tema({ glowRadius: 6 }))).toBe(6)
    expect(glowRadiusOf(null)).toBeUndefined()
  })

  it('★ por defecto brillan os tres estados VIVOS; os apagados non', () => {
    const t = tema({ glowRadius: 6 })
    expect(DEFAULT_GLOW_STATES).toEqual(['unlockable', 'unlocked', 'maxed'])
    for (const e of DEFAULT_GLOW_STATES) expect(glowsForState(t, e)).toBe(true)
    expect(glowsForState(t, 'locked')).toBe(false)
  })

  it('`glowStates` explícito manda (nun atlas hai que acender só o preciso)', () => {
    const t = tema({ glowRadius: 6, glowStates: ['maxed'] })
    expect(glowsForState(t, 'maxed')).toBe(true)
    expect(glowsForState(t, 'unlocked')).toBe(false)
  })
})

// ── Integración: o filtro e a referencia, xuntos ──

function arbore(): TreeDef {
  return {
    id: 'glow-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'T',
    resources: [{ id: 'p', label: 'P', initial: 5 }],
    nodes: [
      { id: 'a', type: 'small', label: 'A', position: { x: 0, y: 0 } },
      {
        id: 'b',
        type: 'small',
        label: 'B',
        position: { x: 120, y: 0 },
        prerequisites: { type: 'all', conditions: [{ type: 'node_unlocked', nodeId: 'a' }] },
      },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  } as unknown as TreeDef
}

async function pinta(effects?: Theme['effects'], abrir = false) {
  const engine = new TreeEngine(arbore())
  if (abrir) await engine.unlock('a')
  return render(
    <ThemeProvider theme={tema(effects)}>
      <SkillTree engine={engine} />
    </ThemeProvider>,
  )
}

describe('★ glow — o filtro e a referencia teñen que casar', () => {
  it('★ sen `effects`, NIN se emite o filtro: cero custo e cero regresión', async () => {
    const { container } = await pinta()
    expect(container.querySelector('filter')).toBeNull()
    expect(container.innerHTML).not.toContain('yf-glow')
  })

  it('★ con radio, o `<defs>` trae o filtro e algún nodo REFERÉNCIAO', async () => {
    const { container } = await pinta({ glowRadius: 6 })
    const filtro = container.querySelector('filter')
    expect(filtro?.getAttribute('id')).toBe(glowFilterId(6))
    // `feMerge` deixa o elemento nítido enriba do seu halo: sen iso o
    // nodo vese borroso en vez de aceso.
    expect(container.querySelector('feGaussianBlur')).not.toBeNull()
    expect(container.querySelector('feMerge')).not.toBeNull()
    // `a` non ten portas nin custo, así que o renderer derívao
    // `unlockable` (19.2) — e `unlockable` está nos estados por defecto.
    const usa = [...container.querySelectorAll<SVGElement>('svg *')].some((el) =>
      (el.style.filter ?? '').includes(glowFilterId(6)),
    )
    expect(usa).toBe(true)
  })

  it('★ un estado fóra de `glowStates` non referencia o filtro', async () => {
    // Só `maxed` brilla, e nesta árbore non hai ningún maxed.
    const { container } = await pinta({ glowRadius: 6, glowStates: ['maxed'] })
    const usa = [...container.querySelectorAll<SVGElement>('svg *')].some((el) =>
      (el.style.filter ?? '').includes('yf-glow'),
    )
    expect(usa).toBe(false)
  })

  it('★ as arestas só brillan ACESAS e só con `glowEdges`', async () => {
    const conta = (c: HTMLElement) =>
      [...c.querySelectorAll<SVGElement>('.yf-skill-edge')].filter((el) =>
        (el.style.filter ?? '').includes('yf-glow'),
      ).length

    // Aresta apagada (nada desbloqueado): non brilla nin pedíndoo.
    const apagada = await pinta({ glowRadius: 6, glowEdges: true })
    expect(conta(apagada.container)).toBe(0)

    // Acesa pero sen `glowEdges`: tampouco.
    const semPedir = await pinta({ glowRadius: 6 }, true)
    expect(conta(semPedir.container)).toBe(0)

    // Acesa e pedida: brilla.
    const acesa = await pinta({ glowRadius: 6, glowEdges: true }, true)
    expect(conta(acesa.container)).toBe(1)
  })
})
// ── FIN: tests do resplandor ──
