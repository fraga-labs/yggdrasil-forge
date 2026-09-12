// ── INICIO: defaultLayoutConfigs (7.16, Cambio 1) ──
// Configs por defecto dos motores de layout, DERIVADAS DO DATO.
// Un só módulo para que as fórmulas vivan xuntas e afinen xuntas.
//
// Lección vinculante (Annex A.6.9): `radius` de radial e `groupRadius`
// de clustered-radial son OBRIGATORIOS — un briefing vello asumiunos
// opcionais e saíu SVG en branco. Aquí calcúlanse SEMPRE.
//
// Cada fórmula leva unha liña de porqué. Afinadas coa galería
// (panadeiro / adversarial / gaia-cards) e o gate visual do dono.

import type { TreeDef } from '@yggdrasil-forge/core'

/** Algoritmos expostos por «Dispor» (identity/custom quedan fóra: non colocan). */
export type AutoLayoutAlgo =
  | 'radial'
  | 'tree'
  | 'layered'
  | 'clustered-radial'
  | 'constellation'
  | 'mesh'

export const AUTO_LAYOUT_ALGOS: readonly AutoLayoutAlgo[] = [
  'radial',
  'tree',
  'layered',
  'clustered-radial',
  'constellation',
  'mesh',
]

/** Config de layout por defecto para `algo`, derivada da forma da árbore. */
export function defaultLayoutConfig(algo: AutoLayoutAlgo, tree: TreeDef): TreeDef['layout'] {
  const nodeCount = Math.max(1, tree.nodes.length)
  // Grupos efectivos: os declarados + 1 polo __ungrouped__ SÓ SE HAI
  // orfos de verdade (afinado 7.16c: contar un oco baleiro estiraba o
  // anel sen necesidade — gate visual do dono co panadeiro).
  const claimed = new Set<string>()
  for (const g of tree.groups ?? []) {
    for (const id of g.nodeIds ?? []) claimed.add(id)
  }
  const orphanCount = tree.nodes.filter((n) => n.group === undefined && !claimed.has(n.id)).length
  const groupCount = Math.max(1, (tree.groups?.length ?? 0) + (orphanCount > 0 ? 1 : 0))
  const maxGroupSize = Math.max(
    1,
    ...(tree.groups ?? []).map(
      (g) => (g.nodeIds?.length ?? 0) + tree.nodes.filter((n) => n.group === g.id).length,
    ),
    orphanCount,
  )

  switch (algo) {
    case 'radial':
      // Separación de arco ~72px por nodo (2πr/n) cun chan de 160 para
      // que as árbores pequenas non queden pegadas ao centro.
      return { type: 'radial', radius: Math.max(160, Math.round(nodeCount * 11.5)) }
    case 'tree':
      // Espazados fixos sensatos: o motor por niveis xa reparte o ancho;
      // 90/130 dan aire aos labels sen estratosfera nas árbores fondas.
      return { type: 'tree', nodeSpacing: 90, levelSpacing: 130 }
    case 'layered':
      // Mesmos espazados ca tree (briefing 7.18): a diferenza é o
      // algoritmo (capas para DAGs), non a densidade do debuxo.
      return { type: 'layered', nodeSpacing: 90, levelSpacing: 130 }
    case 'mesh':
      // 19.6: o espazado goberna a densidade da tea. ~66px deixa ver a
      // icona de cada nodo sen que a malla se abra en canle; a partir de
      // ~90 deixa de parecer unha tea e parece un diagrama de rede.
      // `seed` fixa para que «Dispor» sexa reproducible entre sesións.
      return { type: 'mesh', spacing: 66, seed: 1 }
    case 'clustered-radial':
      // Anel de grupos: ~110px de arco por grupo. Chan 120 (afinado
      // 7.16c: con 2 grupos o chan vello de 240 poñíaos a 480px de
      // distancia con nada no medio — Mundo 220×678 no panadeiro).
      // Órbita segundo o grupo maior, con teito 180 para que un grupo
      // xigante non trague o anel.
      return {
        type: 'clustered-radial',
        groupRadius: Math.max(120, Math.round(groupCount * 55)),
        orbitRadius: Math.min(180, Math.max(70, Math.round(maxGroupSize * 16))),
      }
    case 'constellation':
      // Aneis interior/exterior proporcionais ao tamaño; 0.45 de ratio
      // deixa unha coroa lexible entre ambos.
      return {
        type: 'constellation',
        outerRadius: Math.max(280, Math.round(nodeCount * 12)),
        innerRadius: Math.max(120, Math.round(nodeCount * 5.4)),
      }
  }
}
// ── FIN: defaultLayoutConfigs ──
