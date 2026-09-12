---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': patch
'@yggdrasil-forge/cli': patch
---

O tema viaxa enteiro no documento: aneis, arestas e tipografía

`ThemeSpec` (o `editor.theme` do ficheiro) gaña tres campos novos, todos
opcionais e compatibles cara atrás:

- `nodeRings` — cor do **anel** do nodo por estado, irmán exacto de
  `nodeFills` (que pinta o corpo). Mapea aos tokens `node<Estado>`, que
  son os que o renderer le de verdade.
- `edges` — `color` e `active` (a aresta acesa).
- `typography` — `fontFamily`, `fontWeight`, `letterSpacing`,
  `textTransform`.

Antes disto o renderer sabía pintar todo iso pero o documento non o sabía
levar, así que o estilo non sobrevivía ao ficheiro: un documento «gótico»
ou «sci-fi» non se podía distinguir dun neutro máis que polas cores do
corpo. Agora si, e o mesmo ficheiro dá o mesmo aspecto no editor e en
`ygg render`.

Engádese `themeTypographyFromSpec` (irmán de `themeOverridesFromSpec` para
a rama `typography` do `Theme`); a sinatura do funil de cores non cambia.

Nota de honestidade: NON se expón `ThemeColors.nodeStroke` como dato do
documento porque ningún compoñente do renderer o le (token morto desde
F10.3.fix). O documento non debe poder declarar cousas inertes.
