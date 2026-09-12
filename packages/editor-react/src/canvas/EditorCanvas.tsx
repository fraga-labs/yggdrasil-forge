// ── INICIO: EditorCanvas ──
// 7.5b-ii: o canvas reacciona a tactos reais.
//
// Engade sobre 7.5b-i:
//   - **Drag-to-move**: arrastrar un nodo → ghost no Overlay → soltar
//     → 1 transacción → undo restáura. (★ test visible.)
//   - **Multi-selección**: shift-clic engade/quita; aneis no Overlay.
//   - **Marquee**: shift-drag sobre baleiro → rect → seleccionar nodos
//     dentro.
//
// **Pipeline de eventos** (en fase de captura do contedor):
//   pointerdown nun nodo → state='pressed-node' (esperar limiar).
//     stopPropagation: o SkillTree NON inicia pan.
//   pointermove con state='pressed-node':
//     se desprazamento > limiar → state='dragging' + createMoveOperation.
//     se non, ignorar (clic non confirmado).
//   pointermove con state='dragging' → operation.update(docPoint).
//   pointerup con state='dragging' → engine.transaction(commit). 1 entrada.
//   pointerup con state='pressed-node' (sin drag) → selección (replace
//     ou toggle se shift).
//   pointerdown sobre baleiro + shift → state='marquee'.
//   pointermove con state='marquee' → actualizar rect.
//   pointerup con state='marquee' → seleccionar nodos dentro do rect.
//   pointerdown sobre baleiro sin shift → deixar pasar (pan do SkillTree).
//   Escape → cancel (operation/marquee).
//
// **Decisión arquitectural** (banco): o InteractionController + Tools
// de 7.3 quedan latentes para cando exista UI de barra de tools.
// 7.5b-ii usa createMoveOperation + engine.transaction + SelectionEngine
// directos, porque o modelo "drag vs clic polo limiar" non encaixa co
// modelo Tool actual (a tool teríase que decidir DESPOIS do pointerdown).

import { TreeEngine } from '@yggdrasil-forge/core'
import {
  type AutoLayoutAlgo,
  type EditorEngine,
  type Operation,
  type SelectionRef,
  addNode,
  applyAutoLayout,
  buildConnect,
  buildNewNode,
  buildRemoveCascade,
  createMoveOperation,
  themeOverridesFromSpec,
  themeTypographyFromSpec,
} from '@yggdrasil-forge/editor-core'
import {
  type RegionSpec,
  SkillTree,
  type SkillTreeHandle,
  type Theme,
  ThemeProvider,
  type ViewportState,
  minimal,
  minimalDark,
} from '@yggdrasil-forge/react'
import {
  type JSX,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ProbaSession } from '../proba/useProbaSession.js'
import type { CanvasView, ViewportControls } from '../shell/ShellRuntimeContext.js'
import { CanvasCardsView } from './CanvasCardsView.js'
import { CanvasOverlay, type OverlayRectPx } from './CanvasOverlay.js'
import { type CanvasTool, CanvasToolbar } from './CanvasToolbar.js'
import { ALGO_HELP, ALGO_LABELS, DisporMenu } from './DisporMenu.js'
import { hitTestNode, nodesInRect } from './internals/hitTest.js'
import {
  IDLE,
  type PointerState,
  exceededDragThreshold,
  isAdditive,
  modifiersOf,
  rectBetween,
} from './internals/pointerState.js'
import { docToScreen, findCanvasCtmElement, screenToDoc } from './internals/screenDocCTM.js'

export interface EditorCanvasProps {
  readonly editorEngine: EditorEngine
  /**
   * **7.6**: sesión de Proba activa (opcional). Se está definida:
   *   - o SkillTree renderiza co treeEngine da sesión (non co de render).
   *   - drag/marquee desactivados; a selección (para a ficha) mantense.
   *   - undo/redo do documento non se ven afectados (o EditorEngine
   *     non se toca; edición está apagada polo TopBar/Inspector aparte).
   */
  readonly probaSession?: ProbaSession | null
  /**
   * **F7.9** (antes 7.8.1, heurística por campo, xa retirada): tema do
   * CHROME do editor (claro/escuro), non do documento. Escolle a BASE
   * de render do canvas — `minimalDark` en escuro, `minimal` en
   * claro/sen definir — para que texto, arestas, malla e trazos sexan
   * lexibles sobre calquera fondo do chrome. Os overrides explícitos
   * do documento (`ThemeSpec.textColor`, `nodeFills`) gañan sempre
   * sobre a base escollida. Sen esta prop, compórtase coma sempre
   * (`minimal`) — cero regresión.
   */
  readonly chromeTheme?: 'light' | 'dark'
  /**
   * **7.15c**: vista activa do canvas — `graph` (SkillTree clásico) ou
   * `cards` (ClusterCardsView). O toggle renderízase aquí (esquina do
   * panel) pero o ESTADO vive en EditorShell e chega en vivo polo
   * ShellRuntimeContext (lección 7.14-A: o panel persiste en dockview).
   */
  readonly view?: CanvasView
  readonly onViewChange?: (view: CanvasView) => void
  /**
   * 7.18b «Ir ao nodo»: rexistro do navegador no taboleiro do shell.
   * O canvas rexistra unha función que delega en
   * `SkillTreeHandle.centerOn`; en vista tarxetas o SkillTree non está
   * montado (ref null) e a chamada é un no-op natural, sen erro.
   */
  readonly registerNodeNavigator?: (navigator: ((nodeId: string) => void) | null) => void
  /**
   * Controis de viewport (zoom da TopBar) no taboleiro do shell. Mesmo
   * contrato có navegador: delega en SkillTreeHandle.zoomIn/zoomOut;
   * en tarxetas o SkillTree non está montado → no-op natural.
   */
  readonly registerViewportControls?: (controls: ViewportControls | null) => void
}

/**
 * Hook auxiliar: subscribe ao SelectionEngine e devolve as refs
 * actuais (todas as seleccionadas — para multi-selección no Overlay).
 *
 * **Cache estable**: `selection.current()` devolve un array novo cada
 * chamada (limitación do SelectionEngine en 7.3). `useSyncExternalStore`
 * require referencias estables entre snapshots sin cambio, ou bucla
 * indefinidamente. Cacheamos polo subscribe: cada vez que dispara,
 * recalculamos e gardamos; entre disparos devolvemos a mesma ref.
 */
function useSelectedRefs(editorEngine: EditorEngine): readonly SelectionRef[] {
  const selection = editorEngine.getSession().selection
  const cacheRef = useRef<readonly SelectionRef[]>([])
  const subscribe = useCallback(
    (cb: () => void) => {
      // Refrescar a cache cando dispara o subscribe.
      const unsubscribe = selection.subscribe(() => {
        cacheRef.current = selection.current()
        cb()
      })
      // Snapshot inicial.
      cacheRef.current = selection.current()
      return unsubscribe
    },
    [selection],
  )
  const getSnapshot = useCallback(() => cacheRef.current, [])
  const getServerSnapshot = useCallback(() => cacheRef.current, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function EditorCanvas({
  editorEngine,
  probaSession = null,
  chromeTheme,
  view = 'graph',
  onViewChange,
  registerNodeNavigator,
  registerViewportControls,
}: EditorCanvasProps): JSX.Element {
  // Re-render en commits do EditorEngine.
  const doc = useSyncExternalStore(
    (cb) => editorEngine.subscribe(cb),
    () => editorEngine.getDocument(),
  )
  // **7.6**: se hai sesión de Proba, o SkillTree renderiza co seu
  // TreeEngine (con estado vivo — nodos desbloquéanse, recursos
  // baixan). Sen sesión, TreeEngine de RENDER (todo bloqueado, para
  // ver a estrutura durante Autoría).
  const renderTreeEngine = useMemo(() => new TreeEngine(doc.tree), [doc])
  const treeEngine = probaSession?.treeEngine ?? renderTreeEngine
  const selectedRefs = useSelectedRefs(editorEngine)
  const inProba = probaSession !== null
  // 7.15c: primeiro nodo seleccionado (realce de fila na vista tarxetas).
  const firstSelectedNodeId = selectedRefs.find((r) => r.kind === 'node')?.id

  // Container do canvas e versión do viewport (para forzar overlay redraw).
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportVersion, setViewportVersion] = useState(0)
  // 7.16: handle do SkillTree para encadrar (fit) tras «Dispor».
  const skillTreeRef = useRef<SkillTreeHandle | null>(null)

  // 7.18b: rexistrar o navegador «Ir ao nodo» no taboleiro do shell.
  // A función le o ref no MOMENTO da chamada: en tarxetas ou sen
  // SkillTree montado é un no-op (centerOn tampouco lanza — contrato
  // do handle).
  useEffect(() => {
    if (registerNodeNavigator === undefined) return undefined
    registerNodeNavigator((nodeId: string) => {
      skillTreeRef.current?.centerOn(nodeId)
    })
    return () => registerNodeNavigator(null)
  }, [registerNodeNavigator])

  // Zoom da TopBar (pecha o «TODO» histórico dos botóns −/+): mesmo
  // taboleiro; as funcións len o ref no momento da chamada.
  useEffect(() => {
    if (registerViewportControls === undefined) return undefined
    registerViewportControls({
      zoomIn: () => skillTreeRef.current?.zoomIn(),
      zoomOut: () => skillTreeRef.current?.zoomOut(),
    })
    return () => registerViewportControls(null)
  }, [registerViewportControls])

  // O CTM do `<g>` co transform pan/zoom (dentro do <svg> do SkillTree)
  // é a fonte de verdade screen↔doc. ★ Importante: NON o <svg> raíz —
  // ese non inclúe o transform. Ver screenDocCTM.ts para a cicatriz.
  //
  // **Robustez**: o primeiro paint pode non ter o `<g>` aínda (o
  // SkillTree fai cálculos de layout antes de pintar). Usamos
  // MutationObserver no contedor para captar o `<g>` cando apareza, e
  // así evitamos un primeiro frame con ctmEl=null (que nesgaba aneis
  // ata o segundo render).
  const [ctmEl, setCtmEl] = useState<SVGGraphicsElement | null>(null)
  useEffect(() => {
    // 7.15c: en vista tarxetas o SkillTree NON está montado — o ctmEl
    // vello apuntaría a un <g> desmontado (CTM roto ao volver a grafo).
    // Depender de `view` re-executa a busca cando o grafo remonta.
    if (view !== 'graph') {
      setCtmEl(null)
      return
    }
    if (containerRef.current === null) return
    const el = containerRef.current
    // 1. Comprobación inmediata (caso normal: <svg><g/> xa montado).
    const initial = findCanvasCtmElement(el)
    if (initial !== null) {
      setCtmEl(initial)
      return
    }
    // 2. Se non está, observa o subtree ata que apareza.
    const mo = new MutationObserver(() => {
      const found = findCanvasCtmElement(el)
      if (found !== null) {
        setCtmEl(found)
        mo.disconnect()
      }
    })
    mo.observe(el, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [view])

  // Container rect (para converter screen-clientX a relative-X no overlay).
  //
  // **Problema histórico (visto na review visual)**: o `containerRect`
  // capturado só no mount + window resize/scroll quedaba **obsoleto** cando
  // dockview redimensionaba os paneis arrastrando o borde — dockview non
  // dispara window resize, polo que os aneis/ghosts quedaban en
  // coordenadas vellas (anel orfo arriba á esquerda do canvas).
  //
  // **Arranxo**: ResizeObserver no propio contedor. Captura cambios de
  // tamaño/posición do elemento sin depender de eventos de ventana.
  // Window resize/scroll seguen como sinais adicionais (cambios de
  // posición do elemento na páxina).
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (containerRef.current === null) return
    const el = containerRef.current
    const update = (): void => {
      setContainerRect(el.getBoundingClientRect())
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [])

  // Estado interno do pointer (idle / pressed-node / dragging / marquee).
  // Usamos ref porque queremos que os handlers vexan sempre o estado
  // máis recente sin re-binding por cada paint; e state separado para
  // o que precisa re-render (ghosts/marquee rect).
  const pointerStateRef = useRef<PointerState>(IDLE)
  const [ghostPositions, setGhostPositions] = useState<
    ReadonlyMap<string, { x: number; y: number }> | undefined
  >(undefined)
  const [marqueeRectPx, setMarqueeRectPx] = useState<OverlayRectPx | undefined>(undefined)

  // ── 7.11 — barra de ferramentas ──
  const [tool, setTool] = useState<CanvasTool>('select')
  // Persiste durante a sesión (non se reinicia ao trocar de tool nin
  // ao conectar); por defecto marcado, tal como pide o briefing.
  const [createPrerequisite, setCreatePrerequisite] = useState(true)
  // Posición do cursor (doc-space) mentres a tool Conectar ten un
  // primeiro clic feito. undefined = sen conexión en curso.
  const [connectCursorDoc, setConnectCursorDoc] = useState<{ x: number; y: number } | undefined>(
    undefined,
  )

  // ── Conversión: positions canónicas dos nodos (para o Overlay) ──
  const nodePositions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    for (const node of doc.tree.nodes) {
      if (node.position !== undefined) {
        m.set(node.id, { x: node.position.x, y: node.position.y })
      }
    }
    return m
  }, [doc])

  // ── Commit dunha Operation ──
  const commitOperation = useCallback(
    (op: Operation) => {
      const cmds = op.commit()
      if (cmds.length === 0) return
      editorEngine.transaction({ en: 'Move' }, (tx) => {
        for (const cmd of cmds) tx.apply(cmd)
      })
    },
    [editorEngine],
  )

  // ── Pointer handlers (en fase de captura sobre o contedor) ──
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (ctmEl === null) return
      const screen = { x: e.clientX, y: e.clientY }
      const docPoint = screenToDoc(ctmEl, screen)
      if (docPoint === null) return
      const mods = modifiersOf(e)
      const hit = hitTestNode(docPoint, doc.tree)

      // **7.6**: en Proba, clic segue seleccionando (a ficha do
      // ProbaPanel necesítao) pero NON se inicia drag nin marquee.
      if (inProba) {
        if (hit !== null) {
          e.stopPropagation()
          editorEngine.getSession().selection.replace([hit])
        } else {
          editorEngine.getSession().selection.clear()
        }
        // Pan/zoom seguen funcionando (non paramos propagación no
        // caso de baleiro; en nodo si para evitar pan sobre nodo).
        return
      }

      // ── 7.11 — tool Engadir nodo ──
      // Clic sobre nodo existente: só selecciona (evita solapado
      // accidental). Clic en baleiro: crea o nodo aí mesmo.
      if (tool === 'add') {
        e.stopPropagation()
        if (hit !== null) {
          editorEngine.getSession().selection.replace([hit])
          return
        }
        const newNode = buildNewNode(editorEngine.getDocument(), docPoint)
        const result = editorEngine.transaction({ en: 'Add node', gl: 'Engadir nodo' }, (tx) =>
          tx.apply(addNode(newNode)),
        )
        if (result.ok) {
          editorEngine.getSession().selection.replace([{ kind: 'node', id: newNode.id }])
        }
        return
      }

      // ── 7.11 — tool Conectar ──
      // Primeiro clic (nun nodo): arranca a fantasma. Segundo clic
      // (noutro nodo): despacha buildConnect e remata. Clic en
      // baleiro mentres conecta: cancela.
      if (tool === 'connect') {
        const state = pointerStateRef.current
        if (state.kind === 'connecting') {
          e.stopPropagation()
          if (hit !== null) {
            const cmds = buildConnect(editorEngine.getDocument(), state.sourceId, hit.id, {
              withPrerequisite: createPrerequisite,
            })
            if (cmds.length > 0) {
              editorEngine.transaction({ en: 'Connect', gl: 'Conectar' }, (tx) => {
                for (const c of cmds) tx.apply(c)
              })
            }
          }
          pointerStateRef.current = IDLE
          setConnectCursorDoc(undefined)
          return
        }
        if (hit !== null) {
          e.stopPropagation()
          pointerStateRef.current = { kind: 'connecting', sourceId: hit.id }
          setConnectCursorDoc(docPoint)
          return
        }
        // Clic en baleiro sen conexión en curso: nada especial.
        return
      }

      // ── tool Seleccionar (comportamento orixinal 7.5b-ii) ──
      if (hit !== null) {
        // Sobre un nodo: o editor xestiona. Bloqueamos a propagación para
        // que o SkillTree NON inicie pan.
        e.stopPropagation()
        // Capturamos o punteiro para que pointermove/up sigan chegando aínda
        // que se saia do elemento.
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        pointerStateRef.current = {
          kind: 'pressed-node',
          target: hit,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          startDoc: docPoint,
          modifiers: mods,
        }
        return
      }

      // Sobre baleiro:
      if (mods.shift) {
        // Marquee. Bloqueamos pan; comezamos rect.
        e.stopPropagation()
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        pointerStateRef.current = {
          kind: 'marquee',
          startDoc: docPoint,
          currentDoc: docPoint,
          additive: true, // shift = additive
        }
        setMarqueeRectPx({
          x: e.clientX - (containerRect?.left ?? 0),
          y: e.clientY - (containerRect?.top ?? 0),
          width: 0,
          height: 0,
        })
        return
      }
      // Sen modificador, clic en baleiro → o SkillTree fai pan. Tamén
      // limpamos selección (UX habitual: clic no fondo = deseleccionar).
      editorEngine.getSession().selection.clear()
      // NON stopPropagation: deixa que o SkillTree inicie pan.
    },
    [ctmEl, doc, containerRect, editorEngine, inProba, tool, createPrerequisite],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (ctmEl === null) return
      if (inProba) return
      const state = pointerStateRef.current

      if (state.kind === 'connecting') {
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint === null) return
        setConnectCursorDoc(docPoint)
        return
      }

      if (state.kind === 'pressed-node') {
        if (!exceededDragThreshold(state.startScreenX, state.startScreenY, e.clientX, e.clientY)) {
          return // sigue podendo ser clic
        }
        // Confirma drag. Se o nodo non está xa seleccionado, replace-o (un
        // só) para que MoveOperation o leve. Se SI está seleccionado, drag
        // move todos os seleccionados xuntos (multi-drag).
        const selection = editorEngine.getSession().selection
        if (!selection.isSelected(state.target)) {
          selection.replace([state.target])
        }
        // Crea MoveOperation: captura posicións iniciais dos seleccionados.
        const op = createMoveOperation(editorEngine.getDocument(), selection, state.startDoc)
        // Aplica xa o primeiro update (delta = current - start).
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint !== null) {
          op.update(docPoint, {
            ...(state.modifiers.shift && { shift: true }),
            ...(state.modifiers.ctrl && { ctrl: true }),
            ...(state.modifiers.meta && { meta: true }),
            ...(state.modifiers.alt && { alt: true }),
          })
        }
        pointerStateRef.current = { kind: 'dragging', operation: op }
        // Actualiza ghosts no overlay.
        const ghosts = op.preview().nodePositions
        if (ghosts !== undefined) setGhostPositions(new Map(ghosts))
        return
      }

      if (state.kind === 'dragging') {
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint === null) return
        state.operation.update(docPoint, {})
        const ghosts = state.operation.preview().nodePositions
        if (ghosts !== undefined) setGhostPositions(new Map(ghosts))
        return
      }

      if (state.kind === 'marquee') {
        const docPoint = screenToDoc(ctmEl, { x: e.clientX, y: e.clientY })
        if (docPoint === null) return
        pointerStateRef.current = { ...state, currentDoc: docPoint }
        // Actualizar rect screen-space para o overlay.
        if (containerRect !== null) {
          // Convertir os dous extremos doc → screen para o rect visible.
          // Pero é máis simple e exacto pintar usando screen-space directos
          // (clientX/Y respecto a containerRect) co startScreen rexistrado.
          // Aproximación: re-proxectamos startDoc → screen.
          // (Para precisión absoluta usaríamos os clientX/Y orixinais; iso
          // é mellor, así que cambiamos a forma de gardar o marquee.)
          const startScreen = (() => {
            const sp = docToScreen(ctmEl, state.startDoc)
            if (sp === null) return null
            return { x: sp.x - containerRect.left, y: sp.y - containerRect.top }
          })()
          if (startScreen === null) return
          const cur = {
            x: e.clientX - containerRect.left,
            y: e.clientY - containerRect.top,
          }
          setMarqueeRectPx({
            x: Math.min(startScreen.x, cur.x),
            y: Math.min(startScreen.y, cur.y),
            width: Math.abs(cur.x - startScreen.x),
            height: Math.abs(cur.y - startScreen.y),
          })
        }
        return
      }
      // idle: sin operación, sin marquee → nada que facer.
    },
    [ctmEl, editorEngine, containerRect, inProba],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (inProba) return
      const state = pointerStateRef.current

      if (state.kind === 'pressed-node') {
        // Foi clic (non se superou o limiar): selección.
        const selection = editorEngine.getSession().selection
        if (isAdditive(state.modifiers)) {
          selection.toggle(state.target)
        } else {
          selection.replace([state.target])
        }
        pointerStateRef.current = IDLE
        return
      }

      if (state.kind === 'dragging') {
        commitOperation(state.operation)
        setGhostPositions(undefined)
        pointerStateRef.current = IDLE
        return
      }

      if (state.kind === 'marquee') {
        const rect = rectBetween(state.startDoc, state.currentDoc)
        const inside = nodesInRect(rect, doc.tree)
        const selection = editorEngine.getSession().selection
        if (state.additive) {
          for (const ref of inside) selection.add(ref)
        } else {
          selection.replace(inside)
        }
        setMarqueeRectPx(undefined)
        pointerStateRef.current = IDLE
        return
      }
      // Sin acción específica; non tocou nada o noso pipeline.
      void e
    },
    [editorEngine, doc, commitOperation, inProba],
  )

  // ── 7.11 — reset do estado de punteiro + cambio de tool ──
  // Compartido entre Esc, atallos de teclado e clics na toolbar: trocar
  // de tool a media xesto (drag/marquee/connecting) debe cancelar ese
  // xesto sempre, ou queda "pillado" (ex. liña fantasma que non
  // desaparece se saltas de Conectar a Seleccionar por atallo sen
  // pasar por Esc).
  const resetPointerState = useCallback(() => {
    const state = pointerStateRef.current
    if (state.kind === 'dragging') {
      state.operation.cancel()
      setGhostPositions(undefined)
    } else if (state.kind === 'marquee') {
      setMarqueeRectPx(undefined)
    } else if (state.kind === 'connecting') {
      setConnectCursorDoc(undefined)
    }
    if (state.kind !== 'idle') {
      pointerStateRef.current = IDLE
    }
  }, [])
  const changeTool = useCallback(
    (t: CanvasTool) => {
      resetPointerState()
      setTool(t)
    },
    [resetPointerState],
  )

  // ── 7.16 — «Dispor»: cocer un auto-layout como UNHA transacción ──
  // Un undo devolve TODAS as posicións previas dun golpe. Tras aplicar,
  // fit() encadra o resultado. Erros do motor: alerta honesta (nunca
  // silenciar — A.6.9).
  const [conviteDismissed, setConviteDismissed] = useState(false)
  const handleDispor = useCallback(
    (algo: AutoLayoutAlgo) => {
      const commands = applyAutoLayout(editorEngine.getDocument(), algo)
      if (!commands.ok) {
        window.alert(`Non se puido dispor: ${commands.error.message}`)
        return
      }
      const result = editorEngine.transaction(
        { en: `Auto-layout: ${algo}`, gl: `Dispor: ${ALGO_LABELS[algo]}` },
        (tx) => {
          for (const c of commands.value) tx.apply(c)
        },
      )
      if (result.ok) skillTreeRef.current?.fit()
    },
    [editorEngine],
  )

  // 7.16 — convite tras importar: se ≥30% dos nodos non teñen posición,
  // barra discreta con «Dispor?» (sen modais; ✕ péchaa; ao dispor, a
  // condición faise falsa e desaparece soa).
  const senPosicion = doc.tree.nodes.filter((n) => n.position === undefined).length
  const showConvite =
    !conviteDismissed &&
    view === 'graph' &&
    !inProba &&
    doc.tree.nodes.length > 0 &&
    senPosicion / doc.tree.nodes.length >= 0.3

  // ── 7.15c — cambio de vista (grafo | tarxetas) ──
  // Cambiar de vista a medio xesto cancela o xesto; ao entrar en
  // tarxetas a tool volve a Seleccionar (as tools de creación non
  // existen alí, e así Supr segue operativo sobre a selección).
  const changeView = useCallback(
    (next: CanvasView) => {
      resetPointerState()
      setTool('select')
      onViewChange?.(next)
    },
    [resetPointerState, onViewChange],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Non interceptar mentres se escribe nun campo de texto (ex.
      // nome do nodo no Inspector, cor de tema): "n"/"c"/"v" son
      // letras normais aí.
      const target = e.target as HTMLElement | null
      const isTyping =
        target !== null &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (e.key === 'Escape') {
        resetPointerState()
        // 7.11: Esc volve sempre a Seleccionar (só ten sentido en
        // Autoría — a toolbar nin sequera se renderiza en Proba).
        if (!inProba) setTool('select')
        return
      }

      if (inProba || isTyping) return

      // 7.15c: en vista tarxetas non hai tools de creación — os
      // atallos v/n/c apáganse; Supr (borrar selección) e Ctrl+Z/Y
      // seguen funcionando.
      const inCards = view === 'cards'

      // ── 7.14-O6 (informe 02): Undo/Redo por teclado ──
      // Ctrl/Cmd+Z = desfacer; Ctrl/Cmd+Y ou Ctrl/Cmd+Shift+Z = refacer.
      // A garda de arriba (isTyping) evita roubar o undo NATIVO dos
      // campos de texto; a garda inProba evita tocar o documento en
      // Proba (alí o "undo" é Reiniciar). O Result de undo/redo
      // ignórase a propósito: se non hai que desfacer, é un no-op.
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) editorEngine.redo()
        else editorEngine.undo()
        return
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        editorEngine.redo()
        return
      }

      // 7.11: atallos de tool (7.15c: só na vista grafo).
      if (!inCards && (e.key === 'v' || e.key === 'V')) {
        changeTool('select')
        return
      }
      if (!inCards && (e.key === 'n' || e.key === 'N')) {
        changeTool('add')
        return
      }
      if (!inCards && (e.key === 'c' || e.key === 'C')) {
        changeTool('connect')
        return
      }

      // 7.11: Supr/Delete — borrado con cascada da selección actual
      // (só con tool Seleccionar; noutras tools non hai selección de
      // arestas nin sentido de "borrar" no medio dun xesto). 7.15c: en
      // tarxetas Supr SI funciona (a tool fórzase a select ao entrar).
      if (e.key === 'Delete' && (tool === 'select' || inCards)) {
        const selection = editorEngine.getSession().selection
        const refs = selection.current()
        const nodeIds = refs.filter((r) => r.kind === 'node').map((r) => r.id)
        const edgeIds = refs.filter((r) => r.kind === 'edge').map((r) => r.id)
        if (nodeIds.length === 0 && edgeIds.length === 0) return
        const cmds = buildRemoveCascade(editorEngine.getDocument(), nodeIds, edgeIds)
        if (cmds.length > 0) {
          editorEngine.transaction({ en: 'Delete', gl: 'Eliminar' }, (tx) => {
            for (const c of cmds) tx.apply(c)
          })
          selection.clear()
        }
      }
    },
    [inProba, tool, view, editorEngine, resetPointerState, changeTool],
  )
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleViewportChange = useCallback((_vs: ViewportState) => {
    // Forza re-medida do CTM no overlay (aneis/ghosts seguen aos nodos
    // cando o usuario pan/zoom).
    setViewportVersion((v) => v + 1)
  }, [])

  const { coordinateBounds, theme: themeSpec, background } = doc.meta

  // ── 7.5e → F7.9: mapeo tema→render ──
  //
  // Constrúe o `Theme` de @react partindo dunha BASE escollida segundo
  // `chromeTheme` (`minimalDark` en escuro, `minimal` en claro/sen
  // definir) con override parcial dos nodeFill<Estado> e textColor do
  // documento. Memoiza por identidade do `themeSpec`+`chromeTheme`
  // para non crear un obxecto novo en cada render.
  //
  // **F7.9**: antes disto había unha heurística ad-hoc só para o
  // texto (`textOverride = spec.textColor ?? (chromeTheme==='dark' ?
  // '#e8e9ea' : undefined)`). Arranxo de raíz: a heurística morre, a
  // BASE ENTEIRA cambia con `chromeTheme` (texto, arestas, malla,
  // trazos, recheo base — todos lexibles en escuro sen overrides
  // puntuais). O override do documento (`spec.textColor`, nodeFills)
  // segue gañando sempre sobre a base escollida.
  //
  // O ThemeProvider é un provider de contexto React puro — **non mete
  // nodos DOM entre o contedor e o `<svg>`/`<g>`**. Por tanto a costura
  // CTM de 7.5b-ii (findCanvasCtmElement busca o primeiro `<g>`
  // descendente do `<svg>`) segue intacta. Aínda así, verificable
  // visualmente con drag + zoom.
  const theme: Theme = useMemo(() => {
    // 7.17-C0: o mapeo spec→overrides vive en @editor-core
    // (themeOverridesFromSpec) para que o CLI de render o comparta.
    // Mesmo comportamento que antes: base enteira por chromeTheme,
    // overrides do documento gañan sempre.
    const dark = chromeTheme === 'dark'
    const base = dark ? minimalDark : minimal
    // 19.0: a tipografía é a OUTRA rama do Theme (irmá de `colors`), co
    // seu propio funil. Sen tipografía no documento non se toca a base
    // — por iso o spread condicional en vez de `typography: undefined`.
    const typography = themeTypographyFromSpec(themeSpec) as Theme['typography'] | undefined
    return {
      ...base,
      colors: {
        ...base.colors,
        ...(themeOverridesFromSpec(themeSpec, dark) as Partial<Theme['colors']>),
      },
      ...(typography !== undefined && {
        typography: { ...base.typography, ...typography },
      }),
    }
  }, [themeSpec, chromeTheme])

  // Rexións do tema → props do SkillTree. Mesma forma exacta.
  const regions: readonly RegionSpec[] = themeSpec?.regions ?? []

  // Fondo: v1 só `src`. `opacity/contrast` esperan a que @react os
  // consuma (banked).
  const backgroundImage: string | undefined = background?.src

  // ── 7.11 — liña fantasma da tool Conectar (doc-space) ──
  const connectLine = useMemo(() => {
    const state = pointerStateRef.current
    if (state.kind !== 'connecting' || connectCursorDoc === undefined) return undefined
    const sourcePos = nodePositions.get(state.sourceId)
    if (sourcePos === undefined) return undefined
    return { from: sourcePos, to: connectCursorDoc }
    // pointerStateRef non dispara re-render por si só; connectCursorDoc
    // SI (é o que muda en cada pointermove mentres se conecta), así que
    // vale como dep para recalcular isto en cada frame relevante.
  }, [connectCursorDoc, nodePositions])

  return (
    <div
      ref={containerRef}
      className="editor-canvas"
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      onPointerCancelCapture={handlePointerUp}
      // 7.14-M4 (informe 01): encher o panel dockview. Sen height/width
      // explícitos, o SVG (que é width/height:100%) colapsaba ao seu
      // tamaño intrínseco cadrado (viewBox) e desbordábase o panel,
      // tapándose ~40% detrás de Problemas. Igual que fai `.editor-panel`.
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {view === 'graph' ? (
        <>
          <ThemeProvider theme={theme}>
            <SkillTree
              ref={skillTreeRef}
              engine={treeEngine}
              onViewportChange={handleViewportChange}
              {...(coordinateBounds !== undefined && { coordinateBounds })}
              {...(regions.length > 0 && { regions })}
              {...(backgroundImage !== undefined && { backgroundImage })}
            />
          </ThemeProvider>
          <CanvasOverlay
            ctmEl={ctmEl}
            containerRect={containerRect}
            selectedRefs={selectedRefs}
            nodePositions={nodePositions}
            viewportVersion={viewportVersion}
            {...(ghostPositions !== undefined && { ghosts: ghostPositions })}
            {...(marqueeRectPx !== undefined && { marqueeRect: marqueeRectPx })}
            {...(connectLine !== undefined && { connectLine })}
          />
          {!inProba && (
            <CanvasToolbar
              tool={tool}
              onToolChange={changeTool}
              createPrerequisite={createPrerequisite}
              onCreatePrerequisiteChange={setCreatePrerequisite}
            >
              {/* 7.16: só en Autoría + vista grafo (a toolbar xa o garante). */}
              <DisporMenu onDispor={handleDispor} />
            </CanvasToolbar>
          )}
          {showConvite && (
            <div className="editor-dispor-convite" aria-label="Convite para dispor">
              <span>
                Hai {senPosicion} nodo{senPosicion === 1 ? '' : 's'} sen posición — ¿Dispor?
              </span>
              {(Object.entries(ALGO_LABELS) as [AutoLayoutAlgo, string][]).map(([algo, label]) => (
                <button
                  key={algo}
                  type="button"
                  className="editor-button editor-dispor-convite__algo"
                  onClick={() => handleDispor(algo)}
                >
                  {label}
                  {/* 7.18: a mesma axuda có menú — o convite tamén se explica só. */}
                  <span className="editor-dispor__item-help">{ALGO_HELP[algo]}</span>
                </button>
              ))}
              <button
                type="button"
                className="editor-dispor-convite__close"
                aria-label="Pechar o convite"
                onClick={() => setConviteDismissed(true)}
              >
                ✕
              </button>
            </div>
          )}
        </>
      ) : (
        // 7.15c — vista tarxetas: mesma árbore, outra forma de vela.
        // Sen tools de creación (mover/conectar/marquee son do grafo);
        // clic en fila selecciona (Inspector/ficha de Proba funcionan).
        <CanvasCardsView
          editorEngine={editorEngine}
          treeEngine={treeEngine}
          doc={doc}
          {...(firstSelectedNodeId !== undefined && { selectedNodeId: firstSelectedNodeId })}
        />
      )}
      {/* 7.15c — toggle de vista, nos DOUS modos (Autoría e Proba).
          fieldset = agrupación semántica nativa (o CSS resetea o chrome
          de formulario). */}
      <fieldset
        className="editor-canvas-viewtoggle"
        aria-label="Vista do canvas"
        title="Grafo: mover e conectar. Tarxetas: grupos como listas — o progreso vese en Proba."
      >
        <button
          type="button"
          className={`editor-canvas-viewtoggle__btn${view === 'graph' ? ' editor-canvas-viewtoggle__btn--active' : ''}`}
          aria-pressed={view === 'graph'}
          onClick={() => changeView('graph')}
        >
          grafo
        </button>
        <button
          type="button"
          className={`editor-canvas-viewtoggle__btn${view === 'cards' ? ' editor-canvas-viewtoggle__btn--active' : ''}`}
          aria-pressed={view === 'cards'}
          title="Para mover e conectar, vista grafo"
          onClick={() => changeView('cards')}
        >
          tarxetas
        </button>
      </fieldset>
    </div>
  )
}
// ── FIN: EditorCanvas ──
