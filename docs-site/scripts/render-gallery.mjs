// ── INICIO: render-gallery (16.1) ──
// Renderiza cada documento de examples/gallery/*.json a SVG (claro e
// escuro) con `ygg render` — o MESMO camiño que usa calquera pipeline —
// e escribe:
//   - public/gallery/<nome>.svg e <nome>.dark.svg   (gitignored)
//   - src/data/gallery.json                          (gitignored)
// Os SVGs NON se commitean nin se retocan á man: se o render rompe, o
// build do site falla (garda de podrecemento natural).
//
// Require o CLI compilado: `corepack pnpm turbo run build --filter @yggdrasil-forge/cli`.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const galleryDir = join(root, 'examples', 'gallery')
const showcasePath = join(root, 'examples', 'gallery-showcase.json')
const cliBin = join(root, 'packages', 'cli', 'dist', 'bin.js')
const outDir = join(here, '..', 'public', 'gallery')
const dataDir = join(here, '..', 'src', 'data')

if (!existsSync(cliBin)) {
  console.error(
    `render-gallery: falta ${cliBin}
  Compila o CLI antes: corepack pnpm turbo run build --filter @yggdrasil-forge/cli`,
  )
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
mkdirSync(dataDir, { recursive: true })

/** Texto dunha LocalizedString para a locale dada (con fallback). */
function pick(loc, locale) {
  if (loc === undefined) return ''
  if (typeof loc === 'string') return loc
  return loc[locale] ?? loc.gl ?? loc.en ?? Object.values(loc)[0] ?? ''
}

/** Luminancia aproximada dun #rrggbb: true se é cor CLARA (>0.6). */
function isLightColor(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (m === null) return false
  const n = Number.parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6
}

// 19.1: guións de xogo. Sen eles as fichas saían todas no día cero
// (todo `locked`), que é o estado máis apagado por deseño — catro dos
// cinco estados non se vían nunca. Viven fóra de gallery/ porque eses
// *.json son o corpus de few-shot e non levan campos de escenificación.
const showcase = existsSync(showcasePath)
  ? (JSON.parse(readFileSync(showcasePath, 'utf8')).trees ?? {})
  : {}

/** Bandeiras --grant/--unlock para un id, ou [] se non ten guión. */
function playFlags(id) {
  const guion = showcase[id]
  if (guion === undefined) return []
  const flags = []
  const grant = Object.entries(guion.grant ?? {})
  if (grant.length > 0) flags.push('--grant', grant.map(([k, v]) => `${k}=${v}`).join(','))
  const unlock = guion.unlock ?? []
  if (unlock.length > 0) flags.push('--unlock', unlock.join(','))
  return flags
}

const files = readdirSync(galleryDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
const entries = []
for (const file of files) {
  const id = file.replace(/\.json$/, '')
  const src = join(galleryDir, file)
  const doc = JSON.parse(readFileSync(src, 'utf8'))
  const tree = doc.tree
  // Documentos que PIDEN chan escuro (textColor claro cocido no
  // documento, p.ex. o preset neon): a variante «clara» renderízase
  // tamén con --dark — o SVG leva o seu propio fondo, así que na
  // páxina clara vese como tarxeta escura lexible, nunca texto branco
  // sobre branco (informe do dono na portada 1.0).
  const textColor = doc.editor?.theme?.textColor
  const wantsDarkGround = typeof textColor === 'string' && isLightColor(textColor)
  for (const [suffix, extra] of [
    ['.svg', wantsDarkGround ? ['--dark'] : []],
    ['.dark.svg', ['--dark']],
  ]) {
    const out = join(outDir, `${id}${suffix}`)
    // Falla con stack se o render non sae: é o gate.
    execFileSync(
      process.execPath,
      [cliBin, 'render', src, '--out', out, ...extra, ...playFlags(id)],
      {
        stdio: ['ignore', 'ignore', 'inherit'],
      },
    )
  }
  entries.push({
    id,
    file,
    nodes: tree.nodes.length,
    edges: tree.edges.length,
    layout: tree.layout?.type ?? 'custom',
    preset: doc.editor?.theme?.preset ?? null,
    label: { gl: pick(tree.label, 'gl'), en: pick(tree.label, 'en') },
    description: { gl: pick(tree.description, 'gl'), en: pick(tree.description, 'en') },
    light: `gallery/${id}.svg`,
    dark: `gallery/${id}.dark.svg`,
  })
  const xogada = showcase[id] !== undefined ? ' · xogada' : ''
  console.log(`render-gallery: ${id} (${tree.nodes.length} nodos) → claro + escuro${xogada}`)
}
writeFileSync(join(dataDir, 'gallery.json'), `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
console.log(`render-gallery: ${entries.length} documentos, src/data/gallery.json escrito`)
// ── FIN: render-gallery ──
