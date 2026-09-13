// ── INICIO: smoke test para @yggdrasil-forge/heatmap ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/heatmap', () => {
  // Non se compara cunha literal: unha literal conxela o valor do día en
  // que naceu o paquete e queda verde mentres o package.json avanza — foi
  // así como catro paquetes publicados acabaron exportando `0.0.0`. O
  // valor exacto compróbase para todo o monorepo en
  // `packages/common/__tests__/versionsCoherentes.test.ts`.
  it('exporta VERSION e ten forma de versión', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})
// ── FIN: smoke test ──
