// ── INICIO: cli (7.15, Cambio 4) ──
// Dispatcher do `ygg`. Sen dependencia de arg-parsers: tres comandos
// v1 cunha gramática trivial (só o que o fluxo IA necesita HOXE):
//
//   ygg validate [ficheiro|-] [--json]   exit 0/1 (2 = uso incorrecto)
//   ygg schema [--out ficheiro]
//   ygg new [--id x] [--label "..."]
//
// Testable: `run(argv, io)` é puro respecto de process — o bin real
// (bin.ts) e os tests fornecen o mesmo contrato CliIO.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderDocumentJsonSchema } from './documentSchema.js'
import { isAutoLayoutAlgo, layoutDocumentText } from './layoutCmd.js'
import { newDocumentJson } from './newDocument.js'
import { type PlayOptions, renderPlayedDocumentText } from './renderCmd.js'
import { validateDocumentText } from './validate.js'

export interface CliIO {
  /** Le stdin completo (para `ygg validate -` / pipe). */
  readonly readStdin: () => Promise<string>
  readonly stdout: (text: string) => void
  readonly stderr: (text: string) => void
}

const USAGE = `ygg — ferramentas de liña de comandos de Yggdrasil Forge

Uso:
  ygg validate [ficheiro|-] [--json]   Valida un documento (sen ficheiro ou con "-": le stdin).
                                       --json emite {ok, issues[]} como dato accionable.
  ygg layout <ficheiro|-> --algo <a>   Coloca TODOS os nodos co algoritmo indicado e emite o
       [--out ficheiro]                documento resultante (stdout ou --out). Algoritmos:
                                       radial | tree | layered | clustered-radial |
                                       constellation | mesh (layered: DAGs con multi-pai;
                                       mesh: o único que le as arestas — grafos densos).
  ygg render <ficheiro|-> --out <f.svg>  Renderiza a árbore a un SVG autocontido.
       [--dark] [--locale gl] [--width N]  Sen --unlock pinta o día cero (todo bloqueado).
       [--grant recurso=N,...]             Concede recursos antes de xogar.
       [--unlock id[:N],...]               Desbloquea eses nodos (N rangos) para que a foto
                                           amose varios estados á vez. Falla se o motor di que non.
       [--minimap]                         Debuxa o minimapa na esquina inferior esquerda.
  ygg schema [--out ficheiro]          Emite o JSON Schema do documento.
  ygg new [--id x] [--label "..."]     Emite un documento baleiro válido polo stdout.

Códigos de saída: 0 ok · 1 validación fallida ou erro · 2 uso incorrecto
`

/** Extrae o valor dunha opción `--nome valor`. Devolve [valor, resto]. */
function takeOption(
  args: readonly string[],
  name: string,
): [string | undefined, readonly string[]] {
  const idx = args.indexOf(name)
  if (idx === -1) return [undefined, args]
  const value = args[idx + 1]
  if (value === undefined || value.startsWith('--')) return [undefined, args]
  return [value, [...args.slice(0, idx), ...args.slice(idx + 2)]]
}

/** Parte unha lista `a,b,c` en entradas limpas. Sen valor → lista baleira. */
function splitLista(raw: string | undefined): readonly string[] {
  if (raw === undefined) return []
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
}

async function cmdValidate(args: readonly string[], io: CliIO): Promise<number> {
  const json = args.includes('--json')
  const positional = args.filter((a) => a !== '--json')
  if (positional.length > 1) {
    io.stderr(`ygg validate: agardaba un só ficheiro, recibín ${positional.length}\n`)
    return 2
  }
  const source = positional[0]
  let text: string
  try {
    text =
      source === undefined || source === '-'
        ? await io.readStdin()
        : readFileSync(resolve(source), 'utf8')
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (json) {
      io.stdout(
        `${JSON.stringify(
          { ok: false, issues: [{ severity: 'error', code: 'FILE_READ', message }] },
          null,
          2,
        )}\n`,
      )
    } else {
      io.stderr(`✗ non se puido ler: ${message}\n`)
    }
    return 1
  }

  const report = validateDocumentText(text)
  if (json) {
    io.stdout(`${JSON.stringify(report, null, 2)}\n`)
  } else if (report.ok) {
    io.stdout(
      `✓ documento válido (${report.stats?.nodes ?? 0} nodos, ${report.stats?.edges ?? 0} arestas)\n`,
    )
    // Os avisos da conciencia (19.10). Non fan fallar: van despois do ✓
    // para que un bucle que só mira o código de saída siga igual, e
    // quen le a saída se enteire.
    for (const issue of report.issues) {
      const onde = issue.nodeId ?? issue.edgeId
      io.stdout(
        `  [${issue.severity}] ${issue.code}${onde !== undefined ? ` (${onde})` : ''}: ${issue.message}\n`,
      )
    }
  } else {
    io.stderr('✗ documento inválido:\n')
    for (const issue of report.issues) {
      io.stderr(`  [${issue.severity}] ${issue.code}: ${issue.message}\n`)
    }
  }
  return report.ok ? 0 : 1
}

async function cmdLayout(args: readonly string[], io: CliIO): Promise<number> {
  const [algo, rest1] = takeOption(args, '--algo')
  const [out, rest2] = takeOption(rest1, '--out')
  const positional = rest2.filter((a) => !a.startsWith('--'))
  if (algo === undefined || !isAutoLayoutAlgo(algo)) {
    io.stderr(
      'ygg layout: falta --algo (radial | tree | layered | clustered-radial | constellation)\n',
    )
    return 2
  }
  if (positional.length > 1) {
    io.stderr(`ygg layout: agardaba un só ficheiro, recibín ${positional.length}\n`)
    return 2
  }
  const source = positional[0]
  let text: string
  try {
    text =
      source === undefined || source === '-'
        ? await io.readStdin()
        : readFileSync(resolve(source), 'utf8')
  } catch (e) {
    io.stderr(`✗ non se puido ler: ${e instanceof Error ? e.message : String(e)}\n`)
    return 1
  }
  const result = layoutDocumentText(text, algo)
  if (!result.ok || result.output === undefined) {
    io.stderr(`✗ non se puido dispor: ${result.error ?? 'erro descoñecido'}\n`)
    return 1
  }
  if (out !== undefined) {
    writeFileSync(resolve(out), result.output, 'utf8')
    io.stdout(`documento colocado escrito en ${resolve(out)}\n`)
  } else {
    io.stdout(result.output)
  }
  return 0
}

async function cmdRender(args: readonly string[], io: CliIO): Promise<number> {
  const [out, rest1] = takeOption(args, '--out')
  const [locale, rest2] = takeOption(rest1, '--locale')
  const [width, rest3] = takeOption(rest2, '--width')
  const [grantRaw, rest4] = takeOption(rest3, '--grant')
  const [unlockRaw, rest5] = takeOption(rest4, '--unlock')
  const dark = rest5.includes('--dark')
  const minimap = rest5.includes('--minimap')
  const positional = rest5.filter((a) => !a.startsWith('--'))
  // `takeOption` quita a bandeira SÓ se atopou valor; se segue aquí é que
  // se escribiu baleira (p.ex. `--unlock --dark`). Sen este control, o
  // render sairía no día cero calado: pediches xogar e daríasche outra
  // foto sen dicir nada — o descarte silencioso que non admitimos.
  for (const bandeira of ['--grant', '--unlock'] as const) {
    if (rest5.includes(bandeira)) {
      io.stderr(`ygg render: ${bandeira} precisa un valor (p.ex. ${
        bandeira === '--grant' ? '--grant "ouro=10"' : '--unlock "raiz,folla:2"'
      })
`)
      return 2
    }
  }
  if (out === undefined) {
    io.stderr('ygg render: falta --out <saida.svg>\n')
    return 2
  }
  if (positional.length > 1) {
    io.stderr(`ygg render: agardaba un só ficheiro, recibín ${positional.length}\n`)
    return 2
  }
  const source = positional[0]
  let text: string
  try {
    text =
      source === undefined || source === '-'
        ? await io.readStdin()
        : readFileSync(resolve(source), 'utf8')
  } catch (e) {
    io.stderr(`✗ non se puido ler: ${e instanceof Error ? e.message : String(e)}
`)
    return 1
  }
  const parsedWidth = width !== undefined ? Number.parseInt(width, 10) : undefined
  let play: PlayOptions | undefined
  if (grantRaw !== undefined || unlockRaw !== undefined) {
    const grant: Record<string, number> = {}
    for (const par of splitLista(grantRaw)) {
      const igual = par.indexOf('=')
      const cantidade = igual === -1 ? Number.NaN : Number(par.slice(igual + 1))
      if (igual <= 0 || !Number.isFinite(cantidade)) {
        io.stderr(`ygg render: --grant agarda «recurso=N», recibín «${par}»
`)
        return 2
      }
      grant[par.slice(0, igual)] = cantidade
    }
    const unlock = splitLista(unlockRaw)
    play = {
      ...(Object.keys(grant).length > 0 && { grant }),
      ...(unlock.length > 0 && { unlock }),
    }
  }
  const result = await renderPlayedDocumentText(text, {
    dark,
    ...(minimap && { minimap: true }),
    ...(locale !== undefined && { locale: locale as never }),
    ...(parsedWidth !== undefined && Number.isFinite(parsedWidth) && { width: parsedWidth }),
    ...(play !== undefined && { play }),
  })
  if (!result.ok || result.output === undefined) {
    io.stderr(`✗ non se puido renderizar: ${result.error ?? 'erro descoñecido'}
`)
    return 1
  }
  writeFileSync(resolve(out), result.output, 'utf8')
  io.stdout(`svg escrito en ${resolve(out)}
`)
  return 0
}

function cmdSchema(args: readonly string[], io: CliIO): number {
  const [out, rest] = takeOption(args, '--out')
  if (rest.length > 0) {
    io.stderr(`ygg schema: argumentos non recoñecidos: ${rest.join(' ')}\n`)
    return 2
  }
  const text = renderDocumentJsonSchema()
  if (out !== undefined) {
    writeFileSync(resolve(out), text, 'utf8')
    io.stdout(`schema escrito en ${resolve(out)}\n`)
  } else {
    io.stdout(text)
  }
  return 0
}

function cmdNew(args: readonly string[], io: CliIO): number {
  const [id, rest1] = takeOption(args, '--id')
  const [label, rest2] = takeOption(rest1, '--label')
  if (rest2.length > 0) {
    io.stderr(`ygg new: argumentos non recoñecidos: ${rest2.join(' ')}\n`)
    return 2
  }
  io.stdout(
    newDocumentJson({
      ...(id !== undefined && { id }),
      ...(label !== undefined && { label }),
    }),
  )
  return 0
}

/** Punto de entrada testable do CLI. Devolve o código de saída. */
export async function run(argv: readonly string[], io: CliIO): Promise<number> {
  const [command, ...rest] = argv
  switch (command) {
    case 'validate':
      return cmdValidate(rest, io)
    case 'layout':
      return cmdLayout(rest, io)
    case 'render':
      return cmdRender(rest, io)
    case 'schema':
      return cmdSchema(rest, io)
    case 'new':
      return cmdNew(rest, io)
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      io.stdout(USAGE)
      return command === undefined ? 2 : 0
    default:
      io.stderr(`ygg: comando descoñecido "${command}"\n\n${USAGE}`)
      return 2
  }
}
// ── FIN: cli ──
