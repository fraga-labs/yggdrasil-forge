---
'@yggdrasil-forge/validators': patch
---

`validators` di a que documentos se lle pode aplicar

As nove regras deste paquete asumen unha **árbore enraizada e acíclica**.
A suposición non é errada, pero non estaba dita, e nótase ao correlas
sobre a galería de ouro do propio proxecto: **244 issues en nove
documentos**, con **11 erros** no atlas, que é o documento insignia e é
correcto por deseño.

O detalle, medido:

- `noCyclesRule` (severity **error**) dá 11 erros no atlas porque cada
  comarca se constrúe como unha tea pechada. Nunha malla os ciclos son o
  deseño.
- `noRedundantPrerequisitesRule` marca **102 das 174** arestas do atlas.
  A regra fai ben o seu traballo; o que pasa é que nunha tea densa case
  toda aresta ten alternativa.
- `noDeadEndsRule` dispara nos **nove** documentos, incluído
  `minimal.json`, que ten dous nodos: marca todas as follas. Como toda
  árbore ten follas, só a satisfaría un grafo sen nodos terminais.
- `allReachableFromRootRule`, `progressiveDifficultyRule` e
  `balancedBranchesRule` **non dispararon nin unha vez** en ningún
  documento. As tres fan `return []` se falta `treeDef.rootNodeId`, e
  ningún documento da galería o declara. Un informe limpo desas tres
  significa «non mirei», non «non hai nada».

Non se cambia a semántica de ningunha regra: iso é decisión de produto.
O que se fai é dicilo no README e fixalo nun test de aplicabilidade, para
que quen rexistre unha regra saiba o que está a pedir e para que un
cambio futuro sexa deliberado.
