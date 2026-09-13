# @yggdrasil-forge/editor-core

Headless editor engine for [Yggdrasil Forge](https://fraga-labs.github.io/yggdrasil-forge/), the progression-tree (skill tree) engine. Everything the visual editor does, without a pixel of UI: documents, commands with undo/redo, live validation, auto-layout, theme presets and serialization. Zero React.

```bash
pnpm add @yggdrasil-forge/editor-core
```

## What it is

The edit-side core that [@yggdrasil-forge/editor-react](https://www.npmjs.com/package/@yggdrasil-forge/editor-react) (the Studio UI) is built on:

- **Document model** — `{ tree, editor }` with `serializeDocument` / `deserializeDocument`: guaranteed round-trip, versioned format.
- **EditorEngine + commands** — every edit is a `Command` with undo/redo; the engine keeps the document consistent.
- **Live validation** — structural validators (unique ids, dangling edges, cycles…) producing issues as data.
- **Auto-layout** — drives the layout engines from `@yggdrasil-forge/core` (radial, tree, layered DAGs, clustered-radial, constellation, mesh) and bakes the framing.
- **Theme presets** — named looks (`neon`, …) applied by declaration, plus `standaloneSvg` for self-contained SVG export.

## Where it sits in the stability contract

This package is the **application layer**: it versions with the stable group, but its surface may move faster than `core` while the Studio grows. **Pin versions** if you build on it. What it *produces* — the document — is covered by the hard 1.x promise (additive schema, intact unlock semantics, guaranteed round-trip). Details: [the stable contract](https://fraga-labs.github.io/yggdrasil-forge/contrato/contrato-estable/).

## Related packages

- [@yggdrasil-forge/core](https://www.npmjs.com/package/@yggdrasil-forge/core): TreeEngine, domain types, layout engines.
- [@yggdrasil-forge/editor-react](https://www.npmjs.com/package/@yggdrasil-forge/editor-react): the Studio UI over this engine.
- [@yggdrasil-forge/cli](https://www.npmjs.com/package/@yggdrasil-forge/cli): `ygg` — the same data path, scriptable.

Docs (Galician first, full English): **https://fraga-labs.github.io/yggdrasil-forge/**

## License

MIT
