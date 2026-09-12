---
'@yggdrasil-forge/react': minor
---

A vista de tarxetas cabe enteira: a tarxeta topa en seis filas e a lista rola

Quedaba o último anaco do problema das tarxetas. Coas tarxetas
completas, unha comarca de dezaseis membros mide uns 486 px de alto e
sete delas nun anel piden 2.070: non caben no panel do editor (439) nin
aínda maximizándoo. **O que non cabe é o alto da tarxeta, non o anel.**

A lista de membros topa agora en seis filas visibles e rola por dentro
cando hai máis. Con iso o taboleiro enteiro cabe: medido no editor co
atlas (sete comarcas, 97 nodos), **as sete tarxetas dentro do panel,
cero solapadas**, a zoom de encadre 0,46 e con filas de 15,5 px —
lexibles. Nada se agocha: as dezaseis filas seguen aí.

A roda do rato distingue: se o punteiro está nunha lista que aínda pode
rolar, rola a lista; se xa chegou ao final, o xesto pasa ao lenzo e fai
zoom. Sen iso, unha tarxeta longa sería un cul-de-sac (ves que hai máis
e non hai como chegar) ou mataría o zoom por riba das tarxetas. A
decisión é unha función exportada (`listaQueRola`) para poder probala
sen navegador, que é onde un erro se nota moito.

As tarxetas de seis filas ou menos non levan tope nin scroll: o
documento pequeno queda exactamente como estaba.
