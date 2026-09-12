---
title: Theming
description: The two layers of looks — the renderer theme (ThemeProvider) and the document theme (named presets, per-state fills, regions) — and the seam between the editor chrome and the document.
---

There are **two layers** of looks, and it pays to know which one you are touching:

| Layer | Where it lives | Who uses it |
|---|---|---|
| **Renderer theme** (`Theme`) | In app code, via `ThemeProvider` from `@yggdrasil-forge/react`. | Whoever embeds `SkillTree` in their app. |
| **Document theme** (`ThemeSpec`) | In the file, under `editor.theme`. Travels with the JSON and has undo. | The editor, the CLI (`ygg render`) and any consumer that reads it. |

The renderer starts from a base theme (`minimal` light or `minimalDark`) and the document **overrides** whatever it declares. Nothing in the document is mandatory.

## 1. The renderer theme (`@yggdrasil-forge/react`)

The theme is applied as **inline style from `useTheme()`** (high priority, no cascade issues). Provide it with a `ThemeProvider`:

```tsx
import { ThemeProvider } from '@yggdrasil-forge/react'
import type { Theme } from '@yggdrasil-forge/react'

const dark: Theme = {
  colors: {
    background: '#11131a',      // SVG canvas background (optional)
    surface: '#1c2030',         // "card" behind the tree (optional)
    text: '#e6d5a8',
    nodeFill: '#2a2f3d',        // node body (fallback)
    nodeLocked: '#5b6b86',      // per-state rings
    nodeUnlockable: '#e0a93c',
    nodeUnlocked: '#6fcf97',
    nodeMaxed: '#f0c14b',
    nodeInProgress: '#e08a3c',
    nodeStroke: '#5b6b86',
    edge: '#46506b',
    edgeActive: '#00e0ff',      // "lit" edge (optional)
    icon: '#e6d5a8',            // icon color (optional; falls back to text)
    selected: '#bb86fc',        // selection ring (optional)
    mesh: 'rgba(148,163,184,0.08)',
  },
  sizes: { strokeWidth: 2.5, fontSize: 14, fontSizeSmall: 11, ringWidth: 3 },
  typography: { fontFamily: '"Cinzel", serif', fontWeight: 600, letterSpacing: '0.04em' },
}

<ThemeProvider theme={dark}><SkillTree engine={engine} /></ThemeProvider>
```

- Optional fields have sensible fallbacks: a minimal theme only needs `text` and the state colors.
- `typography` applies to the label `<text>` elements; load the font (`@import`/`<link>`) first.
- Bundled themes: `minimal` (light, warm paper) and `minimalDark`.

### Per-state fill

By default the **ring** changes with the state and the **body** is a single color (`nodeFill`). To make the whole body speak, declare per-state fills — all optional, anything missing falls back to `nodeFill`:

```ts
colors: {
  nodeFill: '#2a2f3d',
  nodeFillLocked: '#1d2230',
  nodeFillUnlockable: '#2a2f3d',
  nodeFillUnlocked: '#2a3d2f',
  nodeFillMaxed: '#3d3320',
  nodeFillInProgress: '#3d2f20',
}
```

**Body color resolution** (`fillColorForState`): 1) `NodeDef.color` from the data **always wins**; 2) the theme's `nodeFill<State>`; 3) `nodeFill`; 4) the default. A half-way multi-tier node is painted as *in progress* even though the engine reports `unlocked` — cosmetic only, the engine is untouched.

## 2. The document theme (`editor.theme`)

```json
"editor": {
  "theme": {
    "preset": "bosque",
    "nodeFills": { "locked": "#4a5340", "unlockable": "#7d8f5a", "unlocked": "#3e7a4c", "maxed": "#b08d3e", "inProgress": "#96a86c" },
    "nodeRings": { "locked": "#2e3528", "maxed": "#d8b15a" },
    "edges": { "color": "#3c4636", "active": "#b08d3e" },
    "typography": { "fontFamily": "Cinzel, serif", "fontWeight": 600, "letterSpacing": "0.08em", "textTransform": "uppercase" },
    "textColor": "#f4efdf",
    "background": "#14151a",
    "regions": [{ "id": "r1", "label": "Breath", "tag": "breath", "color": "#c8875f" }]
  }
}
```

- `nodeFills` — per-state fill of the node **body** (partial: anything missing falls back to the base theme).
- `nodeRings` — per-state color of the node **ring** (outline). The exact sibling of `nodeFills`: the renderer paints a node in two layers, and this is the outer one. It is what separates blackened iron from a thin neon hexagon without touching the fill.
- `edges` — `color` for the lines and `active` for **lit** ones (those leaving an `unlocked`/`maxed` node). Without `active`, lit edges fall back to `color`.
- `typography` — `fontFamily` (always with a generic fallback), `fontWeight`, `letterSpacing`, `textTransform`. **Type is identity, not decoration**: a gothic document and a sci-fi one are not told apart by color alone.
- `textColor` — node text and icons, and region labels. Without it, the editor picks a legible one for its chrome.
- `background` — the **canvas** color (19.10). `SVGRenderer` applies it as the inline background of the `<svg>`, and the standalone export uses it too. **Without it the look is only half-done outside the editor**: `ygg render` painted white or the default dark depending on the `--dark` flag rather than on the file, and a gothic theme on a white page is not the gothic theme.
- `regions` — **tints by tag**: nodes carrying that `tag` get a colored background (low opacity) and a region label.
- `regionLabel` — where the **region name** goes (19.8): `'top'` at the top edge (the old behaviour; since 19.10 in the region's own color and scaled with the map, like the atlas mockup) or `'center'`, floating in the middle and larger. Both sit behind the nodes. **On a dense map pick `'top'`**: a mesh fills the whole blob, so a centered name comes out chopped up by nodes.
- `sizes.labelMinRadius` — minimum radius to carry **painted text**. This is the legibility tool at scale: a three-word name is about 157 viewBox units wide and an atlas has spacings around 60, so past a certain density labels cannot sit beside their nodes however far the layout separates them. Raising it leaves text on the landmarks only; the full name stays in the document (tooltip, `aria-label`, editor).
- `sizes.ornateMinRadius` — minimum node radius that earns an **ornate frame**: a second concentric ring outside the body. In the mockups only the big nodes carry it, and it is what makes them read as important without more color.
- `glow` — the **glow effect** (19.7): `radius` (blur, in layout units), `states` (which ones glow; defaults to the three live ones: `unlockable`, `unlocked`, `maxed`) and `edges` (whether lit edges glow too). Without `glow` the filter **is not even emitted**: zero cost.
- `preset` — **informational**: which preset it started from (the UI marks the active chip). It does not affect rendering by itself: applying a preset means copying its full spec.

:::caution[The glow is not free]
A glow is not painted: it is **filtered**. Every filtered element costs the browser its own rasterization pass, so in an atlas of hundreds of nodes prefer narrowing `glow.states` instead of lighting all three. The `atlas` preset lights **the path you took** (`['unlocked', 'maxed']`) and leaves out `unlockable`, which is the entire frontier: in a 97-node picture that is 29 halos saying nothing. `radius` 2-4 gives a discreet halo; 6-10, the mockups' bloom.

Mind one detail you only see by playing: a **single-tier node without `maxTier`** never reaches `maxed` — the engine leaves it `unlocked`. A `glow.states: ['maxed']` on such a document lights nothing at all.
:::

:::note[Two layers, two axes]
Body (`nodeFills`) and ring (`nodeRings`) are independent on purpose. A theme can keep the body neutral and let only the ring move with progression (the "flat-adaptive" model of the `minimal` theme), or move both. Both accept the five states: `locked`, `unlockable`, `unlocked`, `maxed`, `inProgress`.
:::

### Named presets

`THEME_PRESETS` (`@yggdrasil-forge/editor-core`) is a data registry: `{ id, label, spec }`. The editor's **Tema** tab renders its chips from it.

| id | Character |
|---|---|
| `tintado` | Distinguishable tinted palette (the baker-tree classic). |
| `neutro` | Zero overrides — falls back to the renderer's `minimal`. |
| `pergamino` | Warm earthy parchment lights, sepia-ink text. |
| `neon` | Deep dark fills with saturated accents (made for dark chrome). |
| `bosque` | Deep forest greens and muted golds, ivory text. |
| `forxa` | **The North Star**: obsidian and gold over deep blue, serif with air. The body stays dark and progression lives in the ring. |
| `gotico` | Blackened iron, crimson and brass; heavy uppercase serif; edges like dried blood veins. |
| `sci-fi` | Holographic matrix: near-black body with all the neon in the thin ring (cyan → magenta), wide-tracked labels. |
| `escolar` | The only light one: friendly greens, sunny yellow and sky blue over cream, rounded type. For curricula and learning paths. |
| `atlas` | **Dense map** (19.10): the only one that is not just a palette. Brings `regionShape: 'hull'`, `regionLabel: 'top'`, thin strokes, `labelMinRadius: 40`, an ornate frame on the big nodes, dimmed icons, its own `background` and a glow on the path you took. Built for hundreds of nodes. |

`atlas` deserves its own note: it is the **complete recipe** for a look, not a palette, because the atlas mockup needs six axes at once and none of them works alone. And two things a preset **cannot** carry, because they are not theme but `tree.layout`: `type: "mesh"` and `curve: "arc"`. Without those two the web look stays half-done — they live in the [gallery atlas generator](https://github.com/fraga-labs/yggdrasil-forge/blob/main/tools/galeria/atlas-fisterra.mjs).

The previous four (19.0) are the project's **founding mockup** styles and the first to use `nodeRings`, `edges` and `typography`: copying one of those specs is the fastest way to make a generated document look finished.

:::caution[Fonts are not bundled]
The named families (Cinzel, Orbitron, Nunito…) do not ship with the package. Every stack ends in a real generic (`serif`/`sans-serif`), so a consumer without them sees the fallback — never a failure. If you want the real thing, load it on your own page.
:::

For an AI or a pipeline, the robust recipe is to **copy the preset's full spec** (the one in `gaia-cards.json` in the gallery carries `neon`); emitting only `{ "preset": "neon" }` lets a human press the chip in the editor.

## 3. The seam: editor chrome ↔ document

The ☀/🌙 switch in the top bar changes the **chrome** (the editor panels), **not** the document. The canvas picks its base according to the chrome — `minimal` in light, `minimalDark` in dark — so text, edges and mesh stay readable on any background; and **the document's overrides always win** over that base. So a document with the *Neon* preset looks just as neon on light or dark chrome, and a *Neutral* document follows the chrome. `ygg render --dark` reproduces the same dark base outside the editor.

## 4. Icons (recolorable SVG)

`node.icon` is a **registry id**, with fallback to emoji/character or to URL → image (with `iconScale` for the crop).

```tsx
import { registerIcons, BUILTIN_ICONS, NORSE_ICONS, LOGIC_ICONS, FORGE_ICONS } from '@yggdrasil-forge/react'
import type { IconDef } from '@yggdrasil-forge/react'

// BUILTIN_ICONS register themselves. Themed sets are OPT-IN (byte cost):
registerIcons(NORSE_ICONS)   // 26 norse icons: norse-world-tree, norse-wolf, …
registerIcons(LOGIC_ICONS)   // 19 prerequisite icons: logic-lock, logic-key, logic-fork, …
registerIcons(FORGE_ICONS)   // 25 industrial icons: forge-nut, forge-wrench, forge-crosshair, …

// Your own icon — recolors with the theme via currentColor:
const myIcon: IconDef = { viewBox: '0 0 24 24', paths: [{ d: 'M4 4 L20 20 M20 4 L4 20', mode: 'stroke' }] }
registerIcons({ 'my-x': myIcon })
```

The editor registers all three sets at startup, so `logic-key` or `forge-wrench` in the *Icona* field works out of the box. The full list of ids is in the [gallery README](https://github.com/fraga-labs/yggdrasil-forge/blob/main/examples/gallery/README.md#icon-sets-nodeicon).
