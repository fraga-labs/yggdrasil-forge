---
'@yggdrasil-forge/exporters': patch
'@yggdrasil-forge/importers': patch
'@yggdrasil-forge/storage': patch
'@yggdrasil-forge/themes': patch
---

A constante `VERSION` de cada paquete deixa de mentir

Catro paquetes PUBLICADOS exportaban `VERSION = '0.0.0'`: `exporters`
(que vai por 0.1.1), `importers` (0.2.1), `storage` (0.1.2) e `themes`
(0.1.0). Quen importase esa constante para un diagnóstico lía unha
versión que non existe desde hai tres releases.

**O interesante é por que ninguén o viu.** O smoke test de cada un dicía
`expect(VERSION).toBe('0.0.0')`. Estaba verde. A literal conxelaba o
valor do día en que naceu o paquete e protexía o erro: canto máis
avanzaba o package.json, máis mentía a constante, e máis firme era o
test en dicir que todo ía ben.

Os seis paquetes ligados escapaban por casualidade — alguén os puxo a
man en 1.0.0 — e nesta mesma entrega ían caer: simulei a suba a 1.1.0 e
`core` quedaba exportando `1.0.0`. A eses si que os le xente.

Tres cambios, non un:

- `scripts/sync-versions.mjs` pon a constante a partir do package.json, e
  `changeset:version` chámao xusto despois de que changesets escriba as
  versións novas. Así a constante non pode quedar atrás.
- `packages/common/__tests__/versionsCoherentes.test.ts` compróbao para
  os 22 paquetes: é o gardián de que o script se chamou.
- Os trece smoke tests deixan de comparar cunha literal e piden só forma
  de versión. Nove deles aínda son correctos hoxe (paquetes reservados en
  0.0.0), pero levaban a mesma trampa armada para o día que suban.
