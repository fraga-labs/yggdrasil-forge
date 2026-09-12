// ── INICIO: tests helpers de render (7.17, Cambios 0 e utilidade SVG) ──
import { describe, expect, it } from 'vitest'
import { standaloneSvg } from '../src/svg/standaloneSvg.js'
import {
  themeOverridesFromSpec,
  themeSizesFromSpec,
  themeTypographyFromSpec,
} from '../src/theme/themeOverridesFromSpec.js'

describe('7.17-C0 — themeOverridesFromSpec', () => {
  it('nodeFills parciais mapean aos campos nodeFill<Estado>', () => {
    const overrides = themeOverridesFromSpec(
      { nodeFills: { locked: '#111111', maxed: '#222222' } },
      false,
    )
    expect(overrides).toEqual({ nodeFillLocked: '#111111', nodeFillMaxed: '#222222' })
  })

  it('textColor ten prioridade e mapea a text', () => {
    const overrides = themeOverridesFromSpec({ textColor: '#e8dcc0' }, false)
    expect(overrides).toEqual({ text: '#e8dcc0' })
  })

  it('spec undefined → sen overrides (a base manda)', () => {
    expect(themeOverridesFromSpec(undefined, false)).toEqual({})
  })

  it('base escura: os overrides do documento son os MESMOS (gañan sempre)', () => {
    const spec = { textColor: '#fff', nodeFills: { unlocked: '#c9a24b' } }
    expect(themeOverridesFromSpec(spec, true)).toEqual(themeOverridesFromSpec(spec, false))
  })
})

describe('19.0 — aneis e arestas viaxan no documento', () => {
  it('nodeRings mapea aos tokens node<Estado> (os que o renderer le)', () => {
    const overrides = themeOverridesFromSpec(
      { nodeRings: { locked: '#1a1a1a', maxed: '#c1272d' } },
      false,
    )
    expect(overrides).toEqual({ nodeLocked: '#1a1a1a', nodeMaxed: '#c1272d' })
  })

  it('★ nodeRings NON escribe en `nodeStroke` (token morto da base)', () => {
    const overrides = themeOverridesFromSpec({ nodeRings: { locked: '#1a1a1a' } }, false)
    expect(overrides.nodeStroke).toBeUndefined()
  })

  it('corpo e anel son eixes independentes: nodeFills e nodeRings conviven', () => {
    const overrides = themeOverridesFromSpec(
      { nodeFills: { maxed: '#2a0d10' }, nodeRings: { maxed: '#c1272d' } },
      false,
    )
    expect(overrides).toEqual({ nodeFillMaxed: '#2a0d10', nodeMaxed: '#c1272d' })
  })

  it('edges mapean a edge/edgeActive', () => {
    const overrides = themeOverridesFromSpec(
      { edges: { color: '#5a1f1f', active: '#c1272d' } },
      false,
    )
    expect(overrides).toEqual({ edge: '#5a1f1f', edgeActive: '#c1272d' })
  })

  it('edges parcial: só `color` non inventa `edgeActive` (o renderer xa cae a edge)', () => {
    expect(themeOverridesFromSpec({ edges: { color: '#5a1f1f' } }, false)).toEqual({
      edge: '#5a1f1f',
    })
  })

  it('★ non regresión: un spec previo ao 19.0 dá exactamente os mesmos overrides', () => {
    const antigo = { textColor: '#e8dcc0', nodeFills: { maxed: '#e6c96d' } }
    expect(themeOverridesFromSpec(antigo, false)).toEqual({
      text: '#e8dcc0',
      nodeFillMaxed: '#e6c96d',
    })
  })
})

describe('19.0 — themeTypographyFromSpec', () => {
  it('mapea os catro tokens tal cal', () => {
    expect(
      themeTypographyFromSpec({
        typography: {
          fontFamily: 'Cinzel, serif',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      }),
    ).toEqual({
      fontFamily: 'Cinzel, serif',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    })
  })

  it('★ sen tipografía → undefined, para NON tapar a da base', () => {
    expect(themeTypographyFromSpec(undefined)).toBeUndefined()
    expect(themeTypographyFromSpec({ textColor: '#fff' })).toBeUndefined()
    // Obxecto presente pero baleiro: tampouco hai nada que impoñer.
    expect(themeTypographyFromSpec({ typography: {} })).toBeUndefined()
  })

  it('parcial: só viaxa o declarado', () => {
    expect(themeTypographyFromSpec({ typography: { fontFamily: 'Orbitron, sans-serif' } })).toEqual(
      {
        fontFamily: 'Orbitron, sans-serif',
      },
    )
  })
})

describe('7.17 — standaloneSvg', () => {
  const base = '<svg viewBox="-10 -20 100 50"><g><circle r="5" fill="#123456"/></g></svg>'

  it('engade xmlns, width/height do viewBox, fonte e fondo', () => {
    const result = standaloneSvg(base, { background: '#0a0d14' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const svg = result.value
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="100"')
    expect(svg).toContain('height="50"')
    expect(svg).toContain('font-family:')
    // O rect de fondo cobre o viewBox e vai PRIMEIRO.
    expect(svg).toMatch(
      /<svg [^>]*><rect x="-10" y="-20" width="100" height="50" fill="#0a0d14"\/>/,
    )
  })

  it('width pedido escala mantendo o aspecto', () => {
    const result = standaloneSvg(base, { width: 400 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toContain('width="400"')
    expect(result.value).toContain('height="200"')
  })

  it('respecta un xmlns xa presente (non duplica)', () => {
    const withNs = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>'
    const result = standaloneSvg(withNs)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.match(/xmlns=/g)).toHaveLength(1)
  })

  it('★ var(-- sen resolver → erro honesto (nunca un ficheiro roto)', () => {
    const dirty = '<svg viewBox="0 0 10 10"><text fill="var(--editor-code-key)">x</text></svg>'
    const result = standaloneSvg(dirty)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch(/autocontido/)
  })

  it('sen viewBox → erro honesto', () => {
    expect(standaloneSvg('<svg width="10"></svg>').ok).toBe(false)
  })

  it('determinista: mesma entrada → mesma saída', () => {
    const a = standaloneSvg(base, { background: '#fff', width: 300 })
    const b = standaloneSvg(base, { background: '#fff', width: 300 })
    expect(a).toEqual(b)
  })
})

describe('19.4 — tamaños e iconas: a terceira rama do tema', () => {
  it('★ os cinco tamaños viaxan, incluído labelMinRadius', () => {
    expect(
      themeSizesFromSpec({
        sizes: {
          strokeWidth: 1.3,
          ringWidth: 1.4,
          fontSize: 13,
          maxLabelChars: 18,
          labelMinRadius: 20,
        },
      }),
    ).toEqual({
      strokeWidth: 1.3,
      ringWidth: 1.4,
      fontSize: 13,
      maxLabelChars: 18,
      labelMinRadius: 20,
    })
  })

  it('★ sen `sizes` → undefined, para NON tapar a base', () => {
    expect(themeSizesFromSpec(undefined)).toBeUndefined()
    expect(themeSizesFromSpec({ textColor: '#fff' })).toBeUndefined()
    expect(themeSizesFromSpec({ sizes: {} })).toBeUndefined()
  })

  it('iconColor mapea a `icon` (a cor propia das iconas)', () => {
    expect(themeOverridesFromSpec({ iconColor: '#9a9276' }, false)).toEqual({ icon: '#9a9276' })
  })

  it('★ iconColor e textColor son independentes: a icona pode ser máis apagada', () => {
    expect(themeOverridesFromSpec({ textColor: '#f0e6d2', iconColor: '#9a9276' }, false)).toEqual({
      text: '#f0e6d2',
      icon: '#9a9276',
    })
  })
})
// ── FIN: tests helpers de render ──
