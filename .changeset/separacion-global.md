---
'@yggdrasil-forge/core': patch
---

`MeshLayout`: a garantía de non-solapamento pasa a ser de TODO o documento

O pase de separación traballaba blob a blob, así que só prometía algo
dentro de cada comarca. Agora corre unha vez sobre todas as posicións
xa relaxadas, e a promesa é do documento enteiro.

Non é un tecnicismo: os nodos **sen grupo** colócanse nun anel exterior
repartindo os 360° entre eles, **sen mirar canto miden**, e iso non tiña
protección ningunha. Medido con vinte nodos de radio 44: o arco entre
veciños queda en 70 unidades cando precisan 88, e saían **20 pares
solapados** (o peor, -19,8). Con este cambio, cero. Hai proba.

O custo non se move (803 ms a 1.500 nodos fronte a 815 ms co pase por
blob) e o determinismo mantense: a orde de visita sae das posicións, non
do xerador aleatorio.
