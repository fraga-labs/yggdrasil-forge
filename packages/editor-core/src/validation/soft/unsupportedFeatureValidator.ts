// ── INICIO: unsupportedFeatureValidator ──
// ★ O consumidor principal do supportManifest no editor. Avisa cando
// un documento usa effects ou condicións que o motor NON aplicará.
//
// Razón do warning (non error): o documento PODE seguir editándose e
// seríase válido estructuralmente; só que ao executalo no motor,
// certos effects rebotarán con EFFECT_TYPE_UNSUPPORTED. O editor di
// "atención — o motor non vai facer isto".
//
// Detecta:
//   1. node.effects[*].type non está en supportManifest.effects.
//   2. UnlockConditions referenciadas en prerequisites cuxo .type
//      non está en supportManifest.conditions.
//
// Os composables (all/any/none) atravésanse recursivamente.

import type { LocalizedString } from '@yggdrasil-forge/common'
import { isConditionSupported, isEffectSupported } from '@yggdrasil-forge/core'
import type { EditorDocument } from '../../document/EditorDocument.js'
import type { ValidationIssue, Validator } from '../Validator.js'

interface MaybeTyped {
  type?: string
  conditions?: readonly MaybeTyped[]
  effects?: readonly MaybeTyped[]
}

/**
 * Camiña un composable de UnlockRule (all/any/none) e devolve todos
 * os tipos de condición simples atopados (os `type` das `UnlockCondition`).
 * Os wrappers `all`/`any`/`none` NON se inclúen — ignóranse, só nos
 * importan as condicións terminais.
 */
function collectConditionTypes(node: unknown, out: Set<string>): void {
  if (node === null || node === undefined || typeof node !== 'object') return
  const n = node as MaybeTyped
  if (typeof n.type === 'string') {
    // Wrapper composables: non son types de UnlockCondition, son UnlockRule.
    if (n.type === 'all' || n.type === 'any' || n.type === 'none') {
      // Camiñar dentro.
      if (Array.isArray(n.conditions)) {
        for (const c of n.conditions) collectConditionTypes(c, out)
      }
      return
    }
    // Condición terminal.
    out.add(n.type)
  }
  if (Array.isArray(n.conditions)) {
    for (const c of n.conditions) collectConditionTypes(c, out)
  }
}

/**
 * Camiña un composable de Effect (composite/conditional) e devolve
 * todos os tipos de Effect simples atopados.
 */
function collectEffectTypes(node: unknown, out: Set<string>): void {
  if (node === null || node === undefined || typeof node !== 'object') return
  const n = node as MaybeTyped
  if (typeof n.type === 'string') {
    out.add(n.type)
  }
  if (Array.isArray(n.effects)) {
    for (const e of n.effects) collectEffectTypes(e, out)
  }
}

export const unsupportedFeatureValidator: Validator = (doc: EditorDocument) => {
  const issues: ValidationIssue[] = []
  for (const node of doc.tree.nodes) {
    // 1. Effects: descender en composite/conditional.
    const effectTypes = new Set<string>()
    const effects = (node as { effects?: readonly unknown[] }).effects
    if (Array.isArray(effects)) {
      for (const e of effects) collectEffectTypes(e, effectTypes)
    }
    for (const t of effectTypes) {
      // Os wrappers composite/conditional son "soportados" como
      // estruturas; o que importa son os types DENTRO. Pero queremos
      // listar tamén os non soportados directamente; isEffectSupported
      // recoñece os 8 reais (modify_resource ... composite). Polo
      // tanto se composite/conditional aparecen aquí, son soportados;
      // se aparece modify_stat, non.
      if (!isEffectSupported(t)) {
        const message: LocalizedString = {
          en: `node '${node.id}' uses effect type '${t}' which this engine does not apply`,
          gl: `o nodo '${node.id}' usa un efecto de tipo '${t}' que este motor non aplica`,
        }
        issues.push({
          severity: 'warning',
          code: 'FEATURE_UNSUPPORTED',
          message,
          nodeId: node.id,
        })
      }
    }

    // 2. Prerequisites: descender en all/any/none.
    const conditionTypes = new Set<string>()
    collectConditionTypes(node.prerequisites, conditionTypes)
    for (const t of conditionTypes) {
      if (!isConditionSupported(t)) {
        const message: LocalizedString = {
          en: `node '${node.id}' uses prerequisite condition '${t}' which this engine does not evaluate`,
          gl: `o nodo '${node.id}' usa a condición '${t}', que este motor non avalía`,
        }
        issues.push({
          severity: 'warning',
          code: 'FEATURE_UNSUPPORTED',
          message,
          nodeId: node.id,
        })
      }
    }
  }
  return issues
}
// ── FIN: unsupportedFeatureValidator ──
