# `tools/galeria` — xeradores dos exemplos da galería

Os `*.json` de [`examples/gallery/`](../../examples/gallery/) son o corpus
de **few-shot** do proxecto: o que unha IA vai imitar cando lle pidas «faime
unha árbore de habilidades». Por iso interesa que ningún deles sexa un
ficheiro que xa ninguén sabe refacer.

O atlas non se pode manter a man — 97 nodos e 174 arestas — así que se
xera. Este directorio garda o xerador, commiteado a propósito.

```bash
# precisa editor-core construído (o xerador le THEME_PRESETS do dist)
corepack pnpm turbo run build --filter @yggdrasil-forge/editor-core
node tools/galeria/atlas-fisterra.mjs      # reescribe examples/gallery/atlas-de-fisterra.json
corepack pnpm --filter @yggdrasil-forge/cli exec node ./dist/bin.js validate examples/gallery/atlas-de-fisterra.json
```

- **`nomes-atlas.mjs`** — só CONTIDO: a táboa de 97 nomes (gl/en), iconas,
  tipos e comarcas, máis os tintes. Non sabe nada de xeometría.
- **`atlas-fisterra.mjs`** — a ESTRUTURA: constrúe cada comarca como unha tea
  pechada, pide `layout: mesh` e copia o preset `atlas` enteiro.

## Dúas cousas que non son obvias

**A orde de emisión dos nodos importa.** O `mesh` sementa os membros dun
grupo por orde, do centro do blob cara fóra. Coa orde natural (porta,
pequenos, claves, ascendencia) os tres nodos grandes caen amoreados na
BEIRA da comarca; poñéndoos todos primeiro, amoréanse no CENTRO. Nos dous
casos os seus rótulos chócanse. O xerador emite a ascendencia no medio e
intercala os demais grandes entre os pequenos, así que caen en radios
distintos.

**As dúas claves van a lados opostos do anel**, e iso decídese por
construción (`ancoraClave`), non buscando unha `seed` con sorte: como a
aresta tira, dúas claves ancoradas en pequenos veciños acaban xuntas e os
seus nomes písanse.

## Se cambias o ficheiro

- `examples/gallery-showcase.json` leva o **guión de xogo** da ficha do
  atlas (que nodos se desbloquean para a foto). Se cambian ids ou
  prerrequisitos, `ygg render` falla en alto e o build do sitio cae: a
  garda de podrecemento é iso.
- Hai probas de anti-podrecemento sobre a galería (iconas válidas, esquema
  publicado). Pásaas antes de commitear o JSON rexenerado.

Emparentado: [`tools/malla-proto/`](../malla-proto/), o prototipo de malla
onde se probou a xeometría antes de tocar `packages/`.
