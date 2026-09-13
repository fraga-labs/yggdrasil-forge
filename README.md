# Yggdrasil Forge

> Open-source TypeScript monorepo for building interactive skill
> trees — engine, storage, React renderer, plugins, search, and
> validators.

[![Try it live](https://img.shields.io/badge/%F0%9F%8C%B3%20try%20it-live%20editor-2e7d4f)](https://fraga-labs.github.io/yggdrasil-forge/app/)
[![npm](https://img.shields.io/npm/v/%40yggdrasil-forge%2Fcore?label=%40yggdrasil-forge%2Fcore)](https://www.npmjs.com/package/@yggdrasil-forge/core)
[![CI](https://github.com/fraga-labs/yggdrasil-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/fraga-labs/yggdrasil-forge/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-galego%20%2B%20english-2e7d4f)](https://fraga-labs.github.io/yggdrasil-forge/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Status: 1.x — shipped

The 1.0 line is shipped and the 1.x line evolves on top of it:
themable renderer, complete editor (with autosave and offline PWA),
the data path (published JSON Schema + `ygg` CLI: validate · layout ·
render), the embeddable core bundle for game engines, and bilingual
public docs.

> 🌳 **Try it now — the live editor:** **https://fraga-labs.github.io/yggdrasil-forge/app/** (runs entirely in your browser; no account, no install) ·
> 📚 **Docs:** **https://fraga-labs.github.io/yggdrasil-forge/** (Galician first, full English) ·
> 🗺️ Roadmap and the audited line of done: [`docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md`](docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md).


## What is Yggdrasil Forge?

A modular TypeScript engine for designing, rendering, and
interacting with skill trees — the kind of branching progression
systems found in RPGs, learning platforms, gamified curricula,
and competency frameworks.

**Highlights**:

- 🌳 **Composable trees**: nodes, edges, prerequisites, costs,
  resources, stats — all typed strictly.
- ⚡ **Reactive state**: efficient diffing via `StateStore` +
  `ChangeTracker`; subscribers fire only on relevant changes.
- 💾 **Persistence**: 6 storage adapters (Memory, LocalStorage,
  SessionStorage, IndexedDB, FileSystem, ScopedStorage).
- 📸 **Snapshots + loadouts**: save / restore / share builds via
  serialized URLs.
- ⚛️ **React renderer**: drop-in `<SkillTree>` component with
  themes + hooks.
- 🔌 **Plugin system**: 8 lifecycle hooks; official `HistoryPlugin`,
  `DebugPlugin`, `SearchPlugin`.
- 🔍 **Search**: custom substring engine with field-weighted
  scoring + `LocalizedString` support.
- ✅ **Validators**: 9 built-in structural + pedagogical rules
  (cycles, reachability, branching balance, etc.).
- 🌐 **i18n-first**: every error message localized in gl / es / en.

## See it in action

The [`react-demo`](./examples/react-demo) example builds **"The Paladin"** — a
13-node skill tree with three branches, complex prerequisites, mutually-exclusive
paths, dynamic theming, and custom painted badges:

![The Paladin skill tree](docs/guide/img/paladin-overview.png)

**New here? Start with the walkthrough.** It builds this exact tree step by step —
data model → rendering → theming → art — explaining the *why* at each step and the
pitfalls to avoid along the way:

- 📖 **[Walkthrough — build the Paladin (English)](docs/guide/paladin-walkthrough.en.md)**
- 📖 **[Tutorial — construye El Paladín (Español)](docs/guide/paladin-walkthrough.es.md)**

## AI-assisted authoring — the data path

Yggdrasil Forge is built so that **an AI (or any pipeline) can author a
complete, playable skill tree without ever clicking the editor**. The tree
below — *"The Winter Wolf Path"*: 18 nodes, 3 tinted regions, embedded SVG
icons, a night-sky background, per-state theme fills, two resources, ranks,
`all`/`any` prerequisites and a mutually-exclusive keystone pair — was
generated as a single JSON document by an AI assistant and imported in one
paste, valid on the first try:

![Winter Wolf Path — authoring view with the live Code panel](docs/assets/showcase-lobo-autoria.png)

The workflow:

1. **Generate** — give the AI the published
   [JSON Schema](schema/yggdrasil-document.schema.json) and the
   [gold gallery](examples/gallery/) as few-shot examples, and ask for a tree
   on any theme. The full document lives in the gallery:
   [`lobo-de-inverno.json`](examples/gallery/lobo-de-inverno.json).
2. **Validate** — `ygg validate tree.json` (from `@yggdrasil-forge/cli`) runs
   the exact same validation as the editor's import and reports errors *as
   data* (`--json`), so the AI can fix its own output in a tight loop.
3. **Lay out** — the AI doesn't need to invent coordinates:
   `ygg layout tree.json --algo layered` places every node (six engines:
   `radial`, `tree`, `layered` for DAGs with multi-parent nodes,
   `clustered-radial`, `constellation`, and `mesh` — the only one that reads
   the *edges*, for dense graphs). The editor offers the same menu
   (*Dispor*) and invites you to use it when a pasted tree has no positions.
4. **Dress** — two plain strings make it look finished: a named theme
   preset (`"preset": "neon"` — five curated presets) and bundled icon ids
   (`"icon": "logic-key"`, 19 `logic-*` + 26 `norse-*` + 25 `forge-*`). See
   [aesthetics by declaration](examples/gallery/README.md#aesthetics-by-declaration).
5. **Paste** — drop the JSON into the editor's live **Code panel** → *Validar*
   → *Aplicar*. The whole document replaces the canvas as a single undo step.
6. **Play** — switch to *Proba* mode and play the tree: grant resources,
   unlock nodes, watch the state fills light up.
7. **Render** — `ygg render tree.json --out tree.svg` produces a
   self-contained SVG headlessly (the editor exports SVG/PNG too), so the
   AI can look at its own result and self-critique.

![Winter Wolf Path — played in Proba mode, War branch unlocked](docs/assets/showcase-lobo-proba.png)

## Why Yggdrasil Forge?

If you're building a skill tree, progression system, or branching
curriculum, you have two options:

1. **Roll your own**: implement nodes, edges, prerequisites, state
   management, persistence, validation... and discover edge cases
   you didn't anticipate.
2. **Use Yggdrasil Forge**: a tested, modular engine that has
   already solved the hard problems.

### What you'd build anyway

If your project needs more than a few static nodes, you'll
eventually need:

- **Prerequisite logic**: not just `A → B`, but `(A AND B) OR C`,
  resource-gated unlocks, mutual exclusions. Yggdrasil Forge ships
  `UnlockRule` — a discriminated union for composable rules.
- **State management**: efficient diffing so React only re-renders
  what changed. We use `StateStore` + `ChangeTracker`, with a
  test suite in the thousands covering the edge cases.
- **Persistence + migrations**: 6 storage backends, snapshot
  system, share-via-URL — plus a migration framework so stored
  data survives schema changes.
- **Validators**: detect cycles, unreachable nodes, redundant
  prerequisites *before* shipping to users. 9 built-in rules cover
  structural and pedagogical concerns.
- **i18n**: every error message is localized (gl/es/en); every
  user-facing label is a `LocalizedString`.

### What you probably *wouldn't* build

These come "free" with Yggdrasil Forge:

- **Plugin system** with 8 lifecycle hooks for cross-cutting
  concerns (analytics, debugging, history tracking, custom
  validators).
- **Custom search** with field-weighted scoring (label > keywords >
  description > tags).
- **React renderer** with built-in SVG components, reactive hooks,
  and a default theme.
- **Read-only mode** for shareable preview links.
- **Headless mode** if you want full control over styling.

### When *not* to use Yggdrasil Forge

Be honest: if you need **≤5 nodes** and **no state persistence**,
just use a handful of hard-coded `if` statements. Yggdrasil Forge
earns its dependency footprint when:

- You have **10+ nodes** with branching prerequisites.
- State persistence matters (browser refresh, multi-device sync,
  shareable builds).
- Multiple developers will work on the system over time.
- You want to evolve the tree without rewrites (migrations + schema
  versioning).

## Quick start

### Installation

```bash
pnpm add @yggdrasil-forge/core @yggdrasil-forge/common @yggdrasil-forge/storage
```

For React:

```bash
pnpm add @yggdrasil-forge/react react
```

### Minimal example

```typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'

const treeDef = {
  id: 'my-tree',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { en: 'My skill tree' },
  nodes: [
    { id: 'a', type: 'small' as const, label: { en: 'Skill A' } },
    {
      id: 'b',
      type: 'small' as const,
      label: { en: 'Skill B' },
      prerequisites: { type: 'node_unlocked' as const, nodeId: 'a' },
    },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b', type: 'dependency' as const },
  ],
}

const engine = new TreeEngine(treeDef, { storage: new MemoryStorage() })

const result = await engine.unlock('a')
if (result.ok) {
  console.log('Unlocked!')
}
```

See [`examples/node-basics`](./examples/node-basics) for the
complete annotated walkthrough.

The core doesn't know React exists — proof:
[`examples/vanilla-js`](./examples/vanilla-js), the baker tree driven
with `@yggdrasil-forge/core` and the bare DOM (`canUnlock`, `unlock`,
`grantResource`, paint states), zero framework.

And it doesn't know the web exists either: the **embeddable bundle**
(`@yggdrasil-forge/core/global`, a self-contained IIFE — zero DOM,
zero imports) runs in the JS interpreters engines embed (Jint, puerts,
GodotJS), smoke-tested against real QuickJS on every CI run. Ingestion
examples for Godot and Unity live in
[`examples/engines`](./examples/engines) — same document, same
decisions, wherever it lands.

## Packages

This is a monorepo of 22 packages. The table tells the truth about
every one of them — three hard tiers, no blur:

### Stable 1.0 (released in lockstep; semver contract applies)

| Package | Description |
|---------|-------------|
| [`@yggdrasil-forge/common`](packages/common) | Shared types, errors, `Result<T>`, `LocalizedString`. |
| [`@yggdrasil-forge/core`](packages/core) | `TreeEngine`, domain types, unlock semantics, layout engines, Zod schema. |
| [`@yggdrasil-forge/react`](packages/react) | SVG renderer: SkillTree, viewport, themes, icon sets. |
| [`@yggdrasil-forge/editor-core`](packages/editor-core) | Headless editor engine (commands, undo/redo, validation, auto-layout, presets). |
| [`@yggdrasil-forge/editor-react`](packages/editor-react) | The Studio — the full editor UI. Runnable via [`examples/editor`](examples/editor). |
| [`@yggdrasil-forge/cli`](packages/cli) | `ygg` — `validate`, `layout`, `render`, `schema`, `new`: the headless data path. |

### Functional (built in phases 3–9; published, pre-1.0 API)

| Package | Description |
|---------|-------------|
| [`@yggdrasil-forge/storage`](packages/storage) | 6 storage adapter implementations. |
| [`@yggdrasil-forge/plugins`](packages/plugins) | Official plugins: History, Debug. |
| [`@yggdrasil-forge/search`](packages/search) | Search engine + SearchPlugin. |
| [`@yggdrasil-forge/validators`](packages/validators) | 9 built-in pedagogical rules. |
| [`@yggdrasil-forge/importers`](packages/importers) | GAIA-shaped / canonical / generic importers → `TreeDef`. |
| [`@yggdrasil-forge/exporters`](packages/exporters) | `TreeDef` → JSON / YAML serialization (small but real). |

### Reserved (stubs — a name and a plan, zero implementation)

`@yggdrasil-forge/{analytics, devtools, diff, heatmap, i18n,
multitenancy, neo4j, stats, themes, webhooks}` — deliberate
placeholders for post-1.0 phases (see the roadmap's §6). Each one's
README says exactly that, first line. **They contain no code**; don't
install them expecting behaviour.

## Documentation

- **[Paladin walkthrough](docs/guide/paladin-walkthrough.en.md)**
  ([Español](docs/guide/paladin-walkthrough.es.md)) — build a real skill
  tree step by step, with diagrams and gotchas. Best starting point.
- **[Architecture MASTER document](docs/architecture/MASTER.md)** —
  full design rationale + roadmap.
- **[Development briefings](docs/briefings/)** — the complete
  per-sub-phase history, one briefing per increment.
- **Per-package READMEs** — installation + API summary for each
  package.

## Development

Requires **Node.js ≥ 22** and **pnpm 11**.

```bash
git clone https://github.com/fraga-labs/yggdrasil-forge
cd yggdrasil-forge
pnpm install
pnpm typecheck
pnpm test
pnpm build       # all packages
```

Run the example:

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics start
```

## Roadmap

**1.0 is shipped** — the audited line of done lives in
[`ROADMAP-1.0-RENDERER-TO-STUDIO.md`](docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md)
(§2, point by point, with evidence), and post-1.0 work is banked in its
§6 with the types already in place. The full design history is in
[MASTER.md](docs/architecture/MASTER.md).

## Contributing

Issues and feedback welcome via GitHub. The project is 1.0: PRs are
accepted — read the
[architecture guide](https://fraga-labs.github.io/yggdrasil-forge/arquitectura/guia/)
and the
[extension guide](https://fraga-labs.github.io/yggdrasil-forge/extension/guia/)
first; the quality gates (lint, format, typecheck, tests) are
non-negotiable.

## License

[MIT](LICENSE)

---

*Yggdrasil Forge is named after the world tree of Norse mythology,
the cosmic ash whose branches connect the nine realms — a fitting
metaphor for a system that connects nodes across domains.*
