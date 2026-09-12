// ── INICIO: SkillEdge ──
// Compoñente átomo de edge. Renderiza <path> SVG cun `d` derivado
// de EdgePath.points + EdgePath.kind.
//
// F10.3.fix: usa `useTheme()` para aplicar stroke/strokeWidth inline.
// F10.4: cor por estado do edge (active/inactive) + marker-end opcional
// para frechas (vía `edge.style.directed`).

'use client'

import type { EdgeDef, EdgePath, NodeState } from '@yggdrasil-forge/core'
import { type CSSProperties, type JSX, type MouseEvent, memo } from 'react'
import { ARROW_MARKER_ID } from './SVGRenderer.js'
import { useTheme } from './ThemeProvider.js'
import { glowFilterStyle, glowRadiusOf } from './glow.js'
import { buildPathD } from './svg-helpers.js'

export type EdgeState = 'active' | 'inactive'

/**
 * Calcula o estado dun edge a partir do estado do nodo `source`.
 *
 * Un edge é **active** cando o seu nodo source está en `unlocked` ou
 * `maxed` (camiño «aceso» desde un nodo conquistado). En calquera
 * outro estado (locked, unlockable, in_progress, disabled, expired) o
 * edge é **inactive**.
 *
 * Helper puro; exportado para tests.
 */
export function edgeStateFor(sourceState: NodeState | undefined): EdgeState {
  if (sourceState === 'unlocked' || sourceState === 'maxed') return 'active'
  return 'inactive'
}

export interface SkillEdgeProps {
  readonly edgeId: string
  readonly edge: EdgeDef
  readonly path: EdgePath
  readonly onClick?: (edgeId: string) => void
  /**
   * Estado visual do edge (F10.4). Default `inactive` cando non se
   * pasa (mantén comportamento legacy en tests/consumidores).
   */
  readonly edgeState?: EdgeState
}

function SkillEdgeImpl({
  edgeId,
  edge,
  path,
  onClick,
  edgeState = 'inactive',
}: SkillEdgeProps): JSX.Element {
  const d = buildPathD(path)

  const handleClick =
    onClick !== undefined ? (_e: MouseEvent<SVGPathElement>) => onClick(edgeId) : undefined

  const theme = useTheme()
  const baseStroke = theme?.colors.edge
  const activeStroke = theme?.colors.edgeActive ?? baseStroke
  const isActive = edgeState === 'active'
  const stroke = isActive ? activeStroke : baseStroke
  const strokeWidth = theme?.sizes.strokeWidth

  // 19.7: só as ACESAS resplandecen, e só se o tema o pide con
  // `effects.glowEdges`. Unha aresta apagada con halo sería un
  // contrasentido: o halo é o que marca o camiño andado.
  const glowStyle =
    isActive && theme?.effects?.glowEdges === true
      ? glowFilterStyle(glowRadiusOf(theme))
      : undefined
  const style: CSSProperties = {
    ...(stroke !== undefined && { stroke }),
    ...(strokeWidth !== undefined && { strokeWidth }),
    // F10.4: edges inactivos quédan apagados (opacidade reducida).
    ...(isActive ? {} : { opacity: 0.4 }),
    ...(glowStyle !== undefined && { filter: glowStyle }),
  }

  const directed = edge.style?.directed === true

  return (
    <path
      className="yf-skill-edge"
      data-edge-id={edgeId}
      data-source={edge.source}
      data-target={edge.target}
      data-edge-state={edgeState}
      d={d}
      fill="none"
      stroke="currentColor"
      style={style}
      {...(directed && theme !== null && { markerEnd: `url(#${ARROW_MARKER_ID})` })}
      {...(handleClick !== undefined && { onClick: handleClick })}
    />
  )
}

/**
 * `SkillEdge` memoizado (Fase 16.4 perf): a 1500 nodos hai 4500 arestas
 * e reconciliábanse todas en cada interacción. Props estables (edge do
 * TreeDef, path do layout memoizado, edgeState primitivo) → `memo`.
 */
export const SkillEdge = memo(SkillEdgeImpl)
SkillEdge.displayName = 'SkillEdge'
// ── FIN: SkillEdge ──
