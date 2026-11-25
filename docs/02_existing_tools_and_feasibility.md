# 2. Existing tools and feasibility

> Design documentation carried forward from M1. The final implementation adds controlled-language/regex construction, up to 128 states, zoom and actual browser verification. See the final README, CODE_GUIDE, technical report and VALIDATION_REPORT for current scope and measured results.
**Rubric:** Existing Tools & Feasibility (1/5)

## Review method

The comparisons below use official tutorials, project repositories, and an authors' paper, consulted on **1 November 2026**. They are documentation reviews, not claims of hands-on testing. Limitations described as project-fit observations are our assessment; uncertain current behavior is explicitly marked **to be verified**. Our contribution is a small, explainable M1 package, rather than a claim that other tools cannot simulate finite automata.

| Tool | Platform | What it does well (documented) | Limitations / project-fit observations | Gap our simulator fills |
|---|---|---|---|---|
| [JFLAP](https://jflap.org/csed/jflap/tutorial/fa/createfa/fa.html) | Java desktop application; [project site](https://www.jflap.org/) | Graphical FA construction, NFA configurations, multiple-string runs and trace views; tutorial shows these operations | Desktop runtime/setup is an extra classroom step. Its broader feature set is more than this narrow M1 needs. Current OS compatibility: **to be verified** | One offline HTML entry point, source-level engine tests, and hand-worked examples in the same submission |
| [Automatarium](https://github.com/automatarium/automatarium) | Browser-based project | Repository describes modern JFLAP-inspired UI and full finite-automata support, with basic PDA/TM functionality | Local build/deployment workflow is broader than opening this package's HTML. Exact offline behavior and current path-tree/test-table features: **to be verified** | A deliberately small implementation tied to the course rubric, with no build step |
| [Automata Tutor v3](https://arxiv.org/abs/2005.01419) | Web education system, described by its authors | Paper describes automatic grading and feedback; earlier version supported finite-automata construction exercises | Assessment-oriented platform is broader than our single-machine visualizer. Current deployment, access rules, and offline support: **to be verified** | Self-contained local editing and transparent step traces without depending on a course service |
| [automata-lib](https://github.com/caleb531/automata) | Python library | Implements DFA/NFA and other automata; supports visualization with optional visual dependencies | Python/package setup is needed; it is a programming library rather than this submission's form-based classroom UI. Optional visual setup may need Graphviz | Beginner-facing editor, playback controls, trace, path display, and editable expected-results panel |

JFLAP already supports multiple inputs and traces; those are not claimed as novel. The practical gap is a consistent, locally runnable learning package that exposes both set simulation and individual branches, with concise explanations students can defend in a viva.

## Technical feasibility

| Choice | Why it is feasible |
|---|---|
| HTML/CSS/vanilla JavaScript | Direct `index.html` launch; no framework, package manager, server, or network needed to run |
| SVG diagram | Browser-native circles, paths, text, arrow markers; highlights can be regenerated from a snapshot |
| Pure functions in `engine.js` | Same code in browser and Node; makes manual traces and automated results comparable |
| Active-state sets | DFA is a singleton special case; NFA avoids enumerating every path to decide acceptance |
| Iterative ε-closure | Visited set ensures termination even with ε cycles |
| Separate bounded tree | Makes branching visible without using an exponential computation tree for the result |
| Shared `presets.js` fixtures | Browser test panel and Node tests use the same documented input/expected pairs |

A student who knows basic JavaScript, sets and graph traversal can implement the M1 scope in a few focused days. This is an estimate for a small classroom prototype, not production software.

## Time feasibility (four-day plan)

| Day | Work | Completion evidence |
|---|---|---|
| 1 | Fix formal specification and examples; implement validator and state-set engine | Correct hand traces and engine tests |
| 2 | Editor, JSON import/export, SVG layout, trace controls | Custom machine runs in browser |
| 3 | NFA paths, ε cycles, expected-results panel; boundary cases | Dead/accepting paths and invalid-input checks |
| 4 | Documentation, static mock-up, diagrams and review | Rubric mapping, consistent examples, reproducible tests |

## Risks and mitigations

| Risk | Mitigation / remaining limitation |
|---|---|
| Missing ε-closure causes false rejection | Closure initially and after every symbol; tests include accepting via ε after the last symbol |
| Treating an NFA as one arbitrary path | Track union of destinations; highlight all active states |
| Infinite ε walk | Visited set in closure; summarize repeated (state, position) in each tree branch |
| Exponential computation tree | Explicit 1,500-node display cap; full verdict remains independent; truncation notice |
| Dense graph labels overlap | Circular layout, curved reciprocal edges, merged labels, scrollable graph; dense 128-state graphs may still need a larger view |
| Edited input reuses stale results | Clear snapshots/test output and pause when model or input changes |
| Incorrect expected tests | Hand-worked examples plus independent language predicates over all short words |
| Different browser behavior | Standard script tags and SVG; verify a target browser locally before the viva |
| Scope expansion | Defer regex conversion, PDA/TM, graph dragging, saving projects, and account features |

There are no runtime external dependencies. GitHub's Mermaid renderer and the linked sources are useful when reading documentation online; the prototype itself remains offline.
