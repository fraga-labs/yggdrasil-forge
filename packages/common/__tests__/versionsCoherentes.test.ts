// ── INICIO: a VERSION exportada non pode mentir (19.11) ──
// Invariante de TODO o monorepo, non só de `common`: se un paquete
// exporta unha constante `VERSION`, ten que ser a do seu package.json.
// Vive aquí porque `common` é o chan do que dependen os demais, así que
// é o sitio onde un fallo se ve antes.
//
// O que o trouxo: catro paquetes PUBLICADOS exportaban `VERSION =
// '0.0.0'` — `exporters` (0.1.1), `importers` (0.2.1), `storage`
// (0.1.2) e `themes` (0.1.0). A constante escribírase a man o día que
// naceu cada paquete e ninguén a volveu tocar; quen a importase para un
// diagnóstico lía unha versión que non existe desde hai tres releases.
//
// Os seis ligados escapaban por casualidade: alguén os puxo a man en
// 1.0.0. Coa próxima suba —esta mesma— pasaríalles o mesmo, e a eses
// si que os le xente. Por iso `changeset:version` chama agora a
// `scripts/sync-versions.mjs`, e isto é o gardián de que se chamou.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = join(__dirname, '..', '..', '..')

/** Todos os .ts baixo un directorio. */
function tsBaixo(dir: string): string[] {
  if (!existsSync(dir)) return []
  const saida: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) saida.push(...tsBaixo(ruta))
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) saida.push(ruta)
  }
  return saida
}

interface Paquete {
  readonly nome: string
  readonly versionDoPackageJson: string
  readonly versionExportada: string | undefined
}

function paquetes(): Paquete[] {
  const saida: Paquete[] = []
  for (const nome of readdirSync(join(RAIZ, 'packages'))) {
    const base = join(RAIZ, 'packages', nome)
    const pkgJson = join(base, 'package.json')
    if (!existsSync(pkgJson)) continue
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8')) as {
      name: string
      version: string
    }
    let exportada: string | undefined
    for (const ruta of tsBaixo(join(base, 'src'))) {
      const m = /export const VERSION\s*=\s*'([^']*)'/.exec(readFileSync(ruta, 'utf8'))
      if (m?.[1] !== undefined) {
        exportada = m[1]
        break
      }
    }
    saida.push({
      nome: pkg.name,
      versionDoPackageJson: pkg.version,
      versionExportada: exportada,
    })
  }
  return saida
}

describe('★ a constante VERSION de cada paquete', () => {
  const todos = paquetes()

  it('hai paquetes que atopar (o test non se está enganando só)', () => {
    expect(todos.length).toBeGreaterThan(10)
    expect(todos.filter((p) => p.versionExportada !== undefined).length).toBeGreaterThan(10)
  })

  it('★★ coincide co package.json en todos os que a exportan', () => {
    const mentirosos = todos
      .filter((p) => p.versionExportada !== undefined)
      .filter((p) => p.versionExportada !== p.versionDoPackageJson)
      .map((p) => `${p.nome}: exporta ${p.versionExportada}, é ${p.versionDoPackageJson}`)
    expect(
      mentirosos,
      'arránxao con `node scripts/sync-versions.mjs` (xa o chama changeset:version)',
    ).toEqual([])
  })
})
// ── FIN: a VERSION exportada non pode mentir ──
