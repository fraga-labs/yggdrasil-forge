# @yggdrasil-forge/cli

`ygg` — command-line tools for [Yggdrasil Forge](https://github.com/fraga-labs/yggdrasil-forge), the progression-tree (skill tree) engine. The headless **data path**: everything the visual editor can do with a document, scriptable for pipelines and AIs.

```bash
pnpm add -D @yggdrasil-forge/cli
npx ygg --help
```

## Commands

| Command | What it does |
|---|---|
| `ygg validate [file \| -] [--json]` | Schema + hard validators — the exact same validation as the editor's import. `--json` emits `{ ok, issues[] }` (errors as data, for closed-loop generation). |
| `ygg layout <file \| -> --algo <a> [--out f]` | Places **every** node with a layout engine (`radial`, `tree`, `layered` for DAGs, `clustered-radial`, `constellation`, and `mesh` — the only one that reads the **edges**, for dense graphs) and bakes the framing. Deterministic. |
| `ygg render <file \| -> --out f.svg [--dark] [--locale gl] [--width N] [--minimap]` | Renders the tree to a **self-contained SVG** (theme, states and icons included — no external CSS). `--minimap` draws the minimap in the corner. |
| `ygg render … [--grant r=N,…] [--unlock id[:N],…]` | **Plays before painting**: grants resources and unlocks nodes (`id:N` takes N tiers) so one picture shows several node states instead of a fully-locked day zero. |
| `ygg schema [--out f]` | Emits the published JSON Schema of the document format. |
| `ygg new [--id x] [--label "…"]` | Emits a valid empty document to start from. |

Exit codes: `0` ok · `1` validation failed or error · `2` usage.

No flag fails quietly: an unknown or value-less option (a mistyped `--drak`, a `--out` with the filename forgotten) is a usage error, never a silently different picture.

## The AI loop

```bash
# generate a tree with an AI (schema + gallery as few-shot), then:
npx ygg validate tree.json --json     # fix → repeat
npx ygg layout tree.json --algo layered --out tree.json
npx ygg render tree.json --out tree.svg
```

Docs (Galician first, full English): **https://fraga-labs.github.io/yggdrasil-forge/**
Gold gallery of known-good documents: [`examples/gallery`](https://github.com/fraga-labs/yggdrasil-forge/tree/main/examples/gallery).

## Related packages

- [@yggdrasil-forge/core](https://www.npmjs.com/package/@yggdrasil-forge/core): TreeEngine, domain types, layout engines.
- [@yggdrasil-forge/react](https://www.npmjs.com/package/@yggdrasil-forge/react): the SVG renderer.

## License

MIT
