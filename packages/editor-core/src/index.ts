// ── INICIO: @yggdrasil-forge/editor-core public API ──
// Editor Engine — núcleo headless de edición de TreeDefs. Cero React,
// cero UI. Provisto para que un wrapper (@editor-react, futuro) lle
// poña cara.

export const VERSION = '1.0.0'

// Documento (modelo + metadatos)
export {
  type BackgroundRef,
  DEFAULT_DOCUMENT_META,
  type DocumentMeta,
  type EditorDocument,
  createEditorDocument,
} from './document/EditorDocument.js'
export type {
  ThemeEdgeSpec,
  ThemeNodeState,
  ThemeRegionTint,
  ThemeSpec,
  ThemeTypographySpec,
} from './document/ThemeSpec.js'
// 7.19: presets de tema con nome (o tema como dato reutilizable).
export type { ThemePreset } from './document/themePresets.js'
export { THEME_PRESETS, getThemePreset } from './document/themePresets.js'

// Persistencia
export type { DocumentAdapter } from './document/DocumentAdapter.js'
export { JsonDocumentAdapter, toJson } from './document/JsonDocumentAdapter.js'
export { deserializeDocument, serializeDocument } from './document/serialize.js'
export {
  type DeriveClusterGroupsOptions,
  type DerivedClusterGroup,
  type DerivedClusterMember,
  UNGROUPED_GROUP_ID,
  deriveClusterGroups,
} from './view/deriveClusterGroups.js'
export {
  AUTO_LAYOUT_ALGOS,
  type ApplyAutoLayoutOptions,
  type AutoLayoutAlgo,
  applyAutoLayout,
} from './layout/applyAutoLayout.js'
export {
  themeOverridesFromSpec,
  themeTypographyFromSpec,
} from './theme/themeOverridesFromSpec.js'
export { type StandaloneSvgOptions, standaloneSvg } from './svg/standaloneSvg.js'
export {
  backgroundRefSchema,
  boundsSchema,
  documentMetaSchema,
  type InferredDocumentMeta,
  themeEdgeSpecSchema,
  themeNodeStateSchema,
  themeRegionTintSchema,
  themeSpecSchema,
  themeTypographySpecSchema,
} from './document/documentMetaSchema.js'

// Sesión (efímera, estendida con selection+fsm+activeOperation en 7.3)
export { type EditorSession, createSession } from './session/EditorSession.js'

// Pipeline de edición (7.2)
export type { Command } from './command/Command.js'
export {
  addEdge,
  addNode,
  moveNode,
  removeEdge,
  removeNode,
  replaceDocument,
  setMetaField,
  setNodeField,
  setTreeField,
} from './command/commands/index.js'
// Composites de creación/borrado (7.11)
export {
  buildConnect,
  buildNewNode,
  buildRemoveCascade,
  nextFreeId,
  toggleTag,
} from './command/composites.js'
export {
  type Severity,
  type ValidationIssue,
  type Validator,
  ValidatorRegistry,
  hasErrors,
} from './validation/Validator.js'
export { structuralValidator } from './validation/structuralValidator.js'
export { uniqueIdsValidator } from './validation/uniqueIdsValidator.js'
export { referentialIntegrityValidator } from './validation/referentialIntegrityValidator.js'
// Soft validators (7.4): non-bloqueantes (warning/info).
export { asymmetricExclusionValidator } from './validation/soft/asymmetricExclusionValidator.js'
export { danglingResourceRefsValidator } from './validation/soft/danglingResourceRefsValidator.js'
export { layoutOverflowValidator } from './validation/soft/layoutOverflowValidator.js'
export { prerequisiteCycleValidator } from './validation/soft/prerequisiteCycleValidator.js'
export { unsupportedFeatureValidator } from './validation/soft/unsupportedFeatureValidator.js'
export { createDefaultValidators } from './validation/createDefaultValidators.js'
export { History, type HistoryOptions } from './history/History.js'
export {
  EditorEngine,
  type EditorEngineListener,
  type EditorEngineOptions,
  type TransactionContext,
} from './EditorEngine.js'

// Interacción (7.3): Selection + FSM + Operation + Tool + Controller
export {
  type SelectionEngine,
  type SelectionRef,
  createSelectionEngine,
} from './selection/Selection.js'
export type {
  InputEvent,
  Modifiers,
  Rect,
} from './interaction/InputEvent.js'
export {
  type InteractionMachine,
  type InteractionState,
  createInteractionMachine,
} from './interaction/InteractionMachine.js'
export type { Operation, OperationPreview } from './operation/Operation.js'
export { createMoveOperation } from './operation/MoveOperation.js'
export type { Tool, ToolContext } from './tool/Tool.js'
export { type ToolRegistry, createToolRegistry } from './tool/ToolRegistry.js'
export { createSelectTool } from './tool/tools/SelectTool.js'
export { createMoveTool } from './tool/tools/MoveTool.js'
export {
  InteractionController,
  type InteractionControllerOptions,
} from './interaction/InteractionController.js'
// ── Property Registry (7.5c-i) ──
export type { PropertyDescriptor, PropertyType } from './property/PropertyDescriptor.js'
export {
  nodePropertyRegistry,
  NODE_TYPE_OPTIONS,
  NODE_SHAPE_OPTIONS,
} from './property/nodePropertyRegistry.js'
// ── Property Registry de árbore (7.12) ──
export type { TreePropertyDescriptor } from './property/treePropertyRegistry.js'
export { treePropertyRegistry } from './property/treePropertyRegistry.js'
// ── Gate manifesto ↔ descriptor (7.5c-ii) ──
export {
  authorableEffectTypes,
  authorablePlainEffectTypes,
  isPlainAuthorableEffectType,
} from './property/authorableEffectTypes.js'
// ── Gate condicións (7.5c-ii fase 2) ──
export {
  authorableConditionTypes,
  isAuthorableConditionType,
} from './property/authorableConditionTypes.js'
// ── Localización de condicións + combinadores (7.5c-ii fase 2) ──
export type {
  ConditionParamKind,
  ConditionParamSpec,
  ConditionLabelEntry,
} from './property/conditionLabels.js'
export {
  RULE_COMBINATOR_LABELS,
  CONDITION_TYPE_LABELS,
  NODE_STATE_LABELS,
  getConditionTypeLabel,
  getConditionTypeDescribe,
  getConditionParams,
  getCombinatorLabel,
  getCombinatorDescribe,
  getNodeStateLabel,
} from './property/conditionLabels.js'
// ── Helpers de costPerTier (7.5f) ──
export type { CostPerTierRow } from './property/costPerTierHelpers.js'
export {
  COST_PER_TIER_STRINGS,
  costPerTierRowsFor,
  packCostPerTier,
  rankLabel,
} from './property/costPerTierHelpers.js'
// ── Gate auditoría dead-code de NodeDef (7.5c-T + 7.5c-T2) ──
export {
  USED_NODEDEF_FIELDS,
  UNIMPLEMENTED_NODEDEF_FIELDS,
  DEPRECATED_NODEDEF_FIELDS,
} from './property/nodeDefFieldAudit.js'
// ── Localización de enums (7.5c-U) ──
export type { EnumLabelEntry } from './property/enumLabels.js'
export {
  NODE_TYPE_LABELS,
  NODE_SHAPE_LABELS,
  EFFECT_TYPE_LABELS,
  getNodeTypeLabel,
  getNodeTypeDescribe,
  getNodeShapeLabel,
  getEffectTypeLabel,
  getEffectTypeDescribe,
} from './property/enumLabels.js'
// LocalizedString re-exportada para consumidores (editor-react) que non
// teñen @common como dep directa.
export type { LocalizedString } from '@yggdrasil-forge/common'

/**
 * @internal
 * Fixture de probas (briefing 7.13): dato deseñado para forzar
 * camiños pouco transitados (sen coordinateBounds, labels bilingües,
 * grupos any/none, etc.). NON é API de produto — só para tests.
 */
export {
  adversarialDocument,
  adversarialResources,
  adversarialTreeDef,
} from './testing/adversarialFixture.js'
// ── FIN: barrel ──
