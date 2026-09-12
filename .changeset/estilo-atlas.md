---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/cli': patch
---

O estilo «tela de araña» dos mockups, pedible desde o documento

Estudando o mockup do atlas atopei que o estilo non era alcanzable desde
un ficheiro: faltaban catro pezas, tres delas capacidades que o renderer
XA tiña pero que ninguén podía pedir.

`ThemeSpec` gaña:

- `regionShape: 'box' | 'hull'` — o `hull` (blob suavizado que envolve os
  nodos, con Catmull-Rom) existía no `SkillRegions` desde a súa sub-fase,
  pero só como prop do compoñente: nin un documento nin `ygg render`
  podían pedilo, así que en práctica non se usaba en ningures.
- `sizes` — `strokeWidth`, `ringWidth`, `fontSize`, `maxLabelChars` e
  `labelMinRadius`. Un trazo de 2 px afoga unha malla de 300 arestas: a
  filigrana fina dos mockups precisa 1,3.
- `iconColor` — separado de `textColor` porque a esa densidade as iconas
  teñen que ser máis apagadas que os rótulos, ou a malla desaparece
  detrás de douscentos glifos brancos.

E `@react` gaña o token que fai posible a densidade: **`labelMinRadius`**.
Os nodos cun raio menor pintan icona e nada máis — nos mockups os centos
de nodos pequenos non levan texto, e sen isto douscentos rótulos
sobrepóñense. Agóchase só o `<text>`: nos nodos interactivos o
`aria-label` segue levando o texto enteiro.

Terceiro funil `themeSizesFromSpec`, irmán dos dous existentes (`colors`,
`typography`, `sizes` son ramas distintas do `Theme`, e cada unha ten a
súa porta para que engadir unha non cambie a sinatura das demais).
Cableado nos dous consumidores: editor e `ygg render`.
