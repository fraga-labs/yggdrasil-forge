// ── INICIO: asymmetricExclusionValidator ──
// Aviso (NON-bloqueante) por exclusións asimétricas (A.6.30).
//
// O runtime fai a exclusión simétrica automaticamente vía índice
// inverso (`getEffectiveExclusions(nodeId)`), polo que mesmo cun dato
// asimétrico o comportamento en simulación é correcto. Pero o DATO
// pode estar asimétrico, e iso é un sinal de bug do autor que merece
// aviso visible.
//
// Regra: para cada nodo A con `B ∈ A.exclusions`, comprobar que
// `A ∈ B.exclusions`. Se non, emitir un `warning`.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EditorDocument } from '../../document/EditorDocument.js'
import type { ValidationIssue, Validator } from '../Validator.js'

export const asymmetricExclusionValidator: Validator = (doc: EditorDocument) => {
  const issues: ValidationIssue[] = []
  // Índice: nodeId → set de exclusións declaradas dese nodo.
  const declared = new Map<string, Set<string>>()
  for (const node of doc.tree.nodes) {
    const ex = node.exclusions
    if (ex === undefined) continue
    declared.set(node.id, new Set(ex))
  }
  // Para cada A con B en exclusions, comprobar simetría.
  for (const [a, exclusions] of declared) {
    for (const b of exclusions) {
      const reverse = declared.get(b)
      if (reverse === undefined || !reverse.has(a)) {
        const message: LocalizedString = {
          en: `node '${a}' excludes '${b}', but '${b}' does not exclude '${a}' (asymmetric)`,
          gl: `o nodo '${a}' exclúe '${b}', pero '${b}' non exclúe '${a}' (asimétrica)`,
        }
        issues.push({
          severity: 'warning',
          code: 'EXCL_ASYMMETRIC',
          message,
          nodeId: a,
        })
      }
    }
  }
  return issues
}
// ── FIN: asymmetricExclusionValidator ──
