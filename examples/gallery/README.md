# Yggdrasil Forge — gold gallery

> ⚠️ En galego: esta galería son exemplos de ouro do formato de documento — datos válidos garantidos por test; o `README` vai en inglés porque a audiencia é externa (máquinas, terceiros e IAs).

Known-good example documents for the Yggdrasil Forge document format
(`{ tree, editor }`). Every file here is guaranteed importable: a test
runs `deserializeDocument` over each `*.json` on every CI pass, so the
gallery cannot rot.

Use these together with the published JSON Schema
([`schema/yggdrasil-document.schema.json`](../../schema/yggdrasil-document.schema.json))
as few-shot examples when generating documents programmatically (or
with an AI). Validate output with `ygg validate <file>` from
`@yggdrasil-forge/cli`.

## Files

### `minimal.json` — the smallest useful document
Hand-written, didactic. Exercises:
- 2 nodes (`small` + `keystone`), 1 `dependency` edge.
- 1 resource with `initial` (seeds the play-mode budget).
- A `prerequisites` group (`all`) with a `node_unlocked` condition.
- `costPerTier` (dense array, single tier).
- Bilingual labels (`gl`/`en`) at every level.
- `editor.coordinateBounds` (stable canvas world box).

### `panadeiro.json` — the friendly reference tree
Generated from the canonical baker fixture (`examples/editor`) with
`serializeDocument` — never edited by hand. Exercises:
- Node `groups` (two groups).
- A multi-tier node (`maxTier: 3`) with escalating `costPerTier`.
- A document theme (`editor.theme`): preset, per-state `nodeFills`
  and a region tint bound to a node tag.
- `editor.coordinateBounds` + document `background` reference.

### `lobo-de-inverno.json` — the AI-authored showcase
*"The Winter Wolf Path"* — generated end-to-end by an AI assistant from the
published schema plus this gallery, valid on the first try. The most complete
example: use it as the reference for what a finished, game-ready document
looks like. Exercises:
- 18 nodes in 3 branches with a shared trunk and a summit keystone reachable
  via an `any` group over three branch keystones.
- Embedded **SVG icons as data URIs** (self-contained, no network) on
  keystones/notables; Unicode runes as text icons on minor nodes.
- A **background image** (`editor.background.src`, data-URI SVG night sky).
- Full **theme**: per-state `nodeFills`, `textColor`, 3 tinted regions bound
  to node tags; hexagon/diamond/circle shapes; per-node `color` + `size`
  override on the summit.
- Two resources with `icon`, `color`, `initial` and `max`; multi-rank nodes
  with escalating `costPerTier`; `node_maxed` prerequisites; symmetric
  `exclusions` between two keystones ("choose your path").
- Screenshots in [`docs/assets/`](../../docs/assets/) (see the root README's
  *AI-assisted authoring* section).

### `congoxa-netrunner.json` — the neon mesh (AI-authored)
*"The Netrunner's Dread"* — cyberpunk theme on near-black with a neon grid
background. Structurally the opposite of the wolf tree: a **mesh with
cross-branch links** instead of symmetric fans. Exercises:
- Cross-links between branches (a node reachable from two branches via an
  `any` group); two mutually-exclusive capstones feeding a shared summit.
- Dark neon theme: cyan state fills, magenta/cyan/amber region tints, and a
  per-node `color` override (magenta summit).
- Embedded SVG icon set (chip, skull, ghost, storm…) as data URIs.

### `escola-de-gaita.json` — the learning path (AI-authored)
*"Gaita School"* — a **Galician bagpipe course**, proving the engine works
for education, not just games. Exercises:
- A **light parchment theme** (the other two showcases are dark): warm
  fills, ink text, music-staff background — "Same Data, Different Themes".
- Left-to-right course layout (progression as a timeline, not a fan).
- A single resource (practice hours); a final keystone gated by an `all`
  group across the three tracks (breath / fingering / repertoire), with a
  `node_maxed` condition on the technique node.

### `gaia-cards.json` — the card-ready pattern
*"Constellation Atlas"* — **the reference pattern for generating trees meant
for the cards view** (the `graph | cards` toggle in the editor canvas): each
group renders as a card, each member node as an icon+label+badge row.
Exercises:
- 4 groups with bilingual `label`, `color`, `icon` (built-in registry ids:
  `sparkle`/`arrow`/`bolt`/`gem`) — one group without `color` (deterministic
  palette rotation) and two with `position` (explicit card placement; the
  rest fall back to the automatic ring).
- **Dual membership, deliberately mixed**: some nodes join via
  `GroupDef.nodeIds`, others declare `node.group`, one group uses both.
  Either way works; generators can pick whichever is convenient.
- Two nodes with **no group at all** → they appear under a synthetic
  *"Ungrouped"* card (the view never hides tree content).
- Varied `maxTier` (1/2/3) so card badges show `0/1`, `0/3`… and fill up
  as you play in Proba mode.

### `a-vixilia.json` — the gothic showcase (19.1)

*"The Vigil"* — one night's watch in a besieged church: hold until dawn,
or go down to the ossuary and stop having to hold. The first document to
use the theme axes that started travelling in 19.0, and the reference for
**how a named preset is applied by a generator**: `editor.theme` carries
the `gotico` spec verbatim, id included. Exercises:

- **`nodeRings`, `edges` and `typography` as data** — blackened-iron rings
  that rust to crimson with progression, dried-blood edges, heavy
  uppercase serif. Copy this `editor.theme` and any tree looks gothic.
- **A pure `none` prerequisite group** (`man-limpa`, "The Clean Hand"):
  available only while you have *not* taken the pact. It is also the
  clearest demo of doctrine 2.4.b — unlock it early, take the pact after,
  and it **stays** unlocked: prerequisites are gates at unlock time, not
  continuous invariants.
- **A symmetric `exclusions` pair with narrative weight**: `alba` (dawn)
  and `pacto` (the bargain) veto each other, so the engine — not the prose
  — enforces that you cannot have both endings.
- **`resource_min` in a real tree** (the pact demands you actually hold a
  relic), not just in `adversarial`.
- **`ascendancy` nodes** (octagon shape) and a tree that grows *downward*
  as well as upward: the crypt descends below the root.
- Icons from **three different official sets at once** (`logic-*`,
  `norse-*`, `forge-*`) — they coexist in one document.

### `adversarial.json` — the deliberately awkward tree
Generated from `adversarialDocument()` (`@yggdrasil-forge/editor-core`)
with `serializeDocument` — never edited by hand. Exercises the paths
the friendly data never touches:
- **No** `editor.coordinateBounds` (renderer must derive bounds).
- Bilingual labels at every level (tree, nodes, resources).
- 2 resources, one `refundable` with `refundPercent`.
- `prerequisites` groups `any` **and** `none`.
- Symmetric `exclusions` between two nodes.
- `tags` + `editor.theme.regions` with two regions (one shared).
- A node with its own `color` override; a node **without** `position`.
- **The aesthetics-by-declaration showcase (7.19)**: every node carries a
  `logic-*` icon (12 distinct ids) and the document applies the `neon`
  theme preset — write two declarative fields, get a dressed tree.

## Showcase states (how the doc-site cards are rendered)

`ygg render` paints a tree on **day zero** — everything `locked` — unless
you play it first. Since `locked` is by design the dimmest state, a
day-zero picture shows neither the palette nor the path.

The play scripts for the doc-site cards live in
[`../gallery-showcase.json`](../gallery-showcase.json), deliberately
**outside** this folder: the `*.json` files in here are the few-shot
corpus, and a staging field inside them would teach generators to emit
it. (Several tools also glob `gallery/*.json` as documents.)

```bash
ygg render lobo-de-inverno.json --out shot.svg --dark   --grant "saga=30,sangue=6" --unlock "espertar,corazon,machado:3"
```

A failed unlock is an **error**, not a quieter picture — so if a node id
in a script ever goes stale, the doc-site build fails instead of shipping
a wrong showcase.

## Aesthetics by declaration

Two orthogonal knobs make a generated tree look finished **without
touching a single pixel**. Both are plain strings in the JSON.

### Theme presets (`editor.theme`)

Apply a named preset by copying its full spec (the editor's Theme panel
does exactly this; the `preset` field is the id). Available presets, from
`@yggdrasil-forge/editor-core` (`THEME_PRESETS`):

| id | one-liner |
|----|-----------|
| `tintado` | Distinguishable tinted palette (the baker-tree classic). |
| `neutro` | Zero overrides — falls back to the renderer's `minimal` base. |
| `pergamino` | Warm earthy parchment lights, sepia-ink text. |
| `neon` | Deep dark fills with saturated accents (made for dark chrome). |
| `bosque` | Deep forest greens and muted golds, ivory text. |
| `forxa` | Obsidian and gold over deep blue, serif with air — the project's North Star mockup. |
| `gotico` | Blackened iron, crimson and brass; heavy uppercase serif; dried-blood edges. |
| `sci-fi` | Near-black body, all the neon in the thin ring (cyan → magenta), wide-tracked labels. |
| `escolar` | Friendly greens, sunny yellow and sky blue over cream, rounded type — the only light one. |

The last four ship since 19.0 and are the first presets to exercise the
three axes the document learned to carry that release — `nodeRings` (the
node **outline** per state, sibling of `nodeFills`, which paints the
body), `edges` (`color` + `active` for lit paths) and `typography`
(`fontFamily`, `fontWeight`, `letterSpacing`, `textTransform`). If you
are generating a document and want it to look finished, copy one of
those specs verbatim: type and outline carry as much identity as color.

Named font families are **not bundled**; every stack ends in a real
generic, so a consumer without the font sees the fallback, never a
failure.

The easiest robust recipe for generators: set
`"editor": { "theme": { "preset": "<id>", ...full spec... } }` by copying
the spec from an example (see `gaia-cards.json` for `neon` applied), or
just emit `{ "preset": "<id>" }` and let a human press the matching chip
in the editor's Theme tab.

### Icon sets (`node.icon`)

`node.icon` accepts an emoji, an image URL, or a **registered icon id**.
Three official opt-in sets ship with `@yggdrasil-forge/react`:

- **`logic-*`** — 19 icons for prerequisite/progression semantics
  (see them all on `gaia-cards.json`): `logic-lock`, `logic-unlock`,
  `logic-key`, `logic-crown`, `logic-gate`, `logic-scroll`,
  `logic-check`, `logic-cross`, `logic-compass`, `logic-map-marker`,
  `logic-flame`, `logic-intersect`, `logic-fork`, `logic-forbidden`,
  `logic-eye-closed`, `logic-sparkle`, `logic-star`, `logic-rune`,
  `logic-seedling`.
- **`norse-*`** — 26 norse-flavoured icons (world tree, runes, mythic
  beasts…); full list in
  [`packages/react/src/icons/norse.ts`](../../packages/react/src/icons/norse.ts).
- **`forge-*`** — 25 industrial/mechanical icons (workshop-blueprint
  stroke style): `forge-nut`, `forge-spring`, `forge-plate`,
  `forge-scope`, `forge-rivet`, `forge-assembly`, `forge-cart`,
  `forge-weight`, `forge-guard`, `forge-wall`, `forge-breach`,
  `forge-crosshair`, `forge-cadence`, `forge-arc`, `forge-range`,
  `forge-mortar`, `forge-eye`, `forge-wrench`, `forge-hook`,
  `forge-weld`, `forge-revive`, `forge-nameplate`, `forge-barcode`,
  `forge-link`, `forge-shelf`.

The bundled editor registers the three sets at startup, so these ids
work out of the box; other consumers opt in with
`registerIcons(LOGIC_ICONS)` / `registerIcons(NORSE_ICONS)` /
`registerIcons(FORGE_ICONS)`.

## Regenerating

`minimal.json` is manual. The other two:

```bash
HUSKY=0 corepack pnpm turbo run build --filter @yggdrasil-forge/editor-core
HUSKY=0 corepack pnpm --filter @yggdrasil-forge-examples/editor run gen:gallery
```
