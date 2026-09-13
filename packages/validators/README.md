# @yggdrasil-forge/validators

Pedagogical validators for Yggdrasil Forge skill trees.

Detects structural and pedagogical issues in tree definitions —
cycles, unreachable nodes, dead ends, redundant prerequisites,
unbalanced branches, and more.

## Installation

```bash
pnpm add @yggdrasil-forge/validators
```

## Usage

### Via TreeEngine (recommended)

```typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import {
  ValidatorEngine,
  noCyclesRule,
  allReachableFromRootRule,
  noOrphanNodesRule,
  noDeadEndsRule,
  noRedundantPrerequisitesRule,
  progressiveDifficultyRule,
  maxBranchingFactorRule,
  minBranchingFactorRule,
  balancedBranchesRule,
} from '@yggdrasil-forge/validators'

const engine = new TreeEngine(treeDef)
const validator = new ValidatorEngine()

// Register desired rules:
validator.registerRule(noCyclesRule)
validator.registerRule(allReachableFromRootRule)
validator.registerRule(noOrphanNodesRule)
validator.registerRule(noDeadEndsRule)
validator.registerRule(noRedundantPrerequisitesRule)
validator.registerRule(progressiveDifficultyRule)
validator.registerRule(maxBranchingFactorRule(5))     // factory
validator.registerRule(minBranchingFactorRule(2))     // factory
validator.registerRule(balancedBranchesRule(3))       // factory

// Validate via TreeEngine:
const report = await engine.validatePedagogically(validator)

if (report.hasErrors) {
  console.error('Tree has errors:', report.issues)
}

console.log(`Errors: ${report.errorCount}`)
console.log(`Warnings: ${report.warningCount}`)
console.log(`Info: ${report.infoCount}`)
```

**Why `validatePedagogically(validator)`?** `@yggdrasil-forge/core`
does not depend on `@yggdrasil-forge/validators` (to avoid
circular dependencies). The TreeEngine accepts any validator with
a `validate(treeDef)` method via Inversion of Control.

### Standalone

```typescript
import {
  ValidatorEngine,
  noCyclesRule,
} from '@yggdrasil-forge/validators'

const validator = new ValidatorEngine()
validator.registerRule(noCyclesRule)

const report = await validator.validate(treeDef)
```

## Built-in rules

All built-in rules are exported as named values from
`@yggdrasil-forge/validators`. Six are plain constants; three are
**factories** that take a configuration argument.

### Structural rules

| Rule | Severity | What it checks |
|------|----------|---------------|
| `noCyclesRule` | error | No cycles in dependency edges (DFS). |
| `allReachableFromRootRule` | error | All nodes reachable from `rootNodeId` via dependency edges. |
| `noOrphanNodesRule` | warning | No nodes without edges (any type). |
| `noDeadEndsRule` | warning | No non-root nodes without outgoing dependencies. |
| `maxBranchingFactorRule(limit)` | warning | No node has more than `limit` outgoing dependencies. **Factory.** |
| `minBranchingFactorRule(limit)` | info | Each non-leaf node has at least `limit` outgoing dependencies. **Factory.** |

### Pedagogical rules

| Rule | Severity | What it checks |
|------|----------|---------------|
| `noRedundantPrerequisitesRule` | warning | No dependency edge is redundant (no alternative path exists). |
| `progressiveDifficultyRule` | info | Difficulty (sum of cost amounts) does not decrease along dependency edges. |
| `balancedBranchesRule(maxDepthVariance)` | info | Direct branches from root have similar depth (difference ≤ variance). **Factory.** |

### Deferred / future work

- **`valid_subtree_references`** (referenced in MASTER §17):
  deferred until sub-trees feature is implemented.
- **Custom rules**: implement the `ValidationRule` interface and
  register via `validator.registerRule(myRule)`.

## Types

```typescript
type ValidationSeverity = 'error' | 'warning' | 'info'

interface ValidationIssue {
  ruleId: string
  severity: ValidationSeverity
  message: string
  nodeId?: string
  edgeId?: string
}

interface ValidationRule {
  id: string
  label: LocalizedString  // gl/es/en
  severity: ValidationSeverity
  validate(treeDef: TreeDef): readonly ValidationIssue[]
}

interface ValidationReport {
  issues: readonly ValidationIssue[]
  errorCount: number
  warningCount: number
  infoCount: number
  hasErrors: boolean
}
```

## ValidatorEngine API

| Method | Description |
|--------|-------------|
| `registerRule(rule)` | Add a rule (or replace by id). |
| `unregisterRule(id)` | Remove a rule. Returns `true` if removed. |
| `validate(treeDef)` | Run all rules. Returns `Promise<ValidationReport>`. |
| `getRules()` | Returns `readonly ValidationRule[]` in insertion order. |
| `size()` | Number of registered rules. |

## Applicability — read this before registering rules

**These rules assume a rooted, acyclic tree.** That assumption is not
wrong, but it is not universal, and the package never said it out loud.
Measured over the nine documents of this project's own gold gallery
(`examples/gallery/`), the nine rules together report **244 issues**,
including **11 errors** on `atlas-de-fisterra.json` — a document that is
correct by design.

| What happens | Why |
|---|---|
| `noCyclesRule` reports 11 **errors** on the atlas | Each of its regions is built as a *closed weave*. In a mesh document, cycles are the design. |
| `noRedundantPrerequisitesRule` flags 102 of 174 atlas edges | In a dense weave most edges have an alternative path. Redundancy is the point of a mesh, not a flaw in it. |
| `noDeadEndsRule` fires on **all nine** documents, `minimal.json` included | It flags every leaf. Every tree has leaves, so this rule can only be satisfied by a graph with no terminal nodes. |
| `allReachableFromRootRule`, `progressiveDifficultyRule`, `balancedBranchesRule` never fire — on any document | All three `return []` when `treeDef.rootNodeId` is undefined, and **no gallery document declares it**. A clean report from these three means "not checked", not "nothing wrong". |

So: register the rules that match the *shape* of your document. For a
curriculum or a rooted skill tree, declare `rootNodeId` and the full set
applies. For a mesh or an atlas, `noCyclesRule` and
`noRedundantPrerequisitesRule` will describe your design as a defect.

These facts are pinned in `__tests__/aplicabilidade.test.ts`, so a change
in any of them is deliberate rather than accidental.

## Notes

- **Dependency edges only**: structural rules use only edges with
  `type === 'dependency'`. Other edge types (`soft_dependency`,
  `exclusion`, `enhancement`, `path`) are ignored for graph
  analysis (except `noOrphanNodesRule` which checks edges of any
  type).
- **Async validate**: `ValidatorEngine.validate` returns a Promise.
  Built-in rules are synchronous internally, but the API is async
  to support future IO-based rules.
- **LocalizedString labels**: rule labels are `Record<string, string>`
  with gl/es/en variants.

## License

MIT
