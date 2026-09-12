// ── INICIO: examples/editor/main.tsx ──
// App runnable que monta o EditorShell. Desde 7.10, o editor pasa de
// demo (fixture cableada, morre co F5) a ferramenta real: Novo /
// Importar / Exportar en JSON local, sen backend.
//
// **Principio A.6**: o editor é unha ferramenta sobre dato, non
// contén dato. O paquete @yggdrasil-forge/editor-react non importa
// fixture ningún; é a APP a que decide que documento abrir.
//
// **7.10**: o motor xa non se crea a nivel de módulo — vive en
// estado de React (`useState`), porque substituír o documento
// (Novo/Importar) require un `EditorEngine` novo. O remount
// (`key={docEpoch}`) garante que selección, undo e sesión de proba
// nacen limpos co documento novo; a disposición de paneis NON se
// perde (persiste en localStorage por 7.7, independente do motor).

import type { TreeDef } from '@yggdrasil-forge/core'
import {
  type DocumentMeta,
  type EditorDocument,
  EditorEngine,
  createDefaultValidators,
  createEditorDocument,
  deserializeDocument,
  serializeDocument,
  standaloneSvg,
  toJson,
} from '@yggdrasil-forge/editor-core'
import { EditorShell } from '@yggdrasil-forge/editor-react'
import { FORGE_ICONS, LOGIC_ICONS, NORSE_ICONS, registerIcons } from '@yggdrasil-forge/react'
import 'dockview-react/dist/styles/dockview.css'
import '@yggdrasil-forge/editor-react/styles.css'
import type { SerializedDockview } from 'dockview-react'
import { type JSX, StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { panadeiroDocumentMeta, panadeiroTree } from './fixtures/panadeiro.js'

// ── 7.7 — persistencia da disposición ──
// Clave **versionada**: incrementar LAYOUT_VERSION cando cambien
// os ids/conxunto de paneis, para invalidar layouts vellos sen
// pegarse a bugs de "pestanas orfas". Con versión distinta, fromJSON
// simplemente non atopa o gardado, cae ao default. Cero risco.
// v2: 7.15b engade o panel «Código» ao conxunto.
const LAYOUT_VERSION = 2
const LAYOUT_STORAGE_KEY = `ygg-editor-layout@v${LAYOUT_VERSION}`

function loadLayout(): SerializedDockview | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === null) return undefined
    return JSON.parse(raw) as SerializedDockview
  } catch {
    return undefined
  }
}
function saveLayout(layout: SerializedDockview): void {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // Cota chea ou modo privado — silencio.
  }
}
function clearLayout(): void {
  try {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY)
  } catch {
    // Idem.
  }
}

// ── 7.8 — tema do chrome (claro/escuro) ──
// Mesma clave que le o script anti-flash de index.html. Por defecto
// claro; se o localStorage falla (cota/privado) cae en claro tamén.
type EditorTheme = 'light' | 'dark'
const THEME_STORAGE_KEY = 'ygg-editor-theme'

// ── 15.6 — Supervivencia: autosave do documento ──
// O último «come-traballo» do produto: ata agora F5 perdía todo o non
// exportado. Clave versionada (doutrina 7.7). Envoltura {savedAt, json}
// para poder dicir DE CANDO é o traballo recuperado.
const AUTOSAVE_STORAGE_KEY = 'ygg-editor-autosave@v1'
/** Límite de tamaño serializado (~4MB): por riba, degradación honesta. */
const AUTOSAVE_SIZE_LIMIT = 4_000_000
const AUTOSAVE_DEBOUNCE_MS = 1000

interface AutosavePayload {
  readonly savedAt: string
  readonly json: string
}

function readAutosave(): AutosavePayload | null {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as Partial<AutosavePayload>
    if (typeof parsed.savedAt !== 'string' || typeof parsed.json !== 'string') return null
    return { savedAt: parsed.savedAt, json: parsed.json }
  } catch {
    return null
  }
}

function clearAutosave(): void {
  try {
    window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY)
  } catch {
    // Cota/privado — silencio.
  }
}

function loadTheme(): EditorTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// ── 7.10 — motor + I/O de documento ──

/** Documento panadeiro por defecto (o mesmo que antes de 7.10). */
function loadDefaultDocument(): EditorDocument {
  // Carga panadeiro como dato + coordinateBounds para que a status bar
  // amose "World W×H" e o SkillTree fit-on-mount encadre ben, e o
  // tema por defecto (7.5e §5) que aplica preset "tintado" + rexión pan.
  return createEditorDocument(panadeiroTree, panadeiroDocumentMeta)
}

/**
 * Árbore baleira para "Novo". Campos mínimos confirmados polo probe
 * A.6.42 (briefing 7.10, Cambio 3): `nodes`/`edges` sen mínimo no
 * schema, pero `id`/`schemaVersion`/`version`/`label`/`layout.type`
 * son obrigatorios.
 */
function emptyTreeDef(): TreeDef {
  return {
    id: 'nova-arbore',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Nova árbore' },
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
}

/**
 * **Fix (reportado polo dono, xunto co fix de fit-on-mount en
 * @yggdrasil-forge/react)**: sen `coordinateBounds` explícito, o
 * `viewBox` do SkillTree segue `layoutBounds` — recalculado en CADA
 * edición a partir das posicións reais dos nodos. Nunha árbore
 * baleira/nova, iso significa que o `viewBox` (e por tanto o "zoom"
 * percibido) medra/encolle cada vez que engades un nodo, aínda que o
 * fix de `useViewport` xa non che resete o pan/zoom manual. Fornecer
 * un `coordinateBounds` fixo (mesmo patrón que xa usa `panadeiroDocumentMeta`)
 * estabiliza a vista mentres constrúes.
 */
const emptyDocumentMeta: Partial<DocumentMeta> = {
  coordinateBounds: { minX: -200, minY: -200, maxX: 200, maxY: 200 },
}

function buildEngine(doc: EditorDocument): EditorEngine {
  // ★ 7.5c-ii: rexistrar os soft validators para que o ProblemsPanel
  // reciba warnings (asymmetricExclusion, prerequisiteCycle,
  // layoutOverflow, unsupportedFeature). Os duros (structural,
  // uniqueIds, referentialIntegrity) xa están incluídos polo engine.
  return new EditorEngine(doc, { validators: createDefaultValidators() })
}

// 15.6: estilos dos banners de supervivencia (a app de exemplo non ten
// CSS propio; tokens do chrome para respectar claro/escuro).
const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 14px',
  background: 'var(--editor-bg-elevated)',
  color: 'var(--editor-text-primary)',
  border: '1px solid var(--editor-border-strong)',
  borderRadius: 8,
  boxShadow: 'var(--editor-shadow-elev1)',
  font: '13px var(--editor-font-ui)',
}
const noticeStyle: React.CSSProperties = {
  ...bannerStyle,
  top: 'auto',
  bottom: 8,
  color: 'var(--editor-text-secondary)',
}
const bannerButtonStyle: React.CSSProperties = {
  border: '1px solid var(--editor-border-strong)',
  background: 'var(--editor-bg-panel)',
  color: 'var(--editor-text-primary)',
  borderRadius: 6,
  padding: '3px 10px',
  cursor: 'pointer',
  font: 'inherit',
}

function App(): JSX.Element {
  const initialLayout = useMemo(() => loadLayout(), [])
  const onLayoutChange = useCallback((layout: SerializedDockview) => saveLayout(layout), [])
  const onLayoutInvalid = useCallback(() => clearLayout(), [])

  // ── 7.8 — tema do chrome ──
  const [theme, setTheme] = useState<EditorTheme>(() => loadTheme())
  useEffect(() => {
    document.documentElement.dataset.editorTheme = theme
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Cota chea ou modo privado — silencio.
    }
  }, [theme])
  const onThemeChange = useCallback((t: EditorTheme) => setTheme(t), [])

  // ── 7.10 — motor en estado + remount por docEpoch ──
  const [engine, setEngine] = useState<EditorEngine>(() => buildEngine(loadDefaultDocument()))
  const [docEpoch, setDocEpoch] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const replaceDocument = useCallback((doc: EditorDocument) => {
    // ── 7.14-B: cinto de seguridade ──
    // Nunca substituír o motor/documento actual antes de ter o novo
    // SAN. `deserializeDocument` xa corre os validadores duros (o
    // camiño normal non trae docs malos), pero se algo escapa igual e
    // `buildEngine` lanza, avisamos e conservamos o documento actual —
    // en vez de deixar a app a medias e perder o traballo (informe 05).
    let nextEngine: EditorEngine
    try {
      nextEngine = buildEngine(doc)
    } catch (error) {
      window.alert(
        `Non se puido abrir o documento: ${error instanceof Error ? error.message : String(error)}`,
      )
      return
    }
    setEngine(nextEngine)
    setDocEpoch((n) => n + 1)
  }, [])

  const handleNew = useCallback(() => {
    if (!window.confirm('Substituír o documento actual? O que non exportaras perderase.')) {
      return
    }
    // Novo = folla en branco: nada que recuperar (o autosave volverá
    // en canto haxa un primeiro commit de edición).
    clearAutosave()
    replaceDocument(createEditorDocument(emptyTreeDef(), emptyDocumentMeta))
  }, [replaceDocument])

  // ── 15.6 — autosave: subscrición ao motor con debounce ──
  // Se o documento excede o límite (ou localStorage rebenta de cota),
  // desactívase o autosave DESTA sesión cun aviso discreto único —
  // degradación honesta, nunca crashear.
  const autosaveDisabledRef = useRef(false)
  const [autosaveNotice, setAutosaveNotice] = useState<string | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const save = (): void => {
      if (autosaveDisabledRef.current) return
      const json = serializeDocument(engine.getDocument())
      if (json.length > AUTOSAVE_SIZE_LIMIT) {
        autosaveDisabledRef.current = true
        setAutosaveNotice('Documento grande de máis para o autogardado — exporta a man.')
        return
      }
      try {
        window.localStorage.setItem(
          AUTOSAVE_STORAGE_KEY,
          JSON.stringify({ savedAt: new Date().toISOString(), json }),
        )
      } catch {
        autosaveDisabledRef.current = true
        setAutosaveNotice('Non se puido autogardar (almacenamento cheo) — exporta a man.')
      }
    }
    const unsubscribe = engine.subscribe(() => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        save()
      }, AUTOSAVE_DEBOUNCE_MS)
    })
    return () => {
      if (timer !== null) clearTimeout(timer)
      unsubscribe()
    }
  }, [engine])

  // ── 15.6 — recuperación no arranque ──
  // Se hai autosave, banner ANTES de nada. Continuar → deserializar (a
  // proba de balas de sempre; corrupto → descártase con mensaxe e
  // arranque normal). Descartar → limpar a clave.
  const [recovery, setRecovery] = useState<AutosavePayload | null>(() => readAutosave())
  const handleRecoveryContinue = useCallback(() => {
    if (recovery === null) return
    const restored = deserializeDocument(recovery.json)
    if (!restored.ok) {
      window.alert(`O autogardado estaba corrupto e descartouse: ${restored.error.message}`)
      clearAutosave()
      setRecovery(null)
      return
    }
    replaceDocument(restored.value)
    setRecovery(null)
  }, [recovery, replaceDocument])
  const handleRecoveryDiscard = useCallback(() => {
    clearAutosave()
    setRecovery(null)
  }, [])

  const handleExport = useCallback(() => {
    const doc = engine.getDocument()
    const json = toJson(doc)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.tree.id || 'arbore'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [engine])

  // ── 7.17 — Exportar imaxe (SVG autocontido / PNG 2x) ──
  // Serializa o <svg> VIVO do canvas (en Proba leva os estados da
  // sesión) e faino autocontido con standaloneSvg (@editor-core, a
  // mesma utilidade que usa `ygg render`). O pan/zoom resetéase no
  // clon: o export é a árbore ENTEIRA encadrada, determinista — non
  // "o que casualmente vías".
  const buildImageSvg = useCallback((): { text: string; name: string } | null => {
    const live = document.querySelector('svg.yf-skill-tree')
    if (!(live instanceof SVGSVGElement)) {
      window.alert('Non hai canvas de grafo á vista para exportar.')
      return null
    }
    const clone = live.cloneNode(true) as SVGSVGElement
    const viewport = clone.querySelector(':scope > g')
    viewport?.setAttribute('transform', 'translate(0 0) scale(1)')
    // 19.10: fóra o MINIMAPA. É mobiliario do visor, non a árbore; e o
    // seu rectángulo quedaría conxelado no encadre que tiñas ao
    // exportar, xusto o que este export promete non facer (acaba de
    // resetear o pan/zoom para ser determinista). Sae en árbores de 40
    // nodos ou máis, así que sen isto os exports grandes levan un
    // minimapa incrustado.
    clone.querySelector('.yf-minimap')?.remove()
    const markup = new XMLSerializer().serializeToString(clone)
    // 19.10: manda o LENZO do documento se o declara. Antes saía sempre
    // do CSS do chrome, así que exportar un documento escuro desde un
    // editor en claro daba un marco claro arredor dun debuxo escuro.
    const background =
      engine.getDocument().meta.theme?.background ??
      getComputedStyle(document.documentElement).getPropertyValue('--editor-bg-canvas').trim() ??
      '#f4f4f1'
    const result = standaloneSvg(markup, { background: background || '#f4f4f1' })
    if (!result.ok) {
      window.alert(`Non se puido exportar a imaxe: ${result.error.message}`)
      return null
    }
    const name = engine.getDocument().tree.id || 'arbore'
    return { text: result.value, name }
  }, [engine])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleExportSvg = useCallback(() => {
    const built = buildImageSvg()
    if (built === null) return
    downloadBlob(new Blob([built.text], { type: 'image/svg+xml' }), `${built.name}.svg`)
  }, [buildImageSvg, downloadBlob])

  const handleExportPng = useCallback(() => {
    const built = buildImageSvg()
    if (built === null) return
    // Rasterizado no navegador (por iso o PNG vive aquí e non no CLI):
    // Image + canvas a 2x para nitidez.
    const svgUrl = URL.createObjectURL(new Blob([built.text], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth * scale
      canvas.height = img.naturalHeight * scale
      const ctx = canvas.getContext('2d')
      if (ctx === null) {
        URL.revokeObjectURL(svgUrl)
        window.alert('Non se puido crear o lenzo de rasterizado.')
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(svgUrl)
      canvas.toBlob((blob) => {
        if (blob === null) {
          window.alert('Non se puido xerar o PNG.')
          return
        }
        downloadBlob(blob, `${built.name}.png`)
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      window.alert('Non se puido cargar o SVG para rasterizar.')
    }
    img.src = svgUrl
  }, [buildImageSvg, downloadBlob])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Sempre limpar o input, para poder re-importar o MESMO ficheiro
      // dúas veces seguidas (o navegador non dispara 'change' se o
      // valor non cambia).
      e.target.value = ''
      if (file === undefined) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        const restored = deserializeDocument(text)
        if (!restored.ok) {
          window.alert(`Non se puido importar: ${restored.error.message}`)
          return
        }
        if (!window.confirm('Substituír o documento actual? O que non exportaras perderase.')) {
          return
        }
        // 15.6: o importado é o documento activo — o autosave sígueo.
        try {
          window.localStorage.setItem(
            AUTOSAVE_STORAGE_KEY,
            JSON.stringify({ savedAt: new Date().toISOString(), json: text }),
          )
        } catch {
          // Cota — o efecto de autosave xa avisará se persiste.
        }
        replaceDocument(restored.value)
      }
      reader.onerror = () => {
        window.alert('Non se puido importar: erro lendo o ficheiro.')
      }
      reader.readAsText(file)
    },
    [replaceDocument],
  )

  return (
    <>
      {recovery !== null && (
        <div role="alertdialog" aria-label="Recuperación de traballo" style={bannerStyle}>
          <span>
            Recuperouse traballo sen exportar ({new Date(recovery.savedAt).toLocaleString()}).
          </span>
          <button type="button" style={bannerButtonStyle} onClick={handleRecoveryContinue}>
            Continuar
          </button>
          <button type="button" style={bannerButtonStyle} onClick={handleRecoveryDiscard}>
            Descartar
          </button>
        </div>
      )}
      {autosaveNotice !== null && (
        <output style={noticeStyle}>
          <span>{autosaveNotice}</span>
          <button
            type="button"
            style={bannerButtonStyle}
            aria-label="Pechar o aviso"
            onClick={() => setAutosaveNotice(null)}
          >
            ✕
          </button>
        </output>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <EditorShell
        key={docEpoch}
        engine={engine}
        {...(initialLayout !== undefined && { initialLayout })}
        onLayoutChange={onLayoutChange}
        onLayoutInvalid={onLayoutInvalid}
        theme={theme}
        onThemeChange={onThemeChange}
        documentActions={{
          onNew: handleNew,
          onImport: handleImportClick,
          onExport: handleExport,
          onExportSvg: handleExportSvg,
          onExportPng: handleExportPng,
        }}
      />
    </>
  )
}

// 7.19: sets de iconas opt-in dispoñibles no editor desde o arranque —
// escribir `logic-key` ou `norse-wolf` no campo Icona simplemente
// funciona (o rexistro é o singleton compartido co SkillTree).
registerIcons(NORSE_ICONS)
registerIcons(LOGIC_ICONS)
registerIcons(FORGE_ICONS)

const container = document.getElementById('root')
if (container === null) throw new Error('#root not found')
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// ── FIN: examples/editor/main.tsx ──
