---
title: Layouts
description: Os seis motores de colocación — radial, árbore, capas, radial por grupos, constelación e malla — máis `custom`, e cando usar cada un.
---

Un **layout** decide onde vai cada nodo. En Yggdrasil Forge hai dúas formas de usalo:

- **Vivo**: `tree.layout.type` nomea un motor e o renderer calcula as posicións ao pintar. Útil para consumidores que nunca editan á man.
- **Cocido** (o que fai o editor): *Dispor* ou `ygg layout` executan o motor **unha vez** e gardan as posicións en `node.position`, deixando `layout.type = "custom"`. Despois retocas arrastrando; un só desfacer devolve todo. É a doutrina do editor: *retocas o que a máquina propón*.

## Os motores

| Motor | `layout.type` | Úsao cando… | Non cando… |
|---|---|---|---|
| **Radial** | `radial` | queres aneis por profundidade desde a raíz (Oberón, perks). | a xerarquía non importa. |
| **Árbore (por niveis)** | `tree` | **cada nodo ten un só pai** (Diablo, talentos de WoW). | hai nodos con varios pais: elixe un «pai primario» e as demais arestas crúzanse en diagonal. |
| **Capas (para DAGs)** | `layered` | hai **nodos con varios pais** ou requisitos múltiples (currículos, tech trees). Capa = camiño máis longo; orde por baricentro. | o grafo ten ciclos: devolve erro (non coloca lixo). |
| **Radial por grupos** | `clustered-radial` | tes **grupos** definidos; cada grupo é un cúmulo nun anel, os soltos van a un oco propio. | non hai grupos. |
| **Constelación** | `constellation` | o grafo é solto, sen xerarquía clara (Skyrim). | queres ler a progresión. |
| **Malla** | `mesh` | o grafo é **denso e con lazos** e queres o aspecto de tea de araña: un blob orgánico por grupo, colocado para que as arestas saian CURTAS. É o único motor que le as arestas. | o grafo é unha árbore: as forzas non teñen nada que tensar e sae peor ca `tree`. |
| **Custom** | `custom` | as posicións veñen no dato (`node.position`). É o que deixa Dispor. | — |

As condicións de uso son exactamente as liñas de axuda que mostra o menú **Dispor** do editor.

## Árbore ou capas? O caso do panadeiro

No panadeiro, *pan básico* ten **dous** pais (fariña e levadura). Con **Árbore**, a levadura queda como raíz apartada e a súa aresta cruza o debuxo en diagonal: non é un fallo, é o límite dun layout de árbore sobre un grafo que non é unha árbore. Con **Capas**, fariña e levadura quedan **xuntas arriba** e as dúas arestas baixan limpas a pan básico. Se as túas árbores son educativas, case sempre queres Capas.

## Configuración

Cada motor acepta parámetros en `tree.layout` (todos opcionais; o editor deriva valores sensatos do tamaño da árbore):

```json
"layout": { "type": "layered", "nodeSpacing": 90, "levelSpacing": 130 }
"layout": { "type": "radial", "radius": 200 }
"layout": { "type": "clustered-radial", "groupRadius": 220, "orbitRadius": 90 }
"layout": { "type": "mesh", "spacing": 66, "seed": 1, "curve": "arc" }
```

`tree` e `layered` comparten `nodeSpacing`, `levelSpacing`, `direction` (`top-down`, `bottom-up`, `left-right`, `right-left`) e `centerX/centerY`.

## Desde o CLI

```bash
npx ygg layout arbore.json --algo layered --out arbore.json
```

Coloca **todos** os nodos (tamén os que xa tiñan posición — dispor é dispor) e actualiza `editor.coordinateBounds` para que nada quede fóra do encadre. Determinista: mesma entrada, mesmas posicións.

## Motores propios

Un consumidor pode rexistrar o seu motor no `LayoutEngineRegistry` de `@yggdrasil-forge/core` (`{ type, compute(treeDef) → Result<LayoutResult> }`) e usalo polo `type`. `layout.type` é unha cadea aberta no schema por iso. Ver a [guía de extensión](../extension/guia/).

Todos os exemplos da [galería](../exemplos/galeria/) están colocados por un destes motores.
