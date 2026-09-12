// ── INICIO: layoutCmd (7.16, Cambio 3) ──
// `ygg layout` — o paso que completa o pipeline IA sen GUI:
//   xerar → validate → layout → importar.
//
// Aplica `applyAutoLayout` DIRECTO sobre o documento (sen motor de
// edición nin historial): os comandos `moveNode` son receitas puras de
// mutación; aplícanse sobre un clon profundo e serialízase o resultado.
// Determinista: mesma entrada + mesmo algo → mesmo JSON.

import {
  AUTO_LAYOUT_ALGOS,
  type AutoLayoutAlgo,
  type Command,
  applyAutoLayout,
  deserializeDocument,
  serializeDocument,
} from '@yggdrasil-forge/editor-core'

export interface LayoutTextResult {
  readonly ok: boolean
  /** JSON resultante (pretty, indent 2) con ok=true. */
  readonly output?: string
  readonly error?: string
}

// Reexportado para que a AXUDA e os ERROS do CLI saian da mesma lista
// que a validación. Tela escrita a man nun sitio e derivada noutro é
// como `mesh` acabou fóra da mensaxe de erro.
export { AUTO_LAYOUT_ALGOS }

export function isAutoLayoutAlgo(value: string): value is AutoLayoutAlgo {
  return (AUTO_LAYOUT_ALGOS as readonly string[]).includes(value)
}

/** Valida o texto, aplica o layout e devolve o documento serializado. */
export function layoutDocumentText(text: string, algo: AutoLayoutAlgo): LayoutTextResult {
  const parsed = deserializeDocument(text)
  if (!parsed.ok) return { ok: false, error: parsed.error.message }

  const commands = applyAutoLayout(parsed.value, algo)
  if (!commands.ok) return { ok: false, error: commands.error.message }

  // Clon profundo + mutación directa: os Command.mutate só asignan
  // campos (receitas puras); fóra dunha transacción non hai immer nin
  // historial que preservar.
  const cloned = structuredClone(parsed.value)
  type MutableDoc = Parameters<Command['mutate']>[0]
  for (const command of commands.value) command.mutate(cloned as MutableDoc)

  return { ok: true, output: `${JSON.stringify(JSON.parse(serializeDocument(cloned)), null, 2)}\n` }
}
// ── FIN: layoutCmd ──
