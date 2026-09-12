// ── INICIO: uniqueIdsValidator ──
// IDs duplicados detéctaos o schema do motor, pero unha
// implementación local de unicidade dá feedback máis específico
// (lista todos os ids que aparecen máis dunha vez, en lugar dun único
// erro xenérico do schema).
//
// É BLOQUEANTE: dous nodos co mesmo id é corrupción de modelo.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EditorDocument } from '../document/EditorDocument.js'
import type { ValidationIssue, Validator } from './Validator.js'

export const uniqueIdsValidator: Validator = (doc: EditorDocument) => {
  const issues: ValidationIssue[] = []

  // Nodos
  const nodeIdCounts = new Map<string, number>()
  for (const node of doc.tree.nodes) {
    nodeIdCounts.set(node.id, (nodeIdCounts.get(node.id) ?? 0) + 1)
  }
  for (const [id, count] of nodeIdCounts) {
    if (count > 1) {
      const message: LocalizedString = {
        en: `duplicate node id: '${id}' (appears ${count}x)`,
        gl: `id de nodo repetido: '${id}' (aparece ${count} veces)`,
      }
      issues.push({ severity: 'error', code: 'YGG_ED_DUP_NODE_ID', message, nodeId: id })
    }
  }

  // Arestas
  const edgeIdCounts = new Map<string, number>()
  for (const edge of doc.tree.edges) {
    edgeIdCounts.set(edge.id, (edgeIdCounts.get(edge.id) ?? 0) + 1)
  }
  for (const [id, count] of edgeIdCounts) {
    if (count > 1) {
      const message: LocalizedString = {
        en: `duplicate edge id: '${id}' (appears ${count}x)`,
        gl: `id de aresta repetido: '${id}' (aparece ${count} veces)`,
      }
      issues.push({ severity: 'error', code: 'YGG_ED_DUP_EDGE_ID', message, edgeId: id })
    }
  }

  return issues
}
// ── FIN: uniqueIdsValidator ──
