// ── INICIO: tests soft validators ──
import { isEffectSupported, supportManifest } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { EditorEngine } from '../src/EditorEngine.js'
import { addNode } from '../src/command/commands/index.js'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { hasErrors } from '../src/validation/Validator.js'
import { createDefaultValidators } from '../src/validation/createDefaultValidators.js'
import { asymmetricExclusionValidator } from '../src/validation/soft/asymmetricExclusionValidator.js'
import { layoutOverflowValidator } from '../src/validation/soft/layoutOverflowValidator.js'
import { prerequisiteCycleValidator } from '../src/validation/soft/prerequisiteCycleValidator.js'
import { unsupportedFeatureValidator } from '../src/validation/soft/unsupportedFeatureValidator.js'
import { minimalTreeDef } from './_fixtures.js'

// ── Helper: clonar fixture e patchear ─────────────────────────────
function docWith(
  patch: (tree: ReturnType<typeof minimalTreeDef>) => void,
): ReturnType<typeof createEditorDocument> {
  const tree = minimalTreeDef()
  patch(tree)
  return createEditorDocument(tree)
}

describe('asymmetricExclusionValidator', () => {
  it('exclusión asimétrica → 1 warning', () => {
    const doc = docWith((tree) => {
      const a = tree.nodes.find((n) => n.id === 'root')
      const b = tree.nodes.find((n) => n.id === 'child')
      if (a !== undefined) (a as { exclusions?: string[] }).exclusions = ['child']
      // 'b' non ten 'root' en exclusions → asimétrico
      void b
    })
    const issues = asymmetricExclusionValidator(doc)
    expect(issues.length).toBe(1)
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.code).toBe('EXCL_ASYMMETRIC')
    expect(issues[0]?.nodeId).toBe('root')
  })

  it('exclusión simétrica → 0 issues', () => {
    const doc = docWith((tree) => {
      const a = tree.nodes.find((n) => n.id === 'root')
      const b = tree.nodes.find((n) => n.id === 'child')
      if (a !== undefined) (a as { exclusions?: string[] }).exclusions = ['child']
      if (b !== undefined) (b as { exclusions?: string[] }).exclusions = ['root']
    })
    expect(asymmetricExclusionValidator(doc).length).toBe(0)
  })

  it('sen exclusións → 0 issues', () => {
    const doc = createEditorDocument(minimalTreeDef())
    expect(asymmetricExclusionValidator(doc).length).toBe(0)
  })
})

describe('prerequisiteCycleValidator', () => {
  it('A→B→A: ciclo detectado, warning nos dous nodos', () => {
    const doc = docWith((tree) => {
      const a = tree.nodes.find((n) => n.id === 'root')
      const b = tree.nodes.find((n) => n.id === 'child')
      // root require child
      if (a !== undefined) {
        ;(a as { prerequisites?: unknown }).prerequisites = {
          type: 'node_unlocked',
          nodeId: 'child',
        }
      }
      // child require root
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = {
          type: 'node_unlocked',
          nodeId: 'root',
        }
      }
    })
    const issues = prerequisiteCycleValidator(doc)
    expect(issues.length).toBe(2)
    expect(issues.every((i) => i.code === 'PREREQ_CYCLE')).toBe(true)
    expect(issues.every((i) => i.severity === 'warning')).toBe(true)
    const ids = new Set(issues.map((i) => i.nodeId))
    expect(ids.has('root')).toBe(true)
    expect(ids.has('child')).toBe(true)
  })

  it('DAG (sen ciclos) → 0 issues', () => {
    const doc = docWith((tree) => {
      const b = tree.nodes.find((n) => n.id === 'child')
      // child require root: válido, non hai ciclo.
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = {
          type: 'node_unlocked',
          nodeId: 'root',
        }
      }
    })
    expect(prerequisiteCycleValidator(doc).length).toBe(0)
  })

  it('ciclo a través de all/any composables', () => {
    const doc = docWith((tree) => {
      const a = tree.nodes.find((n) => n.id === 'root')
      const b = tree.nodes.find((n) => n.id === 'child')
      // root require all(node_unlocked('child'), ...)
      if (a !== undefined) {
        ;(a as { prerequisites?: unknown }).prerequisites = {
          type: 'all',
          conditions: [{ type: 'node_unlocked', nodeId: 'child' }],
        }
      }
      // child require any(node_unlocked('root'))
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = {
          type: 'any',
          conditions: [{ type: 'node_unlocked', nodeId: 'root' }],
        }
      }
    })
    const issues = prerequisiteCycleValidator(doc)
    expect(issues.length).toBe(2)
  })

  // ── 19.10: semántica de satisfacibilidade ──
  //
  // O validador vello achataba `all`/`any`/`none` nun só grafo e
  // buscaba ciclos. Iso daba 72 avisos no atlas da galería, que é
  // correcto: as súas comarcas son aneis onde cada nodo pide
  // `any(porta, anterior)`, un ciclo formal cunha saída sempre aberta.

  it('★★ un `any` cunha SAÍDA non é un bloqueo: cero avisos', () => {
    const doc = docWith((tree) => {
      // O patrón exacto do atlas: child pide «a porta OU o anterior», e
      // aquí o anterior é el mesmo (o anel). A porta (root) está aberta.
      const b = tree.nodes.find((n) => n.id === 'child')
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = {
          type: 'any',
          conditions: [
            { type: 'node_unlocked', nodeId: 'root' },
            { type: 'node_unlocked', nodeId: 'child' },
          ],
        }
      }
    })
    expect(prerequisiteCycleValidator(doc)).toEqual([])
  })

  it('★ un `none` nunca bloquea: cúmprese NON desbloqueando', () => {
    const doc = docWith((tree) => {
      const b = tree.nodes.find((n) => n.id === 'child')
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = {
          type: 'none',
          conditions: [{ type: 'node_unlocked', nodeId: 'child' }],
        }
      }
    })
    expect(prerequisiteCycleValidator(doc)).toEqual([])
  })

  it('★ unha condición que non fala de nodos (recursos) non bloquea', () => {
    const doc = docWith((tree) => {
      const b = tree.nodes.find((n) => n.id === 'child')
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = {
          type: 'all',
          conditions: [{ type: 'resource_min', resourceId: 'ouro', amount: 10 }],
        }
      }
    })
    expect(prerequisiteCycleValidator(doc)).toEqual([])
  })

  it('★ un `any` SEN condicións si é un bloqueo: nada o pode cumprir', () => {
    const doc = docWith((tree) => {
      const b = tree.nodes.find((n) => n.id === 'child')
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = { type: 'any', conditions: [] }
      }
    })
    const issues = prerequisiteCycleValidator(doc)
    expect(issues.map((i) => i.nodeId)).toEqual(['child'])
  })

  it('★★ tamén avisa de quen PENDE dun bloqueo, non só dos do ciclo', () => {
    // Mellora sobre o DFS anterior, que marcaba os membros do ciclo e
    // deixaba fóra os que colgaban del: eses tampouco poden abrirse.
    const tree = minimalTreeDef()
    tree.nodes.push({
      id: 'neto',
      type: 'small',
      label: 'Neto',
      position: { x: 200, y: 0 },
      prerequisites: { type: 'node_unlocked', nodeId: 'child' },
    } as never)
    const a = tree.nodes.find((n) => n.id === 'root')
    const b = tree.nodes.find((n) => n.id === 'child')
    if (a !== undefined) {
      ;(a as { prerequisites?: unknown }).prerequisites = {
        type: 'node_unlocked',
        nodeId: 'child',
      }
    }
    if (b !== undefined) {
      ;(b as { prerequisites?: unknown }).prerequisites = { type: 'node_unlocked', nodeId: 'root' }
    }
    const ids = new Set(prerequisiteCycleValidator(createEditorDocument(tree)).map((i) => i.nodeId))
    expect(ids).toEqual(new Set(['root', 'child', 'neto']))
  })

  it('a mensaxe vai nos dous idiomas (a saída do CLI resólvea)', () => {
    const doc = docWith((tree) => {
      const b = tree.nodes.find((n) => n.id === 'child')
      if (b !== undefined) {
        ;(b as { prerequisites?: unknown }).prerequisites = {
          type: 'node_unlocked',
          nodeId: 'child',
        }
      }
    })
    const m = prerequisiteCycleValidator(doc)[0]?.message as { gl?: string; en?: string }
    expect(m.gl).toBeTruthy()
    expect(m.en).toBeTruthy()
  })
})

describe('layoutOverflowValidator', () => {
  it('nodo fóra de coordinateBounds → 1 info', () => {
    const tree = minimalTreeDef()
    const doc = createEditorDocument(tree, {
      coordinateBounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 },
    })
    // root=(0,0) dentro; child=(100,0) FÓRA.
    const issues = layoutOverflowValidator(doc)
    expect(issues.length).toBe(1)
    expect(issues[0]?.severity).toBe('info')
    expect(issues[0]?.code).toBe('LAYOUT_OVERFLOW')
    expect(issues[0]?.nodeId).toBe('child')
  })

  it('todos dentro do box → 0 issues', () => {
    const tree = minimalTreeDef()
    const doc = createEditorDocument(tree, {
      coordinateBounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
    })
    expect(layoutOverflowValidator(doc).length).toBe(0)
  })

  it('sen coordinateBounds → 0 issues (non hai como medir)', () => {
    const doc = createEditorDocument(minimalTreeDef())
    expect(layoutOverflowValidator(doc).length).toBe(0)
  })
})

describe('unsupportedFeatureValidator', () => {
  it('nodo con modify_stat → warning citando o motor', () => {
    const doc = docWith((tree) => {
      const a = tree.nodes.find((n) => n.id === 'root')
      if (a !== undefined) {
        ;(a as { effects?: unknown[] }).effects = [
          { type: 'modify_stat', statId: 's', op: '+', amount: 1 },
        ]
      }
    })
    const issues = unsupportedFeatureValidator(doc)
    expect(issues.length).toBe(1)
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.code).toBe('FEATURE_UNSUPPORTED')
    expect(issues[0]?.message.en).toContain('modify_stat')
  })

  it('nodo con modify_resource (soportado) → 0 issues', () => {
    const doc = docWith((tree) => {
      const a = tree.nodes.find((n) => n.id === 'root')
      if (a !== undefined) {
        ;(a as { effects?: unknown[] }).effects = [
          { type: 'modify_resource', resourceId: 'gold', op: '+', amount: 5 },
        ]
      }
    })
    expect(unsupportedFeatureValidator(doc).length).toBe(0)
  })

  it('le o supportManifest real de @core (non unha copia)', () => {
    // Verificación: cambiar a sinatura do manifesto rompería este test
    // se houbera unha copia local divergente.
    expect(isEffectSupported('modify_resource')).toBe(true)
    expect(isEffectSupported('modify_stat')).toBe(false)
    expect(Object.keys(supportManifest.effects)).toContain('modify_resource')
    expect(Object.keys(supportManifest.effects)).not.toContain('modify_stat')
  })
})

describe('createDefaultValidators — integración co EditorEngine', () => {
  it('devolve os 5 soft validators (non duplica os duros)', () => {
    const validators = createDefaultValidators()
    expect(validators.length).toBe(5)
  })

  it('commit con dato asimétrico: ok (non bloquea), warning en getIssues()', () => {
    const tree = minimalTreeDef()
    const a = tree.nodes.find((n) => n.id === 'root')
    if (a !== undefined) (a as { exclusions?: string[] }).exclusions = ['child']
    const doc = createEditorDocument(tree)
    const engine = new EditorEngine(doc, { validators: createDefaultValidators() })
    // O documento inicial xa ten o warning.
    const initialIssues = engine.getIssues()
    expect(initialIssues.some((i) => i.code === 'EXCL_ASYMMETRIC')).toBe(true)
    expect(hasErrors(initialIssues)).toBe(false)
  })

  it('id duplicado segue bloqueando (duro), aínda con soft validators activos', () => {
    const doc = createEditorDocument(minimalTreeDef())
    const engine = new EditorEngine(doc, { validators: createDefaultValidators() })
    const dup = {
      id: 'root',
      type: 'small',
      label: { en: 'Duplicate' },
      position: { x: 50, y: 50 },
    }
    const result = engine.dispatch(addNode(dup as Parameters<typeof addNode>[0]))
    expect(result.ok).toBe(false)
  })
})
// ── 19.10: as mensaxes van nos DOUS idiomas ──
//
// Deixaron de ser só cousa do editor: desde 19.10 `ygg validate` tamén
// as imprime, e o idioma por defecto do proxecto é o galego. Había once
// mensaxes só en inglés, así que un usuario galego vía o panel Problemas
// e a saída do CLI en dous idiomas mesturados. Esta garda existe para
// que unha mensaxe nova non naza outra vez a medias.

describe('★ 19.10 — toda mensaxe de validación ten `gl` e `en`', () => {
  /** Documento que dispara os cinco validadores soft dunha vez. */
  function docEnfermo(): ReturnType<typeof createEditorDocument> {
    const tree = minimalTreeDef()
    tree.resources = [{ id: 'ouro', label: { gl: 'Ouro' }, initial: 5 } as never]
    const a = tree.nodes.find((n) => n.id === 'root')
    const b = tree.nodes.find((n) => n.id === 'child')
    if (a !== undefined) {
      // exclusión asimétrica + custo a un recurso que non existe
      ;(a as { exclusions?: unknown }).exclusions = ['child']
      ;(a as { costPerTier?: unknown }).costPerTier = [[{ resourceId: 'prata', amount: 1 }]]
      // efecto que o motor NON aplica (`modify_stat` está en
      // UNSUPPORTED_EFFECT_TYPES; `custom` como condición SI está
      // soportada, así que non serve para disparar este validador)
      ;(a as { effects?: unknown }).effects = [{ type: 'modify_stat', statId: 'forza', amount: 1 }]
    }
    if (b !== undefined) {
      // bloqueo real: depende de si mesmo
      ;(b as { prerequisites?: unknown }).prerequisites = {
        type: 'node_unlocked',
        nodeId: 'child',
      }
      ;(b as { position?: unknown }).position = { x: 900, y: 0 }
    }
    return createEditorDocument(tree, {
      coordinateBounds: { minX: 0, minY: 0, maxX: 200, maxY: 200 },
    })
  }

  it('★★ os cinco validadores disparan e TODAS as mensaxes traen os dous idiomas', () => {
    const doc = docEnfermo()
    const issues = createDefaultValidators().flatMap((v) => v(doc))
    // Se algún día un validador deixa de disparar aquí, este número
    // avisa de que a proba xa non cobre o que di cubrir.
    expect(issues.length).toBeGreaterThanOrEqual(5)
    const senGl = issues
      .filter((i) => {
        const m = i.message as { gl?: string; en?: string }
        return typeof m.gl !== 'string' || m.gl.length === 0
      })
      .map((i) => i.code)
    expect(senGl).toEqual([])
    const senEn = issues
      .filter((i) => {
        const m = i.message as { gl?: string; en?: string }
        return typeof m.en !== 'string' || m.en.length === 0
      })
      .map((i) => i.code)
    expect(senEn).toEqual([])
  })

  it('★ cóbrense os cinco códigos, non catro por casualidade', () => {
    const codigos = new Set(
      createDefaultValidators()
        .flatMap((v) => v(docEnfermo()))
        .map((i) => i.code),
    )
    expect(codigos).toContain('EXCL_ASYMMETRIC')
    expect(codigos).toContain('PREREQ_CYCLE')
    expect(codigos).toContain('LAYOUT_OVERFLOW')
    expect(codigos).toContain('RES_DANGLING_COST_PER_TIER')
    expect(codigos).toContain('FEATURE_UNSUPPORTED')
  })
})
// ── FIN: tests soft validators ──
