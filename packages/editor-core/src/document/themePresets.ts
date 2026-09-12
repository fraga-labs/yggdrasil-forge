// ── INICIO: themePresets (7.19, Cambio 2) ──
// Presets de tema con nome — o tema como DATO reutilizable, non como
// constantes inline dun panel. Cada preset é un `ThemeSpec` COMPLETO
// (os 5 estados con recheo, salvo Neutro, que por deseño non trae
// overrides) co `preset` anotado: aplicar = substituír o tema enteiro,
// nunca fusionar.
//
// Tintado e Neutro migran TAL CAL do ThemePanel (7.5e — os seus tests
// son o contrato; cero cambio visual). Os tres novos son proposta do
// Executor partindo das harmonías de minimal/minimalDark; o gate de
// gusto do dono afina os valores.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { ThemeSpec } from './ThemeSpec.js'

export interface ThemePreset {
  /** Id estable (ASCII, sen diacríticos) — o que viaxa en `ThemeSpec.preset`. */
  readonly id: string
  readonly label: LocalizedString
  /** Spec completo que se dispatcha ao aplicar o preset. */
  readonly spec: ThemeSpec
}

/**
 * Rexistro ordenado dos presets do editor. A orde é a das fichas na
 * UI: os dous históricos primeiro, logo os curados do 7.19.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'tintado',
    label: { gl: 'Tintado', en: 'Tinted' },
    // ≈ paleta distinguible tipo panadeiro (validada visualmente en 7.5e).
    spec: {
      preset: 'tintado',
      nodeFills: {
        locked: '#c8c4bb',
        unlockable: '#e6b8a2',
        unlocked: '#7cb37c',
        maxed: '#4a8f4a',
        inProgress: '#e6c98a',
      },
    },
  },
  {
    id: 'neutro',
    label: { gl: 'Neutro', en: 'Neutral' },
    // Sen nodeFills → cae ao `minimal` de @react (por deseño).
    spec: { preset: 'neutro' },
  },
  {
    id: 'pergamino',
    label: { gl: 'Pergamiño', en: 'Parchment' },
    // Claros cálidos terrosos sobre a harmonía do `minimal` (#f4f4ef);
    // progresión de pergamiño apagado a dourado vello, texto tinta sepia.
    spec: {
      preset: 'pergamino',
      nodeFills: {
        locked: '#d9d2c4',
        unlockable: '#eadfc0',
        unlocked: '#cfa968',
        maxed: '#a8813f',
        inProgress: '#e4c98f',
      },
      textColor: '#3b2f1d',
    },
  },
  {
    id: 'neon',
    label: { gl: 'Néon', en: 'Neon' },
    // Fondos-fills escuros profundos (base do `minimalDark`, #1e2026)
    // con acentos saturados; pensado co chrome escuro. Texto case
    // branco frío para ler sobre os fills escuros.
    spec: {
      preset: 'neon',
      nodeFills: {
        locked: '#252a38',
        unlockable: '#7c3aed',
        unlocked: '#06b6d4',
        maxed: '#ec4899',
        inProgress: '#a3e635',
      },
      textColor: '#e8f7ff',
    },
  },
  {
    id: 'bosque',
    label: { gl: 'Bosque', en: 'Forest' },
    // Verdes profundos e dourados apagados; texto marfil para
    // contraste sobre os verdes medios.
    spec: {
      preset: 'bosque',
      nodeFills: {
        locked: '#4a5340',
        unlockable: '#7d8f5a',
        unlocked: '#3e7a4c',
        maxed: '#b08d3e',
        inProgress: '#96a86c',
      },
      textColor: '#f4efdf',
    },
  },
  // ── 19.0: os catro dos mockups fundacionais ──
  // Estes son os primeiros presets que usan os eixes que o documento
  // aprendeu a levar no 19.0 (`nodeRings`, `edges`, `typography`), e
  // por iso son tamén o corpus de referencia: un xerador que copie un
  // destes specs emite un documento que se ve *terminado* sen tocar un
  // só píxel.
  //
  // Nota de fontes: as familias nomeadas (Cinzel, Orbitron, Nunito) NON
  // van empaquetadas — cada stack remata nun xenérico real, así que un
  // consumidor sen elas ve a fonte de reserva, nunca un fallo.
  {
    id: 'forxa',
    label: { gl: 'Forxa', en: 'Forge' },
    // O North Star: obsidiana e ouro sobre azul profundo. O corpo queda
    // escuro e a progresión vive no ANEL — o marco dourado do mockup.
    spec: {
      preset: 'forxa',
      nodeFills: {
        locked: '#11131c',
        unlockable: '#1c2436',
        unlocked: '#2a2416',
        maxed: '#3d3018',
        inProgress: '#1f2130',
      },
      nodeRings: {
        locked: '#3a3a44',
        unlockable: '#d8b15a',
        unlocked: '#e6c77a',
        maxed: '#f2e2b0',
        inProgress: '#8a7a4a',
      },
      edges: { color: '#4a4433', active: '#d8b15a' },
      textColor: '#f0e6d2',
      typography: {
        fontFamily: "'Cinzel', 'Trajan Pro', Georgia, serif",
        fontWeight: 600,
        letterSpacing: '0.06em',
      },
    },
  },
  {
    id: 'gotico',
    label: { gl: 'Gótico', en: 'Gothic' },
    // Ferro negro, carmesí e latón (latón, NON ouro: é o que separa o
    // gótico da forxa). Arestas como vetas de sangue seca.
    spec: {
      preset: 'gotico',
      nodeFills: {
        locked: '#14110f',
        unlockable: '#2a1613',
        unlocked: '#3f1a18',
        maxed: '#5c1f1c',
        inProgress: '#231614',
      },
      nodeRings: {
        locked: '#3a3634',
        unlockable: '#8c6239',
        unlocked: '#a02a24',
        maxed: '#c1272d',
        inProgress: '#6b4a32',
      },
      edges: { color: '#43302b', active: '#a02a24' },
      textColor: '#d9cfc4',
      typography: {
        fontFamily: "'Cardinal', 'Trajan Pro', 'Times New Roman', serif",
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
      },
    },
  },
  {
    id: 'sci-fi',
    label: { gl: 'Sci-fi', en: 'Sci-fi' },
    // Matriz holográfica: corpo case negro e o neon TODO no anel fino
    // (cian → maxenta), como os hexágonos do mockup.
    spec: {
      preset: 'sci-fi',
      nodeFills: {
        locked: '#12131f',
        unlockable: '#1a1b33',
        unlocked: '#102a33',
        maxed: '#2a1030',
        inProgress: '#161a2e',
      },
      nodeRings: {
        locked: '#2f3350',
        unlockable: '#7c4dff',
        unlocked: '#00f0ff',
        maxed: '#ff00aa',
        inProgress: '#4dd0e1',
      },
      edges: { color: '#26304d', active: '#00f0ff' },
      textColor: '#d8f6ff',
      typography: {
        fontFamily: "'Orbitron', 'Rajdhani', 'Segoe UI', system-ui, sans-serif",
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      },
    },
  },
  {
    id: 'escolar',
    label: { gl: 'Escolar', en: 'Classroom' },
    // O único CLARO da fornada: verdes amables, amarelo sol e azul ceo
    // sobre creme, con redonda. Pensado para currículos e itinerarios,
    // onde intimidar é un fallo de deseño.
    spec: {
      preset: 'escolar',
      nodeFills: {
        locked: '#e4e4e0',
        unlockable: '#ffd166',
        unlocked: '#57c785',
        maxed: '#2e9e63',
        inProgress: '#7cc7f0',
      },
      nodeRings: {
        locked: '#c2c2bc',
        unlockable: '#e0a92e',
        unlocked: '#3aa869',
        maxed: '#1f7a4a',
        inProgress: '#4aa3d6',
      },
      edges: { color: '#cfd6cf', active: '#57c785' },
      textColor: '#2f3b33',
      typography: {
        fontFamily: "'Nunito', 'Quicksand', 'Segoe UI', system-ui, sans-serif",
        fontWeight: 700,
        letterSpacing: '0.01em',
      },
    },
  },
]

/** Busca un preset polo seu id. `undefined` se non existe. */
export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id)
}
// ── FIN: themePresets ──
