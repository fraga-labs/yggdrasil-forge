// ── INICIO: smoke test para @yggdrasil-forge/themes ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/themes', () => {
  // Este test dicía `toBe('0.0.0')`. Era verde, e era o motivo de que a
  // constante levase tres releases mentindo: a literal conxelaba o valor
  // do día en que naceu o paquete, e o package.json xa ía por outro. O
  // valor exacto compróbase para todo o monorepo en
  // `packages/common/__tests__/versionsCoherentes.test.ts`, contra o
  // package.json de cada un; aquí só se pide que a exportación exista e
  // teña forma de versión.
  it('exporta VERSION e ten forma de versión', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})
// ── FIN: smoke test ──
