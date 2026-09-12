// ── INICIO: contraste de cor (19.10) ──
// Utilidade interna para unha decisión concreta: **cando unha cor de
// DATO se pode usar como cor de TEXTO**.
//
// O caso que a trouxo: desde o 19.10 o nome da comarca píntase coa cor
// da propia comarca (é o trato do mockup do atlas, e no tema `neon`
// queda espectacular). Pero esas cores están declaradas para usarse como
// TINTE de fondo ao 12% de opacidade, non como texto: no showcase
// gótico, «CLAUSTRO» (#3a2a2a) sobre o lenzo escuro non se lía en
// absoluto. Unha cor que vale para tinguir un fondo non ten por que
// valer para escribir.
//
// A regra: se a cor xa contrasta co lenzo, respéctase tal cal — a
// identidade da comarca é o que se quere. Se non, **acláirase ou
// escurécese conservando o TON**, ata que se lea. Só se renuncia á cor
// (caendo á do texto) cando nin no extremo da escala chega.
//
// O primeiro intento mesturaba cara á cor do texto, e iso lía pero
// desaturaba: o azul #7f9fc0 da escola saía #55595b, un gris. Mover a
// luminosidade en HSL mantén o azul azul.

/** Compoñentes sRGB 0-255, ou `undefined` se non se pode ler a cadea. */
function leHex(cor: string): readonly [number, number, number] | undefined {
  const t = cor.trim()
  const curto = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(t)
  if (curto !== null) {
    const [, r, g, b] = curto
    if (r === undefined || g === undefined || b === undefined) return undefined
    return [
      Number.parseInt(r + r, 16),
      Number.parseInt(g + g, 16),
      Number.parseInt(b + b, 16),
    ] as const
  }
  const longo = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(t)
  if (longo === null) return undefined
  const [, r, g, b] = longo
  if (r === undefined || g === undefined || b === undefined) return undefined
  return [Number.parseInt(r, 16), Number.parseInt(g, 16), Number.parseInt(b, 16)] as const
}

/** Luminancia relativa WCAG (0 = negro, 1 = branco). */
function luminancia([r, g, b]: readonly [number, number, number]): number {
  const canle = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canle(r) + 0.7152 * canle(g) + 0.0722 * canle(b)
}

/**
 * Razón de contraste WCAG entre dúas cores (1 = idénticas, 21 = negro
 * contra branco). Devolve `undefined` se algunha non é hex.
 */
export function razonDeContraste(a: string, b: string): number | undefined {
  const ra = leHex(a)
  const rb = leHex(b)
  if (ra === undefined || rb === undefined) return undefined
  const la = luminancia(ra)
  const lb = luminancia(rb)
  const claro = Math.max(la, lb)
  const escuro = Math.min(la, lb)
  return (claro + 0.05) / (escuro + 0.05)
}

/**
 * ¿É unha cor escura? (luminancia relativa por baixo do medio).
 * `undefined` se non se pode ler — quen pregunta decide o seu default.
 *
 * Serve para escoller BASE de tema: desde que o documento pode declarar
 * o seu `background`, quen renderiza ten que mirar ese lenzo e non só o
 * chrome que o rodea.
 */
export function esCorEscura(cor: string | undefined): boolean | undefined {
  if (cor === undefined) return undefined
  const rgb = leHex(cor)
  if (rgb === undefined) return undefined
  return luminancia(rgb) < 0.4
}

/** Mínimo WCAG para texto grande; o nome dunha comarca vai en versaletas. */
export const CONTRASTE_MINIMO = 3

/** sRGB 0-255 → HSL con H en graos e S/L en 0-1. */
function aHsl([r, g, b]: readonly [number, number, number]): {
  h: number
  s: number
  l: number
} {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return { h: (((h * 60) % 360) + 360) % 360, s, l }
}

/** HSL → sRGB 0-255. */
function desdeHsl(h: number, s: number, l: number): readonly [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hh = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const [r1, g1, b1] =
    hh < 1
      ? [c, x, 0]
      : hh < 2
        ? [x, c, 0]
        : hh < 3
          ? [0, c, x]
          : hh < 4
            ? [0, x, c]
            : hh < 5
              ? [x, 0, c]
              : [c, 0, x]
  const m = l - c / 2
  const v = (u: number): number => Math.round(Math.min(255, Math.max(0, (u + m) * 255)))
  return [v(r1), v(g1), v(b1)] as const
}

const hex = (c: readonly [number, number, number]): string =>
  `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

const mestura = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): string => {
  const c = (i: 0 | 1 | 2): number => Math.round((a[i] ?? 0) * (1 - t) + (b[i] ?? 0) * t)
  return `#${[c(0), c(1), c(2)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Devolve `cor` se xa se le sobre `fondo`; se non, a mestura máis
 * próxima a `cor` que si se le, indo cara a `texto`.
 *
 * `opacidade` é a do texto ao pintarse (o nome da comarca vai ao 0,8).
 * **Non é un detalle**: un texto ao 80% sobre o seu fondo non ten o
 * contraste da cor sólida senón o da cor JA MESTURADA co fondo, e medir
 * a sólida sobreestima sempre. Xúlgase o que se ve.
 *
 * Se algunha cadea non é hex (`rgb()`, `hsl()`, un nome CSS…) devolve
 * `texto`: non se pode xulgar o contraste, e o comportamento anterior a
 * 19.10 era precisamente pintar sempre coa cor do texto — así que nese
 * caso non se arrisca nada.
 */
export function corLexible(
  cor: string | undefined,
  fondo: string | undefined,
  texto: string,
  minimo: number = CONTRASTE_MINIMO,
  opacidade = 1,
): string {
  if (cor === undefined || fondo === undefined) return texto
  const rc = leHex(cor)
  const rf = leHex(fondo)
  const rt = leHex(texto)
  if (rc === undefined || rf === undefined || rt === undefined) return texto
  /** Contraste do que REALMENTE se ve: a cor composta sobre o fondo. */
  const contrasteVisto = (candidata: readonly [number, number, number]): number => {
    const visto = mestura(rf, candidata, Math.max(0, Math.min(1, opacidade)))
    return razonDeContraste(visto, fondo) ?? 0
  }
  if (contrasteVisto(rc) >= minimo) return cor

  // 1. Mover a LUMINOSIDADE conservando ton e saturación. Cara arriba
  //    se o lenzo é escuro, cara abaixo se é claro. O primeiro paso que
  //    pasa é o que menos afasta da cor declarada.
  const { h, s: sat, l } = aHsl(rc)
  const cara = luminancia(rf) < 0.45 ? 1 : -1
  for (let k = 1; k <= 16; k++) {
    const nl = Math.min(0.95, Math.max(0.05, l + cara * k * 0.05))
    const candidata = desdeHsl(h, sat, nl)
    if (contrasteVisto(candidata) >= minimo) return hex(candidata)
    if (nl === 0.95 || nl === 0.05) break
  }

  // 2. Último recurso: a cor do texto, que é a que o resto da UI usa e
  //    a que había antes de 19.10. Chégase aquí cunha cor case acromática
  //    sobre un lenzo do mesmo ton, onde ningunha luminosidade chega.
  return texto
}
// ── FIN: contraste de cor ──
