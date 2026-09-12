---
'@yggdrasil-forge/react': minor
---

O brillo do «seguinte paso»: o renderer deriva `unlockable`

`unlockable` nunca foi un estado que o motor garde — só o escribe se un
documento o forza cun efecto `modify_node_state`. É unha PREGUNTA
(`canUnlock`), e ata agora ninguén a facía ao pintar. Consecuencia: o
recheo `unlockable` do tema, o seu anel e o pulso de `animations.ts` eran
tinta morta, e a afordancia central de todos os mockups fundacionais non
saía nin no editor nin en `ygg render`.

Agora `SkillTree` pregunta `canUnlock` polos nodos `locked` e pásalle a
resposta a `SkillNode`. A pregunta inclúe prerrequisitos, exclusións **e
afordabilidade**: un nodo sen portas pero impagable non brilla.

Dúas engadidas ao contrato, ambas compatibles cara atrás:

- `SkillNode` acepta `unlockable?: boolean` (quen a responde é o
  `SkillTree`, que ten o motor á man).
- `visualStateFor(state, tier, maxTier, unlockable?)` gaña un cuarto
  parámetro opcional. Sen el, comportamento idéntico ao previo.

E un atributo novo no DOM: **`data-visual-state`** leva o estado que se
VE (engade `in_progress` e `unlockable`), mentres `data-state` segue
levando o cru do motor — contrato de 1.0 intacto. O pulso de
`animations.ts` apunta agora ao novo: antes colgaba de
`[data-state="unlockable"]`, un valor que o motor non escribe nunca, así
que non disparou nin unha soa vez desde que se escribiu.

Custo: só se pregunta polos nodos `locked`, e o memo depende do snapshot
do motor, logo corre ao cambiar o estado — non por frame nin ao arrastrar
ou facer zoom. Medido: ~9 ms para unha pasada completa de 1500 nodos,
por baixo do re-render que ese mesmo cambio xa dispara.
