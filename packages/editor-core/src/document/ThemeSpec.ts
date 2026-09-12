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
 * Resplandor, como DATO do documento (19.7).
 *
 * O bloom dos mockups fundacionais. Non é un token de cor: un glow
 * fíltrase (un `<filter>` SVG), e cada elemento filtrado custa unha
 * pasada de rasterización ao navegador. Por iso é opt-in e por iso
 * `states` existe — nun atlas de centos de nodos hai que acender só os
 * poucos que importan.
 */
export interface ThemeGlowSpec {
  /**
   * Radio do desenfoque, en unidades de layout. Sen definir (ou 0) non
   * hai resplandor e nin se emite o filtro. Discreto: 2-4; bloom dos
   * mockups: 6-10.
   */
  readonly radius?: number
  /**
   * Estados que resplandecen. Sen definir, os tres vivos
   * (`unlockable`, `unlocked`, `maxed`): os apagados non brillan.
   */
  readonly states?: readonly ThemeNodeState[]
  /** Se as arestas ACESAS tamén resplandecen. Default `false`. */
  readonly edges?: boolean
}

/**
 * Tamaños do render, como DATO do documento (19.4).
 *
 * Espella a parte tematizable de `ThemeSizes` de
 * `@yggdrasil-forge/react`. Existe porque o estilo «atlas» — a
 * filigrana fina de centos de arestas dos mockups fundacionais — non se
 * pode pedir só con cores: un trazo de 2 px afoga unha malla densa.
 */
export interface ThemeSizesSpec {
  /** Grosor das liñas (arestas, malla, trazo). Base: 2. */
  readonly strokeWidth?: number
  /** Grosor do anel do nodo. Base: 3. */
  readonly ringWidth?: number
  /** Corpo dos rótulos. Base: 14. */
  readonly fontSize?: number
  /** Truncado opt-in do rótulo a N caracteres. */
  readonly maxLabelChars?: number
  /**
   * **Raio mínimo para MERECER rótulo.** Os nodos cun raio menor que
   * isto pintan icona e nada máis.
   *
   * É a peza que fai posible a densidade de atlas: nos mockups os
   * centos de nodos pequenos non levan texto — só as comarcas e os
   * nodos grandes. Sen isto, douscentos rótulos sobrepóñense e o mapa
   * volvese ilexible. `0` ou sen definir = todos levan rótulo
   * (comportamento previo).
   */
  readonly labelMinRadius?: number
  /**
   * Raio mínimo para levar **marco ornamental** (19.8): un segundo anel
   * concéntrico por fóra. Nos mockups só o levan os nodos grandes, e é o
   * que os fai ler como importantes sen máis cor. Sen definir, ningún.
   */
  readonly ornateMinRadius?: number
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
  /**
   * Cor das iconas dos nodos (19.4). Sen definir, cae a `textColor`.
   *
   * Sepáranse porque a esa densidade as iconas teñen que ser máis
   * apagadas que os rótulos: se brillan igual, a malla desaparece
   * detrás de douscentos glifos brancos.
   */
  readonly iconColor?: string
  /**
   * Forma do tinte de rexión (19.4): `'box'` é un rectángulo (o
   * comportamento de sempre) e `'hull'` un blob suavizado que envolve
   * os nodos da rexión.
   *
   * O renderer sabía facer `'hull'` desde a súa sub-fase de rexións,
   * pero só como prop do compoñente: nin un documento nin `ygg render`
   * podían pedilo, así que en práctica non se usaba en ningures.
   */
  readonly regionShape?: 'box' | 'hull'
  /**
   * Onde vai o NOME da rexión (19.8): `'top'` pegado ao bordo (o de
   * sempre) ou `'center'` flotando no medio, grande e coa cor da propia
   * rexión.
   *
   * `'center'` é o dos mockups, e a escala de atlas dálle razón: con
   * varias comarcas, un rótulo no bordo lese como se fose doutra. Vai
   * DEBAIXO dos nodos, así que non tapa nada.
   */
  readonly regionLabel?: 'top' | 'center'
  /** Tamaños do render (19.4). Sen definir, caen á base. */
  readonly sizes?: ThemeSizesSpec
  /** Resplandor (19.7). Sen definir, non hai efecto e nin se emite filtro. */
  readonly glow?: ThemeGlowSpec
  /** Id do preset de partida (informativo, para a UI). */
  readonly preset?: string
}
// ── FIN: ThemeSpec ──
