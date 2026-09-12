// ── INICIO: ProbaPanel ──
// Panel do modo Proba (7.6). Consome a sesión activa e a selección
// do EditorEngine para dar unha experiencia de xogo real sobre a
// árbore actual sen tocar o documento.
//
// Estrutura (mockup aprobado):
//   1. Cabeceira: play + "Proba" + badge "en vivo"
//   2. Recursos: fila por resource con -/+ e cantidade
//   3. Nodo seleccionado: label + estado + condicións + custo + botón
//   4. Botón "Reiniciar proba"

import type {
  Cost,
  NodeDef,
  Resource,
  UnlockConditionEvaluation,
  UnlockExplanation,
} from '@yggdrasil-forge/core'
import type { LocalizedString } from '@yggdrasil-forge/editor-core'
import {
  type EditorEngine,
  type SelectionRef,
  getNodeStateLabel,
} from '@yggdrasil-forge/editor-core'
import { IconGlyph, getIcon } from '@yggdrasil-forge/react'
import { type JSX, useCallback, useRef, useSyncExternalStore } from 'react'
import { PROBA_STRINGS, pickLoc } from './probaStrings.js'
import type { ProbaSession } from './useProbaSession.js'

export interface ProbaPanelProps {
  readonly editorEngine: EditorEngine
  readonly session: ProbaSession
}

function pickLabel(loc: LocalizedString | undefined, fallback: string): string {
  if (loc === undefined) return fallback
  if (typeof loc === 'string') return loc
  return loc.gl ?? loc.en ?? fallback
}

/** Devolve o primeiro nodo seleccionado (ficha só mostra un). */
function useSelectedNodeId(editorEngine: EditorEngine): string | null {
  const selection = editorEngine.getSession().selection
  const cacheRef = useRef<string | null>(null)
  const subscribe = useCallback(
    (cb: () => void) => {
      const unsub = selection.subscribe(() => {
        const cur = selection.current()
        const first = cur.find((r): r is SelectionRef & { kind: 'node' } => r.kind === 'node')
        cacheRef.current = first?.id ?? null
        cb()
      })
      const cur = selection.current()
      const first = cur.find((r): r is SelectionRef & { kind: 'node' } => r.kind === 'node')
      cacheRef.current = first?.id ?? null
      return unsub
    },
    [selection],
  )
  const getSnapshot = useCallback(() => cacheRef.current, [])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function ProbaPanel({ editorEngine, session }: ProbaPanelProps): JSX.Element {
  // Subscribe ao runtime da sesión — cada unlock/grant dispara re-render.
  useSyncExternalStore(
    (cb) => session.treeEngine.subscribe(cb),
    () => session.treeEngine.getSnapshot(),
  )
  const selectedNodeId = useSelectedNodeId(editorEngine)

  const doc = editorEngine.getDocument()
  const resources = doc.tree.resources ?? []
  const budget = session.treeEngine.getBudget()

  const handleGrant = useCallback(
    (resourceId: string, delta: number) => {
      // Fire-and-forget: subscribe rerender-á cando o estado avance.
      session.treeEngine.grantResource(resourceId, delta).catch(() => {
        // Non hai nada útil que facer aquí; o usuario simplemente non
        // verá cambio. Non queremos crash de UI por rate limits ou
        // clamps devolvidos como err.
      })
    },
    [session],
  )

  const handleUnlock = useCallback(
    (nodeId: string) => {
      session.treeEngine.unlock(nodeId).catch(() => {
        // Idem: `canUnlock` xa gobernou o botón; un erro aquí só se
        // daría por carreira e non merece tratamento visible.
      })
    },
    [session],
  )

  return (
    <div className="editor-proba">
      <ProbaHeader />

      {/* ── Recursos ── */}
      <section
        className="editor-proba__section"
        aria-label={pickLoc(PROBA_STRINGS.resourcesHeader)}
      >
        <h3 className="editor-proba__section-title">{pickLoc(PROBA_STRINGS.resourcesHeader)}</h3>
        <p className="editor-proba__hint">{pickLoc(PROBA_STRINGS.resourcesHelp)}</p>
        {resources.length === 0 ? (
          <p className="editor-proba__hint editor-proba__empty">
            {pickLoc(PROBA_STRINGS.noResources)}
          </p>
        ) : (
          <ul className="editor-proba__resources">
            {resources.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                amount={budget.resources[r.id] ?? 0}
                onGrant={(delta) => handleGrant(r.id, delta)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Nodo seleccionado ── */}
      <section className="editor-proba__section" aria-label={pickLoc(PROBA_STRINGS.nodeHeader)}>
        <h3 className="editor-proba__section-title">{pickLoc(PROBA_STRINGS.nodeHeader)}</h3>
        {selectedNodeId === null ? (
          <p className="editor-proba__hint editor-proba__empty">
            {pickLoc(PROBA_STRINGS.noSelectionHint)}
          </p>
        ) : (
          <SelectedNodeCard
            nodeId={selectedNodeId}
            nodeDef={doc.tree.nodes.find((n) => n.id === selectedNodeId)}
            session={session}
            onUnlock={() => handleUnlock(selectedNodeId)}
          />
        )}
      </section>

      {/* ── Reset ── */}
      <div className="editor-proba__actions">
        <button
          type="button"
          className="editor-proba__reset"
          onClick={session.reset}
          title={pickLoc(PROBA_STRINGS.resetHelp)}
        >
          {pickLoc(PROBA_STRINGS.resetButton)}
        </button>
      </div>
    </div>
  )
}

// ── Cabeceira con badge "en vivo" ──
function ProbaHeader(): JSX.Element {
  return (
    <header className="editor-proba__header">
      <span className="editor-proba__icon" aria-hidden="true">
        ▶
      </span>
      <span className="editor-proba__title">{pickLoc(PROBA_STRINGS.panelTitle)}</span>
      <span className="editor-proba__live-badge">{pickLoc(PROBA_STRINGS.liveBadge)}</span>
    </header>
  )
}

// ── Fila de recurso ──
interface ResourceRowProps {
  readonly resource: Resource
  readonly amount: number
  readonly onGrant: (delta: number) => void
}
function ResourceRow({ resource, amount, onGrant }: ResourceRowProps): JSX.Element {
  const label = pickLabel(resource.label, resource.id)
  const swatch = resource.color
  const icona = resource.icon
  const registada = icona !== undefined && icona !== '' ? getIcon(icona) : undefined
  return (
    <li className="editor-proba__resource-row">
      {swatch !== undefined && (
        <span
          className="editor-proba__resource-swatch"
          style={{ background: swatch }}
          aria-hidden="true"
        />
      )}
      {icona !== undefined && (
        <span className="editor-proba__resource-icon" aria-hidden="true">
          {/* 19.10: se o id está rexistrado píntase a ICONA; só cae ao
              texto cando non o está, que é o caso lexítimo dun emoji.
              Antes pintábase sempre `resource.icon` cru, así que un
              recurso con `icon: "norse-sun"` amosaba «norse-sun» ao
              lado da etiqueta — o mesmo fallo que o dono atopara na
              portada 1.0, pero no panel Proba. */}
          {registada !== undefined ? <IconGlyph def={registada} size={14} /> : icona}
        </span>
      )}
      <span className="editor-proba__resource-label">{label}</span>
      <span className="editor-proba__resource-amount">{amount}</span>
      <div className="editor-proba__resource-controls">
        <button
          type="button"
          className="editor-proba__grant-btn"
          onClick={() => onGrant(-1)}
          aria-label={`− ${label}`}
        >
          −
        </button>
        <button
          type="button"
          className="editor-proba__grant-btn"
          onClick={() => onGrant(1)}
          aria-label={`+ ${label}`}
        >
          +
        </button>
      </div>
    </li>
  )
}

// ── Ficha do nodo seleccionado ──
interface SelectedNodeCardProps {
  readonly nodeId: string
  readonly nodeDef: NodeDef | undefined
  readonly session: ProbaSession
  readonly onUnlock: () => void
}
function SelectedNodeCard({
  nodeId,
  nodeDef,
  session,
  onUnlock,
}: SelectedNodeCardProps): JSX.Element {
  if (nodeDef === undefined) {
    return <p className="editor-proba__hint">Nodo non atopado: {nodeId}</p>
  }

  const instance = session.treeEngine.getNodeState(nodeId)
  const state = instance?.state ?? 'locked'
  const currentTier = instance?.currentTier ?? 0
  const maxTier = nodeDef.maxTier ?? 1

  const label = pickLabel(nodeDef.label, nodeDef.id)
  const stateLabel = getNodeStateLabel(state)

  // ★ canUnlock ademáis de explainUnlock: canUnlock inclúe afordabilidade
  // de custo; explainUnlock só cobre prerequisites.
  const canUnlockResult = session.treeEngine.canUnlock(nodeId)
  const canUnlock = canUnlockResult.ok && canUnlockResult.value.allowed
  const canUnlockReason =
    canUnlockResult.ok && canUnlockResult.value.reason !== undefined
      ? pickLabel(canUnlockResult.value.reason, '')
      : undefined

  const explainResult = session.treeEngine.explainUnlock(nodeId)
  const explanation: UnlockExplanation | null = explainResult.ok ? explainResult.value : null

  // Determinar custo do próximo unlock/rango.
  const nextTier = currentTier + 1
  // 17.9: o custo pregúntase ao FUNIL do motor (getEffectiveCostForTier),
  // non ao nodeDef cru — así a ficha ensina o custo cos hooks computeCost
  // dos plugins aplicados (o rebaixado, se hai desconto): explica e
  // cobra coinciden.
  const cost =
    nextTier <= maxTier ? session.treeEngine.getEffectiveCostForTier(nodeId, nextTier) : []

  const budget = session.treeEngine.getBudget()

  const buttonLabel =
    currentTier === 0 ? pickLoc(PROBA_STRINGS.unlockButton) : pickLoc(PROBA_STRINGS.rankUpButton)
  const canAdvance = currentTier < maxTier
  const buttonDisabled = !canUnlock || !canAdvance

  return (
    <div className="editor-proba__node-card">
      <div className="editor-proba__node-header">
        <span className="editor-proba__node-label">{label}</span>
        <span className={`editor-proba__node-state editor-proba__node-state--${state}`}>
          {stateLabel}
        </span>
      </div>
      {maxTier > 1 && (
        <p className="editor-proba__node-tier">
          {PROBA_STRINGS.rankSuffix.gl(currentTier, maxTier)}
        </p>
      )}

      {/* Condicións (prerequisites) */}
      <div className="editor-proba__block">
        <h4 className="editor-proba__block-title">{pickLoc(PROBA_STRINGS.conditionsHeader)}</h4>
        {explanation === null || explanation.conditions.length === 0 ? (
          <p className="editor-proba__hint">{pickLoc(PROBA_STRINGS.noConditions)}</p>
        ) : (
          <ul className="editor-proba__conditions">
            {explanation.conditions.map((cond, i) => (
              <ConditionRow key={`${cond.condition.type}-${i}`} evaluation={cond} />
            ))}
          </ul>
        )}
      </div>

      {/* Custo */}
      <div className="editor-proba__block">
        <h4 className="editor-proba__block-title">{pickLoc(PROBA_STRINGS.costHeader)}</h4>
        {cost.length === 0 ? (
          <p className="editor-proba__hint">{pickLoc(PROBA_STRINGS.noCost)}</p>
        ) : (
          <ul className="editor-proba__costs">
            {cost.map((c) => (
              <CostRow key={c.resourceId} cost={c} have={budget.resources[c.resourceId] ?? 0} />
            ))}
          </ul>
        )}
      </div>

      {/* Botón + hint */}
      <div className="editor-proba__unlock-area">
        <button
          type="button"
          className="editor-proba__unlock-btn"
          onClick={onUnlock}
          disabled={buttonDisabled}
          title={canUnlockReason}
        >
          {buttonLabel}
        </button>
        <p className="editor-proba__hint editor-proba__unlock-hint">
          {pickLoc(PROBA_STRINGS.unlockHelp)}
        </p>
      </div>
    </div>
  )
}

// ── Fila de condición ──
function ConditionRow({ evaluation }: { evaluation: UnlockConditionEvaluation }): JSX.Element {
  const reason = pickLabel(evaluation.reason, '—')
  return (
    <li className={`editor-proba__condition ${evaluation.satisfied ? 'is-ok' : 'is-fail'}`}>
      <span className="editor-proba__condition-mark" aria-hidden="true">
        {evaluation.satisfied ? '✓' : '✗'}
      </span>
      <span className="editor-proba__condition-reason">{reason}</span>
    </li>
  )
}

// ── Fila de custo ──
function CostRow({ cost, have }: { cost: Cost; have: number }): JSX.Element {
  const affordable = have >= cost.amount
  return (
    <li className={`editor-proba__cost ${affordable ? 'is-ok' : 'is-fail'}`}>
      <span className="editor-proba__cost-mark" aria-hidden="true">
        {affordable ? '✓' : '✗'}
      </span>
      <span className="editor-proba__cost-text">
        {cost.amount} {cost.resourceId}{' '}
        <span className="editor-proba__cost-have">
          ({pickLoc(PROBA_STRINGS.affordableHint)} {have})
        </span>
      </span>
    </li>
  )
}

// ── FIN: ProbaPanel ──
