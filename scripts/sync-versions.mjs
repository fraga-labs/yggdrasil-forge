#!/usr/bin/env node
// ── INICIO: sync-versions ──
// Pon a constante `VERSION` de cada paquete de acordo co seu
// package.json.
//
// Por que existe: catro paquetes publicados (`exporters` 0.1.1,
// `importers` 0.2.1, `storage` 0.1.2, `themes` 0.1.0) exportaban
// `VERSION = '0.0.0'`. A constante escribiuse a man o día que naceu o
// paquete e ninguén a volveu tocar, así que quen a importase para un
// diagnóstico lía unha versión que non existe desde hai tres releases.
//
// Os seis paquetes ligados escapaban por casualidade: alguén os puxo a
// man en 1.0.0. Coa seguinte suba pasaríalles o mesmo, e a eses si que
// os le xente.
//
// Chámase desde `changeset:version`, xusto despois de que changesets
// escriba os package.json novos, para que a constante non poida quedar
// atrás nunca máis. `--check` non escribe: só informa (o test usa a
// mesma idea).

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const soComprobar = process.argv.includes('--check')

/** Todos os .ts baixo un directorio (sen glob: `fs.globSync` aínda é experimental). */
function tsBaixo(dir) {
  if (!existsSync(dir)) return []
  const saida = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) saida.push(...tsBaixo(ruta))
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) saida.push(ruta)
  }
  return saida
}

/** Onde vive a constante nun paquete, ou `undefined` se non a ten. */
function atoparVersion(basePkg) {
  for (const ruta of tsBaixo(join(basePkg, 'src'))) {
    const texto = readFileSync(ruta, 'utf8')
    const m = /export const VERSION\s*=\s*'([^']*)'/.exec(texto)
    if (m !== null) return { ruta, texto, actual: m[1] }
  }
  return undefined
}

const desaxustados = []
for (const nome of readdirSync(join(RAIZ, 'packages'))) {
  const basePkg = join(RAIZ, 'packages', nome)
  const pkgJson = join(basePkg, 'package.json')
  if (!existsSync(pkgJson)) continue
  const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'))
  const achado = atoparVersion(basePkg)
  if (achado === undefined) continue
  if (achado.actual === pkg.version) continue
  desaxustados.push({ nome: pkg.name, de: achado.actual, a: pkg.version, ruta: achado.ruta })
  if (!soComprobar) {
    writeFileSync(
      achado.ruta,
      achado.texto.replace(
        /export const VERSION\s*=\s*'[^']*'/,
        `export const VERSION = '${pkg.version}'`,
      ),
      'utf8',
    )
  }
}

if (desaxustados.length === 0) {
  console.info('sync-versions: todas as constantes VERSION coinciden co seu package.json')
  process.exit(0)
}
for (const d of desaxustados) {
  console.info(`sync-versions: ${d.nome} ${d.de} → ${d.a}`)
}
process.exit(soComprobar ? 1 : 0)
// ── FIN: sync-versions ──
