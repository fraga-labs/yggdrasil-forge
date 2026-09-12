// ── INICIO: ThemeSpec ──
// **O tema visual como DATO DO DOCUMENTO** (7.5e).
//
// Antes de 7.5e, o tema vivía como estado local dun compoñente
// React (ThemeLab illado do example). Iso significaba:
//   - Non pasaba polo motor → sen undo/redo.
//   - Non serializaba → perdíase ao gardar.
//   - Non era compatible entre consumidores.
//
// Agora `theme` é un campo opcional en `DocumentMeta` xunto ao
// `background`. Aplícanse as tres consecuencias:
//   1. Undo/redo automático (History via History Manager).
//   2. Serialización de balde (JsonDocumentAdapter serializa `meta`
//      como obxecto; test de round-trip específico).
//   3. Portable: outros consumidores (Tauri, CLI) poden lerlo tamén.
//
// **Same Data. Different Themes.** — o TreeDef segue portable
// (dato do dominio); o tema é presentación, vive no editor namespace
// do ficheiro.
//
// **Headless**: cero dependencia de react. `ThemeSpec` é un tipo puro;
// o mapeo a `Theme` (de @react) faise no consumidor.

/**
 * Estados visuais dos nodos que o tema pode rechear. Corresponden
 * aos `nodeFill<Estado>` de `packages/react/src/theme-types.ts`.
 */
export type ThemeNodeState = 'locked' | 'unlockable' | 'unlocked' | 'maxed' | 'inProgress'

/**
 * Tinte dunha rexión. **A pertenza é por tag**: os nodos con
 * `NodeDef.tags` que inclúan este `tag` renderízanse cun tinte de
 * fondo `color` (o renderer aplica opacidade baixa).
 *
 * A **creación** de rexións (definir novas rexións, borrar, renomear)
 * é doutra ferramenta futura (arco de creación). Aquí só se define
 * o tinte por rexión existente.
 */
export interface ThemeRegionTint {
  readonly id: string
  readonly label: string
  readonly tag: string
  /** CSS color string; o renderer aplícao con opacidade baixa. */
  readonly color: string
}

/**
 * Tipografía dos rótulos, como DATO do documento (19.0).
 *
 * Espella `ThemeTypography` de `@yggdrasil-forge/react` — non se
 * importa para que editor-core siga headless; o mapeo faise no
 * consumidor (`themeTypographyFromSpec`).
 *
 * **Por que existe**: a fonte é identidade visual, non adorno. Un
 * documento «gótico» (serif pesada) e un «sci-fi» (sans estreita en
 * maiúsculas) non se distinguen só polas cores. Antes do 19.0 o
 * renderer sabía pintar isto pero o documento non o sabía levar, así
 * que o estilo non viaxaba co ficheiro.
 *
 * Recoméndase declarar sempre un fallback xenérico no `fontFamily`
 * (`'Cinzel, serif'`), porque o consumidor pode non ter a fonte.
 */
export interface ThemeTypographySpec {
  /** Stack CSS completo, con fallback xenérico (ex. `'Cinzel, serif'`). */
  readonly fontFamily?: string
  /** Peso dos rótulos (400/600/700, ou `'bold'`). */
  readonly fontWeight?: number | string
  /** Tracking (ex. `'0.08em'`) — respiración para rótulos épicos. */
  readonly letterSpacing?: string
  /** Caixa dos rótulos. */
  readonly textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

/**
 * Cor das arestas, como DATO do documento (19.0).
 *
 * `active` é a aresta «acesa»: a que sae dun nodo `unlocked`/`maxed`.
 * Sen `active`, o renderer cae a `color` (e sen ningún dos dous, á
 * base). Separalos é o que permite o camiño luminoso dos mockups
 * (inactive apagado / active luminoso) desde o ficheiro.
 */
export interface ThemeEdgeSpec {
  /** Cor base das liñas. */
  readonly color?: string
  /** Cor das arestas acesas (fallback: `color`). */
  readonly active?: string
}

/**
 * Tema do documento. Capa de presentación separada do TreeDef.
 *
 * Todos os campos son opcionais: sen `nodeFills`/`regions` aplícase o
 * tema base (`minimal` de @react). Con `nodeFills` parcial, o que
 * falte cae ao base. O `preset` é informativo — a UI úsao para saber
 * de que preset partiu (rótulo, botón "restablecer") pero non afecta
 * ao render.
 */
export interface ThemeSpec {
  /** Recheo do corpo do nodo por estado. Parcial: o que falte cae ao tema base. */
  readonly nodeFills?: Partial<Record<ThemeNodeState, string>>
  /**
   * Cor do texto (label + progreso) e iconas dos nodos, e das
   * etiquetas de rexión. **Control directo do autor** — se non se
   * define, o editor escolle un valor lexible automaticamente
   * segundo o tema claro/escuro do seu chrome (7.8.1); fóra do
   * editor, cae ao tema base (`minimal`, texto escuro fixo).
   */
  readonly textColor?: string
  /**
   * Tintes de rexión. A CREACIÓN de rexións é doutra ferramenta
   * futura. Aquí só se define o tinte por rexión existente.
   */
  readonly regions?: readonly ThemeRegionTint[]
  /**
   * Cor do **anel** (trazo) do nodo por estado visual — irmán exacto
   * de `nodeFills`, que pinta o **corpo** (19.0).
   *
   * O modelo do renderer é de dúas capas: o corpo vén de
   * `nodeFill<Estado>` e o anel de `node<Estado>`. Antes do 19.0 o
   * documento só sabía levar a primeira, así que un ficheiro podía
   * declarar o recheo pero non o contorno — e o contorno é o que
   * distingue un ferro negro remachado dun hexágono de neon fino.
   *
   * **Nota de honestidade**: existe tamén un `ThemeColors.nodeStroke`
   * na base de @react que NINGÚN compoñente le (token morto desde
   * F10.3.fix). Non se expón aquí a propósito: o documento non debe
   * poder declarar algo que non pinta nada.
   */
  readonly nodeRings?: Partial<Record<ThemeNodeState, string>>
  /** Cor das arestas (19.0). Sen definir, cae á base. */
  readonly edges?: ThemeEdgeSpec
  /** Tipografía dos rótulos (19.0). Sen definir, cae á base. */
  readonly typography?: ThemeTypographySpec
  /** Id do preset de partida (informativo, para a UI). */
  readonly preset?: string
}
// ── FIN: ThemeSpec ──
