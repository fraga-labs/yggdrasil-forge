// ── INICIO: glow (19.7) ──
// O resplandor dos mockups fundacionais.
//
// Un glow non se pinta: fíltrase. Precisa un `<filter>` en `<defs>` e un
// `filter="url(#…)"` nos elementos que o levan, e os dous lados teñen que
// coincidir no id. Para non ter que baixar un id por props ata cada nodo,
// o id DERÍVASE DO RAIO: dúas árbores co mesmo resplandor comparten un
// filtro idéntico (inofensivo) e con raios distintos non se pisan.

import type { NodeState } from '@yggdrasil-forge/core'
import type { Theme } from './theme-types.js'

/** Estados que resplandecen se o tema non di outra cousa: os vivos. */
export const DEFAULT_GLOW_STATES: readonly NodeState[] = ['unlockable', 'unlocked', 'maxed']

/**
 * Id do filtro para un radio dado. Determinista e estable entre o
 * servidor e o cliente (cero `useId`), que é o que permite que
 * `renderToStaticMarkup` produza SVGs autocontidos válidos.
 */
export function glowFilterId(radius: number): string {
  return `yf-glow-${Math.round(radius * 10)}`
}

/** Radio efectivo do resplandor, ou `undefined` se non hai. */
export function glowRadiusOf(theme: Theme | null): number | undefined {
  const r = theme?.effects?.glowRadius
  return typeof r === 'number' && r > 0 ? r : undefined
}

/** `true` se ese estado visual debe resplandecer con este tema. */
export function glowsForState(theme: Theme | null, state: NodeState): boolean {
  if (glowRadiusOf(theme) === undefined) return false
  return (theme?.effects?.glowStates ?? DEFAULT_GLOW_STATES).includes(state)
}

/** `filter` inline para un elemento que resplandece, ou `undefined`. */
export function glowFilterStyle(radius: number | undefined): string | undefined {
  return radius === undefined ? undefined : `url(#${glowFilterId(radius)})`
}
// ── FIN: glow ──
