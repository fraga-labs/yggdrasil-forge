// ── INICIO: @yggdrasil-forge/importers ──
// Importadores de formatos externos a TreeDef.

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.2.1'

// ── F9.3.a: importador GAIA ──
export { importGaiaProfession, toI18n } from './gaia.js'
export type {
  GaiaCanonicalWeight,
  GaiaGroup,
  GaiaImportOptions,
  GaiaMicroskill,
  GaiaProfession,
} from './gaia.js'

// ── F9.4: import xenérico + identity import ──
export { importTree, importTreeFromJson, importTreeFromYaml } from './generic.js'
export type { TreeMapping } from './generic.js'

// ── F9.2: helper de coherencia canónica (opt-in) ──
export { checkCanonicalCoherence } from './canonical.js'
// ── FIN: @yggdrasil-forge/importers ──
