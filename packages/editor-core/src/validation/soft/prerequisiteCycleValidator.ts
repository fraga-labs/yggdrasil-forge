// ── INICIO: prerequisiteCycleValidator ──
// Aviso (NON-bloqueante) por nodos que **non se poden desbloquear
// nunca** porque os seus prerrequisitos dependen, directa ou
// indirectamente, deles mesmos.
//
// **Reescrito en 19.10.** A versión anterior construía un grafo
// «A → B se B aparece nas condicións de A» ACHATANDO `all`, `any` e
// `none`, e despois buscaba ciclos cun DFS de tres cores. Iso daba
// falsos positivos en canto un documento usaba un `any`: no atlas da
// galería, cada comarca é un anel de doce nodos onde cada un pide
// `any(porta, anterior)`. O anel é un ciclo formal, pero a porta é
// alternativa sempre dispoñible, así que ningún nodo queda bloqueado —
// e aínda así saltaban **72 avisos** sobre un documento correcto. Un
// aviso que berra en documentos sans ensina a ignorar os avisos.
//
// Semántica nova, a mesma que aplica o motor ao desbloquear
// (`UnlockResolver`): punto fixo de SATISFACIBILIDADE.
//
//   - Un nodo sen prerrequisitos é satisfacible.
//   - `all`: precisa que TODAS as condicións o sexan.
//   - `any`: abonda UNHA.
//   - `none`: sempre satisfacible — cúmprese NON desbloqueando, así
//     que pode condicionar a orde, nunca a alcanzabilidade.
//   - Condición que fala doutro nodo (`node_unlocked`, `node_maxed`,
//     `tier_min`, `progress_min`, `node_state`): precisa que ese nodo
//     sexa satisfacible.
//   - Condición que NON fala de nodos (`resource_min`, `stat_min`,
//     `time_after`…): satisfacible. É unha porta de recursos ou de
//     tempo, non de topoloxía, e este validador fala de topoloxía.
//
// Itérase ata que non se engade ningún nodo máis. Os que quedan fóra
// son os que nunca poderán abrirse: eses son os que se avisan.
//
// Consérvase o código `PREREQ_CYCLE` (hai consumidores que o miran) e
// a severidade `warning`, pero a mensaxe di o que de verdade pasa.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EditorDocument } from '../../document/EditorDocument.js'
import type { ValidationIssue, Validator } from '../Validator.js'

interface RegraMaybe {
  type?: string
  nodeId?: string
  conditions?: readonly RegraMaybe[]
}

/**
 * Avalía se unha regra se pode satisfacer dado o conxunto de nodos xa
 * considerados alcanzables.
 *
 * `undefined` (sen prerrequisitos) = satisfacible.
 */
function satisfacible(regra: unknown, alcanzables: ReadonlySet<string>): boolean {
  if (regra === null || regra === undefined || typeof regra !== 'object') return true
  const r = regra as RegraMaybe

  if (r.type === 'all') {
    return (r.conditions ?? []).every((c) => satisfacible(c, alcanzables))
  }
  if (r.type === 'any') {
    const cs = r.conditions ?? []
    // Un `any` sen condicións non se pode cumprir con nada: iso é un
    // documento roto, e o aviso é correcto.
    return cs.length > 0 && cs.some((c) => satisfacible(c, alcanzables))
  }
  if (r.type === 'none') {
    // Cúmprese NON desbloqueando. Nunca bloquea a alcanzabilidade.
    return true
  }
  // Folla: só condiciona se fala doutro NODO.
  if (typeof r.nodeId === 'string') return alcanzables.has(r.nodeId)
  return true
}

export const prerequisiteCycleValidator: Validator = (doc: EditorDocument) => {
  const nodos = doc.tree.nodes
  const existentes = new Set<string>(nodos.map((n) => n.id))
  const alcanzables = new Set<string>()

  // Punto fixo. Como máximo hai `n` roldas úteis (cada rolda engade
  // polo menos un nodo, ou remátase).
  for (let rolda = 0; rolda < nodos.length; rolda++) {
    let engadiu = false
    for (const n of nodos) {
      if (alcanzables.has(n.id)) continue
      if (satisfacible(n.prerequisites, alcanzables)) {
        alcanzables.add(n.id)
        engadiu = true
      }
    }
    if (!engadiu) break
  }

  const issues: ValidationIssue[] = []
  for (const id of existentes) {
    if (alcanzables.has(id)) continue
    const message: LocalizedString = {
      gl: `o nodo '${id}' non se poderá desbloquear nunca: os seus prerrequisitos dependen del mesmo`,
      en: `node '${id}' can never be unlocked: its prerequisites depend on itself`,
    }
    issues.push({ severity: 'warning', code: 'PREREQ_CYCLE', message, nodeId: id })
  }
  return issues
}
// ── FIN: prerequisiteCycleValidator ──
