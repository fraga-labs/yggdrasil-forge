---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/cli': patch
---

Lexibilidade a escala: o layout le o TAMAÑO dos nodos, e o documento leva o seu LENZO

Cinco arranxos que veñen todos do mesmo sitio: render o atlas de 97
nodos da galería, abrir o PNG e comparalo co mockup fundacional. Os
cinco tiñan probas verdes antes e o debuxo estaba mal igual.

**1. `resolveRadius` pasa a `@yggdrasil-forge/core`.** A táboa de radios
por tipo vivía só en `@react` (`nodeGeometry`), así que o motor era cego
ao tamaño dos nodos. Agora a fonte é `core`
(`resolveRadius`, `DEFAULT_RADIUS_BY_TYPE`, `FALLBACK_RADIUS`) e `@react`
reexpórtaa — unha soa verdade, e hai proba de que é literalmente a mesma
función.

**2. `MeshLayout` reserva sitio segundo o corpo.** O hueco entre dous
nodos pasa de `spacing` fixo a `max(spacing, r₁ + r₂ + marxe)`, e o raio
do blob derívase da ÁREA dos seus membros. Un par de nodos pequenos
coloca exactamente coma antes; só se separa o que o precisa. Ademais hai
un **pase final de separación** que dá unha garantía dura: os corpos non
se solapan. Medido no atlas, antes quedaban tres pares solapados (o
peor, 10,6 unidades); a alternativa era subir `iterations` de 220 a
1.200, e iso son 2,65 s a 1.500 nodos en vez de 0,74 s. O pase custa o
mesmo que unha iteración (0,82 s) e non toca o determinismo.

**3. Os nodos grandes pintan enriba.** En SVG non hai z-index: manda a
orde do documento, e un nodo pequeno emitido despois tapáballe o rótulo
a un grande. `SkillTree` ordena por radio ascendente (estable, así que
entre iguais mándaa o documento e o render segue determinista).

**4. O rótulo leva halo.** `paint-order: stroke` coa cor do lenzo por
debaixo do recheo, para lerse sobre arestas e tintes de comarca.

**5. `ThemeSpec.background`** — o documento pode declarar a cor do seu
LENZO. Faltaba, e iso deixaba o aspecto a medias fóra do editor:
`ygg render` pintaba branco ou o escuro por defecto segundo o flag
`--dark`, non segundo o ficheiro. `SVGRenderer` e `standaloneSvg` xa a
lían; o que non existía era a vía para poñela no JSON. **Sen ela o halo
sería código morto**, porque ningún dos dous temas base define
`colors.background` — a mesma trampa que o `nodeStroke` do 19.0, cazada
esta vez mirando o SVG.

Tamén: `regionLabel: 'top'` pasa a levar a cor da comarca e a escalar co
mapa (como no mockup), o preset `atlas` rectifica `regionLabel`,
`labelMinRadius` e os estados do `glow` — o resplandor acende agora o
camiño tomado, que antes nunca acendía —, e o atlas da galería
reconstrúese como TEA (174 arestas, `layout: mesh`) cun xerador
reproducible en `tools/galeria/`.
