'use client'
// ── INICIO: SkillTree ──
// Compoñente raíz SVG que toma un TreeEngine como prop e renderiza
// a árbore enteira. Subscríbese ao engine via useSyncExternalStore
// nativo de React 18+ (re-render automático). Computa layout
// internamente via computeLayout. Headless: cero estilos hardcoded.

import {
  type Bounds,
  type CurveStyle,
  type LayoutEngineRegistry,
  type TreeEngine,
  buildPaths,
  computeLayout,
} from '@yggdrasil-forge/core'
import { forwardRef, useImperativeHandle, useMemo, useRef, useSyncExternalStore } from 'react'
import { MeshOverlay } from './MeshOverlay.js'
import { Minimap } from './Minimap.js'
import { SVGRenderer } from './SVGRenderer.js'
import { SkillEdge, edgeStateFor } from './SkillEdge.js'
import { SkillNode } from './SkillNode.js'
import { SkillNodeControls } from './SkillNodeControls.js'
import {
  type RegionLabelPlacement,
  type RegionShape,
  type RegionSpec,
  SkillRegions,
} from './SkillRegions.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'
import { shortenEdgeAtTarget } from './edgeGeometry.js'
import { type ViewportState, useViewport } from './hooks/useViewport.js'
import { resolveRadius } from './nodeGeometry.js'

/**
 * Handle imperativo expoñido vía `ref` (F10.6) para que consumidores
 * (ex. botóns no toolbar do demo) poidan controlar o viewport.
 */
export interface SkillTreeHandle {
  /** Encadra `bounds` (con `padding`) no viewport actual. */
  fit(): void
  /** Volve ao transform identidade (panX=0, panY=0, zoom=1). */
  reset(): void
  zoomIn(): void
  zoomOut(): void
  getZoom(): number
  /**
   * Centra a vista no nodo indicado (7.18b). Salto directo, coherente
   * con `fit()` (que tampouco anima); `opts.zoom` fixa o zoom (co
   * clamp de sempre), sen el consérvase o actual. O pan resultante
   * pasa polo MESMO `clampPan` do pan manual.
   *
   * **No-op silencioso** se o `nodeId` non existe, o layout non
   * produciu posición para el, ou o layout está en erro — o handle
   * non lanza.
   */
  centerOn(nodeId: string, opts?: { readonly zoom?: number }): void
}

export interface SkillTreeProps {
  readonly engine: TreeEngine
  readonly locale?: string
  readonly onNodeClick?: (nodeId: string) => void
  readonly onEdgeClick?: (edgeId: string) => void
  /**
   * Handler opcional disparado tras un long press (700ms default)
   * sobre un nodo. Propágase a SkillNode internamente.
   */
  readonly onNodeLongPress?: (nodeId: string) => void
  readonly layoutRegistry?: LayoutEngineRegistry
  readonly padding?: number
  /**
   * Override de presentación de curva (F10.4b). Cando se pasa, aplica
   * `buildPaths(layoutResult, curve)` tree-wide **por riba** do que
   * `computeLayout` produza (que xa pode traer xeometría desde o
   * contrato de datos via `LayoutConfig.curve` + `EdgeStyle.routing`).
   *
   * **Canónico = contrato de datos**: para skill-trees serializables /
   * que viaxen entre Studio, exportadores e outros renderers, prefire
   * configurar `treeDef.layout.curve` (e `edge.style.routing` para
   * overrides por-edge). Este prop é só para axustes de
   * presentación puntuais en UI (MASTER A.6.20).
   */
  readonly curve?: CurveStyle
  /** Zoom mínimo do viewport interactivo (F10.6). Default `0.25`. */
  readonly minZoom?: number
  /** Zoom máximo do viewport interactivo (F10.6). Default `4`. */
  readonly maxZoom?: number
  /**
   * Encadrar bounds ao montar (F10.6). Default `true`. Cando `false`,
   * o viewport arranca con transform identidade (panX=0, panY=0,
   * zoom=1).
   */
  readonly fitOnMount?: boolean
  /**
   * Callback opcional disparado cando cambia o transform do viewport
   * (F10.6).
   */
  readonly onViewportChange?: (state: ViewportState) => void
  /**
   * Minimapa na esquina inferior esquerda (19.9). Opt-in: sen isto non
   * se renderiza nada. Clic nel leva alí.
   *
   * A esa densidade non é adorno: cun atlas de centos de nodos, sen
   * minimapa non se sabe onde estás.
   */
  readonly minimap?: boolean

  /**
   * ID do nodo actualmente seleccionado (F10.7). Controlado polo
   * consumidor; o `SkillTree` non xestiona internamente que nodo
   * está seleccionado (cero estado interno aquí). O nodo cuxo `id`
   * coincida recibe `selected` (anel exterior themed con
   * `theme.colors.selected`).
   *
   * Patrón típico: `const [sel, setSel] = useState<string | null>(null)`
   * + `onNodeClick={(id) => setSel(id)}` + `selectedNodeId={sel ?? undefined}`.
   */
  readonly selectedNodeId?: string

  /**
   * Callback opcional disparado cando o pointer entra/sae dun nodo
   * (F10.7). Recibe o `nodeId` ao entrar, `null` ao saír. Permite
   * sincronizar un panel lateral, tooltip externo, etc. Ortogonal a
   * `selectedNodeId` (o consumidor decide se hover muta a selección).
   */
  readonly onNodeHover?: (nodeId: string | null) => void

  /**
   * Fixa o espazo de coordenadas do SVG en lugar de derivalo dos
   * nodos. Cando se pasa, o `viewBox` é EXACTAMENTE este box (+
   * `padding`, default 0), sen a inflación de `maxRadius + 28` que
   * o auto-fit aplica por defecto.
   *
   * Útil cando o consumidor quere mapear posicións 1:1 á pantalla
   * (p.ex. para aliñar cunha imaxe de fondo): o nodo en `(x, y)` da
   * fixture cae no punto `(x, y)` do viewBox. **Recoméndase**
   * combinar con `fitOnMount={false}` (o viewBox xa enquadra todo,
   * o viewport arranca en identidade) e con `padding={0}` (o consumidor
   * elixe o seu propio padding visual).
   *
   * Sen esta prop: comportamento legacy (bounds derivados dos nodos,
   * inflados para acomodar o radio máximo).
   */
  readonly coordinateBounds?: Bounds

  /**
   * URL dunha imaxe a renderizar como fondo do canvas SVG, **dentro**
   * do grupo de pan/zoom (escala e desprázase cos nodos). A imaxe
   * ocupa o box dos `bounds` co `preserveAspectRatio="xMidYMid meet"`
   * (letterbox proporcional).
   *
   * Patrón habitual: combinar con `coordinateBounds` igual ao box da
   * imaxe, así o aliñamento nodo↔imaxe é determinista.
   *
   * Sen esta prop: cero fondo (transparente). Os consumidores poden
   * seguir usando background CSS do canto pai se prefiren a vía vella,
   * pero sufrirán o desfase con pan/zoom.
   */
  readonly backgroundImage?: string

  /**
   * Mostrar o badge `currentTier/maxTier` nos nodos (Interactivo
   * Capa B). Pásase tal cal a cada `SkillNode`. Default = só nodos
   * multi-tier; `true` fórzao en todos, `false` apágao en todos.
   */
  readonly showTierBadge?: boolean

  /**
   * Callback para investir un punto no nodo (Interactivo Capa B).
   * Cando se pasa **e** hai `selectedNodeId`, renderízase un botón
   * **➕** SVG nativo dentro do `<g transform>` adxacente ao nodo.
   * O consumidor cablea normalmente a `engine.unlock(nodeId)`. Cero
   * acoplamento ao motor (callback, non chamada directa).
   */
  readonly onNodeTierIncrease?: (nodeId: string) => void

  /**
   * Callback para retirar un punto do nodo (Interactivo Capa B).
   * Cando se pasa **e** hai `selectedNodeId`, renderízase un botón
   * **➖** SVG nativo dentro do `<g transform>` adxacente ao nodo.
   * O consumidor cablea normalmente a `engine.lockOneTier(nodeId)`.
   *
   * Disabled automático en `currentTier === 0` (sen nada que
   * retirar). O consumidor non precisa engadir lóxica adicional.
   */
  readonly onNodeTierDecrease?: (nodeId: string) => void

  /**
   * Predicado opcional que decide se ➕ está habilitado para o nodo
   * seleccionado (afordabilidade, prereqs cumpridos, etc.). Se
   * devolve `false`, ➕ apárece disabled visualmente. Default
   * (ausente): ➕ activo sempre que `currentTier < maxTier`. O motor
   * rexeitará igualmente se non hai budget; este predicado é só un
   * hint visual para evitar o feedback err do motor en clics inutiles.
   */
  readonly canIncrease?: (nodeId: string) => boolean

  /**
   * Especificacións de **rexións visuais** (Capa 2 — rexións + Theme Lab).
   * Cada rexión agrupa os nodos que comparten `tag` no seu `NodeDef.tags`
   * e píntase como un `<rect>` con tinte de fondo detrás dos edges/nodos.
   *
   * Cero schema en `@core`: as rexións son unha capa visual de presentación
   * sobre tags xa existentes do TreeDef. Útil para distinguir columnas
   * lóxicas (ex. Guerreiro / Paladín / Clérigo) sen tocar o motor.
   *
   * Sen `regions` (ou array baleiro) → cero render extra (regresión cero).
   */
  readonly regions?: readonly RegionSpec[]

  /**
   * Forma do tinte das `regions`. `'box'` (default) = rect bbox redondeado
   * (comportamento legado). `'hull'` = blob orgánico (Catmull-Rom pechado
   * sobre o convex hull). Ignórase se non hai `regions`.
   *
   * Regresión cero sobre consumidores existentes (default `'box'`).
   */
  readonly regionShape?: RegionShape
  /** Onde vai o nome da rexión (19.8). Default `'top'`. */
  readonly regionLabel?: RegionLabelPlacement
}

export const SkillTree = forwardRef<SkillTreeHandle, SkillTreeProps>(function SkillTree(
  {
    engine,
    locale,
    onNodeClick,
    onEdgeClick,
    onNodeLongPress,
    layoutRegistry,
    padding = 16,
    curve,
    minZoom,
    maxZoom,
    fitOnMount,
    onViewportChange,
    selectedNodeId,
    onNodeHover,
    showTierBadge,
    onNodeTierIncrease,
    onNodeTierDecrease,
    canIncrease,
    regions,
    regionShape = 'box',
    regionLabel = 'top',
    minimap = false,
    coordinateBounds,
    backgroundImage,
  },
  ref,
) {
  const state = useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getServerSnapshot.bind(engine),
  )

  const treeDef = engine.getTreeDef()
  const registry = useMemo(() => layoutRegistry ?? createDefaultLayoutRegistry(), [layoutRegistry])
  const layoutResult = useMemo(
    () => computeLayout(treeDef, registry, locale),
    [treeDef, registry, locale],
  )

  // F10.6: bounds + effectivePadding pre-calculados (pasamos undefined
  // ao useViewport cando layoutResult non é ok, e o hook xa guarda).
  // Tódolos hooks (useRef, useViewport, useImperativeHandle) chamáns
  // ANTES do return condicional para non violar a regra dos hooks.
  //
  // Cando o consumidor fixa o espazo de coordenadas con
  // `coordinateBounds`, usamos ese box tal cal + padding directo (sen
  // a inflación `maxRadius + 28` do auto-fit). Iso fai o mapeo nodo →
  // pantalla determinista (útil para aliñar cunha imaxe de fondo).
  const layoutBounds = layoutResult.ok ? layoutResult.value.bounds : undefined
  const okBounds = coordinateBounds ?? layoutBounds
  const maxRadius = treeDef.nodes.reduce((m, n) => Math.max(m, resolveRadius(n)), 0)
  const effectivePadding = coordinateBounds !== undefined ? padding : padding + maxRadius + 28

  const svgRef = useRef<SVGSVGElement>(null)
  const viewport = useViewport(svgRef, okBounds, effectivePadding, {
    ...(minZoom !== undefined && { minZoom }),
    ...(maxZoom !== undefined && { maxZoom }),
    ...(fitOnMount !== undefined && { fitOnMount }),
    ...(onViewportChange !== undefined && { onChange: onViewportChange }),
  })

  useImperativeHandle(
    ref,
    () => ({
      fit: viewport.fit,
      reset: viewport.reset,
      zoomIn: viewport.zoomIn,
      zoomOut: viewport.zoomOut,
      getZoom: viewport.getZoom,
      centerOn: (nodeId: string, opts?: { readonly zoom?: number }) => {
        // No-op silencioso (contrato do handle): sen layout ok ou sen
        // posición para o nodo non hai onde centrar.
        if (!layoutResult.ok) return
        const position = layoutResult.value.nodes.get(nodeId)
        if (position === undefined) return
        viewport.centerOn(position.x, position.y, opts?.zoom)
      },
    }),
    [
      viewport.fit,
      viewport.reset,
      viewport.zoomIn,
      viewport.zoomOut,
      viewport.getZoom,
      viewport.centerOn,
      layoutResult,
    ],
  )

  // F10.4 + Fase 16.4 perf: `buildPaths` aplícase UNHA vez por (layout,
  // curve), non en cada render — con `curve` recreaba tódolos paths en
  // cada interacción e anulaba a memoización de SkillEdge. Hook ANTES
  // do return condicional (regra dos hooks).
  const finalLayoutMemo = useMemo(
    () =>
      layoutResult.ok
        ? curve !== undefined
          ? buildPaths(layoutResult.value, curve)
          : layoutResult.value
        : undefined,
    [layoutResult, curve],
  )

  // Caso de erro: delegar en SVGRenderer co modo erro.
  if (!layoutResult.ok) {
    return (
      <SVGRenderer
        padding={padding}
        error={layoutResult.error.code}
        errorMessage={layoutResult.error.message}
      />
    )
  }

  // F10.4: aplicar curve (opcional). buildPaths é puro — recibe o
  // LayoutResult sen mutar; cando `curve` non se pasa, salta a
  // transformación (paths retos do layout, comportamento legacy).
  const finalLayout = finalLayoutMemo ?? layoutResult.value

  const { nodes: nodePositions, edges: edgePaths, bounds, mesh } = finalLayout

  const edgeMap = useMemo(() => {
    const m = new Map<string, (typeof treeDef.edges)[number]>()
    for (const e of treeDef.edges) m.set(e.id, e)
    return m
  }, [treeDef])

  // F10.4.fix-arrow: lookup de raio por id de nodo, para acortar paths
  // de edges `directed` e que a frecha quede visible fóra do nodo target.
  const nodeRadius = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of treeDef.nodes) m.set(n.id, resolveRadius(n))
    return m
  }, [treeDef])

  // Fase 16.4 perf: as listas de elementos memoízanse. Unha interacción
  // que non toque treeDef/estado/selección (p.ex. a selección do editor,
  // que vai pola overlay) reutiliza os MESMOS arrays: cero createElement
  // e cero comparacións nos 6.000 fillos a 1500 nodos. Tamén corrixe
  // que `shortenEdgeAtTarget` creaba un path novo por render nas
  // arestas directed (anulaba o memo de SkillEdge).
  const edgeElements = useMemo(
    () =>
      [...edgePaths.entries()].map(([edgeId, path]) => {
        const edge = edgeMap.get(edgeId)
        /* v8 ignore next 1 -- defensivo: edgePaths vén de computeLayout sobre treeDef.edges */
        if (edge === undefined) return null
        // F10.4: estado do edge = derivado do estado do source.
        const sourceState = state.nodes[edge.source]?.state
        const edgeState = edgeStateFor(sourceState)
        // F10.4.fix-arrow: se o edge é directed, acortamos o path no
        // extremo target o suficiente para que a frecha quede visible
        // fóra do nodo. Gap = radio do target + pequena marxe.
        const directed = edge.style?.directed === true
        const targetRadius = nodeRadius.get(edge.target) ?? 0
        const finalPath =
          directed && targetRadius > 0 ? shortenEdgeAtTarget(path, targetRadius + 2) : path
        return (
          <SkillEdge
            key={edgeId}
            edgeId={edgeId}
            edge={edge}
            path={finalPath}
            edgeState={edgeState}
            {...(onEdgeClick !== undefined && { onClick: onEdgeClick })}
          />
        )
      }),
    [edgePaths, edgeMap, state, nodeRadius, onEdgeClick],
  )
  // ── 19.2: quen está desbloqueable AGORA ──
  //
  // `unlockable` non é un estado que o motor garde (só o escribe se un
  // documento o forza cun efecto `modify_node_state`): é unha PREGUNTA,
  // `canUnlock`, que inclúe prerrequisitos, exclusións E afordabilidade.
  // Antes disto ninguén a facía ao pintar, así que o recheo `unlockable`
  // do tema, o seu anel e o pulso de `animations.ts` eran tinta morta e
  // o brillo do «seguinte paso» non saía nin no editor nin en
  // `ygg render`.
  //
  // Custo: só se pregunta polos nodos `locked`, e o memo depende de
  // `state`, así que corre ao cambiar o estado — non por frame, nin ao
  // arrastrar ou facer zoom. Medido no core: ~9 ms para unha pasada
  // completa de 1500 nodos, por baixo do re-render que ese mesmo cambio
  // xa dispara.
  const unlockableIds = useMemo(() => {
    const ids = new Set<string>()
    for (const node of treeDef.nodes) {
      if ((state.nodes[node.id]?.state ?? 'locked') !== 'locked') continue
      const check = engine.canUnlock(node.id)
      if (check.ok && check.value.allowed) ids.add(node.id)
    }
    return ids
  }, [engine, treeDef, state])

  // ── 19.10: os nodos GRANDES pintan enriba ──
  //
  // En SVG non hai z-index: manda a orde do documento. Coa orde do
  // ficheiro, un nodo pequeno emitido despois tápalle o RÓTULO a un
  // grande emitido antes — vísteo no atlas, con «Mestre de Ribeira»
  // cortado por dous smalls.
  //
  // A regra é «o fito pinta enriba»: ordénase por radio ascendente, así
  // que os grandes (que son, pola regra de `labelMinRadius`, xustamente
  // os que levan texto) quedan ao final. `sort` de V8 é estable, así que
  // entre iguais consérvase a orde do documento e o render segue sendo
  // determinista.
  const nodosPintados = useMemo(
    () => [...treeDef.nodes].sort((a, b) => resolveRadius(a) - resolveRadius(b)),
    [treeDef],
  )

  const nodeElements = useMemo(
    () =>
      nodosPintados.map((node) => {
        const position = nodePositions.get(node.id)
        /* v8 ignore next 1 -- defensivo: computeLayout produce posicións para tódolos treeDef.nodes */
        if (position === undefined) return null
        const isSelected = selectedNodeId !== undefined && node.id === selectedNodeId
        return (
          <SkillNode
            key={node.id}
            node={node}
            instance={state.nodes[node.id]}
            position={position}
            {...(onNodeClick !== undefined && { onClick: onNodeClick })}
            {...(onNodeLongPress !== undefined && { onLongPress: onNodeLongPress })}
            {...(isSelected && { selected: true })}
            {...(onNodeHover !== undefined && { onHover: onNodeHover })}
            {...(showTierBadge !== undefined && { showTierBadge })}
            {...(unlockableIds.has(node.id) && { unlockable: true })}
          />
        )
      }),
    [
      nodosPintados,
      nodePositions,
      state,
      onNodeClick,
      onNodeLongPress,
      selectedNodeId,
      onNodeHover,
      showTierBadge,
      unlockableIds,
    ],
  )

  return (
    <SVGRenderer
      ref={svgRef}
      bounds={coordinateBounds ?? bounds}
      padding={effectivePadding}
      layoutType={layoutResult.value.layoutType}
      transform={viewport.transform}
      {...(backgroundImage !== undefined && { backgroundImage })}
      onPointerDown={viewport.onPointerDown}
      onPointerMove={viewport.onPointerMove}
      onPointerUp={viewport.onPointerUp}
      {...(minimap && {
        overlay: (
          <Minimap
            nodes={treeDef.nodes}
            nodePositions={nodePositions}
            bounds={coordinateBounds ?? bounds}
            viewBox={{
              // Mesmo viewBox que o SVGRenderer compón a partir de
              // bounds+padding: se se derivase doutra maneira, o
              // rectángulo do viewport mentiría.
              x: (coordinateBounds ?? bounds).minX - effectivePadding,
              y: (coordinateBounds ?? bounds).minY - effectivePadding,
              w:
                (coordinateBounds ?? bounds).maxX -
                (coordinateBounds ?? bounds).minX +
                effectivePadding * 2,
              h:
                (coordinateBounds ?? bounds).maxY -
                (coordinateBounds ?? bounds).minY +
                effectivePadding * 2,
            }}
            viewport={viewport.state}
            {...(regions !== undefined && regions.length > 0 && { regions })}
            onNavigate={(x, y) => viewport.centerOn(x, y)}
          />
        ),
      })}
    >
      <MeshOverlay {...(mesh !== undefined && { mesh })} />
      {regions !== undefined && regions.length > 0 && (
        <SkillRegions
          regions={regions}
          nodePositions={nodePositions}
          nodes={treeDef.nodes}
          regionShape={regionShape}
          regionLabel={regionLabel}
        />
      )}
      <g className="yf-skill-edges">{edgeElements}</g>
      <g className="yf-skill-nodes">{nodeElements}</g>
      {/* Interactivo Capa B: controis ➕/➖ no nodo seleccionado. Renderízanse
          dentro do <g transform> do viewport (móvense co pan/zoom). Cero
          chamada ao motor; o consumidor cablea via onNodeTierIncrease /
          onNodeTierDecrease. */}
      {selectedNodeId !== undefined &&
        (onNodeTierIncrease !== undefined || onNodeTierDecrease !== undefined) &&
        (() => {
          const selectedDef = treeDef.nodes.find((n) => n.id === selectedNodeId)
          const selectedPos = nodePositions.get(selectedNodeId)
          if (selectedDef === undefined || selectedPos === undefined) return null
          const inst = state.nodes[selectedNodeId]
          const currentTier = inst?.currentTier ?? 0
          const maxTier = selectedDef.maxTier ?? 1
          const nodeRadius = resolveRadius(selectedDef)
          // Noop fallback se só un callback foi pasado.
          const onInc = onNodeTierIncrease ?? (() => undefined)
          const onDec = onNodeTierDecrease ?? (() => undefined)
          const canInc = canIncrease !== undefined ? canIncrease(selectedNodeId) : true
          return (
            <g className="yf-skill-tree-controls-layer">
              <SkillNodeControls
                position={selectedPos}
                nodeRadius={nodeRadius}
                nodeId={selectedNodeId}
                currentTier={currentTier}
                maxTier={maxTier}
                canIncrease={canInc}
                onIncrease={onInc}
                onDecrease={onDec}
              />
            </g>
          )
        })()}
    </SVGRenderer>
  )
})
// ── FIN: SkillTree ──
