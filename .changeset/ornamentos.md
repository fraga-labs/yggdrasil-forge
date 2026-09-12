---
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/cli': patch
---

Dous ornamentos dos mockups: nome de comarca no centro e marco dobre

- **`regionLabel: 'top' | 'center'`** — onde vai o nome da rexión.
  `'center'` põeo flotando no medio do blob, grande e coa **cor da propia
  rexión**. A escala de atlas dálle a razón ao mockup: con varias
  comarcas, un rótulo pegado ao bordo lese como se fose doutra. Vai
  debaixo dos nodos (as rexións píntanse antes), así que non tapa nada.

- **`sizes.ornateMinRadius`** — raio mínimo para levar marco ornamental:
  un segundo anel concéntrico por fóra, máis fino e translúcido, con
  `fill: none` para que se vexa o fondo entre os dous aros. Nos mockups
  só o levan os nodos grandes, e é o que os fai ler como importantes sen
  recorrer a máis cor. Irmán de `labelMinRadius`: os dous son limiares de
  tamaño, e por iso viven xuntos en `sizes`.

O marco leva **clase propia** (`yf-skill-node__ornate`), non a do shape:
o pulso de `animations.ts` e as consultas existentes apuntan a
`yf-skill-node__shape`, e un segundo elemento coa mesma clase dobraría a
animación e rompería quen conta un shape por nodo. `renderNodeShape`
gaña un cuarto parámetro opcional para a clase (compatible cara atrás).

As dúas son opt-in: sen pedilas, o markup non cambia nin un byte.
