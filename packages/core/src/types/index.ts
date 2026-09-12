// ── INICIO: types public API ──
// Tipos públicos do paquete @yggdrasil-forge/core.
//
// Ondas:
// - 1ª (1.2): Result, Node, Edge, Tree, RichContent, errors
// - 2ª (1.3): unlock, resources, i18n, events, plugin
// - 3ª (1.4): effects, time, stats, auth, progress, build, audit, changes, metrics
//             + substitución de placeholders en Node/Tree/events

// Result
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from './result.js'

// Content
export type { RichContent, NodeContent } from './content.js'

// Radio do nodo (19.10): dato, non pintado — os layouts precísano para
// reservar sitio, así que a táboa vive aquí e `react` reexpórtaa.
export {
  FALLBACK_RADIUS,
  DEFAULT_RADIUS_BY_TYPE,
  resolveRadius,
} from './nodeRadius.js'

// Node
export type {
  NodeType,
  NodeShape,
  NodeState,
  NodeDef,
  NodeTierInfo,
  NodeInstance,
  StateChange,
  Position,
} from './node.js'
export { freezeNodeDef } from './node.js'

// Edge
export type { EdgeType, EdgeDef, EdgeStyle } from './edge.js'

// Tree
export type {
  TreeDef,
  TreeState,
  GroupDef,
  StatDef,
  BaseLayoutConfig,
  LayoutConfig,
  TreeEngineOptions,
} from './tree.js'

// Selector (1.15)
export type { Selector } from './selector.js'

// Resources (1.3)
export type { Resource, Cost, Budget, GrantResult } from './resources.js'

// I18n config (1.3)
export type { I18nConfig } from './i18n.js'

// Unlock (1.3)
export type {
  UnlockCondition,
  UnlockRule,
  UnlockCheck,
  UnlockExplanation,
  UnlockConditionEvaluation,
  UnlockResult,
  LockResult,
  RespecOptions,
  RespecResult,
} from './unlock.js'

// Events (1.3)
export type { EventMap, EventName, EventHandler } from './events.js'

// Plugin (1.3)
export type {
  Plugin,
  PluginAPI,
  PluginEngineHandle,
  PluginInstallResult,
  PluginLogLevel,
  PluginPermission,
  Hooks,
  HookContext,
  ConditionEvaluator,
  StorageAdapterPlaceholder,
  LayoutAlgorithmPlaceholder,
} from './plugin.js'

// Effects (1.4)
export type { Effect, EffectResult } from './effects.js'

// Time (1.4)
export type { TimeConstraints, TimeManagerOptions } from './time.js'

// Stats (1.4)
export type { StatContribution, StatContributionOp, StatExplanation } from './stats.js'

// Auth (1.4)
export type { AuthConfig, AuthProvider, AuthRequestHandler } from './auth.js'

// Progress (1.4)
export type {
  ProgressSourceConfig,
  ProgressHandler,
  ProgressHandlerContext,
} from './progress.js'

// Build (1.4)
export type { Build, BuildShareLink, BuildSnapshot, Loadout } from './build.js'

// Audit (1.4)
export type { AuditEntry, AuditAction, AuditFilter } from './audit.js'

// Changes (1.4)
export type {
  TreeChange,
  ModifyNodeChanges,
  ModifyEdgeChanges,
  ApplyChangesResult,
} from './changes.js'

// Metrics (1.4)
export type { EngineMetrics } from './metrics.js'

// Errors (re-export from common)
export {
  ErrorCode,
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
  getErrorMessage,
} from './errors.js'
// ── FIN: types public API ──
