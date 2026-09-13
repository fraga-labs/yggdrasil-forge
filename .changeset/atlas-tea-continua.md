---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/react': minor
---

O atlas deixa de ser un arquipélago: as comarcas forman unha tea

O atlas da galería líase como **seis illas nun mar negro**, non como o
tecido continuo do mockup fundacional. A topoloxía non tiña a culpa —o
grafo xa era conexo, con seis raios desde a raíz e un anel entre
comarcas—: a culpa era de `colocarBlobs`, que mide cada comarca polo seu
círculo **circunscrito**. Unha tea irregular non é un círculo, e a
diferenza é enorme. Medido: os círculos case se tocaban (folgo 6–65)
mentres as teas de verdade quedaban a **61–121** unidades unhas doutras.

E había algo peor no medio. O código dicía que o grupo central «medra
para tocar o anel, que se non queda un baleiro»… pero o grupo central do
atlas ten **un só nodo**, e un blob dun membro non medra: inflábase un
número e o burato seguía igual. Eran **165 unidades** de negro arredor
de Fisterra, xusto no centro da foto.

Un pase novo de compactación corre cando xa hai posicións reais e
encolle o anel contra a xeometría de verdade, en dúas fases: primeiro
todas as comarcas xuntas (que conserva a simetría do anel, e iso é parte
de que se lea como un mapa) e despois cada unha polo que lle deixe a súa
veciñanza, porque se non un só par apretado deixa as outras cinco
abertas. Resultado no atlas: costuras de 61–121 a **22–44**, oco central
de 165 a **21,7**, e o lenzo de 799×962 a 702×652. Por dentro non se
deforma nada: móvense comarcas enteiras.

**E iso rompeu os rótulos.** Ao xuntar as comarcas, o bordo de arriba
dunha pasa a estar ocupado pola de enriba, e dous dos seis nomes
quedaron tapados. O preset `atlas` xa deixaba dito que `regionLabel:
'center'` se probara e se rectificara contra o mockup (a malla enche o
blob e o nome sae cortado), así que o sitio segue sendo o bordo: o que
cambia é **cal**. O nome próbase en seis puntos do bordo, ordenados do
lado exterior cara a dentro —nun anel, o exterior é o único que ninguén
máis reclama— e gaña o primeiro que queda limpo.

Limpo conta contra os nodos, contra os **nomes** dos nodos e contra os
rótulos xa colocados. O nome do nodo foi a metade que esquecín no
primeiro intento: baixei «A FRAGA» ao bordo de abaixo porque alí non
había nodos, e caeu enriba de «Espírito da Fraga». E cando nin así hai
sitio —a banda de abaixo é xusto onde o renderer pinta eses nomes— o
rótulo sae un chisco ao lenzo aberto polo lado exterior, que é o que fai
un mapa. É o caso de «O MAR ABERTO».

Empate → arriba, que é o de sempre: un documento cunha soa comarca, ou
cunha centrada, queda exactamente coma antes.
