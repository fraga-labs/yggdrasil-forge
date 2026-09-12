// ── INICIO: tests do estado visual `unlockable` (19.2) ──
// `unlockable` NON é un estado que o motor garde: só o escribe se un
// documento o forza cun efecto `modify_node_state`. É unha PREGUNTA
// (`canUnlock`). Antes do 19.2 ninguén a facía ao pintar, así que o
// recheo `unlockable` do tema, o seu anel e o pulso de animations.ts
// eran tinta morta: o brillo do «seguinte paso» — a afordancia central
// dos mockups fundacionais — non saía nin no editor nin en `ygg render`.

import { render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { visualStateFor } from '../src/SkillNode.js'
import { SkillTree } from '../src/SkillTree.js'

describe('visualStateFor — 19.2', () => {
  it('locked + a resposta do motor → unlockable', () => {
    expect(visualStateFor('locked', 0, undefined, true)).toBe('unlockable')
  })

  it('★ sen resposta do motor, comportamento idéntico ao previo', () => {
    expect(visualStateFor('locked', 0, undefined)).toBe('locked')
    expect(visualStateFor('locked', 0, undefined, false)).toBe('locked')
  })

  it('★ só actúa sobre `locked`: un nodo xa aberto non volve a «prémeme»', () => {
    expect(visualStateFor('unlocked', 1, undefined, true)).toBe('unlocked')
    expect(visualStateFor('maxed', 3, 3, true)).toBe('maxed')
  })

  it('★ o multi-rango a medias segue gañando (é `in_progress`, non «prémeme»)', () => {
    expect(visualStateFor('unlocked', 2, 3, true)).toBe('in_progress')
  })
})

// ── Integración: o SkillTree é quen pregunta ──

function arbore(): TreeDef {
  return {
    id: 'unlockable-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'T',
    resources: [{ id: 'ouro', label: 'Ouro', initial: 1 }],
    nodes: [
      // Sen porta e pagable co inicial → o motor di que si.
      {
        id: 'aberta',
        type: 'small',
        label: 'Aberta',
        position: { x: 0, y: 0 },
        costPerTier: [[{ resourceId: 'ouro', amount: 1 }]],
      },
      // Pagable, pero detrás dunha porta que non se cumpriu.
      {
        id: 'con-porta',
        type: 'small',
        label: 'Con porta',
        position: { x: 100, y: 0 },
        costPerTier: [[{ resourceId: 'ouro', amount: 1 }]],
        prerequisites: { type: 'all', conditions: [{ type: 'node_unlocked', nodeId: 'aberta' }] },
      },
      // Sen porta, pero impagable co orzamento inicial.
      {
        id: 'cara',
        type: 'small',
        label: 'Cara',
        position: { x: 200, y: 0 },
        costPerTier: [[{ resourceId: 'ouro', amount: 99 }]],
      },
    ],
    edges: [{ id: 'e1', source: 'aberta', target: 'con-porta', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
}

function estadoVisual(container: HTMLElement, id: string): string | null {
  const el = container.querySelector(`[data-node-id="${id}"]`)
  return el?.getAttribute('data-visual-state') ?? null
}

describe('SkillTree — quen pregunta canUnlock (19.2)', () => {
  it('★ só o nodo que o motor deixa abrir agora se pinta unlockable', () => {
    const { container } = render(<SkillTree engine={new TreeEngine(arbore())} />)
    expect(estadoVisual(container, 'aberta')).toBe('unlockable')
    // Prerrequisito sen cumprir → segue bloqueado.
    expect(estadoVisual(container, 'con-porta')).toBe('locked')
    // ★ A afordabilidade tamén conta: `canUnlock` inclúea, así que un
    // nodo sen portas pero impagable NON brilla. Prometer o que non se
    // pode pagar sería mentir co mesmo coidado que calar.
    expect(estadoVisual(container, 'cara')).toBe('locked')
  })

  it('data-state segue levando o estado CRU do motor (contrato 1.0 intacto)', () => {
    const { container } = render(<SkillTree engine={new TreeEngine(arbore())} />)
    for (const id of ['aberta', 'con-porta', 'cara']) {
      expect(container.querySelector(`[data-node-id="${id}"]`)?.getAttribute('data-state')).toBe(
        'locked',
      )
    }
  })

  it('★ ao abrir un nodo, o brillo avanza ao seguinte', async () => {
    const engine = new TreeEngine(arbore())
    await engine.grantResource('ouro', 10)
    await engine.unlock('aberta')
    const { container } = render(<SkillTree engine={engine} />)
    expect(estadoVisual(container, 'aberta')).toBe('unlocked')
    expect(estadoVisual(container, 'con-porta')).toBe('unlockable')
  })
})
// ── FIN: tests unlockable ──
