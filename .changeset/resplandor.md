---
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/cli': patch
---

O resplandor: `theme.effects.glow`, e `glow` no documento

O bloom dos mockups fundacionais — «Unlocked: strong outer glow», «Active
path: luminous gold». Faltaba porque un glow non se pinta: **fíltrase**.
Precisa un `<filter>` en `<defs>` e un `filter="url(#…)"` nos elementos
que o levan, e as dúas puntas teñen que casar.

- `@react`: `Theme.effects` con `glowRadius`, `glowStates` (por defecto
  os tres vivos: `unlockable`, `unlocked`, `maxed`) e `glowEdges` (só as
  ACESAS; unha aresta apagada con halo sería un contrasentido). O id do
  filtro **derívase do radio**, así que o `<defs>` e os nodos coinciden
  sen baixar un id por props, e é estable entre servidor e cliente —
  imprescindible para que `ygg render` saque SVGs válidos.
- `editor-core`: `ThemeSpec.glow` (`radius`, `states`, `edges`) e o
  cuarto funil `themeEffectsFromSpec`, que traduce de paso `inProgress`
  → `in_progress` (o documento fala coma `nodeFills`, o motor coma
  `NodeState`; sen esa tradución o glow non saía e non avisaba).

**Opt-in de verdade**: sen `effects`/`glow` nin se emite o filtro, así
que o SVG é byte a byte o de antes e o custo é cero. E é opt-in por unha
razón medible: cada elemento filtrado custa ao navegador unha pasada de
rasterización aparte, por iso `glowStates` existe — nun atlas de centos
de nodos hai que acender só os poucos que importan.
