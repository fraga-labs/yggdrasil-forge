// ── INICIO: layoutOverflowValidator ──
// Aviso (info, NON-bloqueante) por nodos fóra do `coordinateBounds`
// declarado no `meta`. É un sinal útil cando o autor está aliñando
// nodos cunha imaxe de fondo — un nodo fóra do box probablemente é
// un esquecido.
//
// Sen `coordinateBounds`: cero issues (non hai como medir overflow).
// Nodos sen `position`: ignóranse (layouts calculados).

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EditorDocument } from '../../document/EditorDocument.js'
import type { ValidationIssue, Validator } from '../Validator.js'

export const layoutOverflowValidator: Validator = (doc: EditorDocument) => {
  const bounds = doc.meta.coordinateBounds
  if (bounds === undefined) return []
  const issues: ValidationIssue[] = []
  for (const node of doc.tree.nodes) {
    const pos = node.position
    if (pos === undefined) continue
    if (pos.x < bounds.minX || pos.x > bounds.maxX || pos.y < bounds.minY || pos.y > bounds.maxY) {
      const message: LocalizedString = {
        en: `node '${node.id}' at (${pos.x}, ${pos.y}) is outside coordinateBounds (${bounds.minX},${bounds.minY})–(${bounds.maxX},${bounds.maxY})`,
        gl: `o nodo '${node.id}' en (${pos.x}, ${pos.y}) queda fóra de coordinateBounds (${bounds.minX},${bounds.minY})–(${bounds.maxX},${bounds.maxY})`,
      }
      issues.push({
        severity: 'info',
        code: 'LAYOUT_OVERFLOW',
        message,
        nodeId: node.id,
      })
    }
  }
  return issues
}
// ── FIN: layoutOverflowValidator ──
