// ── INICIO: validate (7.15, Cambio 4) ──
// Validación headless dun documento: o corazón do bucle IA.
// `deserializeDocument` (@editor-core) é a única fonte de verdade —
// o mesmo camiño exacto que corre o editor ao importar (7.14-B + 7.15).
// O erro devólvese como DATO accionable, non como texto solto.
//
// **19.10 — tamén corre a CONCIENCIA.** Ata agora isto só deserializaba,
// así que un documento cun ciclo de prerrequisitos, unha exclusión
// asimétrica ou un custo que apunta a un recurso inexistente saía por
// aquí como «✓ documento válido». O editor si avisa deses casos (panel
// Problemas), e a IA que itera con `ygg validate` non se enteraba de
// ningún: o bucle quedaba cego a cinco dos oito validadores.
//
// Os avisos NON fan fallar. `ok` segue significando «o documento
// cárgase», que é o que un pipeline precisa para decidir se continúa;
// un `warning` é información para mellorar, non un muro.

import type { Locale } from '@yggdrasil-forge/common'
import { resolveLocalized } from '@yggdrasil-forge/common'
import { createDefaultValidators, deserializeDocument } from '@yggdrasil-forge/editor-core'

/** Un problema atopado na validación, como dato accionable. */
export interface ValidationIssueJson {
  readonly severity: 'error' | 'warning' | 'info'
  readonly code: string
  readonly message: string
  readonly nodeId?: string
  /** Presente cando o aviso sinala unha ARESTA e non un nodo. */
  readonly edgeId?: string
}

/** Resultado da validación: a forma exacta que emite `ygg validate --json`. */
export interface ValidationReport {
  readonly ok: boolean
  readonly issues: readonly ValidationIssueJson[]
  /** Recontos rápidos (só con ok=true) — útiles para sanidade do chamador. */
  readonly stats?: { readonly nodes: number; readonly edges: number }
}

/**
 * Valida o texto dun documento (JSON). Nunca lanza.
 *
 * Dúas capas, na mesma orde que o editor:
 *   1. **Carga**: se o esquema non pasa, `ok: false` e un só issue de
 *      erro (`deserializeDocument` devolve un erro agregado cos campos
 *      concretos dentro da mensaxe).
 *   2. **Conciencia**: cos validadores soft por defecto de
 *      `@editor-core`. Emiten `warning`/`info` e **non** cambian `ok`.
 *
 * `locale` só afecta ao idioma das mensaxes.
 */
export function validateDocumentText(text: string, locale: Locale = 'gl'): ValidationReport {
  const result = deserializeDocument(text)
  if (result.ok) {
    const issues: ValidationIssueJson[] = []
    for (const validador of createDefaultValidators()) {
      for (const issue of validador(result.value)) {
        issues.push({
          severity: issue.severity,
          code: issue.code,
          message: resolveLocalized(issue.message, locale),
          ...(issue.nodeId !== undefined && { nodeId: issue.nodeId }),
          ...(issue.edgeId !== undefined && { edgeId: issue.edgeId }),
        })
      }
    }
    return {
      // Un aviso non invalida: `ok` significa «cárgase», que é o que un
      // pipeline precisa para decidir se segue.
      ok: true,
      issues,
      stats: {
        nodes: result.value.tree.nodes.length,
        edges: result.value.tree.edges.length,
      },
    }
  }
  return {
    ok: false,
    issues: [
      {
        severity: 'error',
        code: String(result.error.code ?? 'INVALID'),
        message: result.error.message,
      },
    ],
  }
}
// ── FIN: validate ──
