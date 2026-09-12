# Prototipo do layout de MALLA («tela de araña»)

> ⚠️ En galego: isto é un banco de traballo interno, non material para
> terceiros. O algoritmo que aquí se pecha é o que hai que portar a
> `@yggdrasil-forge/core` como motor de layout.

```bash
node tools/malla-proto/xerar.mjs saida.json
npx ygg validate saida.json
npx ygg render saida.json --out saida.svg --dark --width 1400
```

## Por que existe

Os mockups fundacionais (`atlas.png`) piden un estilo que **ningún dos
cinco motores de layout sabía facer**: comarcas como mallas planares
densas e irregulares, con nodos de grao 3-4, arestas curtas, **lazos
pechados** e portas entre comarcas veciñas. `clustered-radial` coloca os
membros nun anel sen mirar o grafo, así que calquera cadea de
prerrequisitos se converte nunha corda que cruza o círculo; con seis
comarcas iso lese a espagueti.

Pechouse aquí primeiro, fóra de `packages/`, para non meter no motor un
algoritmo antes de saber que o resultado se parece ao obxectivo. Este
script escribe as `position` no documento (layout `custom`).

**Xa non é a vía recomendada**: o algoritmo vive en `@core` como
`MeshLayout`, así que un documento pide `layout: { type: 'mesh' }` e non
leva coordenadas ningunhas — vai colocado ao pintar. O exemplo de
verdade é [`tools/galeria/atlas-fisterra.mjs`](../galeria/). Este
directorio queda como rexistro de como se buscou a xeometría, e segue
sendo o sitio onde probar unha idea nova antes de tocar `packages/`.

## O algoritmo

1. **Raio derivado**: o raio de cada comarca sae do número de nodos que
   pide (área da retícula triangular, cun factor de folgo para o recorte
   irregular do bordo). Nada de raios a man.
2. **Colocación**: a primeira comarca no centro; o resto nun anel cuxo
   radio *crece* ata que dúas veciñas non se solapen. Despois a central
   **medra ata tocar o anel** — sen ese último paso queda un baleiro no
   medio, porque o radio do anel o fixan as de fóra.
3. **Puntos**: retícula triangular recortada por un raio modulado con
   tres senoides (bordo orgánico, non circular) máis jitter.
4. **Relaxación**: catro pasadas separando os pares demasiado xuntos.
   Iguala o espazado *sen* perder a irregularidade — unha retícula
   perfecta parece papel milimetrado.
5. **Malla**: árbore de expansión mínima (garante conexo e arestas
   curtas) **máis** extras curtas ata unha cota, con **tope de grao 4**.
   As extras son o que crea os lazos: sen elas hai unha árbore, e unha
   árbore non parece unha tea.
6. **Portas**: o par de nodos máis próximo entre dúas comarcas veciñas,
   unido; as dúas puntas ascenden a `notable` para que a pasaxe se vexa
   de lonxe.
7. **Prerrequisitos**: cada nodo pide `any` sobre os seus veciños — o
   «conectado a calquera adxacente» que usa o propio mockup.

## Leccións medidas

- **A densidade vén do espazado, non do grao.** Subir o tope de grao a 6
  convirte a tea nunha mancha; o que a fai densa é ter moitos nodos por
  comarca (espazado pequeno) mantendo grao 3-4. Coa configuración actual:
  297 nodos, 537 arestas, e o 92% dos nodos con grao 3 ou 4.
- **A veciñanza ten que saír da colocación.** Declarala a man producía
  portas que cruzaban o mapa de punta a punta.
- **A curva importa tanto como a xeometría.** Con `curve: 'straight'` a
  mesma malla parece un diagrama de rede; con `'arc'` (o estilo engadido
  no 19.5, combadura perpendicular sen nesgo de dirección) parece tecida.

## Que aínda NON dá o mockup

Honestidade de alcance, para que non se confunda o prototipo co
obxectivo:

- **Resplandor e marcos ornamentais** nos nodos grandes: son filtros SVG
  que o renderer non ten.
- **Rótulo da comarca flotando no centro** do blob; hoxe vai enriba, fóra.
- **Blobs lobulados (concavos)**: `computeRegionHullPath` fai un convex
  hull suavizado, así que unha comarca en forma de C non é posible.
- **Minimapa**: a esta densidade xa non é un extra.
