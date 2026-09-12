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
    "regions": [{ "id": "r1", "label": "Breath", "tag": "breath", "color": "#c8875f" }]
  }
}
```

- `nodeFills` — per-state fill of the node **body** (partial: anything missing falls back to the base theme).
- `nodeRings` — per-state color of the node **ring** (outline). The exact sibling of `nodeFills`: the renderer paints a node in two layers, and this is the outer one. It is what separates blackened iron from a thin neon hexagon without touching the fill.
- `edges` — `color` for the lines and `active` for **lit** ones (those leaving an `unlocked`/`maxed` node). Without `active`, lit edges fall back to `color`.
- `typography` — `fontFamily` (always with a generic fallback), `fontWeight`, `letterSpacing`, `textTransform`. **Type is identity, not decoration**: a gothic document and a sci-fi one are not told apart by color alone.
- `textColor` — node text and icons, and region labels. Without it, the editor picks a legible one for its chrome.
- `regions` — **tints by tag**: nodes carrying that `tag` get a colored background (low opacity) and a region label.
- `preset` — **informational**: which preset it started from (the UI marks the active chip). It does not affect rendering by itself: applying a preset means copying its full spec.

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
