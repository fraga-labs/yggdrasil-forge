// ── INICIO: Unlock conditions and rules ──
// Sistema declarativo de prerrequisitos: condicións atómicas + combinacións.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeState } from './node.js'
import type { Cost } from './resources.js'

/**
 * Condición atómica para desbloquear un nodo.
 *
 * Cada condición avalíase contra o estado actual da árbore.
 * As condicións combínanse mediante UnlockRule (AND, OR, NOT).
 *
 * Tipos:
 *
 * - `node_unlocked` — Outro nodo está unlocked/maxed
 * - `node_maxed` — Outro nodo está maxed
 * - `node_state` — Outro nodo está nun estado concreto
 * - `nodes_count` — N nodos están unlocked en total (ou nun scope)
 * - `resource_min` — Un recurso ten polo menos X
 * - `tier_min` — Outro nodo está en tier ≥ X
 * - `distance_max` — Este nodo está a ≤ N steps doutro (estilo PoE)
 * - `tag_count` — Hai N nodos cunha tag concreta unlocked
 * - `progress_min` — Outro nodo ten progreso ≥ X%
 * - `subtree_completion` — Unha sub-árbore está completa en ≥ X%
 * - `stat_min` — Un stat global é ≥ X
 * - `time_after` — Pasou o timestamp X (UTC ms)
 * - `time_before` — Aínda non pasou o timestamp X
 * - `custom` — Avaliador rexistrado polo usuario
 */
export type UnlockCondition =
  | { readonly type: 'node_unlocked'; readonly nodeId: string }
  | { readonly type: 'node_maxed'; readonly nodeId: string }
  | { readonly type: 'node_state'; readonly nodeId: string; readonly state: NodeState }
  | { readonly type: 'nodes_count'; readonly count: number; readonly scope?: string }
  | { readonly type: 'resource_min'; readonly resourceId: string; readonly amount: number }
  | { readonly type: 'tier_min'; readonly nodeId: string; readonly tier: number }
  | { readonly type: 'distance_max'; readonly fromNodeId: string; readonly maxSteps: number }
  | { readonly type: 'tag_count'; readonly tag: string; readonly count: number }
  | { readonly type: 'progress_min'; readonly nodeId: string; readonly percent: number }
  | { readonly type: 'subtree_completion'; readonly subtreeId: string; readonly percent: number }
  | { readonly type: 'stat_min'; readonly statId: string; readonly amount: number }
  | { readonly type: 'time_after'; readonly timestamp: number }
  | { readonly type: 'time_before'; readonly timestamp: number }
  | { readonly type: 'custom'; readonly evaluator: string }

/**
 * Regra de desbloqueo: combinación lóxica de condicións.
 *
 * **UN só nivel — as regras NON aniñan** (verificado en 19.1). As
 * condicións dentro de "all"/"any"/"none" teñen que ser `UnlockCondition`
 * atómicas. Meter alí outra regra non dá erro: `UnlockResolver.evaluate`
 * chama a `evaluateCondition` por elemento e ese `switch` non recoñece
 * "all"/"any"/"none", co que devolve `undefined` — falso — e o nodo
 * queda **mudo para sempre**. O schema publicado tampouco a acepta
 * (`ygg validate` e a importación do editor rexéitana, que é a barreira
 * que salva a quen a intente).
 *
 * Para «A e B pero NON C» hai dúas vías reais, ambas de un nivel:
 *   - `exclusions` no `NodeDef` (exclusión mutua entre nodos), ou
 *   - un nodo intermedio que leve a parte `none` por separado.
 *
 * @example AND simple
 * { type: 'all', conditions: [
 *   { type: 'node_unlocked', nodeId: 'a' },
 *   { type: 'resource_min', resourceId: 'xp', amount: 100 }
 * ] }
 *
 * @example OR simple
 * { type: 'any', conditions: [
 *   { type: 'node_unlocked', nodeId: 'a' },
 *   { type: 'node_unlocked', nodeId: 'b' }
 * ] }
 *
 * @example Condición simple (sen wrapper)
 * { type: 'node_unlocked', nodeId: 'a' }
 */
export type UnlockRule =
  | { readonly type: 'all'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'any'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'none'; readonly conditions: readonly UnlockCondition[] }
  | UnlockCondition

/**
 * Resultado da avaliación dun UnlockRule.
 */
export interface UnlockCheck {
  /** True se o nodo pode desbloquearse agora mesmo. */
  readonly allowed: boolean
  /** Mensaxe localizada sobre por que está/non está permitido. */
  readonly reason?: LocalizedString
}

/**
 * Explicación detallada da avaliación dun UnlockRule.
 *
 * Útil para UI ("necesitas A, B e C"), debugging e devtools.
 */
export interface UnlockExplanation {
  readonly satisfied: boolean
  readonly conditions: readonly UnlockConditionEvaluation[]
}

/**
 * Resultado de avaliar unha condición concreta dentro dun UnlockExplanation.
 */
export interface UnlockConditionEvaluation {
  readonly condition: UnlockCondition
  readonly satisfied: boolean
  readonly reason: LocalizedString
}

// ── Tipos de resultado das mutacións (1.13) ──

/**
 * Resultado dunha operación unlock exitosa.
 */
export interface UnlockResult {
  readonly nodeId: string
  readonly newState: NodeState
  readonly tier: number
  readonly spent: readonly Cost[]
}

/**
 * Resultado dunha operación lock exitosa.
 */
export interface LockResult {
  readonly nodeId: string
  readonly newState: NodeState
  readonly refunded: readonly Cost[]
}

/**
 * Resultado dunha operación respec exitosa.
 */
export interface RespecResult {
  readonly nodeIds: readonly string[]
  readonly refunded: readonly Cost[]
}

/**
 * Opcións para `engine.respec()`.
 *
 * Sub-fase 8.3.
 */
export interface RespecOptions {
  /**
   * Porcentaxe do cost ORIXINAL que se mantén polo motor (penalty).
   *
   * Range: [0, 100]. Default 0 (full refund; cero penalty).
   *
   * Fórmula: `refunded = floor(original * (1 - costPercent / 100))`.
   *
   * @example
   * { costPercent: 0 }   // full refund (igual que cero opts)
   * { costPercent: 10 }  // devolve 90%; motor mantén 10%
   * { costPercent: 100 } // cero refund (penalty total)
   */
  readonly costPercent?: number
}
// ── FIN: Unlock conditions and rules ──
