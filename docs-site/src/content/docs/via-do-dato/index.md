---
title: A vía do dato
description: O CLI ygg completo, a galería de ouro e o fluxo xerar → validar → colocar → vestir → renderizar para pipelines e IAs.
---

Todo o que o editor sabe facer sobre un documento existe tamén **sen editor**: como dato (o schema, a galería, os presets) e como comando (`ygg`). Esa é a vía do dato, e é o que permite que unha IA ou un pipeline autore árbores completas.

## `ygg` — o CLI

```bash
pnpm add -D @yggdrasil-forge/cli
```

| Comando | Que fai | Saída |
|---|---|---|
| `ygg validate [f \| -] [--json]` | Schema + validadores duros — **a mesma validación que importar no editor**. Sen ficheiro ou con `-` le stdin. `--json` emite `{ ok, issues[] }`. | 0 ok · 1 inválido · 2 uso |
| `ygg layout <f \| -> --algo <a> [--out f]` | Coloca **todos** os nodos co motor (`radial`, `tree`, `layered`, `clustered-radial`, `constellation`) e coce o encadre. | documento ao stdout ou a `--out` |
| `ygg render <f \| -> --out f.svg [--dark] [--locale gl] [--width N]` | SVG **autocontido** (sen CSS externo nin variables), co tema do documento. `--dark` usa a base escura. | ficheiro SVG |
| `ygg render … [--grant r=N,…] [--unlock id[:N],…]` | **Xoga antes de pintar**: concede recursos e desbloquea nodos para que a foto amose varios estados á vez. `id:N` sobe N rangos. | ficheiro SVG |
| `ygg schema [--out f]` | O JSON Schema publicado. | JSON Schema |
| `ygg new [--id x] [--label "…"]` | Un documento baleiro válido. | documento |

Os erros son **dato**: cun `--json` o modelo ou o script sabe exactamente que arranxar.

### Xogar antes de pintar (`--unlock`)

Sen guión, `ygg render` pinta a árbore **no día cero**: todo bloqueado. E `locked` é, por deseño, o estado máis apagado — así que a foto non ensina nin a paleta nin o camiño. Con `--grant` e `--unlock` a foto amosa o que amosaban os mockups fundacionais: varios estados á vez.

```bash
npx ygg render arbore.json --out foto.svg --dark   --grant "saga=30,sangue=6"   --unlock "espertar,corazon,furia,machado:3"
```

- Aplícase en orde: primeiro os `--grant`, logo os `--unlock` tal como se listan (un nodo pode ser porta doutro).
- `id:N` sobe **N rangos** seguidos: útil para chegar a `maxed`, ou para deixar un multi-rango a medias e que se pinte *en progreso*.
- **Falla en alto**: se o motor di que un desbloqueo non se pode (custo, prerrequisito, exclusión), o comando dá erro coa razón dentro en vez de sacar unha foto distinta da que pediches.

As fichas da galería deste sitio xéranse así; os guións viven en [`examples/gallery-showcase.json`](https://github.com/fraga-labs/yggdrasil-forge/blob/main/examples/gallery-showcase.json), **fóra** da carpeta `gallery/` a propósito: eses documentos son o corpus de *few-shot* e non deben levar campos de escenificación.

## A galería de ouro

`examples/gallery/` contén documentos coñecidos-bos, **garantidos por test** en cada CI (`deserializeDocument` sobre cada un; o escaparate `gaia-cards` ten ademais garda de que leva iconas e preset). Úsaos como *few-shot*:

| Ficheiro | Para que |
|---|---|
| `minimal.json` | O máis pequeno útil: 2 nodos, 1 recurso, 1 prerrequisito, custo por rango, etiquetas `gl`/`en`. |
| `panadeiro.json` | A referencia amable: grupos, multi-rango, tema, **colocado con `layered`** (canónico do caso con dous pais). |
| `lobo-de-inverno.json` | Xerado por unha IA con este fluxo, válido á primeira: 18 nodos, rexións, iconas SVG embebidas, fondo, `all`/`any`. |
| `gaia-cards.json` | O patrón para a **vista de tarxetas** e o escaparate da **estética por declaración**: 12 iconas `logic-*` e preset `neon`. |
| `adversarial.json` | O caso incómodo (nodos sen posición, referencias límite) para probar robustez. |
| `escola-de-gaita.json`, `congoxa-netrunner.json` | Dous temas máis (educativo e cyberpunk) para variedade de few-shot. |
| `a-vixilia.json` | O escaparate gótico: preset con nome copiado enteiro, `nodeRings`/`edges`/`typography` como dato, grupo `none` puro, `exclusions` con peso narrativo e `resource_min` nunha árbore de verdade. |

Todos renderizados en [Exemplos](../exemplos/galeria/). README detallado (en inglés, para audiencia externa): [`examples/gallery/README.md`](https://github.com/fraga-labs/yggdrasil-forge/blob/main/examples/gallery/README.md).

## O fluxo completo

```bash
# 1. xerar (unha IA, un script, á man) → arbore.json, SEN posicións
npx ygg validate arbore.json --json          # 2. erros como dato → corrixir → repetir
npx ygg layout arbore.json --algo layered --out arbore.json   # 3. colocar
#    4. vestir: "editor.theme" (spec dun preset) + "icon": "logic-…" nos nodos
npx ygg render arbore.json --out arbore.svg  # 5. mirar (e que a IA mire)
#    6. importar no editor (Ficheiro → Importar, ou pegar en Código) e retocar
```

Cada paso é **determinista** (mesma entrada, mesma saída) e **idempotente** (podes volver a colocar ou validar sen medo). O detalle de cada peza: [schema](../contrato/ficheiro-e-schema/), [layouts](../layouts/), [theming](../theming/), e o [bucle con IA](../comeza/bucle-ia/) cun prompt que funciona.

## Por que está deseñado así

- **Erro como dato**, non como texto: un validador que só fala para humanos rompe o bucle automático.
- **Unha soa validación**: `ygg validate` e *Importar* son a mesma función. Se pasa un, pasa o outro.
- **Posicións opcionais**: un xerador non ten por que saber xeometría; os motores si.
- **Render autocontido**: o SVG de `ygg render` funciona sen o sitio, sen CSS, sen fontes externas — pódese mandar por correo ou metelo nun PDF.

E a vía do dato non remata na web: [Yggdrasil no teu motor](motores/) — como consumir o documento en Godot, Unity e Unreal, e como facer que a semántica viaxe co bundle embebible.
