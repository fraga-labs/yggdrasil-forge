---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/react': patch
'@yggdrasil-forge/cli': patch
---

`MeshLayout`: o primeiro layout que le as arestas

Sexto motor de layout, `layout: { type: 'mesh', spacing: N }`. Os cinco
anteriores colocan por xeometría pura — anel, filas, columnas — sen
mirar o grafo. Iso vale para árbores, pero nun grafo DENSO con lazos (o
estilo «tela de araña» dos mockups fundacionais) produce cordas que
cruzan o debuxo, porque dous nodos conectados poden acabar en puntas
opostas do círculo.

En `mesh` as arestas son unha FORZA: un blob orgánico por grupo, e as
posicións relaxadas (atracción pola aresta, repulsión local, tirón cara
ao centro do blob) ata que os nodos conectados quedan á distancia
`spacing`. Os blobs colócanse nun anel cuxo radio medra ata que dúas
veciñas non se solapen, e o grupo central medra para encher o medio. O
raio de cada blob derívase de cantos nodos ten: non hai radios a man.

- **Non crea arestas**: un `LayoutEngine` só pode colocar. A topoloxía é
  dato do documento; hai unha receita de xeración en
  `tools/malla-proto/`.
- **Determinista**: cero `Math.random` e cero reloxo. Mesma entrada e
  mesma `seed` → mesmas posicións ao bit, e hai proba.
- **Lineal por pasada**: a repulsión só mira pares próximos (rejilla de
  celas), non todos contra todos. Iso é o que o fai viable a centos de
  nodos.
- `spacing` é **obrigatorio** e positivo, coma o `radius` de radial e o
  `groupRadius` de clustered-radial (lección A.6.9: un radio opcional
  saca SVGs en branco).

Dispoñible en todas as portas: `ygg layout --algo mesh`, o menú
**Dispor** do editor (coa súa condición de uso escrita) e o rexistro por
defecto de `@react`.
