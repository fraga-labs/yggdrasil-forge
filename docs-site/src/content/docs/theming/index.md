---
title: Theming
description: As dúas capas do aspecto — o tema do renderer (ThemeProvider) e o tema do documento (presets con nome, recheos por estado, rexións) — e a costura entre o chrome do editor e o documento.
---

Hai **dúas capas** de aspecto, e conviña saber cal tocas:

| Capa | Onde vive | Quen a usa |
|---|---|---|
| **Tema do renderer** (`Theme`) | No código da app, via `ThemeProvider` de `@yggdrasil-forge/react`. | Quen integra `SkillTree` na súa app. |
| **Tema do documento** (`ThemeSpec`) | No ficheiro, en `editor.theme`. Viaxa co JSON e ten desfacer. | O editor, o CLI (`ygg render`) e calquera consumidor que o lea. |

O renderer parte dun tema base (`minimal` claro ou `minimalDark`) e o documento **sobrescribe** o que declara. Nada do documento é obrigatorio.

## 1. O tema do renderer (`@yggdrasil-forge/react`)

O tema aplícase por **estilo inline desde `useTheme()`** (alta prioridade, sen problemas de cascada). Provéeo cun `ThemeProvider`:

```tsx
import { ThemeProvider } from '@yggdrasil-forge/react'
import type { Theme } from '@yggdrasil-forge/react'

const dark: Theme = {
  colors: {
    background: '#11131a',      // fondo do canvas SVG (opcional)
    surface: '#1c2030',         // «tarxeta» detrás da árbore (opcional)
    text: '#e6d5a8',
    nodeFill: '#2a2f3d',        // interior do nodo (fallback)
    nodeLocked: '#5b6b86',      // aneis por estado
    nodeUnlockable: '#e0a93c',
    nodeUnlocked: '#6fcf97',
    nodeMaxed: '#f0c14b',
    nodeInProgress: '#e08a3c',
    nodeStroke: '#5b6b86',
    edge: '#46506b',
    edgeActive: '#00e0ff',      // aresta «acesa» (opcional)
    icon: '#e6d5a8',            // cor das iconas (opcional; cae a text)
    selected: '#bb86fc',        // anel de selección (opcional)
    mesh: 'rgba(148,163,184,0.08)',
  },
  sizes: { strokeWidth: 2.5, fontSize: 14, fontSizeSmall: 11, ringWidth: 3 },
  typography: { fontFamily: '"Cinzel", serif', fontWeight: 600, letterSpacing: '0.04em' },
}

<ThemeProvider theme={dark}><SkillTree engine={engine} /></ThemeProvider>
```

- Os campos opcionais teñen fallback sensato: un tema mínimo só precisa `text` e as cores de estado.
- `typography` aplícase aos `<text>` das etiquetas; carga a fonte (`@import`/`<link>`) antes.
- Os temas incluídos: `minimal` (claro, papel cálido) e `minimalDark`.

### Recheo por estado

Por defecto o **anel** cambia co estado e o **corpo** é único (`nodeFill`). Para que o corpo enteiro fale, declara recheos por estado — todos opcionais, o que falte cae a `nodeFill`:

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

**Resolución da cor do corpo** (`fillColorForState`): 1) `NodeDef.color` do dato **gaña sempre**; 2) `nodeFill<Estado>` do tema; 3) `nodeFill`; 4) o default. Un nodo multi-rango a medias píntase como *en progreso* aínda que o motor o teña como `unlocked` — é cosmético, o motor non cambia.

## 2. O tema do documento (`editor.theme`)

```json
"editor": {
  "theme": {
    "preset": "bosque",
    "nodeFills": { "locked": "#4a5340", "unlockable": "#7d8f5a", "unlocked": "#3e7a4c", "maxed": "#b08d3e", "inProgress": "#96a86c" },
    "nodeRings": { "locked": "#2e3528", "maxed": "#d8b15a" },
    "edges": { "color": "#3c4636", "active": "#b08d3e" },
    "typography": { "fontFamily": "Cinzel, serif", "fontWeight": 600, "letterSpacing": "0.08em", "textTransform": "uppercase" },
    "textColor": "#f4efdf",
    "regions": [{ "id": "r1", "label": "Sopro", "tag": "sopro", "color": "#c8875f" }]
  }
}
```

- `nodeFills` — **corpo** do nodo por estado (parcial: o que falte cae ao tema base).
- `nodeRings` — **anel** (contorno) do nodo por estado. Irmán exacto de `nodeFills`: o renderer pinta o nodo en dúas capas, e esta é a de fóra. É o que distingue un ferro negro dun hexágono de neon fino sen tocar o recheo.
- `edges` — `color` para as liñas e `active` para as **acesas** (as que saen dun nodo `unlocked`/`maxed`). Sen `active`, as acesas caen a `color`.
- `typography` — `fontFamily` (con fallback xenérico sempre), `fontWeight`, `letterSpacing`, `textTransform`. **A fonte é identidade, non adorno**: un documento gótico e un sci-fi non se distinguen só polas cores.
- `textColor` — texto e iconas dos nodos e etiquetas de rexión. Sen el, o editor escolle un lexible segundo o seu chrome.
- `regions` — **tintes por tag**: os nodos con ese `tag` levan un fondo de cor (con opacidade baixa) e unha etiqueta de rexión.
- `preset` — **informativo**: de que preset partiu (a UI marca a ficha activa). Non afecta ao render por si só: aplicar un preset é copiar o seu spec completo.

:::note[Dúas capas, dous eixes]
O corpo (`nodeFills`) e o anel (`nodeRings`) son independentes a propósito. Un tema pode deixar o corpo neutro e mover só o anel coa progresión (o modelo «plano-adaptativo» do tema `minimal`), ou mover os dous. Ambos aceptan os cinco estados: `locked`, `unlockable`, `unlocked`, `maxed`, `inProgress`.
:::

### Presets con nome

`THEME_PRESETS` (`@yggdrasil-forge/editor-core`) é un rexistro de dato: `{ id, label, spec }`. A pestana **Tema** do editor renderiza as fichas desde aí.

| id | Carácter |
|---|---|
| `tintado` | Paleta distinguible (o clásico do panadeiro). |
| `neutro` | Cero overrides — cae ao `minimal` do renderer. |
| `pergamino` | Claros cálidos terrosos, texto tinta sepia. |
| `neon` | Fills escuros profundos con acentos saturados (pensado para chrome escuro). |
| `bosque` | Verdes profundos e dourados apagados, texto marfil. |
| `forxa` | **O North Star**: obsidiana e ouro sobre azul profundo, serif con aire. O corpo queda escuro e a progresión vive no anel. |
| `gotico` | Ferro negro, carmesí e latón; serif pesada en maiúsculas; arestas como vetas de sangue seca. |
| `sci-fi` | Matriz holográfica: corpo case negro e todo o neon no anel fino (cian → maxenta), rótulos tracking ancho. |
| `escolar` | O único claro: verdes amables, amarelo sol e azul ceo sobre creme, con redonda. Para currículos e itinerarios. |

Os catro últimos (19.0) son os estilos dos **mockups fundacionais** do proxecto e os primeiros que usan `nodeRings`, `edges` e `typography`: copiar un deses specs é a forma máis rápida de que un documento xerado se vexa terminado.

:::caution[As fontes non van empaquetadas]
As familias nomeadas (Cinzel, Orbitron, Nunito…) non se distribúen co paquete. Cada stack remata nun xenérico real (`serif`/`sans-serif`), así que un consumidor que non as teña ve a reserva — nunca un fallo. Se as queres de verdade, cárgaas ti na túa páxina.
:::

Para unha IA ou un pipeline, a receita robusta é **copiar o spec completo** do preset (o de `gaia-cards.json` na galería leva `neon`); emitir só `{ "preset": "neon" }` deixa que un humano prema a ficha no editor.

## 3. A costura: chrome do editor ↔ documento

O switch ☀/🌙 da barra superior cambia o **chrome** (os paneis do editor), **non** o documento. O canvas escolle a súa base segundo o chrome — `minimal` en claro, `minimalDark` en escuro — para que texto, arestas e malla se lean sobre calquera fondo; e **os overrides do documento gañan sempre** sobre esa base. Así un documento con preset *Néon* vese igual de néon en chrome claro ou escuro, e un documento *Neutro* segue o chrome. `ygg render --dark` reproduce a mesma base escura fóra do editor.

## 4. Iconas (SVG recoloreables)

`node.icon` é un **id de rexistro**, con fallback a emoji/carácter ou a URL → imaxe (con `iconScale` para o recorte).

```tsx
import { registerIcons, BUILTIN_ICONS, NORSE_ICONS, LOGIC_ICONS, FORGE_ICONS } from '@yggdrasil-forge/react'
import type { IconDef } from '@yggdrasil-forge/react'

// BUILTIN_ICONS auto-rexístranse. Os sets temáticos son OPT-IN (byte-cost):
registerIcons(NORSE_ICONS)   // 26 iconas nórdicas: norse-world-tree, norse-wolf, …
registerIcons(LOGIC_ICONS)   // 19 iconas de prerrequisitos: logic-lock, logic-key, logic-fork, …
registerIcons(FORGE_ICONS)   // 25 iconas industriais: forge-nut, forge-wrench, forge-crosshair, …

// Icona propia — recolorea co tema vía currentColor:
const myIcon: IconDef = { viewBox: '0 0 24 24', paths: [{ d: 'M4 4 L20 20 M20 4 L4 20', mode: 'stroke' }] }
registerIcons({ 'my-x': myIcon })
```

O editor rexistra os tres sets ao arrancar, así que `logic-key` ou `forge-wrench` no campo *Icona* funcionan de serie. A lista completa de ids está no [README da galería](https://github.com/fraga-labs/yggdrasil-forge/blob/main/examples/gallery/README.md#icon-sets-nodeicon).
