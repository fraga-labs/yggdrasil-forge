// ── INICIO: createDefaultLayoutRegistry ──
// Helper interno para construír un LayoutEngineRegistry default cos
// layouts dispoñibles en core (Identity, Radial, Tree, ClusteredRadial,
// Constellation).
//
// NON exportado publicamente en 7.2. Pode promocionarse a export
// público en sub-fases futuras se require.

import {
  ClusteredRadialLayout,
  ConstellationLayout,
  IdentityLayout,
  LayeredLayout,
  LayoutEngineRegistry,
  MeshLayout,
  RadialLayout,
  TreeLayout,
} from '@yggdrasil-forge/core'

/**
 * Constrúe un LayoutEngineRegistry rexistrando os layouts default
 * disponibles en `@yggdrasil-forge/core`.
 */
export function createDefaultLayoutRegistry(): LayoutEngineRegistry {
  return new LayoutEngineRegistry()
    .register(new IdentityLayout())
    .register(new RadialLayout())
    .register(new TreeLayout())
    .register(new LayeredLayout())
    .register(new ClusteredRadialLayout())
    .register(new MeshLayout())
    .register(new ConstellationLayout())
}
// ── FIN: createDefaultLayoutRegistry ──
