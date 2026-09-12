---
title: Layouts
description: The six placement engines — radial, tree, layered, clustered radial, constellation and mesh — plus `custom`, and when to use each.
---

A **layout** decides where each node goes. In Yggdrasil Forge there are two ways to use one:

- **Live**: `tree.layout.type` names an engine and the renderer computes positions when painting. Useful for consumers who never hand-edit.
- **Baked** (what the editor does): *Dispor* (arrange) or `ygg layout` run the engine **once** and store the positions in `node.position`, leaving `layout.type = "custom"`. Then you tweak by dragging; a single undo brings everything back. It is the editor's doctrine: *you retouch what the machine proposes*.

## The engines

| Engine | `layout.type` | Use it when… | Not when… |
|---|---|---|---|
| **Radial** | `radial` | you want rings by depth from the root (Oberón, perks). | hierarchy doesn't matter. |
| **Tree (by levels)** | `tree` | **every node has a single parent** (Diablo, WoW talents). | nodes have several parents: it picks a "primary parent" and the other edges cross diagonally. |
| **Layered (for DAGs)** | `layered` | there are **nodes with several parents** or multiple requirements (curricula, tech trees). Layer = longest path; order by barycenter. | the graph has cycles: it returns an error (never places garbage). |
| **Clustered radial** | `clustered-radial` | you have **groups**; each group is a cluster on a ring, loose nodes get their own slot. | there are no groups. |
| **Constellation** | `constellation` | the graph is loose, with no clear hierarchy (Skyrim). | you want to read the progression. |
| **Mesh** | `mesh` | the graph is **dense and looped** and you want the spider-web look: one organic blob per group, placed so edges come out SHORT. The only engine that reads the edges. | the graph is a tree: the forces have nothing to tension and `tree` does better. |
| **Custom** | `custom` | positions come in the data (`node.position`). It is what *Dispor* leaves behind. | — |

The usage conditions are exactly the help lines shown by the editor's **Dispor** menu.

## Tree or layered? The baker case

In the baker tree, *basic bread* has **two** parents (flour and yeast). With **Tree**, yeast ends up as a root set aside and its edge crosses the drawing diagonally: not a bug, but the limit of a tree layout over a graph that isn't a tree. With **Layered**, flour and yeast sit **together at the top** and both edges flow cleanly down to basic bread. If your trees are educational, you almost always want Layered.

## Configuration

Each engine accepts parameters in `tree.layout` (all optional; the editor derives sensible values from the tree size):

```json
"layout": { "type": "layered", "nodeSpacing": 90, "levelSpacing": 130 }
"layout": { "type": "radial", "radius": 200 }
"layout": { "type": "clustered-radial", "groupRadius": 220, "orbitRadius": 90 }
"layout": { "type": "mesh", "spacing": 66, "seed": 1, "curve": "arc" }
```

`tree` and `layered` share `nodeSpacing`, `levelSpacing`, `direction` (`top-down`, `bottom-up`, `left-right`, `right-left`) and `centerX/centerY`.

## From the CLI

```bash
npx ygg layout tree.json --algo layered --out tree.json
```

Places **every** node (including those that already had a position — arranging is arranging) and updates `editor.coordinateBounds` so nothing falls outside the framing. Deterministic: same input, same positions.

## Your own engines

A consumer can register its own engine in `LayoutEngineRegistry` from `@yggdrasil-forge/core` (`{ type, compute(treeDef) → Result<LayoutResult> }`) and use it by `type`. That is why `layout.type` is an open string in the schema. See the [extension guide](../extension/guia/).

Every example in the [gallery](../exemplos/galeria/) is placed by one of these engines.
