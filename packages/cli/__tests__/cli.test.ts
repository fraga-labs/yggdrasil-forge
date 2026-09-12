// ── INICIO: tests do CLI ygg (7.15, Cambio 4) ──
// run() é o punto de entrada testable: mesmo contrato CliIO que o bin
// real, con stdin/stdout/stderr falsos. Cobre: exit codes, a forma
// EXACTA de --json, o pipe `ygg new | ygg validate`, a galería, e
// JSON roto con campo sinalado.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type CliIO, run } from '../src/cli.js'
import { validateDocumentText } from '../src/validate.js'

const GALLERY = join(__dirname, '..', '..', '..', 'examples', 'gallery')

interface FakeIO extends CliIO {
  readonly out: () => string
  readonly err: () => string
}

function makeIO(stdin = ''): FakeIO {
  let out = ''
  let err = ''
  return {
    readStdin: () => Promise.resolve(stdin),
    stdout: (text) => {
      out += text
    },
    stderr: (text) => {
      err += text
    },
    out: () => out,
    err: () => err,
  }
}

describe('ygg validate — exit codes e saída', () => {
  it('ficheiro da galería → exit 0 e mensaxe humana', async () => {
    const io = makeIO()
    const code = await run(['validate', join(GALLERY, 'panadeiro.json')], io)
    expect(code).toBe(0)
    expect(io.out()).toMatch(/✓ documento válido/)
  })

  it('JSON roto → exit 1 e issue co campo sinalado (--json)', async () => {
    const broken = { tree: { id: 't' } } // faltan schemaVersion/version/label/nodes/edges/layout
    const io = makeIO(JSON.stringify(broken))
    const code = await run(['validate', '-', '--json'], io)
    expect(code).toBe(1)
    const report = JSON.parse(io.out()) as {
      ok: boolean
      issues: readonly { severity: string; code: string; message: string }[]
    }
    expect(report.ok).toBe(false)
    expect(report.issues.length).toBeGreaterThan(0)
    expect(report.issues[0]?.severity).toBe('error')
    expect(typeof report.issues[0]?.code).toBe('string')
    // A mensaxe sinala campos concretos.
    expect(report.issues[0]?.message).toMatch(/schemaVersion|nodes|label/)
  })

  it('--json coa forma exacta {ok, issues, stats} en éxito', async () => {
    const text = readFileSync(join(GALLERY, 'minimal.json'), 'utf8')
    const io = makeIO(text)
    const code = await run(['validate', '--json'], io)
    expect(code).toBe(0)
    const report = JSON.parse(io.out()) as Record<string, unknown>
    expect(Object.keys(report).sort()).toEqual(['issues', 'ok', 'stats'])
    expect(report.ok).toBe(true)
    expect(report.issues).toEqual([])
    expect(report.stats).toEqual({ nodes: 2, edges: 1 })
  })

  it('theme corrompido → issue que sinala editor.theme', async () => {
    const doc = {
      tree: {
        id: 't',
        schemaVersion: '1.0.0',
        version: '1.0.0',
        label: { gl: 'x' },
        nodes: [],
        edges: [],
        layout: { type: 'custom' },
      },
      editor: { theme: { nodeFills: { locked: 123 } } },
    }
    const io = makeIO(JSON.stringify(doc))
    const code = await run(['validate', '-', '--json'], io)
    expect(code).toBe(1)
    const report = JSON.parse(io.out()) as { issues: readonly { message: string }[] }
    expect(report.issues[0]?.message).toMatch(/editor\.theme\.nodeFills/)
  })

  it('ficheiro inexistente → exit 1 con FILE_READ (--json)', async () => {
    const io = makeIO()
    const code = await run(['validate', 'non-existe.json', '--json'], io)
    expect(code).toBe(1)
    const report = JSON.parse(io.out()) as { issues: readonly { code: string }[] }
    expect(report.issues[0]?.code).toBe('FILE_READ')
  })
})

describe('ygg new — documento baleiro válido', () => {
  it('★ pipe: `ygg new | ygg validate` → ok', async () => {
    const ioNew = makeIO()
    expect(await run(['new', '--label', 'Proba'], ioNew)).toBe(0)
    const ioVal = makeIO(ioNew.out())
    expect(await run(['validate', '-'], ioVal)).toBe(0)
  })

  it('--id e --label chegan ao documento', async () => {
    const io = makeIO()
    await run(['new', '--id', 'a-mina', '--label', 'A miña árbore'], io)
    const doc = JSON.parse(io.out()) as {
      tree: { id: string; label: Record<string, string> }
      editor: { formatVersion: string }
    }
    expect(doc.tree.id).toBe('a-mina')
    expect(doc.tree.label.gl).toBe('A miña árbore')
    expect(doc.editor.formatVersion).toBe('1.0.0')
  })
})

describe('ygg schema — emite o JSON Schema', () => {
  it('stdout é JSON parseable co $id esperado', async () => {
    const io = makeIO()
    expect(await run(['schema'], io)).toBe(0)
    const schema = JSON.parse(io.out()) as { $id: string; title: string }
    expect(schema.$id).toMatch(/yggdrasil-document\.schema\.json$/)
    expect(schema.title).toBe('Yggdrasil Forge document')
  })
})

describe('gramática e códigos de saída', () => {
  it('sen comando → usage + exit 2', async () => {
    const io = makeIO()
    expect(await run([], io)).toBe(2)
    expect(io.out()).toMatch(/Uso:/)
  })

  it('comando descoñecido → exit 2', async () => {
    const io = makeIO()
    expect(await run(['frobnicar'], io)).toBe(2)
    expect(io.err()).toMatch(/descoñecido/)
  })

  it('help → exit 0', async () => {
    const io = makeIO()
    expect(await run(['help'], io)).toBe(0)
  })
})

describe('validateDocumentText — API directa', () => {
  it('galería adversarial → ok con stats', () => {
    const text = readFileSync(join(GALLERY, 'adversarial.json'), 'utf8')
    const report = validateDocumentText(text)
    expect(report.ok).toBe(true)
    expect(report.stats?.nodes).toBeGreaterThan(0)
  })
})
// ── 19.10: `ygg validate` corre tamén a CONCIENCIA ──
//
// Ata 19.10 isto só deserializaba, así que un documento cun ciclo de
// prerrequisitos — os nodos do ciclo quedan bloqueados PARA SEMPRE —
// saía por aquí como «✓ documento válido» e nada máis. O editor si
// avisaba; a IA que itera co CLI non se enteraba.

/** Documento que carga ben pero ten tres problemas semánticos. */
const ENFERMO = JSON.stringify({
  tree: {
    id: 'enfermo',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Con problemas',
    resources: [{ id: 'ouro', label: 'Ouro', initial: 10 }],
    nodes: [
      {
        id: 'a',
        type: 'small',
        label: 'A',
        position: { x: 0, y: 0 },
        costPerTier: [[{ resourceId: 'prata', amount: 2 }]],
        prerequisites: { type: 'node_unlocked', nodeId: 'b' },
      },
      {
        id: 'b',
        type: 'small',
        label: 'B',
        position: { x: 80, y: 0 },
        prerequisites: { type: 'node_unlocked', nodeId: 'a' },
      },
      { id: 'c', type: 'small', label: 'C', position: { x: 160, y: 0 }, exclusions: ['a'] },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  },
  editor: { formatVersion: '1.0.0' },
})

describe('★ ygg layout — a lista de algoritmos sae do rexistro (19.10)', () => {
  it('★ o erro de --algo nomea TODOS, `mesh` incluído', async () => {
    // Estaba escrita a man e quedou en cinco cando entrou `mesh`: a
    // axuda de `ygg --help` si o nomeaba e este erro non, así que quen
    // se equivocaba lía que `mesh` non existía.
    const io = makeIO()
    const code = await run(['layout', join(GALLERY, 'minimal.json')], io)
    expect(code).toBe(2)
    expect(io.err()).toContain('mesh')
    expect(io.err()).toContain('clustered-radial')
  })

  it('★★ o documento cocido queda en `custom`: o que se escribe é o que se pinta', async () => {
    // Antes quedaba co layout vivo, así que as posicións escritas
    // ignorábanse ao renderizar. Medido co atlas: mediana de 49
    // unidades de desfase entre a posición escrita e a pintada.
    const io = makeIO()
    const code = await run(
      ['layout', join(GALLERY, 'atlas-de-fisterra.json'), '--algo', 'mesh'],
      io,
    )
    expect(code).toBe(0)
    const doc = JSON.parse(io.out()) as {
      tree: { layout: { type: string }; nodes: readonly { position?: unknown }[] }
    }
    expect(doc.tree.layout.type).toBe('custom')
    expect(doc.tree.nodes.every((n) => n.position !== undefined)).toBe(true)
  })

  it('`--algo mesh` funciona de verdade, non só na mensaxe', async () => {
    const io = makeIO()
    const code = await run(['layout', join(GALLERY, 'minimal.json'), '--algo', 'mesh'], io)
    expect(code).toBe(0)
    const doc = JSON.parse(io.out()) as { tree: { nodes: readonly { position?: unknown }[] } }
    expect(doc.tree.nodes.every((n) => n.position !== undefined)).toBe(true)
  })
})

describe('★ ygg validate — a conciencia (19.10)', () => {
  it('★★ un ciclo de prerrequisitos xa NON pasa en silencio', async () => {
    const io = makeIO(ENFERMO)
    await run(['validate', '--json'], io)
    const report = JSON.parse(io.out()) as {
      issues: readonly { code: string; nodeId?: string }[]
    }
    expect(report.issues.map((i) => i.code)).toContain('PREREQ_CYCLE')
  })

  it('★★ pero un aviso NON invalida: ok segue true e o exit code 0', async () => {
    // Contrato deliberado: `ok` significa «o documento cárgase», que é
    // o que un pipeline precisa para decidir se continúa. Un warning é
    // información para mellorar, non un muro.
    const io = makeIO(ENFERMO)
    const code = await run(['validate', '--json'], io)
    expect(code).toBe(0)
    expect((JSON.parse(io.out()) as { ok: boolean }).ok).toBe(true)
  })

  it('★ ve os tres tipos de problema: ciclo, exclusión asimétrica e recurso inexistente', async () => {
    const report = validateDocumentText(ENFERMO)
    const codigos = new Set(report.issues.map((i) => i.code))
    expect(codigos).toContain('PREREQ_CYCLE')
    expect(codigos).toContain('EXCL_ASYMMETRIC')
    expect(codigos).toContain('RES_DANGLING_COST_PER_TIER')
  })

  it('★ cada aviso sinala ONDE: id de nodo (ou de aresta)', async () => {
    const report = validateDocumentText(ENFERMO)
    const cycle = report.issues.filter((i) => i.code === 'PREREQ_CYCLE')
    expect(cycle.length).toBeGreaterThan(0)
    for (const i of cycle) expect(i.nodeId).toBeDefined()
  })

  it('a saída humana imprime os avisos DESPOIS do ✓', async () => {
    const io = makeIO(ENFERMO)
    await run(['validate'], io)
    const texto = io.out()
    expect(texto).toMatch(/✓ documento válido/)
    expect(texto.indexOf('PREREQ_CYCLE')).toBeGreaterThan(texto.indexOf('✓'))
  })

  it('un documento limpo segue sen avisos (cero ruído na galería)', async () => {
    for (const f of ['minimal.json', 'panadeiro.json', 'atlas-de-fisterra.json']) {
      const report = validateDocumentText(readFileSync(join(GALLERY, f), 'utf8'))
      expect(report.issues, f).toEqual([])
    }
  })
})
// ── FIN: tests do CLI ──

// ── 19.1: as bandeiras de xogo non poden fallar caladas ──
describe('ygg render --grant/--unlock — uso incorrecto', () => {
  const ARBORE = join(GALLERY, 'panadeiro.json')

  it.each(['--grant', '--unlock'])(
    '★ %s sen valor é erro de uso, non un render mudo',
    async (b) => {
      const io = makeIO()
      // `--dark` detrás fai que takeOption non colla valor: o caso real.
      const code = await run(['render', ARBORE, '--out', 'x.svg', b, '--dark'], io)
      expect(code).toBe(2)
      expect(io.err()).toContain(b)
      expect(io.err()).toContain('precisa un valor')
    },
  )

  it('--grant mal formado («ouro» sen =N) é erro de uso', async () => {
    const io = makeIO()
    const code = await run(['render', ARBORE, '--out', 'x.svg', '--grant', 'ouro'], io)
    expect(code).toBe(2)
    expect(io.err()).toContain('recurso=N')
  })
})
