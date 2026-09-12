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

/** Renderiza o documento (texto JSON) a un SVG autocontido. */
export function renderDocumentText(
  text: string,
  options: RenderTextOptions = {},
): RenderTextResult {
  const parsed = deserializeDocument(text)
  if (!parsed.ok) return { ok: false, error: parsed.error.message }
  const doc = parsed.value
  const dark = options.dark === true
  const locale: Locale = options.locale ?? 'gl'

  // Tema: mesma composición que EditorCanvas (base + overrides do doc).
  const base = dark ? minimalDark : minimal
  const typography = themeTypographyFromSpec(doc.meta.theme) as Theme['typography'] | undefined
  const theme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      ...(themeOverridesFromSpec(doc.meta.theme, dark) as Partial<Theme['colors']>),
    },
    ...(typography !== undefined && {
      typography: { ...base.typography, ...typography },
    }),
  }

  const engine = new TreeEngine(localizeTree(doc.tree, locale), { locale })
  const regions: readonly RegionSpec[] = doc.meta.theme?.regions ?? []
  const backgroundImage = doc.meta.background?.src

  let markup: string
  try {
    markup = renderToStaticMarkup(
      createElement(
        ThemeProvider,
        { theme },
        createElement(SkillTree, {
          engine,
          ...(doc.meta.coordinateBounds !== undefined && {
            coordinateBounds: doc.meta.coordinateBounds,
          }),
          ...(regions.length > 0 && { regions }),
          ...(backgroundImage !== undefined && { backgroundImage }),
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
  const background = theme.colors.background ?? (dark ? '#16171b' : '#ffffff')
  const standalone = standaloneSvg(markup, {
    background,
    ...(options.width !== undefined && { width: options.width }),
  })
  if (!standalone.ok) return { ok: false, error: standalone.error.message }
  return { ok: true, output: `${standalone.value}\n` }
}
// ── FIN: renderCmd ──
