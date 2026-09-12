// ── INICIO: Theme types ──
import type { NodeState } from '@yggdrasil-forge/core'

/**
 * Tema do `@yggdrasil-forge/react`. Define tokens (cores, sizes,
 * fontes) que se aplican aos compoñentes via CSS variables inxectadas
 * polo `SVGRenderer` cando hai un `ThemeProvider` ascendente.
 *
 * Os tokens son **contrato público estable**: novos campos pódense
 * engadir en sub-fases futuras como opcionais; eliminacións son
 * breaking change e require bump major.
 */
export interface Theme {
  /**
   * Cores do tema. Valores son CSS color strings (hex, rgb, hsl,
   * named, var()).
   */
  readonly colors: ThemeColors

  /** Sizes (radios, anchos, font sizes en unidades do layout). */
  readonly sizes: ThemeSizes

  /**
   * Tipografía dos labels do tema (F10.8). Opcional; sen typography,
   * o texto renderiza coa fonte heredada do DOM e os defaults do
   * navegador. Aplícase inline aos `<text>` de label e ao fallback
   * de icono-texto.
   */
  readonly typography?: ThemeTypography

  /**
   * Efectos de composición (19.7). Opcional; sen `effects` o render é
   * exactamente o de sempre — cero regresión e cero custo.
   */
  readonly effects?: ThemeEffects
}

/**
 * Efectos de composición: hoxe só o resplandor (19.7).
 *
 * **Por que non é un token de cor máis**: un glow non se pinta, fíltrase.
 * Precisa un `<filter>` en `<defs>` e un `filter="url(#…)"` nos elementos
 * que o levan, e iso é caro: o navegador rasteriza cada elemento
 * filtrado aparte. Por iso é **opt-in** e por iso `glowStates` existe —
 * nun atlas de 300 nodos hai que acender só os poucos que importan.
 */
export interface ThemeEffects {
  /**
   * Radio do desenfoque do resplandor, en unidades de layout. Sen
   * definir (ou 0) non hai resplandor e non se emite ningún filtro.
   *
   * Valores sensatos: 2-4 para un halo discreto, 6-10 para o bloom
   * dos mockups fundacionais.
   */
  readonly glowRadius?: number

  /**
   * Estados visuais que resplandecen. Sen definir, os tres «vivos»:
   * `unlockable`, `unlocked` e `maxed` — os apagados non brillan.
   *
   * Nun grafo denso conviña reducilo a `['maxed']`: cada elemento
   * filtrado custa unha pasada de rasterización.
   */
  readonly glowStates?: readonly NodeState[]

  /** Se as arestas ACESAS tamén resplandecen. Default `false`. */
  readonly glowEdges?: boolean
}

/**
 * Tokens tipográficos do tema (F10.8). Aplícanse inline desde
 * `useTheme()` aos `<text>` de label. Todos opcionais; campo non
 * declarado = comportamento por defecto do navegador (fonte
 * heredada do DOM ascendente).
 *
 * Doc de cada token:
 * - `fontFamily`: stack CSS (ex. `'Cinzel, serif'`). Recoméndase
 *   pasar tamén o fallback xenérico.
 * - `fontWeight`: peso do texto dos labels (400/500/600/700 etc.).
 *   Acepta tamén string ('bold', 'normal') para encaixar co tipo
 *   CSS estándar.
 * - `letterSpacing`: tracking (ex. `'0.05em'`). Útil para tipografía
 *   épica con respiración.
 * - `textTransform`: maiúsculas/minúsculas. Permite `none`,
 *   `uppercase`, `lowercase`, `capitalize`.
 */
export interface ThemeTypography {
  readonly fontFamily?: string
  readonly fontWeight?: number | string
  readonly letterSpacing?: string
  readonly textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

export interface ThemeColors {
  /** Cor de fondo do svg (cero, fondo transparente). */
  readonly background?: string

  /**
   * Cor da «tarxeta»/superficie detrás da árbore (F10.8). Opcional;
   * se está, o `SVGRenderer` debuxa un `<rect>` cubrindo o viewBox
   * como primeiro fillo (queda detrás de mesh/edges/nodes). Útil
   * para temas con fondo de canvas distinto da superficie interna
   * (ex. canvas escuro + superficie crema neutral).
   *
   * Cero = só `background` (ou transparente).
   */
  readonly surface?: string

  /** Cor do texto (labels, progress). */
  readonly text: string

  /**
   * Cor dos iconos SVG do rexistro (F10.5). Opcional; fallback a
   * `text`. Aplícase via CSS `color` no `<svg>` do icono; os paths
   * usan `currentColor` (`fill` ou `stroke` segundo o seu `mode`).
   */
  readonly icon?: string

  /** Cor de fondo do nodo cando state='locked'. */
  readonly nodeLocked: string

  /** Cor de fondo do nodo cando state='unlockable'. */
  readonly nodeUnlockable: string

  /** Cor de fondo do nodo cando state='unlocked'. */
  readonly nodeUnlocked: string

  /** Cor de fondo do nodo cando state='maxed'. */
  readonly nodeMaxed: string

  /** Cor de fondo do nodo cando state='in_progress'. */
  readonly nodeInProgress: string

  /** Cor do borde do nodo (todos os estados). */
  readonly nodeStroke: string

  /** Cor das liñas dos edges. */
  readonly edge: string

  /**
   * Cor dos edges activos/«acesos» (F10.4). Opcional; fallback a
   * `edge`. Un edge é activo cando o seu nodo `source` está en
   * `unlocked` ou `maxed` (camiños «acesos» desde nodos conquistados).
   */
  readonly edgeActive?: string

  /** Cor dos elementos do mesh overlay (line, circle, polygon). */
  readonly mesh: string

  /**
   * Interior do orbe (fill do shape). Opcional; fallback `#f4f4ef`.
   * Engadido en F10.3.fix (tematización inline). Coexiste co modelo
   * plano-adaptativo: o fill é neutro/claro; o estado coloréase
   * no anel (stroke).
   */
  readonly nodeFill?: string

  /**
   * Fill do corpo do nodo por **estado visual** (Renderer sub-fase 1).
   * Cinco tokens opcionais que permiten que o **corpo** do nodo varíe
   * coa progresión, non só o anel. Sen establecer ningún, o
   * comportamento é idéntico ao previo (todos caen a `nodeFill`).
   *
   * Prioridade no resolutor (`fillColorForState`):
   * 1. `NodeDef.color` (override por-nodo) — gaña sempre se está.
   * 2. `nodeFill<State>` (este token) se o tema o declara.
   * 3. `nodeFill` (interior único, comportamento legado).
   * 4. `'#f4f4ef'` (default último recurso).
   *
   * O **estado visual** que se aplica aquí é o **derivado** (ver
   * `visualStateFor`), non o `NodeState` cru do motor: un multi-tier
   * a medias píntase `in_progress` por cosmética aínda que o motor
   * lle dea `unlocked`. Iso fai que a aceleración visual de tiers
   * parciais "simplemente funcione" co tema.
   */
  readonly nodeFillLocked?: string

  /** Fill do corpo cando o estado visual é `unlockable`. Ver `nodeFillLocked`. */
  readonly nodeFillUnlockable?: string

  /** Fill do corpo cando o estado visual é `unlocked`. Ver `nodeFillLocked`. */
  readonly nodeFillUnlocked?: string

  /** Fill do corpo cando o estado visual é `maxed`. Ver `nodeFillLocked`. */
  readonly nodeFillMaxed?: string

  /**
   * Fill do corpo cando o estado visual é `in_progress`. Inclúe **tanto**
   * o `in_progress` real do motor **como** o derivado por
   * `visualStateFor` (multi-tier a medias). Ver `nodeFillLocked`.
   */
  readonly nodeFillInProgress?: string

  /**
   * Cor do anel de selección (F10.7). Opcional; fallback a
   * `nodeUnlockable` para conservar pegada visual coherente (a
   * selección destaca igual que un nodo accesible). Aplícase como
   * `stroke` dun `<circle>` overlay exterior ao nodo seleccionado.
   *
   * Tamén se usa para o anel de **focus-visible** (dashed) en a11y.
   */
  readonly selected?: string
}

export interface ThemeSizes {
  /** Stroke width das liñas (edges, mesh, node stroke). Default 2. */
  readonly strokeWidth: number

  /** Font size para labels dos nodos. */
  readonly fontSize: number

  /** Font size para texto de progress (porcentaxe). */
  readonly fontSizeSmall: number

  /**
   * Grosor do anel (stroke-width) do shape do nodo. Opcional;
   * fallback `3`. Engadido en F10.3.fix.
   */
  readonly ringWidth?: number

  /**
   * Opt-in (estilo "BDO"): máximo de caracteres a mostrar na etiqueta do
   * nodo. Cando se define (> 0) e a etiqueta supera ese largo, trúncase a
   * N + "…" e engádese un `<title>` SVG co texto completo (tooltip ao
   * hover). O `aria-label` conserva o texto completo. Por defecto
   * `undefined` = sen truncado (comportamento actual).
   */
  readonly maxLabelChars?: number

  /**
   * Raio mínimo (en unidades de layout) para que un nodo MEREZA rótulo
   * (19.4). Os nodos máis pequenos pintan icona e nada máis.
   *
   * É o que fai posible a densidade de atlas: con centos de nodos
   * pequenos, douscentos rótulos sobrepóñense e o mapa vólvese
   * ilexible — nos mockups fundacionais eses nodos non levan texto. O
   * `aria-label` do nodo NON se toca: nos nodos interactivos (os que
   * levan `onClick`, que son os que o emiten) o texto segue enteiro para
   * quen le cun lector de pantalla, aínda que non se pinte.
   *
   * Sen definir (ou `0`) = todos levan rótulo (comportamento previo).
   */
  readonly labelMinRadius?: number

  /**
   * Raio mínimo para levar **marco ornamental** (19.8): un segundo anel
   * concéntrico por fóra, máis fino e translúcido.
   *
   * Nos mockups fundacionais só os nodos grandes — keystones e
   * ascendencias — levan ese dobre aro; é o que os fai ler como
   * «importantes» sen recorrer a máis cor. Sen definir (ou `0`), ningún
   * nodo o leva e o markup non cambia.
   */
  readonly ornateMinRadius?: number
}
// ── FIN: Theme types ──
