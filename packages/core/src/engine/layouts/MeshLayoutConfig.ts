// ── INICIO: MeshLayoutConfig tipos + parseMeshLayoutConfig ──
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { BaseLayoutConfig, LayoutConfig } from '../../types/tree.js'

/**
 * Configuración do `MeshLayout` (19.6).
 *
 * **Que resolve**: os cinco layouts previos colocan os nodos por
 * xeometría pura — anel, filas, columnas — sen mirar as arestas. Iso
 * vale para árbores, pero nun grafo DENSO con lazos (o estilo «tela de
 * araña» dos mockups fundacionais) produce cordas que cruzan o debuxo,
 * porque dous nodos conectados poden acabar en puntas opostas.
 *
 * `mesh` é o primeiro layout que **le as arestas**: coloca cada grupo
 * como un blob orgánico e relaxa as posicións con forzas (atracción
 * pola aresta, repulsión entre veciños próximos) ata que os nodos
 * conectados quedan preto. As comarcas colócanse nun anel cuxo radio
 * medra ata que dúas veciñas non se solapen, e o grupo central medra
 * para encher o medio.
 *
 * **Non crea arestas**: un `LayoutEngine` só pode colocar. A topoloxía
 * da malla (quen conecta con quen) é dato do documento — ver
 * `tools/malla-proto/` para unha receita de xeración.
 *
 * **Determinista**: mesma entrada e mesma `seed`, mesmo resultado, sen
 * `Math.random` nin reloxo.
 */
export interface MeshLayoutConfig extends BaseLayoutConfig {
  readonly type: 'mesh'

  /**
   * Distancia obxectivo entre nodos veciños, en unidades de layout.
   * Obrigatorio, > 0. É o parámetro que goberna a densidade: a
   * sensación de «tea» vén de moitos nodos xuntos, non de moitas
   * arestas por nodo.
   */
  readonly spacing: number

  /** Folgo entre blobs veciños. Opcional, ≥ 0. Default `spacing * 0.1`. */
  readonly gap?: number

  /**
   * Pasadas de relaxación. Opcional, ≥ 0. Default 220. Máis pasadas
   * igualan máis o espazado; a partir de ~300 o cambio non se ve.
   */
  readonly iterations?: number

  /** Semente do xerador determinista. Opcional. Default 1. */
  readonly seed?: number

  /**
   * Grupo que vai no MEDIO (o resto reparte no anel). Opcional; por
   * defecto o primeiro de `treeDef.groups`.
   */
  readonly centerGroupId?: string
}

const DEFAULT_LOCALE: Locale = 'gl'

function validationErr(
  reason: string,
  locale: Locale,
  context: Record<string, unknown>,
): Result<MeshLayoutConfig> {
  return err(
    new YggdrasilError(
      ErrorCode.LAYOUT_COMPUTE_FAILED,
      getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, { type: 'mesh', reason }),
      { context },
    ),
  )
}

/** Valida e normaliza o `LayoutConfig` dun TreeDef para o MeshLayout. */
export function parseMeshLayoutConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<MeshLayoutConfig> {
  if (config.type !== 'mesh') {
    return validationErr(`expected type 'mesh', got '${config.type}'`, locale, {
      type: config.type,
    })
  }

  const spacing = config.spacing
  if (typeof spacing !== 'number' || !Number.isFinite(spacing) || spacing <= 0) {
    return validationErr(`spacing must be a positive number; got ${String(spacing)}`, locale, {
      field: 'spacing',
      value: spacing,
    })
  }

  const gap = config.gap
  if (gap !== undefined && (typeof gap !== 'number' || !Number.isFinite(gap) || gap < 0)) {
    return validationErr(`gap must be a non-negative number; got ${String(gap)}`, locale, {
      field: 'gap',
      value: gap,
    })
  }

  const iterations = config.iterations
  if (
    iterations !== undefined &&
    (typeof iterations !== 'number' || !Number.isInteger(iterations) || iterations < 0)
  ) {
    return validationErr(
      `iterations must be a non-negative integer; got ${String(iterations)}`,
      locale,
      { field: 'iterations', value: iterations },
    )
  }

  const seed = config.seed
  if (seed !== undefined && (typeof seed !== 'number' || !Number.isFinite(seed))) {
    return validationErr(`seed must be a finite number; got ${String(seed)}`, locale, {
      field: 'seed',
      value: seed,
    })
  }

  const centerGroupId = config.centerGroupId
  if (centerGroupId !== undefined && typeof centerGroupId !== 'string') {
    return validationErr(`centerGroupId must be a string; got ${String(centerGroupId)}`, locale, {
      field: 'centerGroupId',
      value: centerGroupId,
    })
  }

  return ok({
    type: 'mesh',
    spacing,
    ...(gap !== undefined ? { gap } : {}),
    ...(iterations !== undefined ? { iterations } : {}),
    ...(seed !== undefined ? { seed } : {}),
    ...(centerGroupId !== undefined ? { centerGroupId } : {}),
  })
}
// ── FIN: MeshLayoutConfig ──
