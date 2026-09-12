// ── INICIO: Minimap (19.9) ──
// O minimapa dos mockups fundacionais (aparece en dous: North Star e
// atlas) e a única peza dese inventario que non tiña unha liña de
// código. A esa densidade non é un adorno: cun atlas de centos de nodos,
// sen minimapa non se sabe onde estás.
//
// **Vai DENTRO do mesmo `<svg>`, pero FÓRA do grupo de pan/zoom.** Iso é
// o que fai que non se mova ao arrastrar nin se estire ao ampliar, sen
// necesidade dun overlay HTML por riba (o `SkillTree` non ten envoltorio
// HTML: a súa raíz é o propio `<svg>`).
//
// Colócase e dimensiónase en **unidades do viewBox**, non en píxeles: así
// escala co SVG e funciona igual no editor que nun `ygg render`
// autocontido, sen medir nada do DOM.

import type { Bounds, NodeDef, Position } from '@yggdrasil-forge/core'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import type { RegionSpec } from './SkillRegions.js'
import { useTheme } from './ThemeProvider.js'
import type { ViewportState } from './hooks/useViewport.js'

/** Rexión do viewBox: o que se ve do documento nun momento dado. */
export interface ViewBoxRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface MinimapProps {
  readonly nodes: readonly NodeDef[]
  readonly nodePositions: ReadonlyMap<string, Position>
  /** Bounds do layout (sen padding). */
  readonly bounds: Bounds
  /** O viewBox efectivo do SVG: onde se coloca o minimapa. */
  readonly viewBox: ViewBoxRect
  /** Transform actual do lenzo, para debuxar o rectángulo do que se ve. */
  readonly viewport: ViewportState
  /** Tintes de rexión, para orientarse pola cor. Opcional. */
  readonly regions?: readonly RegionSpec[]
  /** Largo do minimapa como fracción do viewBox. Default 0.22. */
  readonly widthFraction?: number
  /** Chámase coas coordenadas do DOCUMENTO ás que ir. */
  readonly onNavigate?: (x: number, y: number) => void
}

/** Esquina onde vive: abaixo á esquerda, coma nos dous mockups. */
const MARXE_FRACTION = 0.02

export function Minimap({
  nodes,
  nodePositions,
  bounds,
  viewBox,
  viewport,
  regions,
  widthFraction = 0.22,
  onNavigate,
}: MinimapProps): JSX.Element | null {
  const theme = useTheme()
  const docW = bounds.maxX - bounds.minX
  const docH = bounds.maxY - bounds.minY
  if (docW <= 0 || docH <= 0 || viewBox.w <= 0 || viewBox.h <= 0) return null

  // O minimapa conserva o aspecto do documento: un atlas ancho dá un
  // minimapa ancho. Se fose de aspecto fixo, o rectángulo do viewport
  // mentiría.
  const mmW = viewBox.w * widthFraction
  const mmH = (mmW * docH) / docW
  const marxe = viewBox.w * MARXE_FRACTION
  const mmX = viewBox.x + marxe
  const mmY = viewBox.y + viewBox.h - mmH - marxe
  const escala = mmW / docW

  const aMinimapa = (x: number, y: number): Position => ({
    x: mmX + (x - bounds.minX) * escala,
    y: mmY + (y - bounds.minY) * escala,
  })

  // Xanela visible en coordenadas do DOCUMENTO. Un punto `p` aparece no
  // viewBox en `pan + zoom·p`, así que o que se ve é o intervalo que cae
  // dentro do viewBox — invertido.
  const z = viewport.zoom === 0 ? 1 : viewport.zoom
  const visX = (viewBox.x - viewport.panX) / z
  const visY = (viewBox.y - viewport.panY) / z
  const visW = viewBox.w / z
  const visH = viewBox.h / z
  const r0 = aMinimapa(visX, visY)
  const rW = visW * escala
  const rH = visH * escala

  const cor = theme?.colors.text ?? '#888888'
  const fondo = theme?.colors.surface ?? theme?.colors.background ?? '#000000'

  /**
   * Clic → ir alí. Convértese de píxeles de pantalla a coordenadas do
   * SVG co CTM; se o entorno non o ten (jsdom), non se navega en vez de
   * petar.
   */
  const handlePointerDown = (e: ReactPointerEvent<SVGRectElement>): void => {
    // Sen isto o `<svg>` de arriba interpretaría o clic como inicio de
    // pan e o minimapa sería inusable.
    e.stopPropagation()
    if (onNavigate === undefined) return
    const svg = e.currentTarget.ownerSVGElement
    const ctm = svg?.getScreenCTM?.()
    if (svg === null || svg === undefined || ctm === null || ctm === undefined) return
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const local = p.matrixTransform(ctm.inverse())
    onNavigate(bounds.minX + (local.x - mmX) / escala, bounds.minY + (local.y - mmY) / escala)
  }

  const porTag = new Map<string, string>()
  for (const spec of regions ?? []) porTag.set(spec.tag, spec.color)

  return (
    <g className="yf-minimap" data-testid="minimap">
      <rect
        x={mmX}
        y={mmY}
        width={mmW}
        height={mmH}
        rx={mmW * 0.02}
        fill={fondo}
        fillOpacity={0.72}
        stroke={cor}
        strokeOpacity={0.28}
        strokeWidth={Math.max(0.5, mmW * 0.004)}
        style={onNavigate !== undefined ? { cursor: 'pointer' } : undefined}
        onPointerDown={handlePointerDown}
      />
      {/* Os nodos, como puntos. Á escala do minimapa un nodo son dous
          píxeles: o que se le é a FORMA do conxunto, non cada peza. */}
      <g pointerEvents="none">
        {nodes.map((node) => {
          const p = nodePositions.get(node.id)
          if (p === undefined) return null
          const m = aMinimapa(p.x, p.y)
          const tag = node.tags?.find((t) => porTag.has(t))
          return (
            <circle
              key={node.id}
              cx={m.x}
              cy={m.y}
              r={Math.max(0.6, mmW * 0.012)}
              fill={tag !== undefined ? (porTag.get(tag) ?? cor) : cor}
              fillOpacity={0.75}
            />
          )
        })}
      </g>
      {/* O rectángulo do que se ve. Recórtase ao marco para que, cando o
          zoom é menor que o encadre, non se escape do minimapa. */}
      <rect
        x={Math.max(mmX, r0.x)}
        y={Math.max(mmY, r0.y)}
        width={Math.min(rW, mmX + mmW - Math.max(mmX, r0.x))}
        height={Math.min(rH, mmY + mmH - Math.max(mmY, r0.y))}
        fill="none"
        stroke={cor}
        strokeOpacity={0.85}
        strokeWidth={Math.max(0.8, mmW * 0.008)}
        pointerEvents="none"
        data-testid="minimap-viewport"
      />
    </g>
  )
}
// ── FIN: Minimap ──
