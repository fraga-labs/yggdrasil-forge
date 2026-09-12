---
'@yggdrasil-forge/react': patch
---

A silueta das comarcas deixa de facer espigas, e o minimapa cala cando non ten nada que dicir

Dous defectos que só se ven ampliando o render, non nun test.

**A silueta.** O blob de `regionShape: 'hull'` suavizábase cun
Catmull-Rom **uniforme**, que calcula a tanxente dun vértice como
`(seguinte − anterior) / 2`. Iso só vale se os lados miden parecido, e
aquí non: os vértices veñen dun convex hull sobre puntos mostreados nos
CÍRCULOS dos nodos, así que hai lados de 10 unidades pegados a lados de
187 — razóns de 12x a 19x medidas no atlas da galería. Nesas condicións
a tanxente hérdaa o lado longo e aplícase no curto: o brazo de control
medía ata 3,3 veces a súa corda (63 segmentos deformados) e a silueta
saía con esquinas e mordidas en vez de ser un blob.

Pasa a **parametrización centrípeta**, que escala cada tanxente co
espazado local. Medido no mesmo atlas: o peor brazo/corda cae de 3,32 a
0,54 e o exceso radial sobre o polígono de 2,8% a 0,6%. **Regresión cero
por construción**: con lados iguais a fórmula redúcese termo a termo á
anterior, e hai proba que o comproba vértice a vértice nun caso de
mostraxe uniforme.

**O minimapa.** O rectángulo do «estás aquí» pintábase sempre, tamén
cando a xanela visible cubría o mapa enteiro — e aí coincide co marco e
lese como un bordo branco groso que non informa de nada. Pasaba en TODA
ficha da galería, porque un `ygg render` sae sempre a zoom 1 e encadrado.
Agora só se pinta cando hai algo fóra da vista.

Tamén: o render da galería do sitio pásalle `--minimap` ás árbores de 50
nodos ou máis (mobiliario do visor, non dato do documento), e o atlas
dos exemplos leva xerador documentado en `tools/galeria/README.md`.
