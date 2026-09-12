---
'@yggdrasil-forge/cli': minor
---

`ygg render --grant/--unlock`: a foto da árbore viva

Ata agora `ygg render` pintaba sempre o día cero, con todo `locked`. Como
`locked` é por deseño o estado máis apagado, as fotos da galería, das
docs e do README amosaban árbores que parecían mortas, e catro dos cinco
estados non aparecían nunca — nin a aresta acesa, que existe desde F10.4.
Os mockups fundacionais pedían xusto o contrario: «display multiple node
states simultaneously».

Dúas bandeiras novas:

- `--grant recurso=N,…` concede recursos antes de xogar.
- `--unlock id[:N],…` desbloquea eses nodos en orde; `id:N` sobe N rangos
  (para chegar a `maxed`, ou deixar un multi-rango a medias e que se
  pinte en progreso).

Falla en ALTO: se o motor rexeita un desbloqueo (custo, prerrequisito,
exclusión), o comando dá erro coa razón dentro en vez de sacar unha foto
distinta da pedida. Iso xa cazou dous guións meus mal ordenados.

API: `renderDocumentText` queda intacta (síncrona, mesma sinatura). O
modo xogado vive nunha función irmá `renderPlayedDocumentText` (async,
porque `unlock`/`grantResource` do motor o son), e ambas comparten o
mesmo pintado.
