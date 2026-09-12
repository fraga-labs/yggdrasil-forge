# capturas — o xerador da guía visual (17.5)

As capturas da guía do editor (`docs-site/src/assets/capturas/*.png`) **xéranse por script, nunca á man**: cambia a UI → reexecútase → frescas. E se un fluxo rompe, a UI rompeu — as capturas son tamén sentinela.

## Rexenerar

Desde a raíz do repo:

```bash
corepack pnpm run capturas
```

(Arranca só o dev server do editor no porto 5199, executa as 14 escenas contra tema marfil a 1440×900, e escribe os PNG en `docs-site/src/assets/capturas/`. Primeira vez: `cd tools/e2e/capturas && npm install` e, se non tes navegadores de Playwright, `npx playwright install chromium`.)

## Regras

- **Determinista no CONTIDO**, non no píxel: cada escena arranca limpa
  (`localStorage.clear()`) e cun documento de partida fixo (o panadeiro da
  galería ou un doc novo), así que nunca hai estado residual. Pero o
  antialiasing do texto varía entre execucións: medido, unha pasada sen
  cambio ningún move ~14.000 píxeles de `01-editor.png` sen que se vexa
  nada distinto. **Se o único que cambia é iso, descarta a captura** en vez
  de commitear ruído binario:

  ```bash
  git restore docs-site/src/assets/capturas/01-editor.png
  ```
- **Recorte intelixente**: cada PNG ensina UN concepto — elemento ou zona, non sempre pantalla enteira.
- **Nomes estables**: `01-editor.png` … `14-problemas.png`. A guía referencia estes nomes; non os cambies sen tocar a guía (gl **e** en — comparten imaxes).
- **Frescura**: rexenerar antes de cada release (regra no checklist do ROADMAP). Capturas rancias son documentación mentindo.
- **Autocontido**: este directorio commitéase (excepción no `.gitignore` de `/tools/e2e/*`) e non depende do resto da suite E2E do Tester (helpers propios). O escuro queda fóra da v1 para non duplicar mantemento.
