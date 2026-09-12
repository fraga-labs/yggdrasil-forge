---
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-react': minor
'@yggdrasil-forge/cli': minor
---

O minimapa: a última peza dos mockups fundacionais

`<Minimap>` en `@react`, e `SkillTree` gaña a prop `minimap`. Amosa a
árbore enteira como puntos (coloreados pola súa rexión), o rectángulo do
que se está a ver, e **premendo nel vaise alí**.

Aparece en dous dos mockups e era a única peza dese inventario sen nin
unha liña de código. A esa densidade non é adorno: cun atlas de centos de
nodos, sen minimapa non se sabe onde estás.

Decisións:

- Vai **dentro do mesmo `<svg>` pero FÓRA do grupo de pan/zoom** — por
  iso non se move ao arrastrar nin se estira ao ampliar. `SVGRenderer`
  gaña un slot `overlay` para iso (o `SkillTree` non ten envoltorio HTML:
  a súa raíz é o propio `<svg>`).
- Colócase e dimensiónase en **unidades do viewBox**, non en píxeles: así
  escala co SVG e funciona igual no editor que nun `ygg render`
  autocontido, **sen medir nada do DOM**.
- Conserva o **aspecto do documento**: se fose de aspecto fixo, o
  rectángulo do viewport mentiría.
- **Non é dato do documento**: é mobiliario do visor, así que decídeo
  quen renderiza. No editor acéndese nas árbores de 40 nodos ou máis (nun
  panadeiro de cinco só quitaría sitio); no CLI, coa bandeira
  `ygg render --minimap`.
