# Final validation report

**Executed:** 25 November 2026 | Node v22.22.2 | Browser engine 158.0.4370.33

## Recorded results

| Suite | Passed | Failed | Main evidence |
|---|---:|---:|---|
| Base engine and presets | 3,042 | 0 | Exact hand traces; 78 preset expectations; independent short-language checks |
| Question and regex construction | 45,247 | 0 | Authored questions; all three output models; native regex oracle; nested expressions; conversion/limit checks |
| UI-event logic with DOM stand-in | 28 | 0 | Editor, generation, stale output, preservation on error and CSV invalidation |
| **Development checks subtotal** | **48,317** | **0** | `validation/unit-summary.json` |
| **Real browser integration** | **30** | **0** | `validation/browser-summary.json` |
| **Total development + browser checks** | **48,347** | **0** | Counts are checks, not distinct languages/proofs |

The real-browser checks use the actual interface and a temporary browser profile, served from a private loopback server. No user's signed-in browser session is used. This final run replaces the M1 browser-preview limitation: real browser behavior is now verified. The original pure engine still has no DOM dependency.

## What was checked

- Six presets, each with 13 manually specified expected cases.
- Question families: prefix, suffix, substring, negation, even/odd/exact/threshold/modular counts, length, binary-value divisibility, Boolean products and parentheses/precedence.
- All three generated output types: DFA, NFA and ENFA. Some NFA outputs are deterministic special cases, while pattern/regex constructions can expose actual branching.
- Exhaustive binary strings through length 7 for authored construction fixtures, plus base preset words through length 8; alphabet {a,b} cases; and 30 seeded random nested regexes through length 6.
- Regex operators, epsilon and empty language; malformed/unsupported operators; invalid alphabet conflicts; dynamic unseen patterns and a count of 17; state/resource bounds and non-mutation.
- Initial/final epsilon closure, epsilon-cycle termination, accepting empty input, invalid symbols, no path, unreachable states and trap behavior.
- Actual Run, Pause/resume, Step, Back, editor add/remove/transition changes, failed-import preservation and failed-question preservation.
- Actual JSON export/import, SVG download and CSV download content; stale-case invalidation; graph zoom; mobile document width; no uncaught page JavaScript errors.

## Expected versus actual records

| File | Contents |
|---|---|
| `validation/preset-results.csv` | 78 preset input/expected/actual/PASS rows |
| `validation/manual-and-generated.csv` | 28 manually specified cases for 10 constructed examples, including actual state-set traces |
| `validation/construction-results.csv` | Detailed selected authored question/regex comparisons against independent predicates/oracles |
| `validation/browser-results.csv` | Actual 13-case CSV downloaded by clicking the browser's Save results CSV button |
| `validation/unit-summary.json` | Executed Node version, suite counts and zero failures |
| `validation/browser-summary.json` | Actual browser version and named checks |
| `validation/manual-summary.json` | Count and status of manually specified construction examples |

Generated question expectations use direct string/count/arithmetic predicates, not automaton transitions. Regex expectations use a separately evaluated native regular expression for the supported syntax. Authored wording fixtures provide an additional independent check on interpretation. Finite exhaustive tests support implementation correctness; the report also states formal invariants.

## Actual screenshots

`docs/screenshots/` contains question construction, accepted DFA simulation, NFA paths, epsilon simulation, the test panel, mobile layout and full application. These are screenshots from successful real runs, not mock-ups. The PDF report includes selected screenshots.

## Reproduce

```sh
node tests/run-all.js
node tests/create-evidence.js
npm install
npx playwright install chromium
npm run test:browser
```

Only the browser suite needs the optional development package. Opening `index.html` needs no package installation or internet. Browser tests write screenshot/evidence files and close their temporary browser/server after completion.

## Scope and limitations

Unrestricted natural-language interpretation and nonregular-language construction are not claimed. Unsupported wording gives a visible error without replacing the previous machine. Construction aborts beyond 128 states; path display caps at 1,500 nodes independently of verdict calculation. Dense graphs may have crossing edges. The parser's displayed interpretation must be reviewed by the user. Administrative roll numbers and actual member contribution confirmations remain for the team to fill truthfully.
