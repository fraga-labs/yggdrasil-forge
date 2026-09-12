---
'@yggdrasil-forge/editor-core': patch
'@yggdrasil-forge/react': patch
---

Cocer un layout deixa o documento en `custom`, e os nodos sen rótulo levan nome

**Cocer significa cocer.** `applyAutoLayout` (o que hai detrás de
«Dispor» e de `ygg layout`) gardaba as posicións pero non tocaba o
`tree.layout`. Nun documento que declaraba un layout VIVO (`mesh`,
`radial`…) iso deixaba coordenadas que o renderer IGNORA, porque volve
calcular ao pintar. Medido co atlas da galería: `ygg layout --algo mesh`
escribía posicións afastadas unha mediana de **49 unidades** (ata 163)
das que despois se pintaban. E no editor era peor: arrastrar un nodo
nun documento así non facía nada visible. Agora o documento pasa a
`custom`, todo na mesma transacción (un undo devolve layout e
posicións).

**E redispor co mesmo algoritmo respecta a afinación do autor**: se o
documento xa declaraba ese motor, úsase a SÚA configuración (`spacing`,
`seed`, curva) en vez dos defaults. Era iso o que facía que as
posicións cocidas nin se parecesen ás vivas.

**Os nodos sen rótulo tiñan nome en ningures.** Ao ocultar o texto con
`sizes.labelMinRadius`, o nome só sobrevivía no `aria-label`… que se
emite unicamente nos nodos INTERACTIVOS. Nun `ygg render` (cero
handlers) o atlas saía con **un só `aria-label`** para toda a árbore:
90 dos 97 nodos quedaban sen tooltip e sen nome accesible. Agora o nodo
emite un `<title>` co nome completo sempre que o texto non estea enteiro
á vista — ese é o mecanismo estándar de nome accesible en SVG, e dá o
tooltip nativo. Corríxense tamén as tres liñas de documentación onde
afirmara que o nome «segue no tooltip»: non era certo.
