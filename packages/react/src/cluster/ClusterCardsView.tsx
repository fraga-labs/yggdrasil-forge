'use client'
// ── INICIO: ClusterCardsView (promovido desde ClusterCards do exemplo) ──
//
// Vista "tarxetas-lista": cada cluster como card (título + filas
// icona/label/badge), forma fixa independente do número de membros.
// Patrón GAIA. Autocontido en pan/zoom (matemática igual á do SkillTree
// pero local: useViewport está acoplado a SVG — banco para refactor
// futuro DOM-agnóstico).
//
// **Cero acoplamento ao exemplo**: autoestilado con inline styles +
// classNames `yf-cluster-*` para override. Posicións inxectadas vía
// `positions`; se faltan, fallback a anel automático.
//
// Lóxica pura en `./logic.ts` (importada por sondas).

import type { CSSProperties, JSX, MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../ThemeProvider.js'
import { isImageRef } from '../icons/imageRef.js'
import type { IconDef, IconPath } from '../icons/registry.js'
import { rowBadge, rowState } from './logic.js'

export interface ClusterMember {
  readonly id: string
  readonly label: string
  /**
   * 17.2: o mesmo contrato ca `node.icon` no grafo — un `IconDef`
   * resolto, ou un string cru (data-URI/URL → imaxe; calquera outro →
   * texto/emoji). A vista nunca descarta unha icona en silencio.
   */
  readonly icon?: IconDef | string
  readonly currentTier: number
  readonly maxTier: number
}

export interface ClusterGroup {
  readonly id: string
  readonly label: string
  /** Cor de acento (título da tarxeta + icona de fila). Dato do consumidor. */
  readonly color: string
  /**
   * 17.8: icona da cabeceira da tarxeta — mesmo contrato ca
   * `ClusterMember.icon` (IconDef → glyph; data-URI/URL → imaxe;
   * calquera outro string → texto/emoji). Nunca descarte silencioso.
   */
  readonly icon?: IconDef | string
  readonly members: readonly ClusterMember[]
}

/** Mapa groupId → posición CSS (`left`/`top` en `%`, `px`, etc.). */
export type CardPositions = Record<string, { readonly left: string; readonly top: string }>

export interface ClusterCardsViewProps {
  readonly groups: readonly ClusterGroup[]
  /**
   * Mapa de posicións por groupId. Para os grupos sen entrada, dispónse
   * automaticamente nun anel de raio fixo (`autoRadiusPercent`% do
   * lenzo) ao redor do centro. Sen `positions`, todos van ao anel.
   */
  readonly positions?: CardPositions
  /**
   * % do tamaño do contedor para o raio do anel automático.
   *
   * **Sen definir (o normal), o anel calcúlase en PÍXELES a partir do
   * tamaño das tarxetas** e a vista encádrase soa ao abrir. Dáse un
   * valor só para forzar o comportamento vello, que non mira canto
   * miden as tarxetas e pode solapalas.
   */
  readonly autoRadiusPercent?: number
  readonly crownLabel?: string
  readonly crownIcon?: IconDef
  readonly selectedNodeId?: string
  readonly onRowClick: (id: string) => void
  /** Límite inferior do zoom. Default 0.4. */
  readonly minZoom?: number
  /** Límite superior do zoom. Default 3.0. */
  readonly maxZoom?: number
}

// ── Pan/zoom local ──
// useViewport (do mesmo paquete) está acoplado a SVGSVGElement; aquí o
// contedor é HTML. Replicamos a matemática esencial (zoomToward sobre
// punto do cursor) localmente. Refactor futuro: useViewport DOM-agnóstico.

const DEFAULT_MIN_ZOOM = 0.4
const DEFAULT_MAX_ZOOM = 3.0
const WHEEL_FACTOR_IN = 1.1
const WHEEL_FACTOR_OUT = 1 / 1.1

function zoomTowardCursor(
  state: { panX: number; panY: number; zoom: number },
  factor: number,
  cursorX: number,
  cursorY: number,
  minZoom: number,
  maxZoom: number,
): { panX: number; panY: number; zoom: number } {
  const newZoom = Math.max(minZoom, Math.min(maxZoom, state.zoom * factor))
  if (newZoom === state.zoom) return state
  const localX = (cursorX - state.panX) / state.zoom
  const localY = (cursorY - state.panY) / state.zoom
  return {
    panX: cursorX - newZoom * localX,
    panY: cursorY - newZoom * localY,
    zoom: newZoom,
  }
}

// ── InlineIcon ──
// Render dun IconDef como SVG root (uso fora dun `<svg>` envolvente).
// Banco para deduplicar con IconGlyph (que se aniña en `<g>`).
function InlineIcon({ def, size }: { def: IconDef; size: number }): JSX.Element {
  const viewBox = def.viewBox ?? '0 0 24 24'
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      <title>icon</title>
      {def.paths.map((p: IconPath, i: number) => {
        const mode = p.mode ?? 'fill'
        if (mode === 'stroke') {
          return (
            <path
              key={`p-${String(i)}`}
              d={p.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }
        return <path key={`p-${String(i)}`} d={p.d} fill="currentColor" />
      })}
    </svg>
  )
}

// ── RowIcon ──
// 17.2: paridade de iconas co grafo. A cela da fila renderiza por caso
// co MESMO criterio de imaxe do SkillNode (icons/imageRef.ts):
//   - IconDef → InlineIcon (glyph recoloreable, como sempre)
//   - string-imaxe (data:/URL/ruta/extensión) → <img> do tamaño da fila
//   - calquera outro string → texto/emoji
// Nunca `null` silencioso: se hai `icon`, algo se pinta.
function RowIcon({
  icon,
  label,
  size,
}: {
  readonly icon: IconDef | string
  readonly label: string
  readonly size: number
}): JSX.Element {
  if (typeof icon !== 'string') return <InlineIcon def={icon} size={size} />
  if (isImageRef(icon)) {
    return (
      <img
        src={icon}
        alt={label}
        loading="lazy"
        width={size}
        height={size}
        style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }}
      />
    )
  }
  // Emoji/carácter: mesma rama de fallback có <text> do SkillNode.
  return (
    <span aria-hidden="true" style={{ fontSize: size * 0.8, lineHeight: 1 }}>
      {icon}
    </span>
  )
}

/** Ancho máximo dunha tarxeta (o `maxWidth` do `cardStyle`) máis folgura. */
const CARD_W = 280 + 24
/** Oco que hai que deixar no medio para a coroa (icona 72 + rótulo). */
const CROWN_W = 180
const CROWN_H = 104
/** Alto estimado: cabeceira + fila por membro + folgura. */
const CARD_HEAD = 46
const CARD_ROW = 26
const CARD_GAP = 24
/**
 * Filas VISIBLES como moito nunha tarxeta; o resto vese rolando dentro
 * dela.
 *
 * **Por que hai tope (19.10).** Unha comarca de dezaseis membros dá unha
 * tarxeta de ~486 px de alto, e sete delas nun anel piden 2.070 px: non
 * caben nin no panel do editor (439) nin maximizado. O que non cabe é o
 * ALTO da tarxeta, non o anel. Con seis filas a tarxeta queda en 226 e o
 * taboleiro enteiro cabe a zoom 0,46, onde aínda se le. Non se agocha
 * nada: a lista rola.
 */
const MAX_FILAS_VISIBLES = 6

/**
 * ¿Debe a roda ROLAR unha lista en vez de facer zoom no lenzo?
 *
 * Devolve o elemento que rola, ou `null` para que mande o zoom. A regra
 * é a de calquera scroll aniñado: rola se hai algo por rolar NESA
 * dirección; se xa se chegou ao final, o xesto pasa ao lenzo e non se
 * queda trabado.
 *
 * Exportado para poder probalo sen navegador: é a peza onde un erro se
 * nota moito (ou non rolas, ou non fas zoom).
 */
export function listaQueRola(alvo: EventTarget | null, deltaY: number): HTMLElement | null {
  if (alvo === null || !(alvo instanceof Element)) return null
  const lista = alvo.closest<HTMLElement>('[data-yf-scroll]')
  if (lista === null) return null
  const máximo = lista.scrollHeight - lista.clientHeight
  if (máximo <= 1) return null
  if (deltaY > 0) return lista.scrollTop < máximo - 1 ? lista : null
  if (deltaY < 0) return lista.scrollTop > 1 ? lista : null
  return null
}

/** Alto REAL dunha tarxeta de `filas` membros, co tope aplicado. */
function cardHeight(filas: number): number {
  return CARD_HEAD + Math.min(filas, MAX_FILAS_VISIBLES) * CARD_ROW + CARD_GAP
}

/**
 * Semi-eixes (en PÍXELES) do anel automático para `n` tarxetas de ata
 * `filas` membros.
 *
 * **Por que en píxeles e non en % (19.10).** O anel ía a un 36% do
 * CONTEDOR sen mirar canto miden as tarxetas. Nun panel de 700×439 iso
 * dá un semi-eixe vertical de 158 px, e unha tarxeta de 16 membros mide
 * uns 460: as tarxetas pisábanse uns ás outras. Vísteo co atlas da
 * galería (sete grupos) no editor.
 *
 * O factor √2 é o que dá a GARANTÍA. Con paso angular Δ, dúas tarxetas
 * veciñas sepáranse |dx| = 2·Rx·sin(Δ/2)·|sin φ| e |dy| =
 * 2·Ry·sin(Δ/2)·|cos φ|. Tomando Rx = √2·w/(2·sin(Δ/2)) (e igual para
 * Ry con h), queda |dx| = √2·w·|sin φ| e |dy| = √2·h·|cos φ|; como
 * max(|sin φ|, |cos φ|) ≥ 1/√2, sempre se cumpre |dx| ≥ w ou |dy| ≥ h.
 * É dicir: as caixas nunca se solapan, veña o ángulo que veña.
 */
function ringRadii(n: number, filas: number): { rx: number; ry: number } {
  const h = cardHeight(filas)
  if (n <= 1) return { rx: 0, ry: 0 }
  const paso = Math.sin(Math.PI / n)
  const k = Math.SQRT2 / (2 * paso)
  // Chan: no medio vai a COROA (icona + nome da árbore), así que o anel
  // ten que despexala. Sen este chan, con dous grupos o anel sae máis
  // apertado que o de antes e as tarxetas rózana — vísteo na captura
  // 10 da guía, co panadeiro.
  //
  // A cota do √2 vale para calquera ángulo, así que cos ángulos
  // concretos dun anel de `n` sobra sitio. Probei a apertala buscando o
  // límite real par a par, e o encadre só subía de 0,46 a 0,48: o que
  // manda é o ALTO DO PANEL, non o anel. Vinte liñas por un 5% non
  // pagan, así que queda a fórmula pechada.
  return {
    rx: Math.max(k * CARD_W, CROWN_W / 2 + CARD_W / 2 + CARD_GAP),
    ry: Math.max(k * h, CROWN_H / 2 + h / 2 + CARD_GAP),
  }
}

/**
 * Posición CSS para un grupo: usa `positions[groupId]` se existe; senón,
 * dispón os grupos restantes nun anel automático ao redor do centro.
 */
function resolvePosition(
  groupId: string,
  groups: readonly ClusterGroup[],
  positions: CardPositions | undefined,
  autoRadiusPercent: number | undefined,
  radii: { rx: number; ry: number },
): { left: string; top: string } {
  if (positions?.[groupId] !== undefined) return positions[groupId]
  // Anel automático: índice entre os grupos SEN posición explícita.
  const groupsWithoutPos = groups.filter((g) => positions?.[g.id] === undefined)
  const idx = groupsWithoutPos.findIndex((g) => g.id === groupId)
  const total = groupsWithoutPos.length
  // Empezar arriba (-π/2) e ir en sentido horario.
  const angle = -Math.PI / 2 + (2 * Math.PI * idx) / Math.max(1, total)
  // Con `autoRadiusPercent` explícito mándao quen chama (compatibilidade
  // exacta); sen el, o anel en píxeles que non deixa solapar.
  if (autoRadiusPercent !== undefined) {
    return {
      left: `${50 + autoRadiusPercent * Math.cos(angle)}%`,
      top: `${50 + autoRadiusPercent * Math.sin(angle)}%`,
    }
  }
  const dx = radii.rx * Math.cos(angle)
  const dy = radii.ry * Math.sin(angle)
  return {
    left: `calc(50% + ${dx.toFixed(1)}px)`,
    top: `calc(50% + ${dy.toFixed(1)}px)`,
  }
}

export function ClusterCardsView({
  groups,
  positions,
  autoRadiusPercent,
  crownLabel,
  crownIcon,
  selectedNodeId,
  onRowClick,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
}: ClusterCardsViewProps): JSX.Element {
  const theme = useTheme()
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── 19.10: anel en píxeles + encadre inicial ──
  //
  // Van xuntos a propósito: un anel máis grande sen encadrar deixaría
  // as tarxetas fóra da vista ao abrir, que é peor que solapadas.
  const nAnel = groups.filter((g) => positions?.[g.id] === undefined).length
  const filasMax = groups.reduce((m, g) => Math.max(m, g.members.length), 0)
  const radii = ringRadii(nAnel, filasMax)
  const anelKey = `${nAnel}:${filasMax}:${autoRadiusPercent ?? 'auto'}`
  const encadradoRef = useRef<string>('')
  const dragStartRef = useRef<{
    clientX: number
    clientY: number
    initialPanX: number
    initialPanY: number
  } | null>(null)

  // Encadre: unha soa vez por «forma do anel». Non se repite en cada
  // render para non pelexar co zoom que faga quen mira.
  useEffect(() => {
    if (autoRadiusPercent !== undefined) return
    if (encadradoRef.current === anelKey) return
    const el = containerRef.current
    if (el === null) return
    const { width, height } = el.getBoundingClientRect()
    if (width <= 0 || height <= 0) return
    encadradoRef.current = anelKey
    const anchoAnel = 2 * radii.rx + CARD_W
    const altoAnel = 2 * radii.ry + cardHeight(filasMax)
    const cabe = Math.min(width / anchoAnel, height / altoAnel)
    const z = Math.max(minZoom, Math.min(1, cabe))
    setZoom(z)
    // O `transformOrigin` é '0 0', así que escalar arrastra cara á
    // esquina: este pan é o que mantén o centro no centro.
    setPan({ x: ((1 - z) * width) / 2, y: ((1 - z) * height) / 2 })
  }, [anelKey, autoRadiusPercent, radii.rx, radii.ry, filasMax, minZoom])

  // Wheel listener non-pasivo (preventDefault require non-pasivo).
  useEffect(() => {
    const el = containerRef.current
    if (el === null) return undefined
    const onWheel = (e: WheelEvent): void => {
      // Se o punteiro está nunha lista que aínda pode rolar, o xesto é
      // dela: nin `preventDefault` nin zoom. Sen isto, unha tarxeta con
      // máis de seis membros sería un cul-de-sac — vese que hai máis e
      // non hai como chegar.
      if (listaQueRola(e.target, e.deltaY) !== null) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const factor = e.deltaY < 0 ? WHEEL_FACTOR_IN : WHEEL_FACTOR_OUT
      setZoom((prevZoom) => {
        setPan((prevPan) => {
          const next = zoomTowardCursor(
            { panX: prevPan.x, panY: prevPan.y, zoom: prevZoom },
            factor,
            cursorX,
            cursorY,
            minZoom,
            maxZoom,
          )
          return { x: next.panX, y: next.panY }
        })
        return Math.max(minZoom, Math.min(maxZoom, prevZoom * factor))
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [minZoom, maxZoom])

  const onMouseDown = (e: ReactMouseEvent<HTMLDivElement>): void => {
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    }
    setIsDragging(true)
  }
  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>): void => {
    const d = dragStartRef.current
    if (d === null) return
    setPan({
      x: d.initialPanX + (e.clientX - d.clientX),
      y: d.initialPanY + (e.clientY - d.clientY),
    })
  }
  const endDrag = (): void => {
    dragStartRef.current = null
    setIsDragging(false)
  }

  const containerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    cursor: isDragging ? 'grabbing' : 'grab',
  }
  const viewportStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    transformOrigin: '0 0',
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  }
  const textColor = theme?.colors.text ?? '#e8dcc4'

  const rowStateColor: Record<'done' | 'actual' | 'locked', string> = {
    done: theme?.colors.nodeMaxed ?? '#5fc89a',
    actual: theme?.colors.nodeUnlockable ?? '#f0b056',
    locked: theme?.colors.nodeLocked ?? '#7c8294',
  }

  return (
    <div
      className="yf-cluster-cards"
      ref={containerRef}
      style={containerStyle}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <div className="yf-cluster-cards__viewport" style={viewportStyle}>
        {(crownIcon !== undefined || crownLabel !== undefined) && (
          <div
            className="yf-cluster-crown"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: '#d6c89a',
            }}
          >
            <div
              className="yf-cluster-crown__glyph"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(217, 138, 43, 0.18)',
                border: '2px solid #d98a2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f0b056',
                boxShadow: '0 0 24px rgba(217, 138, 43, 0.35), inset 0 0 12px rgba(0, 0, 0, 0.4)',
              }}
            >
              {crownIcon !== undefined ? <InlineIcon def={crownIcon} size={42} /> : <span>·</span>}
            </div>
            {crownLabel !== undefined && (
              <div
                className="yf-cluster-crown__label"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.9)',
                }}
              >
                {crownLabel}
              </div>
            )}
          </div>
        )}
        {groups.map((g) => {
          const position = resolvePosition(g.id, groups, positions, autoRadiusPercent, radii)
          const cardStyle: CSSProperties = {
            position: 'absolute',
            left: position.left,
            top: position.top,
            transform: 'translate(-50%, -50%)',
            minWidth: 220,
            maxWidth: 280,
            background: 'rgba(17, 19, 26, 0.92)',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.55)',
            font: '13px / 1.4 system-ui, sans-serif',
            color: textColor,
          }
          return (
            <div key={g.id} className="yf-cluster-card" style={cardStyle}>
              <div
                className="yf-cluster-card__title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  color: '#11131a',
                  background: g.color,
                }}
              >
                {g.icon !== undefined ? (
                  <span
                    className="yf-cluster-card__icon"
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    <RowIcon icon={g.icon} label={g.label} size={16} />
                  </span>
                ) : null}
                {g.label}
              </div>
              <ul
                className="yf-cluster-card__rows"
                // `data-yf-scroll` é o que a roda do rato busca para
                // decidir se rola a lista ou fai zoom no lenzo.
                {...(g.members.length > MAX_FILAS_VISIBLES && { 'data-yf-scroll': '' })}
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: '4px 0',
                  ...(g.members.length > MAX_FILAS_VISIBLES && {
                    maxHeight: MAX_FILAS_VISIBLES * CARD_ROW,
                    overflowY: 'auto',
                  }),
                }}
              >
                {g.members.map((m) => {
                  const state = rowState(m.currentTier, m.maxTier)
                  const badge = rowBadge(m.currentTier, m.maxTier)
                  const isSelected = m.id === selectedNodeId
                  return (
                    <li
                      key={m.id}
                      className={`yf-cluster-row yf-cluster-row--${state}${isSelected ? ' yf-cluster-row--selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="yf-cluster-row__button"
                        onClick={() => onRowClick(m.id)}
                        style={{
                          width: '100%',
                          display: 'grid',
                          gridTemplateColumns: '24px 1fr auto',
                          alignItems: 'center',
                          gap: 10,
                          padding: '7px 14px',
                          background: isSelected ? 'rgba(217, 138, 43, 0.12)' : 'transparent',
                          border: 'none',
                          borderLeft: `3px solid ${isSelected ? '#d98a2b' : 'transparent'}`,
                          color: 'inherit',
                          font: 'inherit',
                          textAlign: 'left',
                          cursor: 'pointer',
                          opacity: state === 'locked' ? 0.85 : 1,
                        }}
                      >
                        <span
                          className="yf-cluster-row__icon"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: g.color,
                          }}
                        >
                          {m.icon !== undefined ? (
                            <RowIcon icon={m.icon} label={m.label} size={20} />
                          ) : null}
                        </span>
                        <span
                          className="yf-cluster-row__label"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            opacity: state === 'locked' ? 0.6 : 1,
                          }}
                        >
                          {m.label}
                        </span>
                        <span
                          className="yf-cluster-row__badge"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            minWidth: 24,
                            textAlign: 'right',
                            color: rowStateColor[state],
                          }}
                        >
                          {badge}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
// ── FIN: ClusterCardsView ──
