// ── INICIO: @yggdrasil-forge/cli ──
// Ferramentas de liña de comandos de Yggdrasil Forge (7.15, Cambio 4).
// O executable é `ygg` (ver bin.ts); este índice expón a mesma
// funcionalidade como API para quen prefira chamala desde Node.

/**
 * Versión actual do paquete.
 */
export const VERSION = '1.0.0'

export { type CliIO, run } from './cli.js'
export {
  SCHEMA_ID,
  buildDocumentJsonSchema,
  renderDocumentJsonSchema,
  yggdrasilDocumentSchema,
} from './documentSchema.js'
export { type LayoutTextResult, isAutoLayoutAlgo, layoutDocumentText } from './layoutCmd.js'
export { type NewDocumentOptions, newDocumentJson } from './newDocument.js'
export {
  type PlayOptions,
  type RenderPlayedTextOptions,
  type RenderTextOptions,
  type RenderTextResult,
  renderDocumentText,
  renderPlayedDocumentText,
} from './renderCmd.js'
export {
  type ValidationIssueJson,
  type ValidationReport,
  validateDocumentText,
} from './validate.js'
// ── FIN: @yggdrasil-forge/cli ──
