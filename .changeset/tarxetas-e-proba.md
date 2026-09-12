---
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-react': patch
---

A vista de tarxetas deixa de solapar, e o panel Proba pinta as iconas

**As tarxetas pisábanse.** O anel automático ía a un 36% do CONTEDOR sen
mirar canto miden as tarxetas. Nun panel de 700×439 iso dá un semi-eixe
vertical de 158 px e unha tarxeta de 16 membros mide uns 460: co atlas
da galería (sete grupos) as tarxetas saían literalmente unhas por riba
doutras. Agora o anel calcúlase en PÍXELES a partir do tamaño real das
tarxetas, cunha garantía demostrable: co factor √2, para calquera ángulo
sempre se cumpre que dúas veciñas se separan o ancho dunha tarxeta en X
ou o alto en Y. Medido no editor: de tarxetas ilexibles a **cero pares
solapados**.

Vai acompañado do **encadre inicial**: un anel máis grande sen encadrar
deixaría as tarxetas fóra da vista, que é peor. Ao abrir, a vista axusta
o zoom ao anel. Iso arranxa de paso un defecto que xa existía co anel
vello: coa árbore do panadeiro (dous grupos) as tarxetas saían cortadas
polo bordo do panel, como se ve na captura 10 da guía.

`autoRadiusPercent` segue funcionando para quen queira o comportamento
vello, e as `positions` explícitas mandan coma sempre.

**O panel Proba pintaba o id da icona como texto**: un recurso con
`icon: "norse-sun"` amosaba «norse-sun» ao lado da etiqueta. Agora
resólvese como no Inspector (icona se o id está rexistrado; texto só
cando non o está, que é o caso lexítimo dun emoji).
