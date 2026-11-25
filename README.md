# State Studio final automata project

**DFA/NFA String Processing Visualizer with question-to-automaton construction**  
CSET302 Automata Theory and Computability | B.Tech CSE  
Team: **Aaryan, Prejval Yadav, Sakshi** | Final evaluation, 23-27 November 2026

## Run the final project

1. Extract the **whole ZIP into a new folder**. Use this final folder instead of the earlier Desktop/M1 copy.
2. Double-click [`index.html`](index.html). It opens [`prototype/index.html`](prototype/index.html). No installation, server, build, API key or internet is needed to use the simulator.
3. Enter `Binary strings with even number of 1s and odd number of 0s`, select DFA and click **Generate automaton**.
4. Review the interpreted language and construction steps. States, transitions, graph, sample string and expected test cases load automatically.
5. Run `101`: ACCEPTED. Run `11`: REJECTED. Use Step, Back, Pause, Reset, speed and graph zoom to explain the computation.
6. Run all tests. Save expected/actual results with **Save results CSV**, the diagram with **Save SVG**, and the machine with JSON export. JSON import accepts the same machine format.

The teacher's extension is implemented: a supported question or regex creates the machine, including its states and transitions. The interpreter uses an offline controlled-language grammar. It does not claim unrestricted English understanding or generate finite automata for nonregular languages. Unknown wording is refused without replacing a working machine.

## Supported question examples

| Question | Accepted | Rejected |
|---|---|---|
| `Design a DFA for binary strings ending in 01` | `0101` | `010` |
| `Binary strings starting with 1 and ending in 00` | `100` | `001` |
| `Binary strings with even number of 1s and odd number of 0s` | `101` | `11` |
| `Binary strings with exactly two 1s` | `101` | `111` |
| `Binary strings with at least 3 zeros` | `0001` | `01` |
| `Binary strings with number of 1s modulo 3 = 2` | `11` | `111` |
| `Binary strings with length at most 4` | `0101` | `01010` |
| `Binary numbers divisible by 3` | `110` | `101` |
| `Strings over {a,b} starting with ab and ending in ba` | `abba` | `abab` |
| `Binary strings with no consecutive 1s` | `1010` | `110` |
| `Binary strings starting with 01 or ending with 10` | `110` | `111` |
| `Binary strings jo 01 se end hoti hain` | `101` | `010` |

Patterns and counters are constructed algorithmically, not selected from an answer list. For example, `ending in 1100101` and `exactly 17 ones` create fresh machines. AND binds more tightly than OR; use parentheses to change grouping. NOT negates a condition/group. For numeric divisibility, empty input rejects, zero accepts, and leading zeros are allowed. Even counts and modular length conditions include zero.

Select NFA or ENFA for that output type. Pattern questions use regex/Thompson construction for nondeterministic output. Counter/product machines may have only singleton destinations and no epsilon edges, which is valid: every DFA is also an NFA.

## Regular expression mode

Select Regex and enter `(0|1)*01`, `a*b`, `(ab|ba)+`, `0?1+`, `[01]*00[01]*`, `ε` or another expression using this syntax:

| Syntax | Meaning |
|---|---|
| `ab`, `a|b` | Concatenation, union |
| `a*`, `a+`, `a?` | Zero or more, one or more, optional |
| `(ab|ba)` | Grouping |
| `[ab]`, `[a-c]` | Symbol class / short ascending range |
| `.` | Any symbol in the chosen alphabet |
| `ε` / blank regex | Empty string |
| `∅` | Empty language |

Union is `|`; postfix `+` means one or more. Matching consumes the whole string. Alphabet is inferred from literal symbols unless explicitly supplied. Wildcard-only/empty regex defaults to {0,1}. Escape literal metacharacters with a backslash. `{N}` repetition, anchors, lookaround, shorthand classes, negated classes and backreferences are unsupported.

## Manual editing and presets

Six presets remain: DFA ends-in-01, even number of 1s, starts-with-1, contains-00; NFA ends-in-01; ENFA a*b. Each loads 13 expected cases. Any machine can be edited or imported using [`docs/automaton.schema.json`](docs/automaton.schema.json). Blank string input means epsilon; the visible character `ε` is not an input symbol. In JSON, `"symbol":""` denotes an epsilon edge.

Editing a constructed machine marks its original explanation and expectations as stale. Update expectations or regenerate. Failed imports/questions preserve the current machine. Edits stop playback and clear old traces. CSV export is disabled after test expectations change until tests run again.

## Run tests

Node.js 18+ is needed only for development checks:

```sh
node tests/run-all.js
node tests/create-evidence.js
```

Optional real-browser tests use Playwright:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

The browser suite starts/stops a private loopback server and uses a temporary profile. `STATE_STUDIO_BROWSER` can select a local Chromium-family executable; `STATE_STUDIO_PLAYWRIGHT` can select an existing Playwright package. They are test-only settings. No npm installation is needed to open the app.

Actual summaries, CSV evidence and screenshots are in [`VALIDATION_REPORT.md`](VALIDATION_REPORT.md), [`validation/`](validation/) and [`docs/screenshots/`](docs/screenshots/). Finite tests support the implementation; correctness invariants are also explained in the report.

## Final rubric mapping

| Criterion | Marks | Evidence |
|---|---:|---|
| Implementation | 2 | Question/regex construction, dynamic editor, all models, visualization, controls, traces/paths, JSON/SVG/CSV exports |
| Demonstration and testing | 2 | [`docs/DEMO_AND_VIVA.md`](docs/DEMO_AND_VIVA.md), real CSV results, test suites and screenshots |
| Technical documentation and report | 2 | [`report/technical-report.pdf`](report/technical-report.pdf), source guide and design documents |
| Format and code documentation | 1 | Structured report, source comments, repeatable checks, [`docs/CODE_GUIDE.md`](docs/CODE_GUIDE.md) |
| Presentation and explanation | 1 | Live demo and viva guide with hand traces and limits |
| Individual contribution and teamwork | 1 | [`docs/TEAM_RESPONSIBILITIES.md`](docs/TEAM_RESPONSIBILITIES.md): ownership and verification tasks |
| **Total** | **9** | Working simulator, source, report, tests and individual understanding |

## Limits and administrative details

- The question interpreter is a supported-language parser, not unrestricted AI. Unfamiliar paraphrases and nonregular languages may be refused. Use a supported form or a formal regex for another regular language.
- Limits: 128 construction/machine states, 12 alphabet symbols, 300 input symbols, 40-symbol literal patterns, counts/divisors 0-40 (modulus/divisor at least 1), 160 regex characters. A regex may reach the state limit first.
- Path display caps at 1,500 nodes and summarizes repeated epsilon configurations. Some displayed branches can be omitted when truncated; the complete state-set verdict is independent.
- Dense graphs can have overlapping edges. Use zoom, transition tables and trace tables.
- No institutional report template or roll numbers were provided. The report uses a standard academic structure and supplied names. Add administrative details required by your institution.

AI-assisted development was used. Each member should review the source, execute their assigned checks and explain the implementation. Responsibility allocations are not claims of unverified individual work.
