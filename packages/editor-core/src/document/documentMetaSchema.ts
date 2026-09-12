// ── INICIO: documentMetaSchema ──
// **Zod para o namespace `editor` do ficheiro** (briefing 7.15, Cambio 1).
//
// Ata agora o `tree` validábase (Zod de @core + validadores duros,
// 7.14-B) pero o namespace `editor` pasaba SEN validar: un
// `theme.nodeFills.locked: 123` chegaba ao renderer. Estes schemas
// espellan EXACTAMENTE os tipos TS de `EditorDocument.ts` / `ThemeSpec.ts`
// — se cambias un, cambia o outro (o gate de drift do JSON Schema
// publicado avisará se esqueces rexenerar).
//
// **Decisión de deseño — `.passthrough()` no nivel de meta**: claves
// descoñecidas do futuro NON impiden abrir un ficheiro (forward-compat)
// e consérvanse tal cal ao round-trip. Un editor vello pode abrir un
// ficheiro novo sen destruír o que non entende. Os obxectos aniñados
// coñecidos (`background`, `theme`, `coordinateBounds`) valídanse
// estritos nos seus campos coñecidos.
//
// As `.describe()` van en inglés: a audiencia do JSON Schema publicado
// (Cambio 2) son máquinas e terceiros.

import { z } from 'zod'

/** Estados visuais dos nodos que o tema pode rechear (ThemeNodeState). */
export const themeNodeStateSchema = z
  .enum(['locked', 'unlockable', 'unlocked', 'maxed', 'inProgress'])
  .describe('Visual node state that a theme can fill.')

/** Espella `ThemeRegionTint` (ThemeSpec.ts). */
export const themeRegionTintSchema = z
  .object({
    id: z.string().describe('Unique region id.'),
    label: z.string().describe('Human-readable region label.'),
    tag: z.string().describe('Nodes whose NodeDef.tags include this tag belong to the region.'),
    color: z.string().describe('CSS color string; the renderer applies it at low opacity.'),
  })
  .describe('Background tint for one region (membership is by node tag).')

/** Espella `ThemeEdgeSpec` (ThemeSpec.ts). */
export const themeEdgeSpecSchema = z
  .object({
    color: z.string().optional().describe('Base edge line color (CSS color string).'),
    active: z
      .string()
      .optional()
      .describe('Color for lit edges (those leaving an unlocked/maxed node). Falls back to color.'),
  })
  .describe('Edge colors as document data.')

/** Espella `ThemeTypographySpec` (ThemeSpec.ts). */
export const themeTypographySpecSchema = z
  .object({
    fontFamily: z
      .string()
      .optional()
      .describe("Full CSS font stack, generic fallback included (e.g. 'Cinzel, serif')."),
    fontWeight: z
      .union([z.number(), z.string()])
      .optional()
      .describe("Label font weight (400/600/700, or 'bold')."),
    letterSpacing: z.string().optional().describe("Label tracking (e.g. '0.08em')."),
    textTransform: z
      .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
      .optional()
      .describe('Label letter case.'),
  })
  .describe('Label typography as document data.')

/** Espella `ThemeSizesSpec` (ThemeSpec.ts). */
export const themeSizesSpecSchema = z
  .object({
    strokeWidth: z.number().positive().optional().describe('Line thickness (edges, mesh). Base 2.'),
    ringWidth: z.number().positive().optional().describe('Node ring thickness. Base 3.'),
    fontSize: z.number().positive().optional().describe('Label font size. Base 14.'),
    maxLabelChars: z.number().int().positive().optional().describe('Opt-in label truncation.'),
    labelMinRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Minimum node radius that earns a label; smaller nodes render icon only. Enables atlas density.',
      ),
    ornateMinRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe('Minimum node radius that earns an ornate outer frame (a second concentric ring).'),
  })
  .describe('Render sizes as document data.')

/** Espella `ThemeGlowSpec` (ThemeSpec.ts). */
export const themeGlowSpecSchema = z
  .object({
    radius: z
      .number()
      .nonnegative()
      .optional()
      .describe('Glow blur radius in layout units. 0 or omitted means no glow at all.'),
    states: z
      .array(themeNodeStateSchema)
      .optional()
      .describe('Visual states that glow. Defaults to unlockable/unlocked/maxed.'),
    edges: z.boolean().optional().describe('Whether lit edges glow too. Default false.'),
  })
  .describe('Glow effect as document data. Opt-in: filters cost a rasterization pass each.')

/** Espella `ThemeSpec` (ThemeSpec.ts). */
export const themeSpecSchema = z
  .object({
    nodeFills: z
      .record(themeNodeStateSchema, z.string())
      .optional()
      .describe(
        'Node body fill per visual state (CSS color strings). Partial: missing states fall back to the base theme.',
      ),
    textColor: z
      .string()
      .optional()
      .describe(
        'Color for node labels, progress text, icons and region labels. Omit for an automatic legible default.',
      ),
    regions: z
      .array(themeRegionTintSchema)
      .optional()
      .describe('Region tints. Region membership is by node tag.'),
    nodeRings: z
      .record(themeNodeStateSchema, z.string())
      .optional()
      .describe(
        'Node ring (outline) color per visual state — the sibling of nodeFills, which paints the body. Partial: missing states fall back to the base theme.',
      ),
    edges: themeEdgeSpecSchema.optional().describe('Edge colors. Omit to fall back to the base.'),
    typography: themeTypographySpecSchema
      .optional()
      .describe('Label typography. Omit to fall back to the base.'),
    iconColor: z
      .string()
      .optional()
      .describe('Node icon color. Falls back to textColor when omitted.'),
    regionShape: z
      .enum(['box', 'hull'])
      .optional()
      .describe("Region tint shape: 'box' (default) or 'hull' (smoothed blob around the nodes)."),
    regionLabel: z
      .enum(['top', 'center'])
      .optional()
      .describe(
        "Where the region name goes: 'top' (default) or 'center' (large, in the region color, behind the nodes).",
      ),
    sizes: themeSizesSpecSchema.optional().describe('Render sizes. Omit to fall back to the base.'),
    glow: themeGlowSpecSchema.optional().describe('Glow effect. Omit for no glow at all.'),
    preset: z
      .string()
      .optional()
      .describe('Id of the preset this theme started from (informative, for UIs).'),
  })
  .describe('Document theme: presentation layer, separate from the TreeDef.')

/** Espella `Bounds` (@core layouts). */
export const boundsSchema = z
  .object({
    minX: z.number().describe('Left edge of the coordinate space.'),
    minY: z.number().describe('Top edge of the coordinate space.'),
    maxX: z.number().describe('Right edge of the coordinate space.'),
    maxY: z.number().describe('Bottom edge of the coordinate space.'),
  })
  .describe('Fixed coordinate space for the canvas (world box).')

/** Espella `BackgroundRef` (EditorDocument.ts). */
export const backgroundRefSchema = z
  .object({
    src: z.string().describe('URL, path or asset id of the background image.'),
    opacity: z.number().optional().describe('0..1 opacity applied to the image.'),
    contrast: z.number().optional().describe('Contrast treatment applied by the consumer.'),
    desaturate: z.number().optional().describe('Desaturation treatment applied by the consumer.'),
    locked: z
      .boolean()
      .optional()
      .describe('If true, consumers must not move or replace this background.'),
  })
  .describe('Reference to a background image plus its visual treatment.')

/**
 * Espella `Partial<DocumentMeta>` — a forma que o namespace `editor`
 * ten NO FICHEIRO (todos os campos opcionais; os defaults aplícaos
 * `createEditorDocument`).
 */
export const documentMetaSchema = z
  .object({
    formatVersion: z
      .string()
      .optional()
      .describe('File format version (semver). Used for future migrations.'),
    background: backgroundRefSchema.optional(),
    coordinateBounds: boundsSchema.optional(),
    thumbnail: z
      .string()
      .optional()
      .describe('PNG/SVG capture as base64 data URI or URL (optional).'),
    imports: z
      .array(z.string())
      .optional()
      .describe('Other referenced documents (reserved for future composition).'),
    theme: themeSpecSchema.optional(),
  })
  .passthrough()
  .describe(
    'Editor-level metadata namespace. Unknown keys are preserved as-is (forward compatibility).',
  )

export type InferredDocumentMeta = z.infer<typeof documentMetaSchema>
// ── FIN: documentMetaSchema ──
