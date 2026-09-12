// ── INICIO: renderCmd (7.17, Cambio 2) ──
// `ygg render` — render HEADLESS da árbore a SVG autocontido.
// Pecha o bucle da vía do dato: xerar → validate → layout → render →
// xulgar → refinar, cero GUI.
//
// Camiño: deserializeDocument → TreeEngine → renderToStaticMarkup de
// <ThemeProvider><SkillTree/></ThemeProvider> (viable porque o
// SkillTree ten getServerSnapshot cableado; os effects de fit/CTM non
// corren en estático e o viewBox segue os bounds → árbore enteira e
// encadrada) → standaloneSvg (a MESMA utilidade que o export do
// editor).
//
// `--locale`: as labels de @react resólvense con prioridade fixa
// gl>es>en (sen contexto de locale ata o previsto "7.4"). Sen tocar
// @react (superficie pública — cláusula de investigación honesta), o
// CLI pre-resolve as LocalizedString DO DATO á locale pedida antes de
// renderizar. Mesmo resultado, cero parche.

import { type Locale, resolveLocalized } from '@yggdrasil-forge/common'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import {
  deserializeDocument,
  standaloneSvg,
  themeOverridesFromSpec,
  themeSizesFromSpec,
  themeTypographyFromSpec,
} from '@yggdrasil-forge/editor-core'
import { FORGE_ICONS, LOGIC_ICONS, NORSE_ICONS, registerIcons } from '@yggdrasil-forge/react'
import {
  type RegionSpec,
  SkillTree,
  type Theme,
  ThemeProvider,
  minimal,
  minimalDark,
} from '@yggdrasil-forge/react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Os sets oficiais rexístranse coma no editor (7.19): un documento con
// `icon: "logic-key"` renderiza a ICONA, non o id como texto de
// fallback (informe do dono na portada 1.0).
registerIcons(NORSE_ICONS)
registerIcons(LOGIC_ICONS)
registerIcons(FORGE_ICONS)

export interface RenderTextOptions {
  readonly dark?: boolean
  readonly locale?: Locale
  readonly width?: number
}

/**
 * Guión de xogo previo ao render (19.1).
 *
 * **Por que existe**: sen isto, `ygg render` pinta sempre a árbore no
 * día cero, con TODO bloqueado. E `locked` é, por deseño, o estado máis
 * apagado de todos — así que as fotos da galería, das docs e do README
 * amosaban árbores que parecían mortas, e catro dos cinco estados non
 * aparecían nunca. Os mockups fundacionais pedían o contrario coas súas
 * propias palabras: «display multiple node states simultaneously».
 *
 * Aplícase en orde: primeiro os `grant`, logo os `unlock` tal como se
 * listan (a orde importa: un nodo pode ser porta doutro).
 */
export interface PlayOptions {
  /** Recursos a conceder antes de desbloquear: `{ fariña: 10 }`. */
  readonly grant?: Readonly<Record<string, number>>
  /**
   * Nodos a desbloquear, en orde. Cada entrada é `id` (un rango) ou
   * `id:N` (N rangos seguidos, para chegar a `in_progress` ou `maxed`).
   */
  readonly unlock?: readonly string[]
}

export interface RenderPlayedTextOptions extends RenderTextOptions {
  readonly play?: PlayOptions
}

export interface RenderTextResult {
  readonly ok: boolean
  readonly output?: string
  readonly error?: string
}

/** Pre-resolve as labels dos nodos á locale (ver cabeceira). */
function localizeTree(tree: TreeDef, locale: Locale): TreeDef {
  return {
    ...tree,
    nodes: tree.nodes.map((node) => ({
      ...node,
      label: resolveLocalized(node.label, locale),
    })),
  }
}

/**
 * Documento xa deserializado, co tema composto e o motor construído —
 * o estado común ás dúas portas de entrada (síncrona e xogada). Extraer
 * isto é o que permite engadir o modo xogado SEN duplicar o pintado nin
 * cambiar a sinatura pública de `renderDocumentText`.
 */
interface Preparado {
  readonly theme: Theme
  readonly engine: TreeEngine
  readonly regions: readonly RegionSpec[]
  readonly coordinateBounds: { minX: number; minY: number; maxX: number; maxY: number } | undefined
  readonly backgroundImage: string | undefined
  readonly regionShape: 'box' | 'hull' | undefined
  readonly dark: boolean
}

function preparar(
  text: string,
  options: RenderTextOptions,
): { ok: true; value: Preparado } | { ok: false; error: string } {
  const parsed = deserializeDocument(text)
  if (!parsed.ok) return { ok: false, error: parsed.error.message }
  const doc = parsed.value
  const dark = options.dark === true
  const locale: Locale = options.locale ?? 'gl'

  // Tema: mesma composición que EditorCanvas (base + overrides do doc).
  const base = dark ? minimalDark : minimal
  const typography = themeTypographyFromSpec(doc.meta.theme) as Theme['typography'] | undefined
  const sizes = themeSizesFromSpec(doc.meta.theme) as Partial<Theme['sizes']> | undefined
  const theme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      ...(themeOverridesFromSpec(doc.meta.theme, dark) as Partial<Theme['colors']>),
    },
    ...(sizes !== undefined && { sizes: { ...base.sizes, ...sizes } }),
    ...(typography !== undefined && {
      typography: { ...base.typography, ...typography },
    }),
  }

  return {
    ok: true,
    value: {
      theme,
      engine: new TreeEngine(localizeTree(doc.tree, locale), { locale }),
      regions: doc.meta.theme?.regions ?? [],
      coordinateBounds: doc.meta.coordinateBounds,
      backgroundImage: doc.meta.background?.src,
      regionShape: doc.meta.theme?.regionShape,
      dark,
    },
  }
}

function pintar(p: Preparado, options: RenderTextOptions): RenderTextResult {
  let markup: string
  try {
    markup = renderToStaticMarkup(
      createElement(
        ThemeProvider,
        { theme: p.theme },
        createElement(SkillTree, {
          engine: p.engine,
          ...(p.coordinateBounds !== undefined && { coordinateBounds: p.coordinateBounds }),
          ...(p.regions.length > 0 && { regions: p.regions }),
          ...(p.backgroundImage !== undefined && { backgroundImage: p.backgroundImage }),
          ...(p.regionShape !== undefined && { regionShape: p.regionShape }),
        }),
      ),
    )
  } catch (e) {
    // Cláusula de investigación honesta: se o SkillTree tropeza en
    // estático, informamos — sen parchear @react ás bravas.
    return {
      ok: false,
      error: `renderToStaticMarkup fallou: ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  // Fondo efectivo: o do tema; sen el, sólido segundo a base (un SVG
  // transparente vese "roto" en visores escuros/claros).
  const background = p.theme.colors.background ?? (p.dark ? '#16171b' : '#ffffff')
  const standalone = standaloneSvg(markup, {
    background,
    ...(options.width !== undefined && { width: options.width }),
  })
  if (!standalone.ok) return { ok: false, error: standalone.error.message }
  return {
    ok: true,
    output: `${standalone.value}
`,
  }
}

/**
 * Parsea unha entrada de `unlock`: `id` → 1 rango; `id:N` → N rangos.
 *
 * O corte faise polo ÚLTIMO `:` e só conta como contador se o que vén
 * detrás son díxitos — así un id que leve `:` non se rompe.
 */
function parseUnlockEntry(entry: string): { id: string; veces: number } | undefined {
  const corte = entry.lastIndexOf(':')
  if (corte <= 0) return entry.length > 0 ? { id: entry, veces: 1 } : undefined
  const sufixo = entry.slice(corte + 1)
  if (!/^[0-9]+$/.test(sufixo)) return { id: entry, veces: 1 }
  const veces = Number.parseInt(sufixo, 10)
  const id = entry.slice(0, corte)
  if (id.length === 0 || veces < 1) return undefined
  return { id, veces }
}

/**
 * Aplica o guión de xogo sobre o motor. Devolve unha mensaxe de erro se
 * algo non se puido facer, ou `undefined` se todo saíu.
 *
 * **Falla en alto, non en silencio**: se pediches desbloquear un nodo e
 * o motor di que non, o render que sairía non sería o que pediches —
 * así que é erro, coa razón do motor dentro, e non unha foto distinta
 * sen avisar.
 */
async function xogar(engine: TreeEngine, play: PlayOptions): Promise<string | undefined> {
  for (const [resourceId, amount] of Object.entries(play.grant ?? {})) {
    const r = await engine.grantResource(resourceId, amount)
    if (!r.ok) return `non se puido conceder ${amount} de «${resourceId}»: ${r.error.message}`
  }
  for (const entry of play.unlock ?? []) {
    const parsed = parseUnlockEntry(entry)
    if (parsed === undefined) return `entrada de --unlock inválida: «${entry}»`
    for (let i = 0; i < parsed.veces; i++) {
      const r = await engine.unlock(parsed.id)
      if (!r.ok) {
        const rango = parsed.veces > 1 ? ` (rango ${i + 1} de ${parsed.veces})` : ''
        return `non se puido desbloquear «${parsed.id}»${rango}: ${r.error.message}`
      }
    }
  }
  return undefined
}

/** Renderiza o documento (texto JSON) a un SVG autocontido. */
export function renderDocumentText(
  text: string,
  options: RenderTextOptions = {},
): RenderTextResult {
  const prep = preparar(text, options)
  if (!prep.ok) return { ok: false, error: prep.error }
  return pintar(prep.value, options)
}

/**
 * Coma `renderDocumentText`, pero **xogando primeiro** (19.1): concede
 * recursos e desbloquea nodos antes de pintar, para que a foto amose
 * varios estados á vez en vez da árbore enteira no día cero.
 *
 * É async porque `unlock`/`grantResource` do motor o son. A versión
 * síncrona segue existindo intacta para quen non xoga.
 */
export async function renderPlayedDocumentText(
  text: string,
  options: RenderPlayedTextOptions = {},
): Promise<RenderTextResult> {
  const prep = preparar(text, options)
  if (!prep.ok) return { ok: false, error: prep.error }
  if (options.play !== undefined) {
    const erro = await xogar(prep.value.engine, options.play)
    if (erro !== undefined) return { ok: false, error: erro }
  }
  return pintar(prep.value, options)
}
// ── FIN: renderCmd ──
