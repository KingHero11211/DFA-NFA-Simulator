# Source code and algorithm guide

| File | Responsibility | Main functions |
|---|---|---|
| `engine.js` | Pure validation and string simulation | `validate`, `index`, `closure`, `simulate`, `enumeratePaths` |
| `compiler.js` | Formal automaton construction | `pattern`, `counter`, `numericModulo`, `product`, `complement`, `parseRegex`, `thompson`, `removeEpsilon`, `determinize`, `minimize` |
| `questions.js` | Question interpretation, reference predicates and generation | `parse`, `parseCondition`, `construct`, `evaluate`, `generate`, `testCases` |
| `presets.js` | Six examples and manually specified expectations | `machines`, `cases`, `examples` |
| `app.js` | Editor, generation, playback, SVG rendering and downloads | `load`, `edit`, `checkDraft`, `initialize`, `render`, `drawGraph`, handlers |
| `index.html` and `style.css` | Labelled inputs, layout and responsive design | Question builder, editor, graph, trace, result and test panels |

## Question construction

`parse` extracts a declared alphabet and removes recognized task wording. `parseCondition` fully matches atoms and creates an expression tree, splitting OR before AND and respecting parentheses. Unknown conditions are errors, not ignored text. `construct` builds complete machines. Prefix/exact patterns track matched positions and a trap; suffix/substring patterns track the longest relevant pattern prefix. Counters use exact/saturated or modular counts. Binary-number divisibility updates remainder as `(2*r + bit) % M`; a separate initial state rejects empty input.

`product` explores reachable state pairs: AND accepts when both components accept; OR accepts when either does. `complement` flips final states of a complete DFA. `minimize` repeatedly splits accepting/non-accepting partitions by successor-block signatures and builds the reachable quotient. Its state names can differ from a hand drawing while recognizing the same language.

`evaluate` uses direct string operations, counts and arithmetic, not state transitions. It provides generated expected cases. Interpretation must still be checked: a correct machine for an unintended interpretation is not the intended answer. Authored wording tests use independent expectations.

## Regex construction

`parseRegex` is recursive descent: union contains concatenations, which contain repeated atoms. Thompson construction gives each syntax-tree fragment a start/end and connects fragments with epsilon edges. Epsilon removal uses closure before/after symbol moves. Reachable-subset BFS turns each closed subset into a DFA state, including a trap subset when needed. Partition refinement then minimizes the DFA. A native regex independently evaluates the same supported syntax for validation.

## Simulation correctness

Snapshot i contains exactly the states reachable after the first i input symbols. Initially use {start}, or its epsilon closure. Each next set unions all labelled destinations, followed by closure for ENFA. At full input, acceptance means intersection with the final-state set. DFA active sets stay singleton. Closure's visited set prevents infinite epsilon loops.

Path enumeration keeps parent-linked histories rather than merging branches. Repeated (state,input-position) on a branch summarizes a zero-consumption cycle. The 1,500-node path cap cannot affect the separate state-set result. `app.js` animates snapshots; Back changes the cursor instead of inverting transitions. Edits invalidate old output; failed construction/import preserves a valid machine.

## Complexity

With input length n, V states and E destination edges, indexed DFA transition work is O(n), with O(n) stored trace. Epsilon closure costs O(V+E_epsilon). NFA/ENFA processing and stored traces have conservative bound O((n+1)(V+E)). Thompson construction is linear in regex syntax size for a fixed alphabet. Subset construction can require 2^V subsets; a product can require V1*V2 pairs. Both abort beyond 128 states. Minimization uses straightforward repeated signatures, not optimized Hopcroft minimization. Unbounded path enumeration can be exponential; presentation is separately capped.

Run `node tests/run-all.js`, `node tests/create-evidence.js` and, with Playwright installed, `npm run test:browser`. CSV evidence is in `validation/`; browser screenshots are real runs in `docs/screenshots/`.
