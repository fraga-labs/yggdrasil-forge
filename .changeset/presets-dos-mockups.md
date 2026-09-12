---
'@yggdrasil-forge/editor-core': minor
---

Catro presets novos: os estilos dos mockups fundacionais

`THEME_PRESETS` pasa de 5 a 9 co engadido de `forxa`, `gotico`, `sci-fi` e
`escolar` — os catro estilos dos mockups cos que naceu o proxecto, agora
como dato aplicable dun clic (ou copiable por un xerador).

Son tamén os primeiros presets que exercen os tres eixes que o documento
aprendeu a levar neste mesmo ciclo: `nodeRings` (o anel por estado),
`edges` (base e acesa) e `typography`. Iso importa para o corpus: un
xerador que imite un preset vello só aprende cores de recheo; imitando
estes aprende que a fonte e o contorno tamén son identidade.

As familias nomeadas (Cinzel, Orbitron, Nunito…) NON van empaquetadas;
cada stack remata nun xenérico real, e hai un test que o garante.
