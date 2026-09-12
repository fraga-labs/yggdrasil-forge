---
'@yggdrasil-forge/core': patch
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-react': patch
'@yggdrasil-forge/cli': patch
---

O editor le o lenzo do documento, e o `mesh` sen grupos dá unha tea

Catro cousas atopadas abrindo o atlas **no editor** — a peza que levaba
toda a sesión sen mirar.

**O convite «Dispor?» tapaba o lenzo.** Aparecía cando ≥30% dos nodos
non teñen `position`… sen mirar o `layout`. Un documento que declara un
layout VIVO (`mesh`, `radial`, `tree`…) non leva coordenadas A
PROPÓSITO: colócao o motor, e é o que as docs recomendan a quen xera
árbores. Ao abrir o atlas saía un panel de seis algoritmos por riba do
debuxo dicindo que había 97 nodos «sen posición» cando estaban todos
colocados. Agora só se convida con `layout: custom`, que é onde de
verdade quedan sen colocar (amoreados no (0,0)).

**A base do tema do editor pasa a mirar o `background` do documento.**
Trampa que abrín eu ao engadir `ThemeSpec.background`: o documento xa
podía pedir lenzo escuro, pero a base seguía saíndo do chrome, así que
un documento así aberto nun editor en claro daba texto escuro sobre
fondo escuro. A base existe para que o texto se lea sobre o fondo, e o
fondo agora pode vir do ficheiro. `@react` expón `esCorEscura` (e
`corLexible`/`razonDeContraste`) para poder decidilo.

**`MeshLayout` cun documento sen agrupar facía un anel.** Se ningún nodo
ten `group`, todos ían ao anel exterior de «soltos» e saía un círculo
perfecto — un layout inútil, en silencio, para quen pediu unha tea.
Pasa de verdade: `lobo-de-inverno` declara tres `GroupDef` pero expresa
a pertenza por `tags`, que é o eixe do TEMA. Agora, sen información de
agrupamento, faise unha soa tea con todo.

**`ygg layout` sen `--algo` listaba cinco algoritmos** (a axuda de
`--help` si nomeaba `mesh`). A lista sae agora do propio rexistro.
