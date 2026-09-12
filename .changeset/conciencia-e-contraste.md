---
'@yggdrasil-forge/editor-core': patch
'@yggdrasil-forge/react': patch
'@yggdrasil-forge/cli': minor
---

`ygg validate` corre a conciencia, o validador de ciclos deixa de dar falsos positivos, e o nome da comarca gárdase de ser ilexible

Tres cousas que saíron de mirar as nove fichas da galería unha por unha.

**`ygg validate` só deserializaba.** Nunca corría os cinco validadores
soft que si corre o editor, así que un documento cun **ciclo de
prerrequisitos** — os nodos do ciclo quedan bloqueados para sempre —
saía como «✓ documento válido» e nada máis. Iso é precisamente a porta
que usa unha IA no bucle xerar → validar → corrixir: estaba cega a
cinco dos oito validadores. Agora imprímense despois do `✓` e van en
`--json`. **Non cambian o código de saída**: `ok` segue significando «o
documento cárgase», que é o que un pipeline precisa para decidir se
segue.

**O validador de ciclos dá 72 falsos positivos no atlas.** Construía un
grafo achatando `all`, `any` e `none` como se todas as condicións fosen
obrigatorias. As comarcas do atlas son aneis onde cada nodo pide
`any(porta, anterior)`: ciclo formal, saída sempre aberta, ningún nodo
bloqueado. Reescrito como **punto fixo de satisfacibilidade**, a mesma
semántica que aplica o motor: `all` pide todas, `any` abonda unha,
`none` nunca bloquea (cúmprese NON desbloqueando) e unha condición de
recursos non é topoloxía. Agora avisa do que importa — «este nodo non se
poderá desbloquear nunca» — e tamén de quen PENDE dun bloqueo, que o DFS
anterior deixaba fóra.

**O nome da comarca podía quedar invisible.** Desde 19.10 píntase coa cor
da comarca, e esas cores decláranse para tinguir un fondo ao 12% de
opacidade: no showcase gótico «CLAUSTRO» (#3a2a2a) sobre lenzo escuro non
se lía. Engádese un xuízo de contraste WCAG que **respecta a cor cando xa
se le** (as tres do `neon` saen intactas) e, cando non, acláraa ou
escurécea **conservando o ton** ata pasar 3:1 — un azul segue sendo azul.
Tense en conta a opacidade real do texto, porque medir a cor sólida
sobreestima sempre o contraste.

E na orde de pintado: entre nodos do mesmo radio píntase de **abaixo a
arriba**, porque o rótulo colga por debaixo do nodo e era o veciño de
abaixo quen llo comía («Dubhe» cortado por «Merak» en `gaia-cards`).
