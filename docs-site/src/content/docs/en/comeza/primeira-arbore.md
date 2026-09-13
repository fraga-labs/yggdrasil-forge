---
title: Your first tree in 5 minutes
description: Two paths to the same result — with the editor (no code) or with the CLI (no editor).
sidebar:
  order: 2
---

Let's make a small three-step tree: *Knead → Bake → Sell*. The same tree comes out of both paths; pick yours.

## Path A — with the editor

1. Start the editor ([installation](../instalacion/)) and do **Ficheiro → Novo** (File → New). The editor's UI is in Galician; this guide gives each label with its translation the first time it appears.
2. Press **N** (*Engadir nodo*, the add-node tool) and click three times on the canvas: three nodes.
3. Select each one (tool **V**, *Seleccionar*) and, in the **Inspector**, label them (*Etiqueta*): *Knead*, *Bake*, *Sell*. Give *Sell* the **Tipo** (type) `keystone` and the **Icona** (icon) `logic-crown`.
4. Press **C** (*Conectar*, connect) and drag from *Knead* to *Bake*, and from *Bake* to *Sell*. With the default option, each connection also adds the prerequisite: *Bake* requires *Knead*, and so on.
5. With nothing selected, the Inspector shows the **tree**: add a **Recurso** (resource) called *Point* with initial (*Inicial*) `3`. Go back to each node and give it **Custo** (cost) `1 Point`.
6. **✥ Dispor → Árbore (por niveis)** (Arrange → Tree by levels) to place them nicely. **Tema** (theme) tab → **Pergamiño** (Parchment).
7. Switch to **Proba** (play mode): you have 3 points; unlock *Knead*, then *Bake*, then *Sell*. The fills change as you go. **Reiniciar** (reset) starts over.
8. **Ficheiro → Exportar JSON** saves the document; **Exportar imaxe SVG** gives you the picture.

## Path B — with the CLI (without opening the editor)

Write `bakery.json`:

```json
{
  "tree": {
    "id": "bakery",
    "schemaVersion": "1.0.0",
    "version": "1.0.0",
    "label": { "gl": "Panadería", "en": "Bakery" },
    "resources": [{ "id": "point", "label": { "gl": "Punto", "en": "Point" }, "initial": 3 }],
    "nodes": [
      { "id": "knead", "type": "small", "label": { "en": "Knead" },
        "costPerTier": [[{ "resourceId": "point", "amount": 1 }]] },
      { "id": "bake", "type": "small", "label": { "en": "Bake" },
        "prerequisites": { "type": "all", "conditions": [{ "type": "node_unlocked", "nodeId": "knead" }] },
        "costPerTier": [[{ "resourceId": "point", "amount": 1 }]] },
      { "id": "sell", "type": "keystone", "label": { "en": "Sell" }, "icon": "logic-crown",
        "prerequisites": { "type": "all", "conditions": [{ "type": "node_unlocked", "nodeId": "bake" }] },
        "costPerTier": [[{ "resourceId": "point", "amount": 1 }]] }
    ],
    "edges": [
      { "id": "e1", "source": "knead", "target": "bake", "type": "dependency" },
      { "id": "e2", "source": "bake", "target": "sell", "type": "dependency" }
    ],
    "layout": { "type": "custom" }
  },
  "editor": { "formatVersion": "1.0.0" }
}
```

Notice: **no positions**. You don't need them:

```bash
npx ygg validate bakery.json            # ✓ documento válido (3 nodos, 2 arestas)
npx ygg layout bakery.json --algo tree --out bakery.json
npx ygg render bakery.json --out bakery.svg
```

The `ygg` command speaks **Galician**: that first line is the real output, not a translation of it. Exit codes and `--json` are language-neutral, so a script or a model never has to read it.

`layout` bakes the positions (and the framing) into the document; `render` produces a self-contained SVG. Import `bakery.json` into the editor whenever you want to tweak it.

## What you just used

- The **document** `{ tree, editor }`: `tree` is the portable contract (the engine only knows about that); `editor` keeps what belongs to the editor (framing, theme, background). → [The TreeDef contract](../../contrato/conceptos/)
- **Prerequisites** and **per-tier costs**: the progression logic lives in the data, not in the UI.
- **Arrange / `ygg layout`** and **preset / icons**: position and looks by declaration. → [Layouts](../../layouts/), [Theming](../../theming/)
- **Proba**: the engine playing your tree.

Next: [the AI loop](../bucle-ia/) — the same path B, but the one writing the JSON is a model.
