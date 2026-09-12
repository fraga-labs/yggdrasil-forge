'use client'

// ── INICIO: SkillNode ──
// Compoñente átomo de nodo. Renderiza <g> con <circle> + <text>.

import type { NodeDef, NodeInstance, NodeState, Position } from '@yggdrasil-forge/core'
import {
  type CSSProperties,
  type FocusEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  memo,
  useId,
  useRef,
  useState,
} from 'react'
import { useTheme } from './ThemeProvider.js'
import { glowFilterStyle, glowRadiusOf, glowsForState } from './glow.js'
import { IconGlyph } from './icons/IconGlyph.js'
import { isImageRef } from './icons/imageRef.js'
import { getIcon } from './icons/registry.js'
import { ORNATE_CLASS, renderNodeShape, resolveRadius, resolveShape } from './nodeGeometry.js'
import type { Theme } from './theme-types.js'

export interface SkillNodeProps {
  /** Definición do nodo (do TreeDef). */
  readonly node: NodeDef

  /**
   * Instancia actual do nodo (do TreeState). Pode ser undefined se
   * o engine aínda non inicializou esta entrada (defensivo).
   */
  readonly instance: NodeInstance | undefined

  /** Posición no layout. */
  readonly position: Position

  /** Callback cando o usuario clica/activa este nodo. */
  readonly onClick?: (nodeId: string) => void

  /**
   * Handler opcional que se dispara cando o usuario mantén premido
   * o nodo durante `longPressDuration` ms sen levantar o pointer.
   * Útil para mobile/touch (long press como gesture de contexto).
   */
  readonly onLongPress?: (nodeId: string) => void

  /**
   * Duración en ms para considerar un long press. Default 700.
   * Cero efecto se `onLongPress` é undefined.
   */
  readonly longPressDuration?: number

  /**
   * Marca este nodo como **seleccionado** (F10.7). Render: anel de
   * selección exterior con `theme.colors.selected` (fallback a
   * `nodeUnlockable`). Tamén pon `data-selected="true"` no `<g>` raíz.
   *
   * Controlado polo consumidor (vía `SkillTree.selectedNodeId`); este
   * compoñente non xestiona internamente que nodo está seleccionado.
   */
  readonly selected?: boolean

  /**
   * Callback opcional disparado cando o pointer entra/sae do nodo
   * (F10.7). Recibe o `nodeId` ao entrar, `null` ao saír. Permite
   * que o consumidor sincronice un panel lateral, tooltip externo,
   * etc.
   *
   * Ortogonal a `onClick` / `onLongPress`. Cero impacto no pan/zoom
   * do viewport (events de pointer no SVG raíz seguen funcionando).
   */
  readonly onHover?: (nodeId: string | null) => void

  /**
   * Mostrar o badge de progresión `currentTier/maxTier` na esquina
   * inferior dereita do nodo (Interactivo Capa B). Por defecto **só
   * se amosa para nodos multi-tier** (`maxTier > 1`); con
   * `showTierBadge: false` ocúltase sempre; con `true` fórzase
   * mesmo en single-tier (útil para depuración / construtores
   * interactivos onde todos os nodos deben amosar o seu progreso).
   *
   * O badge é un `<text>` SVG inline-tematizado; non depende do icono
   * (segue visible aínda que o icon id caia ao fallback de texto).
   */
  readonly showTierBadge?: boolean

  /**
   * O motor di que este nodo se pode desbloquear AGORA (19.2).
   *
   * `unlockable` nunca é un estado gardado: o motor só o escribe se un
   * documento o forza cun efecto `modify_node_state`. É unha PREGUNTA
   * (`canUnlock`), e quen a fai é o `SkillTree`, que ten o motor á man.
   * Aquí chega xa respondida para que o nodo se pinte co seu recheo,
   * o seu anel e o pulso de «prémeme».
   */
  readonly unlockable?: boolean
}

const DEFAULT_LONG_PRESS_MS = 700

function SkillNodeImpl({
  node,
  instance,
  position,
  onClick,
  onLongPress,
  longPressDuration,
  selected,
  onHover,
  showTierBadge,
  unlockable,
}: SkillNodeProps): JSX.Element {
  const state = instance?.state ?? 'locked'
  const tier = instance?.currentTier ?? 0
  const progress = instance?.progress

  const shape = resolveShape(node)
  const radius = resolveRadius(node)
  const icon = node.icon
  const labelY = radius + 16

  // F10.3.fix: tematización inline (non via <style> scopeado). Cada cor
  // calcúlase desde useTheme() e aplícase como inline CSS no elemento.
  // exactOptionalPropertyTypes: spread condicional para non emitir
  // `prop: undefined` (rompería con strict 'exactOptionalPropertyTypes').
  const theme = useTheme()
  // 19.4: a esta densidade os nodos pequenos non levan texto (ver
  // `ThemeSizes.labelMinRadius`). Agóchase só o <text>: nos nodos
  // interactivos o `aria-label` segue levando o texto enteiro, así que
  // quen usa lector de pantalla non perde nada.
  const labelMinRadius = theme?.sizes.labelMinRadius ?? 0
  // 19.8: marco ornamental nos nodos grandes. Vai ANTES do shape para
  // que o corpo se pinte enriba; o `fill: none` deixa ver o fondo entre
  // os dous aneis, que é o que fai que pareza un marco e non un borde.
  const ornateMinRadius = theme?.sizes.ornateMinRadius ?? 0
  const levaMarco = ornateMinRadius > 0 && radius >= ornateMinRadius
  const mereceRotulo = labelMinRadius <= 0 || radius >= labelMinRadius
  // Renderer sub-fase 1: estado visual derivado (in_progress cosmético
  // para multi-tier a medias) + fill por estado + override `node.color`.
  // Cero regresión: sen tokens de fill por estado nin `node.color`, o
  // resultado é `theme.colors.nodeFill` (idéntico ao previo).
  const visualState = visualStateFor(state, tier, node.maxTier, unlockable)
  const fill: string =
    theme !== null ? fillColorForState(theme, visualState, node.color) : (node.color ?? '#f4f4ef')
  const ring: string | undefined =
    theme !== null ? ringColorForState(theme, visualState) : undefined
  const ringWidth: number = theme?.sizes.ringWidth ?? 3
  const textColor: string | undefined = theme?.colors.text
  const fontSize: number | undefined = theme?.sizes.fontSize
  const fontSizeSmall: number | undefined = theme?.sizes.fontSizeSmall

  // F10.8: typography tokens opcionais do tema. Spread condicional
  // para non emitir `prop: undefined` (rompería exactOptionalPropertyTypes).
  // Aplícase aos `<text>` de label e ao fallback de icono-texto.
  const typography = theme?.typography
  const typographyStyle: CSSProperties = {
    ...(typography?.fontFamily !== undefined && { fontFamily: typography.fontFamily }),
    ...(typography?.fontWeight !== undefined && { fontWeight: typography.fontWeight }),
    ...(typography?.letterSpacing !== undefined && { letterSpacing: typography.letterSpacing }),
    ...(typography?.textTransform !== undefined && { textTransform: typography.textTransform }),
  }

  // F10.5: cor do icono = ThemeColors.icon (opt) ?? text (fallback).
  const iconColor: string | undefined = theme?.colors.icon ?? textColor

  // F10.7: cor do anel de selección/foco. Fallback a `nodeUnlockable`
  // que xa é unha cor accesible/destacada do tema (a do anel
  // "podes desbloquearme"); mantén coherencia visual sen requirir
  // que o consumidor declare unha nova cor.
  const selectedColor: string | undefined = theme?.colors.selected ?? theme?.colors.nodeUnlockable

  // F10.7: estado local de hover/focus para afordancias visuais. Non
  // viaxa ao engine; é puramente UI. `onHover` (callback ao
  // consumidor) é independente — engadímolo cando o pointer entra/sae,
  // independentemente do estado local.
  const [isHovering, setHovering] = useState(false)
  // Id único POR INSTANCIA para o clipPath da icona (mesmo precedente
  // que `useId()` no SVGRenderer). Sen os `:` que React mete (non son
  // válidos dentro de `url(#…)`).
  const instanceId = useId().replace(/:/g, '')
  const [isFocused, setFocused] = useState(false)

  // F10.5: resolución do icono — (a) ID rexistrado → IconGlyph;
  // (b) URL (http/https/// relativa) → <image>; (c) calquera outro →
  // <text> (emoji/char, fallback retrocompatible).
  const iconDef = icon !== undefined ? getIcon(icon) : undefined
  // F11.3: imaxe se NON é glyph e parece recurso de imaxe. O criterio
  // vive en icons/imageRef.ts (compartido coa vista de tarxetas desde
  // o 17.2); calquera outra cadea (emoji, texto curto) cae á rama
  // <text>.
  const iconIsUrl = icon !== undefined && isImageRef(icon)
  // Tamaño do icono SVG: proporcional ao raio. Mantén o oco do emoji
  // anterior (radius=26 daba ~26px de glyph), e escala ao redor diso.
  const iconSize = radius * 1.0
  // F11.3b: badges raster (rutas/URIs de imaxe) renderízanse a un tamaño
  // maior ca os glyphs vector. Os badges deséñanse verticais ou cadrados
  // (~1:1 a 0.77:1); a imaxe preserva proporción co `preserveAspectRatio`
  // do `<image>`. O estado do nodo amósase co anel, polo que o badge non
  // debe tapalo de todo — de aí o `1.8` e non `2.0` (deixa ~10% de marxe
  // ao bordo). Glyphs vector seguen a `iconSize` (sen cambio).
  //
  // Nota de deseño (adendo iconScale, Decisión 3 · opción A): ese ~10%
  // de anel visible con `iconScale === 1` é INTENCIONADO, non un bug —
  // garante que o estado do nodo (bloqueado/desbloqueado/maxed…) segue
  // lexible por defecto nos nodos con icona-imaxe. Quen queira que a
  // imaxe cubra máis pode subir `iconScale` (ata 3) desde o Inspector.
  const imageSize = radius * 1.8
  // ★ Zoom manual do autor (Inspector, barra de axuste). Só ten
  // sentido para badges raster (iconIsUrl); glyphs vector ignórano.
  // 1 = tamaño base (imageSize); ata 3 = achega moito máis. Clamp
  // defensivo aquí tamén (o schema xa o fai, pero un dato importado
  // á man podería saltalo).
  const iconScale = Math.min(3, Math.max(1, node.iconScale ?? 1))
  const effectiveImageSize = imageSize * iconScale
  // ★ Recorte á forma real do nodo (círculo/hexágono/...): sen isto,
  // unha imaxe non-cadrada deixaba marxes baleiras dentro do
  // `preserveAspectRatio="meet"` orixinal, e nunca se axustaba de
  // verdade "dentro" da forma. O clip usa `radius` (a forma real),
  // non `effectiveImageSize` — así a imaxe NUNCA escapa do contorno
  // do nodo por moito zoom que se lle poña.
  //
  // O id do clipPath vai prefixado por `instanceId` (useId) para
  // evitar colisións cando hai VARIOS `SkillTree` na mesma páxina co
  // mesmo `node.id` (ids DOM duplicados → `url(#…)` apunta ao clip
  // doutra árbore). Ademais saneamos o `node.id` (só [A-Za-z0-9_-])
  // para que ids con espazos/comiñas/unicode non rompan a referencia.
  const safeNodeId = node.id.replace(/[^A-Za-z0-9_-]/g, '_')
  const iconClipId = `yf-icon-clip-${instanceId}-${safeNodeId}`
  // F11.3c: nodos locked → badge raster atenuado (grayscale + escurecido) para
  // que o estado salte á vista cos badges grandes e vívidos. Só afecta á imaxe;
  // o anel conserva a cor de estado, e glyph/<text> tampouco se tocan. O union
  // NodeState ('locked'|'unlockable'|'in_progress'|'unlocked'|'maxed'|'disabled'
  // |'expired') non inclúe 'incompatible' — esa categoría calcúlase fóra (no
  // exemplo) por exclusións; só atenuamos cando o `instance.state` é 'locked'.
  const dimBadge = state === 'locked'

  // 19.7: resplandor. Só nos estados que o tema acende, e só se o tema
  // o pediu: sen `effects.glowRadius` isto é `undefined` e o markup non
  // cambia nin un byte.
  const glowStyle = glowsForState(theme, visualState)
    ? glowFilterStyle(glowRadiusOf(theme))
    : undefined
  const shapeStyle: CSSProperties = {
    fill,
    strokeWidth: ringWidth,
    ...(ring !== undefined && { stroke: ring }),
    ...(glowStyle !== undefined && { filter: glowStyle }),
  }
  const labelStyle: CSSProperties = {
    ...(textColor !== undefined && { fill: textColor }),
    ...(fontSize !== undefined && { fontSize }),
    ...typographyStyle,
  }
  // ── 19.10: halo do rótulo ──
  //
  // O texto do nodo cae sobre arestas, tintes de comarca e o nome da
  // rexión. Sen halo hai combinacións nas que non se le — e nos mockups
  // fundacionais o texto SEMPRE se le. `paintOrder: 'stroke'` pinta
  // primeiro un trazo da cor do FONDO e despois o recheo por riba: o
  // glifo queda nítido e o contorno abre un oco arredor.
  //
  // Só no rótulo e no progreso, non no icono: o glifo do icono xa vai
  // dentro do corpo do nodo, que é opaco.
  //
  // A cor sae de `background` e, faltando esa, de `mesh`. **Non é un
  // detalle**: `colors.background` é opcional e NINGÚN dos dous temas
  // base o define, así que atarlle o halo só a el deixábao morto
  // exactamente onde máis falta — nun `ygg render`. Mesma trampa que o
  // `nodeStroke` do 19.0, cazada esta vez mirando o SVG. `mesh` é a cor
  // da retícula do lenzo: sempre definida e sempre veciña do fondo.
  const fondo = theme?.colors.background ?? theme?.colors.mesh
  const haloStyle: CSSProperties =
    fondo === undefined
      ? {}
      : {
          paintOrder: 'stroke',
          stroke: fondo,
          strokeWidth: Math.max(2, (fontSize ?? 12) * 0.3),
          strokeLinejoin: 'round',
        }
  const labelConHalo: CSSProperties = { ...labelStyle, ...haloStyle }
  const progressStyle: CSSProperties = {
    ...(textColor !== undefined && { fill: textColor }),
    ...(fontSizeSmall !== undefined && { fontSize: fontSizeSmall }),
    ...typographyStyle,
    ...haloStyle,
  }

  // F11.x: truncado opt-in da etiqueta. Activo só se theme.sizes.maxLabelChars
  // é un número > 0 e a etiqueta o excede. Cando trunca, mostramos `N…` no
  // <text> visible e engadimos un <title> co texto completo (tooltip nativo
  // ao hover). O `aria-label` resólvese desde `formatAriaLabel(node, state)`
  // → `resolveLabel(node)` (texto completo), e iso non se toca.
  const fullLabel = resolveLabel(node)
  const maxLabelChars = theme?.sizes.maxLabelChars
  const labelTruncated =
    typeof maxLabelChars === 'number' && maxLabelChars > 0 && fullLabel.length > maxLabelChars
  const displayLabel = labelTruncated
    ? `${fullLabel.slice(0, maxLabelChars).trimEnd()}…`
    : fullLabel

  const handleClick =
    onClick !== undefined ? (_e: MouseEvent<SVGGElement>) => onClick(node.id) : undefined

  const handleKeyDown =
    onClick !== undefined
      ? (e: KeyboardEvent<SVGGElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick(node.id)
          }
        }
      : undefined

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelLongPress = (): void => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerDown =
    onLongPress !== undefined
      ? (_e: PointerEvent<SVGGElement>) => {
          cancelLongPress()
          longPressTimerRef.current = setTimeout(() => {
            onLongPress(node.id)
            longPressTimerRef.current = null
          }, longPressDuration ?? DEFAULT_LONG_PRESS_MS)
        }
      : undefined

  const handlePointerEnd =
    onLongPress !== undefined ? (_e: PointerEvent<SVGGElement>) => cancelLongPress() : undefined

  // F10.7: hover/focus handlers. Sempre actívanse (cero impacto se
  // `onHover` non se pasa). O estado local móvese tanto se hai
  // callback como se non — o overlay debúxase segundo o estado.
  const handlePointerEnter = (_e: PointerEvent<SVGGElement>): void => {
    setHovering(true)
    if (onHover !== undefined) onHover(node.id)
  }
  const handlePointerLeave = (e: PointerEvent<SVGGElement>): void => {
    setHovering(false)
    if (onHover !== undefined) onHover(null)
    // Se había un long press en curso, cancélase tamén (mesmo
    // comportamento que tiña handlePointerEnd; mantemos ambos por
    // claridade).
    if (handlePointerEnd !== undefined) handlePointerEnd(e)
  }
  const handleFocus = (_e: FocusEvent<SVGGElement>): void => {
    setFocused(true)
  }
  const handleBlur = (_e: FocusEvent<SVGGElement>): void => {
    setFocused(false)
  }

  // F10.7: cursor de man cando o nodo é interactivo (afordancia
  // descubribilidade). Inline style para que viaxe co tema sen
  // depender de CSS externo.
  const containerStyle: CSSProperties = {
    ...(onClick !== undefined && { cursor: 'pointer' }),
  }

  // F10.7: cálculo do overlay de selección/foco/hover. Orde de
  // prioridade visual: selected > focused > hovering. Cero overlay
  // se ningún. Render como `<circle>` exterior universal (envolve
  // shapes non circulares; pragmático e visualmente coherente).
  const overlayRadius = radius + ringWidth + 4
  let overlay: JSX.Element | null = null
  if (selected === true && selectedColor !== undefined) {
    overlay = (
      <circle
        className="yf-skill-node__selection"
        r={overlayRadius}
        style={{
          fill: 'none',
          stroke: selectedColor,
          strokeWidth: ringWidth,
        }}
      />
    )
  } else if (isFocused && selectedColor !== undefined) {
    // Foco de teclado: mesmo cor que selección pero dashed (distingue
    // visualmente sen requirir nova cor).
    overlay = (
      <circle
        className="yf-skill-node__focus"
        r={overlayRadius}
        style={{
          fill: 'none',
          stroke: selectedColor,
          strokeWidth: ringWidth,
          strokeDasharray: '4 3',
        }}
      />
    )
  } else if (isHovering && textColor !== undefined) {
    // Hover: anel exterior fino sutil. Cor do texto (que xa é parte
    // do tema), opacidade reducida para non competir con selección.
    // Sen glow pesado (briefing §5).
    overlay = (
      <circle
        className="yf-skill-node__hover"
        r={overlayRadius}
        style={{
          fill: 'none',
          stroke: textColor,
          strokeWidth: 1,
          opacity: 0.5,
        }}
      />
    )
  }

  return (
    <g
      className="yf-skill-node"
      data-node-id={node.id}
      // `data-state` é o estado CRU do motor — contrato estable desde
      // 1.0, e a verdade do dominio.
      data-state={state}
      // `data-visual-state` (19.2) é o que se VE: engade `in_progress`
      // para os multi-rango a medias e `unlockable` cando o motor di que
      // se pode abrir agora. Existe porque os dous non coinciden e antes
      // só se publicaba un: o pulso de `animations.ts` apuntaba a
      // `[data-state="unlockable"]`, un valor que o motor non garda
      // nunca, así que non disparaba xamais.
      data-visual-state={visualState}
      data-tier={tier}
      {...(selected === true && { 'data-selected': 'true' })}
      {...(isHovering && { 'data-hover': 'true' })}
      {...(isFocused && { 'data-focused': 'true' })}
      transform={`translate(${position.x},${position.y})`}
      style={containerStyle}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...(handleClick !== undefined && {
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        tabIndex: 0,
        role: 'button',
        'aria-label': formatAriaLabel(node, state),
      })}
      {...(handlePointerDown !== undefined && {
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerEnd,
        onPointerCancel: handlePointerEnd,
      })}
    >
      {labelTruncated && <title>{fullLabel}</title>}
      {overlay}
      {levaMarco &&
        renderNodeShape(
          shape,
          radius * 1.2,
          {
            fill: 'none',
            strokeWidth: Math.max(1, ringWidth * 0.6),
            ...(ring !== undefined && { stroke: ring }),
            opacity: 0.55,
          },
          ORNATE_CLASS,
        )}
      {renderNodeShape(shape, radius, shapeStyle)}
      {iconDef !== undefined && (
        <IconGlyph
          def={iconDef}
          size={iconSize}
          {...(iconColor !== undefined && { color: iconColor })}
        />
      )}
      {iconDef === undefined && iconIsUrl && icon !== undefined && (
        <>
          <defs>
            <clipPath id={iconClipId}>{renderNodeShape(shape, radius)}</clipPath>
          </defs>
          <image
            className="yf-skill-node__icon"
            href={icon}
            x={-effectiveImageSize / 2}
            y={-effectiveImageSize / 2}
            width={effectiveImageSize}
            height={effectiveImageSize}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${iconClipId})`}
            {...(dimBadge ? { style: { filter: 'grayscale(1) brightness(0.5)' } } : {})}
          />
        </>
      )}
      {iconDef === undefined && !iconIsUrl && icon !== undefined && (
        <text
          className="yf-skill-node__icon"
          textAnchor="middle"
          dominantBaseline="central"
          style={labelStyle}
        >
          {icon}
        </text>
      )}
      {mereceRotulo && (
        <text className="yf-skill-node__label" textAnchor="middle" y={labelY} style={labelConHalo}>
          {displayLabel}
        </text>
      )}
      {progress !== undefined && (
        <text
          className="yf-skill-node__progress"
          textAnchor="middle"
          y={labelY + 16}
          style={progressStyle}
        >
          {progress}%
        </text>
      )}
      {/* Interactivo Capa B: badge currentTier/maxTier na esquina inferior
          dereita. Default: amosar en multi-tier; con showTierBadge controla. */}
      {(() => {
        const maxTier = node.maxTier ?? 1
        const visible = showTierBadge ?? maxTier > 1
        if (!visible) return null
        const badgeX = radius * 0.75
        const badgeY = radius * 0.75
        const badgeR = Math.max(8, radius * 0.32)
        return (
          <g className="yf-skill-node__tier-badge" data-testid="tier-badge" pointerEvents="none">
            <circle
              cx={badgeX}
              cy={badgeY}
              r={badgeR}
              fill={fill}
              stroke={ring ?? '#666'}
              strokeWidth={1.5}
            />
            <text
              x={badgeX}
              y={badgeY}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontSize: Math.max(9, radius * 0.28),
                fontWeight: 600,
                fill: textColor ?? '#2a2a2a',
                ...(typography?.fontFamily !== undefined && {
                  fontFamily: typography.fontFamily,
                }),
              }}
            >
              {tier}/{maxTier}
            </text>
          </g>
        )
      })()}
    </g>
  )
}

/**
 * `SkillNode` memoizado (Fase 16.4 perf). Os seus props son referencias
 * estables entre interaccións (node do TreeDef, instance do snapshot,
 * position do layout memoizado, callbacks do consumidor), así que
 * seleccionar ou arrastrar NON ten por que reconciliar os N nodos: a
 * medición a 1500 nodos daba ~200 ms por selección e ~1,7 s por drag
 * só por re-render. `memo` convérteo en N comparacións superficiais.
 * Sen cambio de API: mesmo nome, mesmos props, mesmo tipo de compoñente.
 */
export const SkillNode = memo(SkillNodeImpl)
SkillNode.displayName = 'SkillNode'

/**
 * Resolve o label do nodo. Se é LocalizedString (Record), devolve un
 * fallback razoable (en 7.4 ThemeProvider proverá locale; en 7.2
 * cero contexto).
 */
function resolveLabel(node: NodeDef): string {
  const lbl = node.label
  if (typeof lbl === 'string') return lbl
  // LocalizedString Record: pick gl > es > en > first value > id como fallback básico (7.2).
  return lbl.gl ?? lbl.es ?? lbl.en ?? Object.values(lbl)[0] ?? node.id
}

/**
 * Constrúe o aria-label do nodo incluíndo o label resoluble + estado
 * actual. Patrón: "{label}, {stateLabel}".
 */
function formatAriaLabel(node: NodeDef, state: NodeState): string {
  return `${resolveLabel(node)}, ${ARIA_STATE_LABELS[state]}`
}

const ARIA_STATE_LABELS: Readonly<Record<NodeState, string>> = {
  locked: 'locked',
  unlockable: 'unlockable',
  in_progress: 'in progress',
  unlocked: 'unlocked',
  maxed: 'maxed',
  disabled: 'disabled',
  expired: 'expired',
}

/**
 * Devolve a cor de anel (stroke) para un `NodeState` dado o `Theme`.
 *
 * Mapa (F10.3.fix):
 * - `locked`      → `nodeLocked`
 * - `unlockable`  → `nodeUnlockable`
 * - `unlocked`    → `nodeUnlocked`
 * - `maxed`       → `nodeMaxed`
 * - `in_progress` → `nodeInProgress`
 * - `disabled`, `expired` → `nodeLocked` (convención do tema "minimal":
 *   estes estados non teñen cor específica e caen no fallback locked).
 *
 * Helper puro; exportado para tests.
 */
export function ringColorForState(theme: Theme, state: NodeState): string {
  switch (state) {
    case 'unlockable':
      return theme.colors.nodeUnlockable
    case 'unlocked':
      return theme.colors.nodeUnlocked
    case 'maxed':
      return theme.colors.nodeMaxed
    case 'in_progress':
      return theme.colors.nodeInProgress
    default:
      return theme.colors.nodeLocked
  }
}

/**
 * Derivación cosmética do estado visual a partir do `NodeState` do
 * motor (Renderer sub-fase 1).
 *
 * Un nodo multi-tier (`maxTier > 1`) **a medias** (`0 < currentTier <
 * maxTier`) píntase como `in_progress` aínda que o motor lle dea
 * `unlocked`. Iso é cosmético: o motor segue facendo as súas
 * comprobacións sobre o `NodeState` real; aquí só decidimos cor.
 *
 * Casos:
 * - Single-tier (maxTier === 1 ou undefined): devolve o `state` cru.
 * - Multi-tier coa tier no medio: devolve `'in_progress'`.
 * - Multi-tier en 0 ou en maxTier: devolve o `state` cru (locked/maxed).
 *
 * Aplícase **tanto** ao anel coma ao fill, de modo que o tema só ten
 * que definir `nodeFillInProgress` para que os tiers parciais teñan
 * o seu corpo característico (ex. dourado tenue).
 */
export function visualStateFor(
  state: NodeState,
  currentTier: number,
  maxTier: number | undefined,
  unlockable?: boolean,
): NodeState {
  if (maxTier !== undefined && maxTier > 1 && currentTier > 0 && currentTier < maxTier) {
    return 'in_progress'
  }
  // 19.2: `unlockable` é derivado, igual que `in_progress`. Só se aplica
  // sobre `locked`: un nodo xa aberto non volve a «prémeme», e un
  // multi-rango a medias xa gañou arriba (ten rango > 0, logo non é
  // locked). Sen a resposta do motor, comportamento idéntico ao previo.
  if (state === 'locked' && unlockable === true) {
    return 'unlockable'
  }
  return state
}

/**
 * Resolve o fill do corpo do nodo (Renderer sub-fase 1).
 *
 * Prioridade (de máis específico a máis xenérico):
 * 1. `nodeColor` (override por-nodo desde `NodeDef.color`) — gaña sempre.
 * 2. `theme.colors.nodeFill<State>` — fill por estado, se o tema o declara.
 * 3. `theme.colors.nodeFill` — interior único (comportamento legado).
 * 4. `'#f4f4ef'` — default último recurso.
 *
 * O `visualState` esperado é o derivado por `visualStateFor`, non o
 * `NodeState` cru: así, un multi-tier a medias usa `nodeFillInProgress`
 * automaticamente.
 *
 * **Cero regresión por defecto**: sen tokens `nodeFill<State>` no tema
 * e sen `node.color`, devolve `theme.colors.nodeFill ?? '#f4f4ef'`,
 * idéntico ao comportamento previo á sub-fase 1.
 *
 * Helper puro; exportado para tests.
 */
export function fillColorForState(
  theme: Theme,
  visualState: NodeState,
  nodeColor?: string,
): string {
  if (nodeColor !== undefined) return nodeColor
  const c = theme.colors
  const byState =
    visualState === 'locked'
      ? c.nodeFillLocked
      : visualState === 'unlockable'
        ? c.nodeFillUnlockable
        : visualState === 'in_progress'
          ? c.nodeFillInProgress
          : visualState === 'maxed'
            ? c.nodeFillMaxed
            : c.nodeFillUnlocked
  return byState ?? c.nodeFill ?? '#f4f4ef'
}
// ── FIN: SkillNode ──
