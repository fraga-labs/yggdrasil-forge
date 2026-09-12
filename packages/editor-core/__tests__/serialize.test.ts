// ── INICIO: tests serialize / deserialize ──
import { describe, expect, it } from 'vitest'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'
import { minimalTreeDef } from './_fixtures.js'

describe('serializeDocument / deserializeDocument — round-trip', () => {
  it('round-trip simple: tree + meta default volve igual', () => {
    const doc = createEditorDocument(minimalTreeDef())
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree).toEqual(doc.tree)
    expect(restored.value.meta).toEqual(doc.meta)
  })

  it('round-trip con todos os opcionais de meta', () => {
    const doc = createEditorDocument(minimalTreeDef(), {
      formatVersion: '1.0.0',
      background: { src: '/cyber.png', opacity: 0.5, contrast: 1.1 },
      coordinateBounds: { minX: 0, minY: 0, maxX: 1402, maxY: 1122 },
      thumbnail: 'data:image/png;base64,abc',
      imports: ['./other.tree.json'],
    })
    const json = serializeDocument(doc)
    const restored = deserializeDocument(json)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree).toEqual(doc.tree)
    expect(restored.value.meta).toEqual(doc.meta)
  })
})

describe('serializeDocument — formato namespaced', () => {
  it('o JSON top-level ten claves `tree` e `editor`', () => {
    const doc = createEditorDocument(minimalTreeDef(), {
      background: { src: '/x.png' },
    })
    const json = serializeDocument(doc)
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(['editor', 'tree'])
    expect(parsed.tree).toBeTypeOf('object')
    expect(parsed.editor).toBeTypeOf('object')
  })
})

describe('deserializeDocument — compatibilidade cara atrás', () => {
  it('TreeDef pelado (sin envelope) carga con meta = default', () => {
    const treeOnly = JSON.stringify(minimalTreeDef())
    const restored = deserializeDocument(treeOnly)
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.tree.id).toBe('editor-core-test')
    expect(restored.value.meta.formatVersion).toBe('1.0.0')
    expect('background' in restored.value.meta).toBe(false)
  })
})

describe('deserializeDocument — validación', () => {
  it('JSON inválido: devolve Result.err (non lanza)', () => {
    const restored = deserializeDocument('{ this is not json')
    expect(restored.ok).toBe(false)
  })

  it('tree inválido: devolve Result.err (non lanza)', () => {
    // Sin id, sin nodes → validateTreeDef rexeita.
    const broken = JSON.stringify({ tree: { totally: 'wrong' } })
    const restored = deserializeDocument(broken)
    expect(restored.ok).toBe(false)
  })

  it('JSON é a string "null": devolve Result.err', () => {
    const restored = deserializeDocument('null')
    expect(restored.ok).toBe(false)
  })
})

// ── 7.14-B: blindaxe do import (informe 05) ──
// deserializeDocument corre os validadores DUROS
// (structural/uniqueIds/referentialIntegrity) sobre o doc parseado.
// Contrato: se devolve `ok`, o documento é cargable (o motor non
// lanzará ao construírse) — sen isto, ids duplicados pasaban o schema
// Zod e crasheaban ao renderizar o canvas, perdendo o documento.
describe('deserializeDocument — validadores duros (blindaxe do import)', () => {
  const base = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'x' },
    nodes: [] as unknown[],
    edges: [] as unknown[],
    layout: { type: 'custom' },
  }
  const node = (id: string, x: number) => ({
    id,
    type: 'small',
    label: { gl: id },
    position: { x, y: 0 },
  })

  it('ids de nodo duplicados → err (sen throw)', () => {
    const json = JSON.stringify({ ...base, nodes: [node('dup', 0), node('dup', 50)] })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/dup/i)
  })

  it('ids de aresta duplicados → err', () => {
    const json = JSON.stringify({
      ...base,
      nodes: [node('a', 0), node('b', 50)],
      edges: [
        { id: 'e', source: 'a', target: 'b', type: 'dependency' },
        { id: 'e', source: 'b', target: 'a', type: 'dependency' },
      ],
    })
    expect(deserializeDocument(json).ok).toBe(false)
  })

  it('aresta a nodo inexistente → err', () => {
    const json = JSON.stringify({
      ...base,
      nodes: [node('a', 0)],
      edges: [{ id: 'e', source: 'a', target: 'fantasma', type: 'dependency' }],
    })
    expect(deserializeDocument(json).ok).toBe(false)
  })

  it('happy-path: árbore válida → ok', () => {
    const json = JSON.stringify({
      ...base,
      nodes: [node('a', 0), node('b', 50)],
      edges: [{ id: 'e', source: 'a', target: 'b', type: 'dependency' }],
    })
    expect(deserializeDocument(json).ok).toBe(true)
  })
})

// ── 7.15-C1: validación Zod do namespace `editor` ──
// O tree xa se validaba (7.14-B); agora o meta tamén. Contrato: se
// deserializeDocument devolve `ok`, o documento ENTEIRO é san. Claves
// descoñecidas do futuro consérvanse tal cal (passthrough).
describe('deserializeDocument — namespace editor (documentMetaSchema, 7.15)', () => {
  const validTree = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'x' },
    nodes: [{ id: 'a', type: 'small', label: { gl: 'a' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  }

  it('theme con tipo errado → err que sinala o campo', () => {
    const json = JSON.stringify({
      tree: validTree,
      editor: { theme: { nodeFills: { locked: 123 } } },
    })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/editor\.theme\.nodeFills/)
  })

  it('background.opacity como string → err co campo', () => {
    const json = JSON.stringify({
      tree: validTree,
      editor: { background: { src: '/x.png', opacity: 'moita' } },
    })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/editor\.background\.opacity/)
  })

  it('coordinateBounds incompleto → err co campo', () => {
    const json = JSON.stringify({
      tree: validTree,
      editor: { coordinateBounds: { minX: 0, minY: 0, maxX: 100 } },
    })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/editor\.coordinateBounds\.maxY/)
  })

  it('★ clave descoñecida no meta → ok e CONSÉRVASE no round-trip', () => {
    const json = JSON.stringify({
      tree: validTree,
      editor: { formatVersion: '1.0.0', chaveDoFuturo: { misterio: true } },
    })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Consérvase no doc...
    expect((r.value.meta as Record<string, unknown>).chaveDoFuturo).toEqual({ misterio: true })
    // ...e sobrevive ao round-trip completo.
    const reparsed = JSON.parse(serializeDocument(r.value)) as {
      editor: Record<string, unknown>
    }
    expect(reparsed.editor.chaveDoFuturo).toEqual({ misterio: true })
  })

  it('theme válido completo → ok e chega ao doc', () => {
    const json = JSON.stringify({
      tree: validTree,
      editor: {
        theme: {
          preset: 'tintado',
          textColor: '#333333',
          nodeFills: { locked: '#c8c4bb', unlocked: '#7cb37c' },
          regions: [{ id: 'r1', label: 'Pan', tag: 'pan', color: '#c8875f' }],
        },
      },
    })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.meta.theme?.nodeFills?.locked).toBe('#c8c4bb')
    expect(r.value.meta.theme?.regions?.[0]?.tag).toBe('pan')
  })

  it('★ 19.0 — trazo, arestas e tipografía sobreviven ao ficheiro (ida e volta)', () => {
    const theme = {
      preset: 'gotico',
      nodeRings: { locked: '#3a2d2d', maxed: '#c1272d' },
      edges: { color: '#4a1418', active: '#c1272d' },
      typography: {
        fontFamily: 'Cinzel, serif',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
      },
    }
    const r = deserializeDocument(JSON.stringify({ tree: validTree, editor: { theme } }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Ida: o dato chega intacto ao documento.
    expect(r.value.meta.theme).toMatchObject(theme)
    // Volta: reserializar e volver ler non perde nada polo camiño — é o
    // que fai que o estilo viaxe co ficheiro e non só na sesión.
    const again = deserializeDocument(serializeDocument(r.value))
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.value.meta.theme).toEqual(r.value.meta.theme)
  })

  it('19.0 — tipografía con caixa inválida → err que sinala o campo', () => {
    const json = JSON.stringify({
      tree: validTree,
      editor: { theme: { typography: { textTransform: 'MAIÚSCULAS' } } },
    })
    const r = deserializeDocument(json)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/editor\.theme\.typography\.textTransform/)
  })

  it('★ 19.1 — unha regra de desbloqueo ANIÑADA é rexeitada na porta', () => {
    // O avaliador do motor non recorre regras: pasaríalle a regra interna
    // a `evaluateCondition`, cuxo switch non a recoñece, e devolvería
    // `undefined` (falso) — o nodo quedaría mudo para sempre SEN erro.
    // A validación é a barreira que impide que ese documento entre.
    const conNido = {
      ...validTree,
      nodes: [
        ...validTree.nodes,
        {
          id: 'aniñado',
          type: 'small',
          label: { gl: 'Aniñado' },
          position: { x: 999, y: 999 },
          prerequisites: {
            type: 'all',
            conditions: [
              { type: 'node_unlocked', nodeId: validTree.nodes[0]?.id },
              { type: 'none', conditions: [{ type: 'node_unlocked', nodeId: 'x' }] },
            ],
          },
        },
      ],
    }
    const r = deserializeDocument(JSON.stringify({ tree: conNido }))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toMatch(/prerequisites/)
  })

  it('compat: TreeDef pelado (sen namespace editor) segue cargando', () => {
    const r = deserializeDocument(JSON.stringify(validTree))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.meta.formatVersion).toBe('1.0.0')
  })
})
// ── FIN: tests serialize ──
