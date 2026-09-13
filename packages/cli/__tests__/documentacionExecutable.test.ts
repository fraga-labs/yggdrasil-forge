// ── INICIO: a documentación executable ten que executar (19.11) ──
// Cada comando `ygg` que aparece nun bloque ```bash da documentación
// **córrese de verdade** e ten que saír con 0.
//
// Isto naceu de copiar e pegar o que a documentación di. O README da
// galería ensinaba a foto do lobo con
// `--unlock "espertar,corazon,machado:3"`, e a cadea real do documento é
// `espertar → corazon → furia → pel-de-oso → machado`: faltaban DOUS
// nodos, así que o comando fallaba. A «vía do dato» levaba a mesma orde
// coa metade dun nodo menos, e a versión inglesa tiña os ids traducidos
// (`awaken,heart,fury,axe`), que non existen en ningures.
//
// O peor era o veciño: xusto debaixo, o README presume de que «un
// desbloqueo fallido é un ERRO, non unha foto máis calada — se un id
// queda rancio, o build das docs falla en vez de publicar un escaparate
// equivocado». E era certo… para `gallery-showcase.json`, que o build
// corre. A copia escrita a man na páxina non a miraba ninguén.

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type CliIO, run } from '../src/cli.js'

const RAIZ = join(__dirname, '..', '..', '..')
const GALLERY = join(RAIZ, 'examples', 'gallery')

/** Páxinas que ensinan comandos contra ficheiros REAIS da galería. */
const PAXINAS = [
  join(GALLERY, 'README.md'),
  join(RAIZ, 'docs-site', 'src', 'content', 'docs', 'via-do-dato', 'index.md'),
  join(RAIZ, 'docs-site', 'src', 'content', 'docs', 'en', 'via-do-dato', 'index.md'),
]

/**
 * Parte unha liña de shell respectando as comiñas dobres.
 *
 * Non é un shell: só o suficiente para `--unlock "a,b:2"`. Se algún día
 * a documentación precisa máis (tubos, variables), o sitio de arranxalo
 * é aquí e non baixando o listón do test.
 */
function partirArgv(liña: string): string[] {
  const out: string[] = []
  let actual = ''
  let dentro = false
  for (const c of liña) {
    if (c === '"') {
      dentro = !dentro
      continue
    }
    if (c === ' ' && !dentro) {
      if (actual.length > 0) out.push(actual)
      actual = ''
      continue
    }
    actual += c
  }
  if (actual.length > 0) out.push(actual)
  return out
}

/** Comandos `ygg …` dentro dos bloques ```bash dunha páxina. */
function comandosDe(texto: string): string[] {
  const ordes: string[] = []
  const bloques = texto.matchAll(/```bash[^\n]*\n([\s\S]*?)```/g)
  for (const b of bloques) {
    for (const bruta of (b[1] ?? '').split('\n')) {
      const liña = bruta.trim().replace(/^npx /, '')
      if (!liña.startsWith('ygg ')) continue
      if (liña.includes('#')) continue // liñas con comentario: non son literais
      ordes.push(liña)
    }
  }
  return ordes
}

function makeIO(): CliIO & { err: () => string } {
  let err = ''
  return {
    readStdin: () => Promise.resolve(''),
    stdout: () => {
      // A saída non se mira: o que se xulga é o código de saída.
    },
    stderr: (t) => {
      err += t
    },
    err: () => err,
  }
}

describe('★ a documentación executable execútase', () => {
  for (const paxina of PAXINAS) {
    const texto = readFileSync(paxina, 'utf8')
    const ordes = comandosDe(texto).filter((o) => o.startsWith('ygg render'))
    const nome = paxina.slice(RAIZ.length + 1)

    it(`${nome} ensina algún comando de render`, () => {
      expect(ordes.length).toBeGreaterThan(0)
    })

    for (const orde of ordes) {
      it(`★★ ${nome}: ${orde.slice(0, 58)}… sae con 0`, async () => {
        const dir = mkdtempSync(join(tmpdir(), 'ygg-docs-'))
        try {
          const argv = partirArgv(orde).slice(1)
          // O ficheiro nómbrase espido porque a páxina supón que estás
          // dentro de examples/gallery/; e a saída vai ao temporal.
          const resolto = argv.map((a, i) => {
            if (a.endsWith('.json') && argv[i - 1] !== '--out') return join(GALLERY, a)
            if (a.endsWith('.svg')) return join(dir, 'saida.svg')
            return a
          })
          const io = makeIO()
          const code = await run(resolto, io)
          expect(code, `${orde}\n\n${io.err()}`).toBe(0)
        } finally {
          rmSync(dir, { recursive: true, force: true })
        }
      })
    }
  }
})
// ── FIN: a documentación executable ──
