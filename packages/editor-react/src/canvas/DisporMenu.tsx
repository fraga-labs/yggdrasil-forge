// ── INICIO: DisporMenu (7.16, Cambio 2) ──
// Dropdown «Dispor» da barra do canvas (Autoría + vista grafo só — o
// caller decide non renderizalo noutros contextos, igual que fai coa
// CanvasToolbar). Mesmo patrón de peche que FileMenu/PanelsMenu:
// clic fóra ou Escape.
//
// «Coloca todos os nodos automaticamente. Podes retocar despois
// arrastrando.» — a acción coce posicións via applyAutoLayout (un
// undo devolve todo).

import type { AutoLayoutAlgo } from '@yggdrasil-forge/editor-core'
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import { useMenuKeyboard } from '../shell/useMenuKeyboard.js'

export const ALGO_LABELS: Readonly<Record<AutoLayoutAlgo, string>> = {
  radial: 'Radial',
  tree: 'Árbore (por niveis)',
  layered: 'Capas (para DAGs)',
  'clustered-radial': 'Radial por grupos',
  constellation: 'Constelación',
  mesh: 'Malla (tea de araña)',
}

/**
 * 7.18 (Cambio 3): cada algoritmo TEN condicións de uso, e a UI dío —
 * doutrina «explícase só». Redacción aprobada no briefing (o «parece
 * raro» do dono co tree sobre un DAG era a condición sen contar).
 */
export const ALGO_HELP: Readonly<Record<AutoLayoutAlgo, string>> = {
  radial: 'Aneis por profundidade desde a raíz.',
  tree: 'Ideal cando cada nodo ten UN só pai; con varios pais crúzanse arestas.',
  layered: 'Para nodos con varios pais ou requisitos múltiples.',
  'clustered-radial': 'Precisa grupos definidos; os soltos van a un oco propio.',
  constellation: 'Para grafos soltos sen xerarquía clara.',
  mesh: 'Para grafos densos con lazos: un blob por grupo e arestas curtas.',
}

export interface DisporMenuProps {
  readonly onDispor: (algo: AutoLayoutAlgo) => void
}

export function DisporMenu({ onDispor }: DisporMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  // auto-2: navegación por teclado (WAI-ARIA menu button).
  const closeMenu = useCallback(() => setOpen(false), [])
  useMenuKeyboard(open, menuRef, closeMenu)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current === null) return
      if (!menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="editor-dispor" ref={menuRef}>
      <button
        type="button"
        className={`editor-canvas-toolbar__btn editor-dispor__trigger${open ? ' editor-canvas-toolbar__btn--active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Dispor"
        title="Dispor — coloca todos os nodos automaticamente. Podes retocar despois arrastrando."
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">✥</span>
      </button>
      {open && (
        <ul className="editor-dispor__menu" role="menu" aria-label="Algoritmos de disposición">
          {(Object.entries(ALGO_LABELS) as [AutoLayoutAlgo, string][]).map(([algo, label]) => (
            <li key={algo}>
              <button
                type="button"
                role="menuitem"
                className="editor-dispor__item"
                onClick={() => {
                  setOpen(false)
                  onDispor(algo)
                }}
              >
                {label}
                <span className="editor-dispor__item-help">{ALGO_HELP[algo]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
// ── FIN: DisporMenu ──
