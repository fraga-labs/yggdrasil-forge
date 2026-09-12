// ── INICIO: applyAutoLayout (7.16, Cambio 1) ──
// «Dispor» headless: executa un motor de layout de @core UNHA vez e
// devolve os comandos `moveNode` que COCEN as posicións en
// `node.position` (decisión de deseño: cocer, non vivir — o layout
// vivo chocaría co drag e coa filosofía "retocas o que a máquina
// propón"). `layout.type` do documento queda como está ('custom').
//
// O chamador aplica os comandos nunha transacción → UN undo devolve
// todas as posicións previas dun golpe.
//
// Determinista: mesma árbore + mesmo algo → mesmas posicións (os
// catro motores son puros; asertado en test).

import { type Locale, getErrorMessage, resolveLocalized } from '@yggdrasil-forge/common'
import {
  ClusteredRadialLayout,
  ConstellationLayout,
  ErrorCode,
  LayeredLayout,
  LayoutEngineRegistry,
  MeshLayout,
  RadialLayout,
  type Result,
  type TreeDef,
  TreeLayout,
  YggdrasilError,
  computeLayout,
  err,
  ok,
} from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'
import { moveNode, setMetaField, setTreeField } from '../command/commands/index.js'
import type { EditorDocument } from '../document/EditorDocument.js'
import { type AutoLayoutAlgo, defaultLayoutConfig } from './defaultLayoutConfigs.js'

export type { AutoLayoutAlgo } from './defaultLayoutConfigs.js'
export { AUTO_LAYOUT_ALGOS } from './defaultLayoutConfigs.js'

export interface ApplyAutoLayoutOptions {
  readonly locale?: Locale
}

/**
 * Registry local cos motores que «Dispor» expón. NON se depende do
 * `createDefaultLayoutRegistry` de @react (editor-core é headless);
 * os motores son clases públicas de @core.
 */
function createEditorLayoutRegistry(): LayoutEngineRegistry {
  return new LayoutEngineRegistry()
    .register(new RadialLayout())
    .register(new TreeLayout())
    .register(new LayeredLayout())
    .register(new ClusteredRadialLayout())
    .register(new ConstellationLayout())
    .register(new MeshLayout())
}

/**
 * Marxe engadida aos bounds do layout ao actualizar
 * `coordinateBounds` (labels/aneis sobresaen do centro do nodo).
 */
const BOUNDS_MARGIN = 48

/**
 * Calcula o layout `algo` para o documento e devolve un `moveNode`
 * por CADA nodo coa súa posición nova (tamén os que xa tiñan posición
 * — dispor é dispor), MÁIS un `setMetaField('coordinateBounds')` cos
 * bounds do layout (7.16b, feedback do gate do dono): sen isto, un
 * layout maior có box fixo do documento deixaba nodos FÓRA do viewBox
 * e do alcance do pan (que está limitado aos bounds) — invisibles e
 * inalcanzables. Todo na mesma transacción → un undo devolve posicións
 * E encadre. `err` propaga o erro do motor, nunca o silencia.
 */
export function applyAutoLayout(
  doc: EditorDocument,
  algo: AutoLayoutAlgo,
  options?: ApplyAutoLayoutOptions,
): Result<readonly Command[]> {
  const locale: Locale = options?.locale ?? 'gl'
  // TreeDef efémero co layout do algoritmo — o documento NON se toca.
  // Se o documento xa pedía ESTE algoritmo, mándase a súa config.
  const propia = doc.tree.layout.type === algo ? doc.tree.layout : undefined
  const ephemeral: TreeDef = {
    ...doc.tree,
    layout: propia ?? defaultLayoutConfig(algo, doc.tree),
  }
  const computed = computeLayout(ephemeral, createEditorLayoutRegistry(), locale)
  if (!computed.ok) return computed

  const commands: Command[] = []
  for (const node of doc.tree.nodes) {
    const position = computed.value.nodes.get(node.id)
    if (position === undefined) {
      // Defensivo: un motor que non coloque TODOS os nodos é un erro
      // honesto, non un layout a medias.
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_TREE_DEF,
          getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
            details: `o motor "${algo}" non devolveu posición para o nodo "${node.id}" (${resolveLocalized(node.label, locale)})`,
          }),
        ),
      )
    }
    commands.push(moveNode(node.id, position))
  }

  // Cocer: o documento pasa a `custom`, que é o que honra as posicións
  // que acabamos de gardar. Só se fai falta, para non meter unha orde
  // inerte na transacción do caso normal (o documento xa era `custom`).
  if (doc.tree.layout.type !== 'custom') {
    commands.push(setTreeField('layout', { type: 'custom' }))
  }

  // Encadre: coordinateBounds segue o layout (con marxe para labels).
  // Só se hai nodos — un doc baleiro non ten nada que encadrar.
  if (doc.tree.nodes.length > 0) {
    const bounds = computed.value.bounds
    commands.push(
      setMetaField('coordinateBounds', {
        minX: Math.round(bounds.minX - BOUNDS_MARGIN),
        minY: Math.round(bounds.minY - BOUNDS_MARGIN),
        maxX: Math.round(bounds.maxX + BOUNDS_MARGIN),
        maxY: Math.round(bounds.maxY + BOUNDS_MARGIN),
      }),
    )
  }
  return ok(commands)
}
// ── FIN: applyAutoLayout ──
