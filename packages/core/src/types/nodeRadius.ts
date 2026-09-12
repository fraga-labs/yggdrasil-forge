// ── INICIO: radio do nodo (19.10) ──
// O RAIO dun nodo é dato, non pintado: sae de `node.size` ou, faltando
// ese, do seu `type`. Vivía só en `@yggdrasil-forge/react`
// (`nodeGeometry`), e iso deixaba cego ao motor: os layouts colocaban
// todos os nodos como puntos do mesmo tamaño, así que unha árbore con
// nodos de radio 15 e de radio 44 saía cos grandes solapándose cos
// veciños (e cos rótulos pisándose).
//
// Aquí é onde ten que estar: `core` non pode importar de `react`, pero
// `react` si de `core`, así que esta é a única colocación que permite
// UNHA soa táboa. `react` reexpórtaa; ninguén ten dúas verdades.
//
// **Non é o radio PINTADO**: o marco ornamentado, o anel e o glow
// engaden por fóra. É o radio do corpo, que é o que un layout precisa
// para reservar sitio.

import type { NodeDef, NodeType } from './node.js'

/** Radio cando nin `size` nin o tipo din nada. */
export const FALLBACK_RADIUS = 24

/** Radio por defecto de cada tipo de nodo. */
export const DEFAULT_RADIUS_BY_TYPE: Readonly<Record<NodeType, number>> = {
  root: 40,
  small: 16,
  notable: 26,
  keystone: 34,
  mastery: 30,
  ascendancy: 32,
  cluster: 22,
  gateway: 26,
  milestone: 24,
  subtree_anchor: 28,
  custom: 24,
}

/**
 * Radio do corpo do nodo. `size` manda; se non vén, decide o tipo.
 *
 * Aviso para quen escriba documentos: `size` é un RADIO absoluto, non un
 * multiplicador. Un `size: 1.2` non fai o nodo un 20% máis grande —
 * faino de radio 1.2, é dicir invisible.
 */
export function resolveRadius(node: Pick<NodeDef, 'type' | 'size'>): number {
  return node.size ?? DEFAULT_RADIUS_BY_TYPE[node.type] ?? FALLBACK_RADIUS
}
// ── FIN: radio do nodo ──
