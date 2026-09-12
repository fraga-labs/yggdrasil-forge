---
'@yggdrasil-forge/editor-core': patch
'@yggdrasil-forge/core': patch
---

Preset `gotico` afinado, e a verdade sobre o aniñamento de regras

- **`gotico`**: o anel de `unlocked` e a aresta acesa eran a MESMA cor
  (`#a02a24`), o que deixaba a árbore nun vermello plano onde non se
  distinguía o camiño do premio. Agora ferro oxidado (`#8e3a2a`) →
  carmesí (`#c1272d`), coa aresta acesa apagada (`#6e2620`). Detectado ao
  aplicalo por primeira vez a un documento real (`a-vixilia`).

- **`UnlockRule`**: o TSDoc dicía que as regras aniñan «via cast». Non é
  certo e o erro é silencioso: `UnlockResolver.evaluate` pasa cada
  elemento a `evaluateCondition`, cuxo `switch` non recoñece
  `all`/`any`/`none`, co que devolve `undefined` — falso — e o nodo queda
  MUDO para sempre. O schema publicado tampouco as acepta (esa é a
  barreira que salva a quen o intente). Comentario corrixido coas dúas
  vías reais (`exclusions`, ou un nodo intermedio), e proba nova que fixa
  o rexeitamento na porta.
