// ── INICIO: anti-podrecemento da galería (7.15, Cambio 3) ──
// Cada *.json de examples/gallery/ DEBE pasar deserializeDocument.
// A galería de ouro non pode mentir: se un cambio de schema a rompe,
// este test dío antes de que o descubra un consumidor externo.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { deserializeDocument } from '@yggdrasil-forge/editor-core'
import { BUILTIN_ICONS, FORGE_ICONS, LOGIC_ICONS, NORSE_ICONS } from '@yggdrasil-forge/react'
import { describe, expect, it } from 'vitest'

const GALLERY = join(__dirname, '..', '..', '..', 'examples', 'gallery')

describe('7.15-C3 — galería de ouro: todo ficheiro é importable', () => {
  const files = readdirSync(GALLERY).filter((f) => f.endsWith('.json'))

  it('a galería ten os tres exemplos canónicos', () => {
    expect(files).toEqual(
      expect.arrayContaining(['minimal.json', 'panadeiro.json', 'adversarial.json']),
    )
  })

  for (const file of files) {
    it(`${file} pasa deserializeDocument → ok`, () => {
      const text = readFileSync(join(GALLERY, file), 'utf8')
      const result = deserializeDocument(text)
      expect(
        result.ok,
        result.ok ? undefined : `(${file}) ${(result as { error: Error }).error.message}`,
      ).toBe(true)
    })
  }

  it('★ 7.19 — gaia-cards é o escaparate da estética por declaración', () => {
    // O README promete: TODOS os nodos con icona logic-* e o preset
    // neon aplicado. Se unha rexeneración o perde, este test dío.
    const result = deserializeDocument(readFileSync(join(GALLERY, 'gaia-cards.json'), 'utf8'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const doc = result.value
    expect(doc.meta.theme?.preset).toBe('neon')
    // Spec completo, non só o id (a vía robusta para xeradores).
    expect(Object.keys(doc.meta.theme?.nodeFills ?? {})).toHaveLength(5)
    for (const node of doc.tree.nodes) {
      expect(node.icon, node.id).toMatch(/^logic-/)
    }
    // 12 iconas DISTINTAS — mostrario, non papel tapiz.
    expect(new Set(doc.tree.nodes.map((n) => n.icon)).size).toBe(doc.tree.nodes.length)
  })
})
// ── FIN: anti-podrecemento ──

// ── 19.3: as iconas da galería teñen que EXISTIR ──
// Un id que non está no rexistro non falla: o nodo pinta o texto do id
// como fallback. Cazouse así un `norse-sowilo` (o real é
// `norse-rune-sowilo`) que levaba sen detectar nun render novo. Como a
// galería é o corpus de few-shot, unha icona inventada aquí ensínalle a
// un xerador a inventalas.
describe('★ 19.3 — toda icona de rexistro usada na galería existe', () => {
  const REXISTRADAS = new Set<string>([
    ...Object.keys(BUILTIN_ICONS),
    ...Object.keys(NORSE_ICONS),
    ...Object.keys(LOGIC_ICONS),
    ...Object.keys(FORGE_ICONS),
  ])
  // Só se comproban os ids con prefixo de set: `icon` tamén acepta emoji,
  // URL e data-URI, e eses non pasan por aquí.
  const ehIdDeSet = (v: unknown): v is string =>
    typeof v === 'string' && /^(builtin|norse|logic|forge)-/.test(v)

  for (const file of readdirSync(GALLERY).filter((f) => f.endsWith('.json'))) {
    it(`${file} non usa ningunha icona inventada`, () => {
      const result = deserializeDocument(readFileSync(join(GALLERY, file), 'utf8'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const tree = result.value.tree
      const usadas = [
        ...tree.nodes.map((n) => n.icon),
        ...(tree.resources ?? []).map((r) => r.icon),
      ].filter(ehIdDeSet)
      const inventadas = [...new Set(usadas)].filter((id) => !REXISTRADAS.has(id))
      expect(inventadas, `(${file}) iconas que non están en ningún set`).toEqual([])
    })
  }
})
