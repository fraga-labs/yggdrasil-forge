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

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

/**
 * Un comando da documentación e, se o leva, a **promesa** escrita ao seu
 * carón nun comentario `# …`.
 */
interface OrdeDoc {
  readonly orde: string
  /** O que a páxina di que vai saír, se o di cun `✓`. */
  readonly promesa: string | undefined
}

/** Comandos `ygg …` dentro dos bloques ```bash dunha páxina. */
function comandosDe(texto: string): OrdeDoc[] {
  const ordes: OrdeDoc[] = []
  const bloques = texto.matchAll(/```bash[^\n]*\n([\s\S]*?)```/g)
  for (const b of bloques) {
    for (const bruta of (b[1] ?? '').split('\n')) {
      const liña = bruta.trim().replace(/^npx /, '')
      if (!liña.startsWith('ygg ')) continue
      const almofada = liña.indexOf('#')
      const orde = (almofada === -1 ? liña : liña.slice(0, almofada)).trim()
      const comentario = almofada === -1 ? '' : liña.slice(almofada + 1).trim()
      // Só se toma por promesa o que se parece a unha saída literal. Un
      // `# 3. colocar` ou un `# fix → repeat` son glosas, non contratos.
      const promesa = comentario.startsWith('✓') ? comentario : undefined
      ordes.push({ orde, ...(promesa !== undefined && { promesa }) })
    }
  }
  return ordes
}

function makeIO(): CliIO & { out: () => string; err: () => string } {
  let out = ''
  let err = ''
  return {
    readStdin: () => Promise.resolve(''),
    stdout: (t) => {
      out += t
    },
    stderr: (t) => {
      err += t
    },
    out: () => out,
    err: () => err,
  }
}

/**
 * Nomes de ficheiro que a documentación usa como MARCADOR («a túa
 * árbore»), non como exemplo executable. Esta lista é curta a propósito:
 * calquera outro `.json` que non estea na galería faise fallar, porque o
 * máis probable é que sexa un nome real que quedou rancio.
 */
const MARCADORES = new Set(['arbore.json', 'tree.json'])

describe('★ a documentación executable execútase', () => {
  for (const paxina of PAXINAS) {
    const texto = readFileSync(paxina, 'utf8')
    const todas = comandosDe(texto)
      .map((o) => o.orde)
      .filter((o) => o.startsWith('ygg render'))
    const nome = paxina.slice(RAIZ.length + 1)

    // Un `.json` que non está na galería e non é marcador coñecido: iso
    // xa é o fallo, e dise aquí en vez de deixalo pasar.
    const rancios = todas.filter((o) =>
      partirArgv(o).some(
        (a) => a.endsWith('.json') && !MARCADORES.has(a) && !existsSync(join(GALLERY, a)),
      ),
    )
    const ordes = todas.filter(
      (o) => !partirArgv(o).some((a) => a.endsWith('.json') && MARCADORES.has(a)),
    )

    it(`${nome} non nomea ningún documento que non existe`, () => {
      expect(rancios).toEqual([])
    })

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
// ── Os tutoriais de entrada: o JSON que ensinan, cos comandos que ensinan ──
// A páxina inglesa prometía `# ✓ valid document (3 nodes, 2 edges)`. O
// `ygg` fala galego e o que sae é `✓ documento válido (3 nodos, 2
// arestas)`: o primeiro comando dun recén chegado non daba o que a
// páxina dicía. Os comandos si funcionaban; a saída estaba inventada.
//
// Aquí escríbese o bloque ```json da propia páxina co nome que a propia
// páxina usa, e córrense as ordes na orde na que aparecen. Cando a liña
// leva unha promesa (un comentario que empeza por `✓`), compróbase
// tamén contra o stdout de verdade.
const TUTORIAIS = [
  join(RAIZ, 'docs-site', 'src', 'content', 'docs', 'comeza', 'primeira-arbore.md'),
  join(RAIZ, 'docs-site', 'src', 'content', 'docs', 'en', 'comeza', 'primeira-arbore.md'),
]

describe('★★ os tutoriais de entrada córrense enteiros', () => {
  for (const paxina of TUTORIAIS) {
    const texto = readFileSync(paxina, 'utf8')
    const nome = paxina.slice(RAIZ.length + 1)
    const documento = /```json\n([\s\S]*?)```/.exec(texto)?.[1]
    const ordes = comandosDe(texto)
    const promesas = ordes.filter((o) => o.promesa !== undefined).length

    it(`${nome} ensina un documento e polo menos tres ordes`, () => {
      expect(documento).toBeDefined()
      expect(ordes.length).toBeGreaterThanOrEqual(3)
    })

    it(`★★ ${nome}: as ${ordes.length} ordes, en orde, con ${promesas} promesa(s)`, async () => {
      const dir = mkdtempSync(join(tmpdir(), 'ygg-tuto-'))
      try {
        // O documento escríbese con TODOS os nomes .json que as ordes
        // mencionan: así o test non ten que adiviñar como se chama.
        const ficheiros = new Set(
          ordes.flatMap((o) => partirArgv(o.orde)).filter((a) => a.endsWith('.json')),
        )
        expect(ficheiros.size).toBeGreaterThan(0)
        for (const f of ficheiros) writeFileSync(join(dir, f), documento ?? '', 'utf8')

        for (const { orde, promesa } of ordes) {
          const argv = partirArgv(orde).slice(1)
          const resolto = argv.map((a) =>
            a.endsWith('.json') || a.endsWith('.svg') ? join(dir, a) : a,
          )
          const io = makeIO()
          const code = await run(resolto, io)
          expect(code, `${orde}\n\n${io.err()}`).toBe(0)
          if (promesa !== undefined) {
            expect(io.out(), `a páxina promete «${promesa}»`).toContain(promesa)
          }
        }
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }
})

// ── FIN: a documentación executable ──
