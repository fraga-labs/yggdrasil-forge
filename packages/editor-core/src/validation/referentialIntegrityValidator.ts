// ── INICIO: referentialIntegrityValidator ──
// Cada referencia a un nodo desde outro elemento (aresta source/target,
// prerequisite.nodeId, exclusion) debe apuntar a un nodo que **existe**
// no propio TreeDef. As referencias dangling son corrupción de modelo
// → BLOQUEAR.
//
// O schema do motor xa testa algunhas destas (cross-node 2.5 #7-#10
// segundo o comentario en treeDefSchema), pero ter unha versión LOCAL
// dá feedback máis específico (id concreto + tipo de referencia que
// fallou). É unha rede de seguridade redundante con structuralValidator,
// non un substituto.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EditorDocument } from '../document/EditorDocument.js'
import type { ValidationIssue, Validator } from './Validator.js'

interface PrereqMaybe {
  type?: string
  nodeId?: string
  conditions?: readonly { nodeId?: string; conditions?: readonly PrereqMaybe[] }[]
}

/**
 * Camiña un tree de prerequisitos (composable: 'all_of'/'any_of') e
 * extrae todos os ids referenciados. Tolerante a formas — só lle
 * importa atopar `nodeId` en calquera profundidade.
 */
function collectPrereqNodeIds(prereq: unknown, out: string[]): void {
  if (prereq === null || prereq === undefined || typeof prereq !== 'object') return
  const p = prereq as PrereqMaybe
  if (typeof p.nodeId === 'string') out.push(p.nodeId)
  if (Array.isArray(p.conditions)) {
    for (const c of p.conditions) collectPrereqNodeIds(c, out)
  }
}

export const referentialIntegrityValidator: Validator = (doc: EditorDocument) => {
  const issues: ValidationIssue[] = []
  const nodeIds = new Set<string>(doc.tree.nodes.map((n) => n.id))

  // Arestas: source/target deben existir.
  for (const edge of doc.tree.edges) {
    if (!nodeIds.has(edge.source)) {
      const message: LocalizedString = {
        en: `edge '${edge.id}' has dangling source '${edge.source}'`,
        gl: `a aresta '${edge.id}' sae dun nodo inexistente: '${edge.source}'`,
      }
      issues.push({
        severity: 'error',
        code: 'YGG_ED_DANGLING_EDGE_SOURCE',
        message,
        edgeId: edge.id,
      })
    }
    if (!nodeIds.has(edge.target)) {
      const message: LocalizedString = {
        en: `edge '${edge.id}' has dangling target '${edge.target}'`,
        gl: `a aresta '${edge.id}' apunta a un nodo inexistente: '${edge.target}'`,
      }
      issues.push({
        severity: 'error',
        code: 'YGG_ED_DANGLING_EDGE_TARGET',
        message,
        edgeId: edge.id,
      })
    }
  }

  // Prerequisitos: nodeId referenciado en calquera profundidade.
  // Exclusións: o array `exclusions` ten ids directos.
  for (const node of doc.tree.nodes) {
    const prereqIds: string[] = []
    collectPrereqNodeIds(node.prerequisites, prereqIds)
    for (const ref of prereqIds) {
      if (!nodeIds.has(ref)) {
        const message: LocalizedString = {
          en: `node '${node.id}' has dangling prerequisite '${ref}'`,
          gl: `o nodo '${node.id}' ten un prerrequisito cara a un nodo inexistente: '${ref}'`,
        }
        issues.push({
          severity: 'error',
          code: 'YGG_ED_DANGLING_PREREQ',
          message,
          nodeId: node.id,
        })
      }
    }
    const exclusions = node.exclusions
    if (exclusions !== undefined) {
      for (const ref of exclusions) {
        if (!nodeIds.has(ref)) {
          const message: LocalizedString = {
            en: `node '${node.id}' has dangling exclusion '${ref}'`,
            gl: `o nodo '${node.id}' exclúe un nodo inexistente: '${ref}'`,
          }
          issues.push({
            severity: 'error',
            code: 'YGG_ED_DANGLING_EXCLUSION',
            message,
            nodeId: node.id,
          })
        }
      }
    }
  }

  return issues
}
// ── FIN: referentialIntegrityValidator ──
