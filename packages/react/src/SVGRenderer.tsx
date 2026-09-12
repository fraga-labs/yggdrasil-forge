'use client'

import type { Bounds } from '@yggdrasil-forge/core'
// ── INICIO: SVGRenderer ──
import {
  type CSSProperties,
  type JSX,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
  useId,
} from 'react'
import { useTheme } from './ThemeProvider.js'
import { buildAnimationsCSS } from './animations.js'
import { glowFilterId, glowRadiusOf } from './glow.js'
import { buildViewBox } from './svg-helpers.js'

// Ambiente de módulo: tipa `process.env.NODE_ENV` sen depender de
// @types/node. Non crea un global; só satisfai o typecheck. O acceso
// real é o texto estático que os bundlers (vite/webpack/esbuild)
// substitúen en build → en prod plégase a constante e o banner
// elimínase; en dev resólvese a verdadeiro.
declare const process: { readonly env: { readonly NODE_ENV?: string } }

/**
 * ID estable do marker `<marker>` da frecha (F10.4). Compartido entre
 * `SVGRenderer` (que define o marker en `<defs>`) e `SkillEdge` (que o
 * referencia via `marker-end="url(#...)"`).
 *
 * Estable cross-instance: hai un só skill-tree por viewport como caso
 * típico; aínda con varios, todos comparten o mesmo marker (mesmo
 * shape), polo que un id global é suficiente.
 */
export const ARROW_MARKER_ID = 'yf-arrow-marker'

export interface SVGRendererProps {
  readonly bounds?: Bounds
  readonly padding?: number
  readonly layoutType?: string
  readonly error?: string
  /** Mensaxe detallada do erro (só se mostra en DEV). */
  readonly errorMessage?: string
  readonly ariaLabel?: string
  readonly children?: ReactNode
  /**
   * Transform SVG aplicado ao `<g>` que envolve os children (F10.6).
   * Default: identidade (sen pan/zoom). O `<defs>` queda **fóra** do
   * transform para que os markers non escalen co contido.
   */
  readonly transform?: string
  /** Pan/zoom handlers (F10.6); todos opcionais. */
  readonly onPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void
  readonly onPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void
  readonly onPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void
  /**
   * URL de imaxe a renderizar como fondo do canvas, **dentro** do grupo
   * de pan/zoom (escala e desprázase cos nodos). Ocupa o box dos
   * `bounds` con `preserveAspectRatio="xMidYMid meet"`. Cero efecto se
   * non se pasa.
   */
  readonly backgroundImage?: string
}

/**
 * F10.3.fix — tematización inline.
 *
 * `SVGRenderer` xa NON inxecta CSS variables nin emite regras de cor.
 * As cores aplícanse como inline `style` polos consumidores
 * (`SkillNode`, `SkillEdge`, `MeshOverlay`) calculando desde
 * `useTheme()` no propio compoñente.
 *
 * Conservamos:
 * - `data-theme-id={themeId}` (áncora estable para scope das animacións).
 * - `<style>{buildAnimationsCSS(themeId)}</style>` (transicións,
 *   keyframes, pulse, reduced-motion). Esas si funcionan e dan vida ao
 *   cambio de cor.
 *
 * Por que o cambio: o modelo anterior (CSS vars + regras `var()` nun
 * `<style>` interior scopeado por `data-theme-id`) só aplicaba en
 * background no demo do navegador real (cascade/scope inestable). Vendo
 * que o problema era estrutural, eliminamos a dependencia do `<style>`
 * interior para cores e usamos inline-style coa propiedade CSS (non
 * atributo SVG) para conservar transicións.
 */
export const SVGRenderer = forwardRef<SVGSVGElement, SVGRendererProps>(function SVGRenderer(
  {
    bounds,
    padding = 16,
    layoutType,
    error,
    errorMessage,
    ariaLabel,
    children,
    transform,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    backgroundImage,
  },
  ref,
): JSX.Element {
  const theme = useTheme()
  const themeId = useId()
  const glowRadius = glowRadiusOf(theme)
  const viewBox = buildViewBox(bounds, padding)

  if (error !== undefined) {
    // DEV vs PROD: banner visible só fóra de produción. Usamos o texto
    // estático `process.env.NODE_ENV` para que os bundlers (vite/webpack/
    // esbuild) o substitúan en build → en prod plégase a constante e o
    // banner elimínase; en dev (navegador incluído) resólvese a verdadeiro.
    // Sen garda `typeof process`: rompería a substitución (deixaría un
    // `typeof process` runtime que en navegador dá 'undefined' e mataría
    // o banner en dev). Mesmo patrón que usa React.
    const isDev = process.env.NODE_ENV !== 'production'
    return (
      <svg
        ref={ref}
        className="yf-skill-tree yf-skill-tree--error"
        data-error={error}
        style={{ display: 'block', width: '100%', height: '100%' }}
        viewBox={isDev ? '0 0 320 120' : viewBox}
        role="img"
        aria-label={
          ariaLabel ?? (isDev ? `Skill tree (layout error: ${error})` : 'Skill tree (layout error)')
        }
      >
        {isDev ? (
          <g>
            <rect x="0" y="0" width="320" height="120" fill="#fdeaea" />
            <text
              x="160"
              y="48"
              textAnchor="middle"
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                fill: '#a3261f',
              }}
            >
              Layout error: {error}
            </text>
            {errorMessage !== undefined ? (
              <text
                x="160"
                y="72"
                textAnchor="middle"
                style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 11,
                  fill: '#a3261f',
                }}
              >
                {errorMessage}
              </text>
            ) : null}
            <text
              x="160"
              y="98"
              textAnchor="middle"
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: 10,
                fill: '#a3261f',
                opacity: 0.7,
              }}
            >
              (visible in dev only)
            </text>
          </g>
        ) : null}
      </svg>
    )
  }

  const animationsCSS = theme !== null ? buildAnimationsCSS(themeId) : null

  // F10.4: marker de frecha en <defs>. fill inline desde useTheme()
  // (mesmo patrón que SkillEdge stroke). Só se emite cando hai tema —
  // mesma convención que data-theme-id e o <style> de animacións.
  const arrowFillStyle: CSSProperties | undefined =
    theme !== null && theme.colors.edge !== undefined ? { fill: theme.colors.edge } : undefined

  // F10.8: background do SVG aplicado **inline** (a vía CSS-var via
  // <style> interior era inestable; o inline funciona). Cero
  // background no tema = SVG transparente (comportamento previo).
  const themeStyle: CSSProperties | undefined =
    theme?.colors.background !== undefined ? { background: theme.colors.background } : undefined

  // Layout-L fix: o <svg> enche o seu contedor por defecto. Sen isto,
  // o navegador usa as dimensións intrínsecas do viewBox e o consumidor
  // ten que engadir CSS para evitar bandas mortas. `display: block`
  // ademais elimina o gap baseline de svg inline. O background do tema
  // sobreescribe se está definido.
  const svgStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    ...(themeStyle ?? {}),
  }

  // F10.8: surface = «tarxeta» opcional debaixo de todo o contido.
  // Calcúlase a partir do mesmo bounds+padding que viewBox para
  // cubrir exactamente a área visible da árbore. Cero surface no
  // tema = nada. (Panel composible completo é F12.)
  const surfaceRect =
    theme?.colors.surface !== undefined && bounds !== undefined
      ? {
          x: bounds.minX - padding,
          y: bounds.minY - padding,
          width: bounds.maxX - bounds.minX + padding * 2,
          height: bounds.maxY - bounds.minY + padding * 2,
          fill: theme.colors.surface,
        }
      : null

  return (
    <svg
      ref={ref}
      className="yf-skill-tree"
      {...(layoutType !== undefined && { 'data-layout': layoutType })}
      {...(theme !== null && { 'data-theme-id': themeId })}
      style={svgStyle}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel ?? 'Skill tree'}
      {...(onPointerDown !== undefined && { onPointerDown })}
      {...(onPointerMove !== undefined && { onPointerMove })}
      {...(onPointerUp !== undefined && { onPointerUp })}
    >
      {animationsCSS !== null && <style>{animationsCSS}</style>}
      {theme !== null && (
        <defs>
          {/* 19.7: o resplandor. Só se emite cando o tema o pide, así
              que sen `effects.glowRadius` o SVG é byte a byte o de
              antes. `feMerge` deixa o elemento nítido ENRIBA do seu
              propio halo; sen iso o nodo vese borroso en vez de aceso. */}
          {glowRadius !== undefined && (
            <filter
              id={glowFilterId(glowRadius)}
              x="-75%"
              y="-75%"
              width="250%"
              height="250%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation={glowRadius} result="yf-blur" />
              <feMerge>
                <feMergeNode in="yf-blur" />
                <feMergeNode in="yf-blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
          <marker
            id={ARROW_MARKER_ID}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              {...(arrowFillStyle !== undefined && { style: arrowFillStyle })}
            />
          </marker>
        </defs>
      )}
      {/* F10.6: pan/zoom group. Identidade por defecto (cero impacto
          se non se pasa `transform`). <defs> queda fóra para que os
          markers non escalen co contido (decisión: markers manteñen
          tamaño constante percibido, máis predecible). */}
      <g {...(transform !== undefined && { transform })}>
        {/* F12.bg: imaxe de fondo opcional dentro do grupo pan/zoom.
            Ocupa o box dos bounds; con preserveAspectRatio meet,
            letterboxea proporcionalmente. Vai ANTES do surface e
            children para quedar debaixo de todo. */}
        {backgroundImage !== undefined && bounds !== undefined && (
          <image
            className="yf-skill-tree__background"
            href={backgroundImage}
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.maxX - bounds.minX}
            height={bounds.maxY - bounds.minY}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {/* F10.8: surface = «tarxeta» opcional debaixo de todo o
            contido. Dentro do <g transform> a tarxeta acompaña a
            árbore (parte do contido). O panel composible completo
            queda para F12. */}
        {surfaceRect !== null && (
          <rect
            className="yf-skill-tree__surface"
            x={surfaceRect.x}
            y={surfaceRect.y}
            width={surfaceRect.width}
            height={surfaceRect.height}
            style={{ fill: surfaceRect.fill }}
          />
        )}
        {children}
      </g>
    </svg>
  )
})
// ── FIN: SVGRenderer ──
