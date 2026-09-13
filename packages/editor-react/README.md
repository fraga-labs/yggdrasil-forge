# @yggdrasil-forge/editor-react

The **Yggdrasil Forge Studio** — the full visual editor for progression trees (skill trees), as a React component library. This is the application layer of [Yggdrasil Forge](https://fraga-labs.github.io/yggdrasil-forge/): canvas with pan/zoom, inspector, live validation, auto-layout with six engines, cards view, play mode, icon picker, autosave with recovery, and a synchronized code panel.

```bash
pnpm add @yggdrasil-forge/editor-react @yggdrasil-forge/editor-core react react-dom
```

`react@19` or newer is required as a peer dependency. Import the bundled styles once:

```ts
import '@yggdrasil-forge/editor-react/styles.css'
```

## What you get

- **EditorShell / EditorCanvas** — the editor chrome (dockable panels) and the graph canvas with selection, drag, viewport controls and structure/problems navigation.
- **Inspector** — edit nodes, edges, groups, unlock rules, costs, icons (visual picker over the registered icon sets) and theme presets.
- **Cards view** — the same document as group cards with icon parity (glyphs, images, emoji).
- **Play mode** — walk the tree as a player against the real `TreeEngine` semantics.
- **Code panel** — CodeMirror JSON view synchronized both ways with the canvas.
- **Import/Export** — the versioned document format, plus self-contained SVG export.

Everything renders the same document the rest of the toolchain speaks: what you author here loads in [@yggdrasil-forge/react](https://www.npmjs.com/package/@yggdrasil-forge/react), validates with [`ygg`](https://www.npmjs.com/package/@yggdrasil-forge/cli), and round-trips forever.

## Where it sits in the stability contract

This package is the **application layer**: it versions with the stable group, but its surface may move faster than `core` while the Studio grows. **Pin versions** if you build on it. What it *produces* — the document — is covered by the hard 1.x promise. Details: [the stable contract](https://fraga-labs.github.io/yggdrasil-forge/contrato/contrato-estable/).

## Docs

Galician first, full English: **https://fraga-labs.github.io/yggdrasil-forge/**
A runnable editor app lives in the repository: [`examples/editor`](https://github.com/fraga-labs/yggdrasil-forge/tree/main/examples/editor).

## License

MIT
