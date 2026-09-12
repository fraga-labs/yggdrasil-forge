// ── INICIO: themeOverridesFromSpec (7.17, Cambio 0) ──
// O mapeo `DocumentMeta.theme → overrides de ThemeColors` extraído de
// EditorCanvas (@editor-react) SEN cambio de comportamento, para que o
// CLI (`ygg render`) e calquera consumidor headless o reutilicen.
//
// Devolve un record plano {campoDeThemeColors: cor}. Non importa tipos
// de @react (editor-core é headless): as claves son os NOMES dos
// campos de `ThemeColors` e o consumidor tipa ao aplicar
// (`{...base.colors, ...overrides}`).

import type { ThemeSpec } from '../document/ThemeSpec.js'

/**
 * Overrides de cores derivados do tema do documento.
 *
 * @param spec - O `meta.theme` do documento (ou undefined).
 * @param _dark - Base escollida polo consumidor (minimal/minimalDark).
 *   Reservado no contrato: HOXE os overrides do documento son os
 *   mesmos sobre ambas bases (gañan sempre sobre a base enteira);
 *   o parámetro existe para que futuros defaults dependentes da base
 *   non cambien a sinatura pública.
 */
export function themeOverridesFromSpec(
  spec: ThemeSpec | undefined,
  _dark: boolean,
): Record<string, string> {
  const fills = spec?.nodeFills ?? {}
  const rings = spec?.nodeRings ?? {}
  const edges = spec?.edges
  return {
    ...(spec?.textColor !== undefined && { text: spec.textColor }),
    ...(fills.locked !== undefined && { nodeFillLocked: fills.locked }),
    ...(fills.unlockable !== undefined && { nodeFillUnlockable: fills.unlockable }),
    ...(fills.unlocked !== undefined && { nodeFillUnlocked: fills.unlocked }),
    ...(fills.maxed !== undefined && { nodeFillMaxed: fills.maxed }),
    ...(fills.inProgress !== undefined && { nodeFillInProgress: fills.inProgress }),
    // 19.0 — aneis e arestas. Mesmo contrato: o documento gaña sobre a base.
    //
    // Os aneis mapean aos tokens `node<Estado>`, que son os que
    // `ringColorForState` (@react) le de verdade. NON se mapea a
    // `nodeStroke`: ese token da base está morto (ningún compoñente o
    // consulta), e o documento non debe poder declarar cousas inertes.
    ...(rings.locked !== undefined && { nodeLocked: rings.locked }),
    ...(rings.unlockable !== undefined && { nodeUnlockable: rings.unlockable }),
    ...(rings.unlocked !== undefined && { nodeUnlocked: rings.unlocked }),
    ...(rings.maxed !== undefined && { nodeMaxed: rings.maxed }),
    ...(rings.inProgress !== undefined && { nodeInProgress: rings.inProgress }),
    ...(edges?.color !== undefined && { edge: edges.color }),
    ...(edges?.active !== undefined && { edgeActive: edges.active }),
    // 19.4 — cor propia das iconas (sen ela, @react cae a `text`).
    ...(spec?.iconColor !== undefined && { icon: spec.iconColor }),
    // 19.10 — cor do lenzo. `SVGRenderer` xa a le (fondo inline do
    // `<svg>`) e `standaloneSvg` tamén; o que faltaba era que o
    // DOCUMENTO puidese declarala.
    ...(spec?.background !== undefined && { background: spec.background }),
  }
}

/**
 * Overrides de tipografía derivados do tema do documento (19.0).
 *
 * Irmán de `themeOverridesFromSpec` para a **outra rama** do `Theme`
 * de @react: `colors` e `typography` son campos distintos, así que
 * cada un ten o seu funil e a sinatura do primeiro non cambia.
 *
 * Devolve `undefined` cando o documento non declara tipografía, para
 * que o consumidor poida deixar intacta a da base (`{...base}`) en vez
 * de plantarlle un obxecto baleiro que tape a herdada.
 *
 * @param spec - O `meta.theme` do documento (ou undefined).
 */
export function themeTypographyFromSpec(
  spec: ThemeSpec | undefined,
): Record<string, string | number> | undefined {
  const t = spec?.typography
  if (t === undefined) return undefined
  const out: Record<string, string | number> = {
    ...(t.fontFamily !== undefined && { fontFamily: t.fontFamily }),
    ...(t.fontWeight !== undefined && { fontWeight: t.fontWeight }),
    ...(t.letterSpacing !== undefined && { letterSpacing: t.letterSpacing }),
    ...(t.textTransform !== undefined && { textTransform: t.textTransform }),
  }
  return Object.keys(out).length > 0 ? out : undefined
}
/**
 * Overrides de TAMAÑOS derivados do tema do documento (19.4).
 *
 * Terceiro funil, irmán dos outros dous: `colors`, `typography` e
 * `sizes` son ramas distintas do `Theme` de @react, e cada unha ten a
 * súa porta para que engadir unha non cambie a sinatura das demais.
 *
 * Devolve `undefined` cando o documento non declara tamaños, para que o
 * consumidor deixe a base intacta.
 */
export function themeSizesFromSpec(
  spec: ThemeSpec | undefined,
): Record<string, number> | undefined {
  const z = spec?.sizes
  if (z === undefined) return undefined
  const out: Record<string, number> = {
    ...(z.strokeWidth !== undefined && { strokeWidth: z.strokeWidth }),
    ...(z.ringWidth !== undefined && { ringWidth: z.ringWidth }),
    ...(z.fontSize !== undefined && { fontSize: z.fontSize }),
    ...(z.maxLabelChars !== undefined && { maxLabelChars: z.maxLabelChars }),
    ...(z.labelMinRadius !== undefined && { labelMinRadius: z.labelMinRadius }),
    ...(z.ornateMinRadius !== undefined && { ornateMinRadius: z.ornateMinRadius }),
  }
  return Object.keys(out).length > 0 ? out : undefined
}
/**
 * Overrides de EFECTOS derivados do tema do documento (19.7).
 *
 * Cuarto funil. Traduce de paso o nome do estado: o documento fala
 * `inProgress` (coma en `nodeFills`) e o `NodeState` do motor
 * `in_progress`. Sen esa tradución o estado non casaría e o glow non
 * sairía, calado.
 */
export function themeEffectsFromSpec(
  spec: ThemeSpec | undefined,
): Record<string, unknown> | undefined {
  const g = spec?.glow
  if (g === undefined) return undefined
  const estados = g.states?.map((e) => (e === 'inProgress' ? 'in_progress' : e))
  const out: Record<string, unknown> = {
    ...(g.radius !== undefined && { glowRadius: g.radius }),
    ...(estados !== undefined && { glowStates: estados }),
    ...(g.edges !== undefined && { glowEdges: g.edges }),
  }
  return Object.keys(out).length > 0 ? out : undefined
}
// ── FIN: themeOverridesFromSpec ──
