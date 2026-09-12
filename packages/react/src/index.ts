// ── INICIO: @yggdrasil-forge/react ──
// Entry point principal. Inclúe SkillTree con autoload do tema
// 'minimal' por defecto. Para cero estilos, importar desde
// `@yggdrasil-forge/react/headless`.

/**
 * Versión actual do paquete.
 */
export const VERSION = '1.0.0'

// SkillTree exportado como wrapper con autoload de tema minimal.
// O core SkillTree (sen wrapper) está dispoñible vía /headless.
export { SkillTreeWithDefaultTheme as SkillTree } from './SkillTreeWithDefaultTheme.js'
export type { SkillTreeHandle, SkillTreeProps } from './SkillTree.js'
export type { RegionShape, RegionSpec } from './SkillRegions.js'
export { computeRegionHullPath } from './SkillRegions.js'
export type { ViewportState } from './hooks/useViewport.js'

// Compoñentes individuais (cero diferenza fronte a /headless).
export { SkillNode } from './SkillNode.js'
export type { SkillNodeProps } from './SkillNode.js'

export { SkillEdge } from './SkillEdge.js'
export type { SkillEdgeProps } from './SkillEdge.js'

export { MeshOverlay } from './MeshOverlay.js'
export type { MeshOverlayProps } from './MeshOverlay.js'

export { SVGRenderer } from './SVGRenderer.js'
export type { SVGRendererProps } from './SVGRenderer.js'

// Tema infra (só dispoñible desde root entry).
export { Minimap } from './Minimap.js'
export type { MinimapProps, ViewBoxRect } from './Minimap.js'
export { ThemeProvider } from './ThemeProvider.js'
export type { ThemeProviderProps } from './ThemeProvider.js'
export type { Theme, ThemeColors, ThemeEffects, ThemeSizes } from './theme-types.js'
// 19.7: o resplandor. O id do filtro derívase do radio para que o
// `<defs>` e os elementos que o usan coincidan sen baixar props.
export {
  DEFAULT_GLOW_STATES,
  glowFilterId,
  glowRadiusOf,
  glowsForState,
} from './glow.js'
export { esCorEscura, corLexible, razonDeContraste } from './colorContrast.js'
export { minimal } from './themes/minimal.js'
export { minimalDark } from './themes/minimalDark.js'

// Hooks customizados (independentes do tema).
export {
  useSkillTree,
  useNodeState,
  useNodeSelector,
  useStat,
} from './hooks/index.js'

// Compoñente de accesibilidade (announcements vía live region ARIA).
export { SkillTreeAnnouncer } from './SkillTreeAnnouncer.js'
export type { SkillTreeAnnouncerProps } from './SkillTreeAnnouncer.js'

// Error boundary para SkillTree (class component; require 'use client').
export { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary.js'
export type { SkillTreeErrorBoundaryProps } from './SkillTreeErrorBoundary.js'

// F10.5: rexistro de iconos SVG recoloreables. O auto-rexistro dos
// builtins vive en `registry.ts` (top-level), execútase cando
// `SkillNode` importa `getIcon` — non require side-effect import aquí
// (que sería tree-shaken por `package.json` `"sideEffects": false`).
export {
  registerIcon,
  registerIcons,
  getIcon,
  hasIcon,
  listRegisteredIcons,
} from './icons/registry.js'
export type { IconDef, IconPath } from './icons/registry.js'
export { IconGlyph } from './icons/IconGlyph.js'
export type { IconGlyphProps } from './icons/IconGlyph.js'
export { BUILTIN_ICONS } from './icons/registry.js'

// F10.5b: iconset Norse (opt-in). 26 iconos de inspiración nórdica
// para o branding Yggdrasil. Non se auto-rexistran (byte-cost que
// non todo consumidor quere). Uso explícito:
//   import { registerIcons, NORSE_ICONS } from '@yggdrasil-forge/react'
//   registerIcons(NORSE_ICONS)
export { NORSE_ICONS } from './icons/norse.js'

// 7.19: iconset Logic (opt-in, mesmo patrón). 19 iconos para a
// semántica de prerequisitos e progresión (locked/key/AND/OR/NOT…).
//   import { registerIcons, LOGIC_ICONS } from '@yggdrasil-forge/react'
//   registerIcons(LOGIC_ICONS)
export { LOGIC_ICONS } from './icons/logic.js'

// 17.1: iconset Forge (opt-in, mesmo patrón). 25 iconos industriais/
// mecánicos — taller, carga, puntería, oficio, loxística.
//   import { registerIcons, FORGE_ICONS } from '@yggdrasil-forge/react'
//   registerIcons(FORGE_ICONS)
export { FORGE_ICONS } from './icons/forge.js'

// F10.6: vistas alternativas + inspector (promovidas desde
// examples/oberon-panadeiro tras ser pedidas por GAIA como segundo
// consumidor real).
//
//   - ClusterCardsView: vista "tarxetas-lista" (cada cluster como
//     card con título + filas icona/label/badge). Pan/zoom local.
//   - NodeInspector: panel lateral co detalle dun nodo (níveis +
//     acción clave + vídeo opcional + botón subir nivel). i18n vía
//     locale + strings override.
//
// Lóxica pura tamén exportada para consumers que constrúan as súas
// propias vistas sobre estas regras.
export { ClusterCardsView } from './cluster/ClusterCardsView.js'
export type {
  CardPositions,
  ClusterCardsViewProps,
  ClusterGroup,
  ClusterMember,
} from './cluster/ClusterCardsView.js'
export { rowBadge, rowState } from './cluster/logic.js'
export type { RowState } from './cluster/logic.js'

export { NodeInspector } from './inspector/NodeInspector.js'
export type { InspectorStrings, NodeInspectorProps } from './inspector/NodeInspector.js'
export { badgeKind, badgeText, tierRowsFor } from './inspector/logic.js'
export type { TierRow, TierState } from './inspector/logic.js'
// ── FIN: @yggdrasil-forge/react ──
