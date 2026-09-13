// ── INICIO: a que documentos se lle poden aplicar estas regras (19.11) ──
// As nove regras deste paquete asumen unha ÁRBORE ENRAIZADA E ACÍCLICA.
// Iso non estaba dito en ningures, e nótase ao correlas sobre a galería
// de ouro do propio proxecto: 244 issues en nove documentos, con **11
// errores** no atlas, que é o documento insignia e é correcto.
//
// Non se cambia a semántica de ningunha regra aquí: iso é unha decisión
// de produto. O que se fai é **fixar por escrito** o que fan, para que
// quen as rexistre saiba o que está a pedir e para que un cambio futuro
// sexa deliberado e non un accidente.

import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { ValidatorEngine } from '../src/ValidatorEngine.js'
import {
  allReachableFromRootRule,
  balancedBranchesRule,
  noCyclesRule,
  noDeadEndsRule,
  noRedundantPrerequisitesRule,
  progressiveDifficultyRule,
} from '../src/rules.js'
import type { ValidationRule } from '../src/types.js'

/** Cadea a → b → c. Sen `rootNodeId`, como TODA a galería de ouro. */
function cadea(rootNodeId?: string): TreeDef {
  return {
    id: 'cadea',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Cadea' },
    nodes: [
      { id: 'a', type: 'small', label: { gl: 'a' } },
      { id: 'b', type: 'small', label: { gl: 'b' } },
      { id: 'c', type: 'small', label: { gl: 'c' } },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
      { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
    ],
    ...(rootNodeId !== undefined && { rootNodeId }),
  } as unknown as TreeDef
}

/** Anel pechado de catro: a forma dunha comarca do atlas. */
function anel(): TreeDef {
  return {
    id: 'anel',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Anel' },
    nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, type: 'small', label: { gl: id } })),
    edges: ['a', 'b', 'c', 'd'].map((id, i, todos) => ({
      id: `e-${id}`,
      source: id,
      target: todos[(i + 1) % todos.length],
      type: 'dependency',
    })),
  } as unknown as TreeDef
}

async function correr(regras: readonly ValidationRule[], tree: TreeDef) {
  const eng = new ValidatorEngine()
  for (const r of regras) eng.registerRule(r)
  return eng.validate(tree)
}

describe('★ 19.11 — tres regras non se aplican sen `rootNodeId`', () => {
  const GATEADAS = [allReachableFromRootRule, progressiveDifficultyRule, balancedBranchesRule(0)]

  it('★★ sen `rootNodeId` devolven LIMPO, e limpo aquí significa «non mirei»', () => {
    // Isto é o que pasa en toda a galería de ouro: ningún dos nove
    // documentos declara `rootNodeId`, así que estas tres regras nunca
    // dispararon nin unha vez. Cero issues, pero non por estaren ben os
    // documentos: por non correr.
    const tree = cadea()
    expect(tree.rootNodeId).toBeUndefined()
    for (const regra of GATEADAS) {
      expect(regra.validate(tree), `${regra.id} debería ser inaplicable`).toEqual([])
    }
  })

  it('★★ e en canto se declara, espertan', () => {
    // A proba de que o silencio era o gate e non a saúde do documento:
    // co mesmo grafo e un `rootNodeId` que non chega a todo, sae o erro.
    const tree = cadea('c')
    const issues = allReachableFromRootRule.validate(tree)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]?.severity).toBe('error')
  })
})

/** Triángulo a→b, b→c, a→c: o atallo `a→c` ten camiño alternativo. */
function triangulo(): TreeDef {
  return {
    id: 'tri',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Tri' },
    nodes: ['a', 'b', 'c'].map((id) => ({ id, type: 'small', label: { gl: id } })),
    edges: [
      { id: 'ab', source: 'a', target: 'b', type: 'dependency' },
      { id: 'bc', source: 'b', target: 'c', type: 'dependency' },
      { id: 'ac', source: 'a', target: 'c', type: 'dependency' },
    ],
  } as unknown as TreeDef
}

describe('★ 19.11 — as regras asumen un DAG enraizado', () => {
  it('★★ un anel pechado dá ERRO de ciclo, e unha comarca do atlas é un anel', () => {
    // O xerador do atlas constrúe cada comarca como «unha tea pechada»:
    // os ciclos son o deseño, non un defecto. E `no_cycles` é severity
    // `error`, así que sobre o atlas dá 11 ERROS nun documento correcto.
    const issues = noCyclesRule.validate(anel())
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]?.severity).toBe('error')
  })

  it('★ `no_redundant_prerequisites` marca o atallo cando hai camiño longo', () => {
    // A regra fai exactamente o que di, e faino ben: `a→c` sobra porque
    // xa hai `a→b→c`. O que hai que saber é o que iso implica nunha
    // MALLA: no atlas son 102 arestas de 174, porque nunha tea densa
    // case toda aresta ten alternativa. A redundancia é o punto dunha
    // malla, non un defecto dela.
    //
    // (Un anel dirixido simple NON dá redundancias, ao contrario do que
    // eu supuxera antes de medilo: quitando `a→b` xa non hai xeito de
    // ir de `a` a `b`. As do atlas veñen das cordas.)
    const issues = noRedundantPrerequisitesRule.validate(triangulo())
    expect(issues.map((i) => i.edgeId)).toEqual(['ac'])
    expect(noRedundantPrerequisitesRule.validate(anel())).toEqual([])
  })
})

describe('★ 19.11 — `no_dead_ends` marca TODAS as follas', () => {
  it('★★ nunha cadea a → b → c avisa de `c`, que é unha folla normal', () => {
    // Dito así parece obvio, e é exactamente o problema: como toda
    // árbore ten follas, esta regra avisa en TODOS os documentos da
    // galería, incluído `minimal.json`, que ten dous nodos. 27 avisos en
    // nove documentos. Unha regra que berra nos documentos sans ensina a
    // ignorar os avisos.
    const issues = noDeadEndsRule.validate(cadea())
    expect(issues.map((i) => i.nodeId)).toEqual(['c'])
  })

  it('a exención de raíz só funciona se o documento declara `rootNodeId`', () => {
    // `if (node.id === treeDef.rootNodeId) continue` — e como ningún
    // documento da galería o declara, a exención non se aplica nunca.
    const conRaiz = noDeadEndsRule.validate(cadea('c'))
    expect(conRaiz).toEqual([])
  })
})

describe('o motor', () => {
  it('conta por severidade e `hasErrors` segue os errores', async () => {
    const rep = await correr([noCyclesRule, noDeadEndsRule], anel())
    expect(rep.hasErrors).toBe(true)
    expect(rep.errorCount + rep.warningCount + rep.infoCount).toBe(rep.issues.length)
  })
})
// ── FIN: aplicabilidade ──
