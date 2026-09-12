// ── INICIO: tests de contraste de cor (19.10) ──
// Isto existe por unha regresión MIÑA, cazada mirando as fichas da
// galería unha por unha en vez de só o atlas: ao facer que o nome da
// comarca leve a cor da comarca, o showcase gótico quedou con
// «CLAUSTRO» en #3a2a2a sobre lenzo escuro — invisible. As cores de
// rexión decláranse para tinguir un fondo ao 12% de opacidade, e unha
// cor que vale para iso non ten por que valer para escribir.
//
// O contrato ten DÚAS metades e as dúas importan: corrixir o que non se
// le, e **non tocar** o que si. Se só se cumprise a primeira, o tema
// `neon` perdería o seu magenta e o seu cian, que son a súa identidade.

import { describe, expect, it } from 'vitest'
import { CONTRASTE_MINIMO, corLexible, razonDeContraste } from '../src/colorContrast.js'

const LENZO_ESCURO = '#24262c'
const TEXTO_CLARO = '#e8d5b0'

describe('razonDeContraste', () => {
  it('negro contra branco dá o máximo WCAG (21)', () => {
    expect(razonDeContraste('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('unha cor contra si mesma dá 1', () => {
    expect(razonDeContraste('#3a2a2a', '#3a2a2a')).toBeCloseTo(1, 6)
  })

  it('entende a forma curta de tres díxitos', () => {
    expect(razonDeContraste('#fff', '#ffffff')).toBeCloseTo(1, 6)
  })

  it('cor que non é hex → undefined (non se inventa un número)', () => {
    expect(razonDeContraste('rebeccapurple', '#000000')).toBeUndefined()
    expect(razonDeContraste('rgb(10,10,10)', '#000000')).toBeUndefined()
  })
})

describe('★ corLexible — corrixe o ilexible', () => {
  it('★★ o tinte gótico sobre lenzo escuro sae CAMBIADO e xa se le', () => {
    const tinte = '#3a2a2a'
    expect(razonDeContraste(tinte, LENZO_ESCURO)).toBeLessThan(CONTRASTE_MINIMO)
    const saida = corLexible(tinte, LENZO_ESCURO, TEXTO_CLARO)
    expect(saida).not.toBe(tinte)
    expect(razonDeContraste(saida, LENZO_ESCURO) ?? 0).toBeGreaterThanOrEqual(CONTRASTE_MINIMO)
  })

  it('★ conserva o máximo posible da cor: non salta directo ao texto', () => {
    const saida = corLexible('#3a2a2a', LENZO_ESCURO, TEXTO_CLARO)
    expect(saida).not.toBe(TEXTO_CLARO)
  })

  it('un tinte claro sobre lenzo CLARO tamén se corrixe (vale nos dous sentidos)', () => {
    const saida = corLexible('#f0ead8', '#ffffff', '#2a2a2a')
    expect(razonDeContraste(saida, '#ffffff') ?? 0).toBeGreaterThanOrEqual(CONTRASTE_MINIMO)
  })
})

describe('★ corLexible — ao corrixir consérvase o TON', () => {
  it('★★ un azul segue sendo azul: móvese a luminosidade, non a cor', () => {
    // O primeiro intento mesturaba cara á cor do texto e o azul da
    // escola (#7f9fc0) saía #55595b: lía, pero era un gris. O que se
    // quere é un azul máis escuro.
    const saida = corLexible('#7f9fc0', '#dddddd', '#2a2a2a', CONTRASTE_MINIMO, 0.8)
    const azul = Number.parseInt(saida.slice(5, 7), 16)
    const vermello = Number.parseInt(saida.slice(1, 3), 16)
    expect(azul).toBeGreaterThan(vermello + 20)
  })

  it('★ e un vermello segue sendo vermello sobre lenzo escuro', () => {
    const saida = corLexible('#6b2320', LENZO_ESCURO, TEXTO_CLARO, CONTRASTE_MINIMO, 0.8)
    const vermello = Number.parseInt(saida.slice(1, 3), 16)
    const azul = Number.parseInt(saida.slice(5, 7), 16)
    expect(vermello).toBeGreaterThan(azul + 20)
  })
})

describe('★ corLexible — non toca o que xa se le', () => {
  it('★★ as tres cores do tema `neon` saen INTACTAS', () => {
    // Son a identidade da ficha: se as «arranxase», o cyberpunk deixaría
    // de ser cyberpunk.
    for (const cor of ['#c937b4', '#37e0d8', '#c9a24b']) {
      expect(corLexible(cor, LENZO_ESCURO, TEXTO_CLARO)).toBe(cor)
    }
  })

  it('respecta o mínimo que se lle pase', () => {
    // Cun mínimo absurdo (7, o AAA de texto pequeno) até o magenta cae.
    expect(corLexible('#c937b4', LENZO_ESCURO, TEXTO_CLARO, 7)).not.toBe('#c937b4')
  })
})

describe('★ corLexible — a OPACIDADE conta', () => {
  it('★★ unha cor que pasa sólida pode non pasar ao 80%, e entón corríxese', () => {
    // É o caso real do azul #4a7fa8 sobre o lenzo escuro: sólido dá
    // 3,5:1 e pasa; ao 80% o que se ve é a mestura co fondo e queda en
    // 2,9:1. Medir a sólida sobreestima sempre.
    const azul = '#4a7fa8'
    expect(razonDeContraste(azul, LENZO_ESCURO) ?? 0).toBeGreaterThanOrEqual(CONTRASTE_MINIMO)
    expect(corLexible(azul, LENZO_ESCURO, TEXTO_CLARO, CONTRASTE_MINIMO, 1)).toBe(azul)
    expect(corLexible(azul, LENZO_ESCURO, TEXTO_CLARO, CONTRASTE_MINIMO, 0.8)).not.toBe(azul)
  })

  it('opacidade 1 é o comportamento por defecto (nada implícito)', () => {
    const cor = '#3a2a2a'
    expect(corLexible(cor, LENZO_ESCURO, TEXTO_CLARO)).toBe(
      corLexible(cor, LENZO_ESCURO, TEXTO_CLARO, CONTRASTE_MINIMO, 1),
    )
  })

  it('unha opacidade fóra de rango non rompe o cálculo', () => {
    for (const o of [-1, 0, 2, Number.NaN]) {
      expect(() =>
        corLexible('#3a2a2a', LENZO_ESCURO, TEXTO_CLARO, CONTRASTE_MINIMO, o),
      ).not.toThrow()
    }
  })
})

describe('corLexible — casos de borde', () => {
  it('sen lenzo coñecido devolve o texto (era o comportamento previo a 19.10)', () => {
    expect(corLexible('#c937b4', undefined, TEXTO_CLARO)).toBe(TEXTO_CLARO)
  })

  it('sen cor de comarca devolve o texto', () => {
    expect(corLexible(undefined, LENZO_ESCURO, TEXTO_CLARO)).toBe(TEXTO_CLARO)
  })

  it('cor non-hex devolve o texto: non se pode xulgar, logo non se arrisca', () => {
    expect(corLexible('hsl(280 60% 40%)', LENZO_ESCURO, TEXTO_CLARO)).toBe(TEXTO_CLARO)
  })

  it('★ nun lenzo gris medio ao 80% NADA chega: cae ao texto, e iso é honesto', () => {
    // O límite real do método. Sobre #7f7f7f, un texto translúcido nin
    // aclarando ata o branco nin escurecendo ata o negro alcanza 3:1
    // (a mestura co fondo cómelle o rango). Aí devólvese o texto, que é
    // o que facía o renderer antes de 19.10, en vez de inventar unha
    // cor que tampouco se lería.
    expect(corLexible('#808080', '#7f7f7f', TEXTO_CLARO, CONTRASTE_MINIMO, 0.8)).toBe(TEXTO_CLARO)
  })

  it('★ pero SEN opacidade o mesmo caso si se salva conservando o ton', () => {
    // Mesmo lenzo, texto opaco: xa hai rango, así que non se renuncia á
    // cor. Isto é o que mellorou ao mover luminosidade en vez de
    // mesturar cara ao texto (antes saía un gris).
    const saida = corLexible('#3a6a7c', '#7f7f7f', TEXTO_CLARO, CONTRASTE_MINIMO, 1)
    expect(saida).not.toBe(TEXTO_CLARO)
    expect(razonDeContraste(saida, '#7f7f7f') ?? 0).toBeGreaterThanOrEqual(CONTRASTE_MINIMO)
  })
})
// ── FIN: tests de contraste de cor ──
