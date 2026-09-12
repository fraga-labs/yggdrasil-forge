// ── INICIO: tests de PathBuilder ──
import { describe, expect, it } from 'vitest'
import type { LayoutResult } from '../../../src/engine/layouts/LayoutResult.js'
import { buildPaths } from '../../../src/engine/layouts/PathBuilder.js'

/** Helper: LayoutResult mínimo con edges. */
function makeLR(
  edges: Array<[string, { x: number; y: number }, { x: number; y: number }]>,
): LayoutResult {
  const nodes = new Map<string, { x: number; y: number }>()
  const edgeMap = new Map<string, { points: readonly { x: number; y: number }[] }>()
  for (const [id, source, target] of edges) {
    edgeMap.set(id, { points: [source, target] })
    nodes.set(`s_${id}`, source)
    nodes.set(`t_${id}`, target)
  }
  return {
    nodes,
    edges: edgeMap,
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    layoutType: 'test',
  }
}

const EDGE = [['e1', { x: 0, y: 0 }, { x: 10, y: 100 }]] as const

describe('buildPaths', () => {
  // straight
  it("'straight': 2 puntos, kind='line'", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'straight')
    const ep = lr.edges.get('e1')
    expect(ep?.points).toHaveLength(2)
    expect(ep?.kind).toBe('line')
  })

  it("'straight': múltiples edges transformados", () => {
    const lr = buildPaths(
      makeLR([
        ['e1', { x: 0, y: 0 }, { x: 10, y: 10 }],
        ['e2', { x: 5, y: 5 }, { x: 20, y: 20 }],
      ]),
      'straight',
    )
    expect(lr.edges.size).toBe(2)
    expect(lr.edges.get('e1')?.kind).toBe('line')
    expect(lr.edges.get('e2')?.kind).toBe('line')
  })

  it('edge con < 2 puntos: preservado intacto', () => {
    const input: LayoutResult = {
      nodes: new Map([['a', { x: 0, y: 0 }]]),
      edges: new Map([['e1', { points: [{ x: 0, y: 0 }] }]]),
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      layoutType: 'test',
    }
    const lr = buildPaths(input, 'diagonal-vertical')
    expect(lr.edges.get('e1')?.points).toHaveLength(1)
  })

  // diagonal-vertical
  it("'diagonal-vertical': 4 puntos cubic", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'diagonal-vertical')
    const ep = lr.edges.get('e1')
    expect(ep?.points).toHaveLength(4)
    expect(ep?.kind).toBe('cubic')
  })

  it("'diagonal-vertical': control points con tangentes verticais", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'diagonal-vertical')
    const pts = lr.edges.get('e1')?.points ?? []
    // c1.x === source.x, c2.x === target.x
    expect(pts[1]?.x).toBe(0)
    expect(pts[2]?.x).toBe(10)
  })

  it("'diagonal-vertical': tension default 0.5", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'diagonal-vertical')
    const pts = lr.edges.get('e1')?.points ?? []
    // c1.y = 0 + 100 * 0.5 = 50
    expect(pts[1]?.y).toBeCloseTo(50, 5)
  })

  it("'diagonal-vertical': tension custom", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'diagonal-vertical', {
      tension: 0.3,
    })
    const pts = lr.edges.get('e1')?.points ?? []
    expect(pts[1]?.y).toBeCloseTo(30, 5)
  })

  // diagonal-horizontal
  it("'diagonal-horizontal': 4 puntos cubic con tangentes horizontais", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'diagonal-horizontal')
    const pts = lr.edges.get('e1')?.points ?? []
    expect(pts).toHaveLength(4)
    expect(lr.edges.get('e1')?.kind).toBe('cubic')
    // c1.y === source.y, c2.y === target.y
    expect(pts[1]?.y).toBe(0)
    expect(pts[2]?.y).toBe(100)
  })

  // radial
  it("'radial': 4 puntos cubic", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'radial')
    const ep = lr.edges.get('e1')
    expect(ep?.points).toHaveLength(4)
    expect(ep?.kind).toBe('cubic')
  })

  // orthogonal
  it("'orthogonal' cornerRatio 0.5: 4 puntos S-shape polyline", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'orthogonal')
    const ep = lr.edges.get('e1')
    expect(ep?.points).toHaveLength(4)
    expect(ep?.kind).toBe('polyline')
  })

  it("'orthogonal' cornerRatio 0: 3 puntos L-shape", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'orthogonal', {
      cornerRatio: 0,
    })
    const ep = lr.edges.get('e1')
    expect(ep?.points).toHaveLength(3)
    expect(ep?.kind).toBe('polyline')
  })

  it("'orthogonal' cornerRatio 1: 3 puntos L-shape inverso", () => {
    const lr = buildPaths(makeLR([...EDGE]), 'orthogonal', {
      cornerRatio: 1,
    })
    const ep = lr.edges.get('e1')
    expect(ep?.points).toHaveLength(3)
    expect(ep?.kind).toBe('polyline')
  })

  // octilinear (briefing 1)
  it("'octilinear' dominante-H (100,40): [(0,0),(60,0),(100,40)]", () => {
    const lr = buildPaths(makeLR([['e1', { x: 0, y: 0 }, { x: 100, y: 40 }]]), 'octilinear')
    const ep = lr.edges.get('e1')
    expect(ep?.kind).toBe('polyline')
    expect(ep?.points).toEqual([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 100, y: 40 },
    ])
  })

  it("'octilinear' dominante-V (40,100): [(0,0),(0,60),(40,100)]", () => {
    const lr = buildPaths(makeLR([['e1', { x: 0, y: 0 }, { x: 40, y: 100 }]]), 'octilinear')
    const ep = lr.edges.get('e1')
    expect(ep?.kind).toBe('polyline')
    expect(ep?.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 60 },
      { x: 40, y: 100 },
    ])
  })

  it("'octilinear' aliñado H (100,0): degenera a 2 puntos [source,target]", () => {
    const lr = buildPaths(makeLR([['e1', { x: 0, y: 0 }, { x: 100, y: 0 }]]), 'octilinear')
    const ep = lr.edges.get('e1')
    expect(ep?.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])
  })

  it("'octilinear' aliñado V (0,100): degenera a 2 puntos [source,target]", () => {
    const lr = buildPaths(makeLR([['e1', { x: 0, y: 0 }, { x: 0, y: 100 }]]), 'octilinear')
    const ep = lr.edges.get('e1')
    expect(ep?.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ])
  })

  it("'octilinear': todos os segmentos teñen pendente múltiplo de 45° (0, ±1, ∞)", () => {
    const cases: Array<[number, number]> = [
      [100, 40],
      [40, 100],
      [-100, 40],
      [40, -100],
      [-100, -40],
      [-40, -100],
      [50, 50],
    ]
    for (const [dx, dy] of cases) {
      const lr = buildPaths(makeLR([['e1', { x: 0, y: 0 }, { x: dx, y: dy }]]), 'octilinear')
      const points = lr.edges.get('e1')?.points ?? []
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1] as { x: number; y: number }
        const b = points[i] as { x: number; y: number }
        const sdx = b.x - a.x
        const sdy = b.y - a.y
        // Pendente válida: 0 (horizontal), ∞ (vertical) ou ±1 (45°).
        const isHorizontal = Math.abs(sdy) < 1e-6
        const isVertical = Math.abs(sdx) < 1e-6
        const is45 = Math.abs(Math.abs(sdx) - Math.abs(sdy)) < 1e-6
        expect(
          isHorizontal || isVertical || is45,
          `dx=${dx} dy=${dy} segmento (${a.x},${a.y})→(${b.x},${b.y}) non é 0/∞/±1`,
        ).toBe(true)
      }
    }
  })

  // inmutabilidade
  it('input layoutResult non modificado', () => {
    const input = makeLR([...EDGE])
    const origEdges = input.edges
    buildPaths(input, 'diagonal-vertical')
    expect(input.edges).toBe(origEdges)
  })

  it('nodes, bounds, layoutType, mesh preservados', () => {
    const input: LayoutResult = {
      ...makeLR([...EDGE]),
      mesh: [{ type: 'circle', center: { x: 0, y: 0 }, radius: 50 }],
    }
    const lr = buildPaths(input, 'diagonal-vertical')
    expect(lr.nodes).toBe(input.nodes)
    expect(lr.bounds).toBe(input.bounds)
    expect(lr.layoutType).toBe(input.layoutType)
    expect(lr.mesh).toBe(input.mesh)
  })

  // edge cases
  it('edges baleiro: output con edges baleiro', () => {
    const input: LayoutResult = {
      nodes: new Map(),
      edges: new Map(),
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      layoutType: 'test',
    }
    const lr = buildPaths(input, 'straight')
    expect(lr.edges.size).toBe(0)
  })

  it('tension > 1: cero erro', () => {
    const lr = buildPaths(makeLR([...EDGE]), 'diagonal-vertical', {
      tension: 2,
    })
    expect(lr.edges.get('e1')?.points).toHaveLength(4)
  })

  it('tension negativo: cero erro', () => {
    const lr = buildPaths(makeLR([...EDGE]), 'diagonal-vertical', {
      tension: -0.5,
    })
    expect(lr.edges.get('e1')?.points).toHaveLength(4)
  })

  // determinismo
  it('determinismo: mesma entrada = mesma saída', () => {
    const input = makeLR([...EDGE])
    const r1 = buildPaths(input, 'diagonal-vertical')
    const r2 = buildPaths(input, 'diagonal-vertical')
    expect(r1.edges.get('e1')?.points).toEqual(r2.edges.get('e1')?.points)
  })
})
// ── FIN: tests de PathBuilder ──

// ── 19.5: 'arc' — o único estilo sen nesgo de dirección ──
// Os cinco anteriores asumen unha orientación dominante; nunha MALLA, con
// arestas a todas as direccións, iso produce S raros nas perpendiculares
// ao nesgo. 'arc' depende só da propia aresta.
describe("★ 19.5 — buildPaths 'arc'", () => {
  const p = (id: string, lr = makeLR([[id, { x: 0, y: 0 }, { x: 300, y: 0 }]])) =>
    buildPaths(lr, 'arc').edges.get(id)

  it('devolve cubic con catro puntos', () => {
    const path = p('e')
    expect(path?.kind).toBe('cubic')
    expect(path?.points).toHaveLength(4)
  })

  it('★ a combadura é PERPENDICULAR ao segmento e proporcional (12% por defecto)', () => {
    // Aresta horizontal de 300: os controis desprázanse 36 en Y (0.12·300)
    // e nada fóra do eixe perpendicular.
    const path = p('e')
    const [p0, c1, c2, p3] = path?.points ?? []
    expect(p0).toEqual({ x: 0, y: 0 })
    expect(p3).toEqual({ x: 300, y: 0 })
    expect(c1?.y).toBeCloseTo(36, 5)
    expect(c2?.y).toBeCloseTo(36, 5)
    // Os controis reparten o tramo en tercios.
    expect(c1?.x).toBeCloseTo(100, 5)
    expect(c2?.x).toBeCloseTo(200, 5)
  })

  it('★ sen nesgo de dirección: unha vertical combase igual ca unha horizontal', () => {
    const vert = buildPaths(makeLR([['v', { x: 0, y: 0 }, { x: 0, y: 300 }]]), 'arc').edges.get('v')
    const [, c1] = vert?.points ?? []
    // Mesma magnitude (36), agora no eixe X.
    expect(Math.abs(c1?.x ?? 0)).toBeCloseTo(36, 5)
    expect(c1?.y).toBeCloseTo(100, 5)
  })

  it('★ `arcMaxBow` acouta: unha aresta longuísima non se volve unha bóveda', () => {
    const lr = makeLR([['l', { x: 0, y: 0 }, { x: 4000, y: 0 }]])
    const sen = buildPaths(lr, 'arc').edges.get('l')
    const con = buildPaths(lr, 'arc', { arcMaxBow: 40 }).edges.get('l')
    // Sen tope: 0.12·4000 = 480, pero o default xa acouta a 90.
    expect(sen?.points[1]?.y).toBeCloseTo(90, 5)
    expect(con?.points[1]?.y).toBeCloseTo(40, 5)
  })

  it('aresta degenerada (mesmo punto) → recta, sen dividir por cero', () => {
    const path = buildPaths(makeLR([['d', { x: 7, y: 7 }, { x: 7, y: 7 }]]), 'arc').edges.get('d')
    expect(path?.kind).toBe('line')
    expect(path?.points).toHaveLength(2)
  })

  it('determinista: a mesma aresta combase sempre ao mesmo lado', () => {
    const lr = makeLR([['e', { x: 10, y: 20 }, { x: 210, y: 120 }]])
    expect(buildPaths(lr, 'arc').edges.get('e')).toEqual(buildPaths(lr, 'arc').edges.get('e'))
  })
})
