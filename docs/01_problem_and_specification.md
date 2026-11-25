# 1. Problem definition and automata specification

> Design documentation carried forward from M1. The final implementation adds controlled-language/regex construction, up to 128 states, zoom and actual browser verification. See the final README, CODE_GUIDE, technical report and VALIDATION_REPORT for current scope and measured results.
**Course:** CSET302 Automata Theory and Computability · **Stage:** Milestone 1 (M1)  
**Project:** DFA/NFA String Processing Visualizer · **Rubric:** Problem Definition & Automata Specification (1/5)

## Problem and objective

When solving an automaton on paper, students can lose track of the current state, confuse an NFA's alternative paths with simultaneous input consumption, or forget ε-transitions. A final yes/no answer does not explain where a mistake happened.

The proposed simulator takes a student-defined finite automaton and string, shows each input-consuming step, and explains acceptance or rejection. Students can compare the generated trace with a hand calculation and test several strings against expected answers.

Objectives: (1) accept dynamic automaton definitions, (2) implement the formal transition rules correctly, (3) display all active states and used transitions, (4) expose separate NFA branches, and (5) validate generated results against independently chosen expectations.

## Scope and assumptions

| In scope | Outside M1 scope |
|---|---|
| DFA, NFA, ε-NFA; one start state; any subset of final states | PDA, Turing machines, transducers |
| Editable states, alphabet, transitions, JSON interchange | Regular-expression conversion, minimization, equivalence proofs |
| SVG graph, play/pause, step/back/reset, trace and path tree | Dragging graph nodes, collaborative editing, server accounts |
| User-editable tests; pure engine tested in Node | Formal verification of arbitrary implementation code |

The alphabet is a finite set of single Unicode code points; strings are sequences of those symbols. Whitespace, comma and the visible character `ε` are reserved and cannot be alphabet symbols. The empty string is entered as a blank input, not the literal text `ε`. JSON represents an ε-transition with `"symbol": ""`. There is exactly one start state. An NFA may have missing transitions, interpreted as ∅; a DFA must be complete and deterministic. Unreachable states are allowed with a warning. Empty alphabet and empty final-state set are allowed.

Classroom limits enforced by the engine: 1–128 states, at most 12 alphabet symbols, at most 300 input symbols. State names match `[A-Za-z][A-Za-z0-9_]{0,15}`. These are implementation limits, not restrictions in automata theory. Tree display is capped at 1,500 nodes; this never caps the state-set algorithm or changes its verdict.

## Inputs and outputs

| Input | Format / meaning | Output |
|---|---|---|
| Automaton | Type, Q, Σ, start, F, transition table / JSON | Validated model and labelled SVG graph, or specific errors |
| String w | Text; blank means ε | Trace with position, read symbol, current states, transitions |
| Step delay | 100–1,800 ms | Timed animation; does not change computation |
| Controls | Run, Pause, Step, Back, Reset | Selected immutable trace snapshot, consumed/remaining text |
| Expected cases | JSON pair per line: `["01", true]` | Expected vs generated ACCEPTED / REJECTED / ERROR, PASS/FAIL |
| NFA computation | Derived from model and w | Separate path prefixes, dead branches, accepting path(s), truncation notice if needed |

## Formal model

A **DFA** is M = (Q, Σ, δ, q₀, F), where Q is a finite nonempty set of states, Σ is a finite alphabet, δ: Q × Σ → Q is a total function, q₀ ∈ Q is the start state, and F ⊆ Q is the accepting set.

The extended function satisfies δ̂(q, ε) = q and δ̂(q, xa) = δ(δ̂(q, x), a). The DFA accepts w iff δ̂(q₀, w) ∈ F.

An **NFA** uses δ: Q × Σ → P(Q), where P(Q) is the power set of Q. Define δ̂(S, ε) = S and δ̂(S, xa) = ⋃{δ(q, a) : q ∈ δ̂(S, x)}. Use S = {q₀}. The NFA accepts iff δ̂({q₀}, w) ∩ F ≠ ∅. Acceptance is existential: one complete accepting path suffices, even when other paths die.

An **ε-NFA** uses δ: Q × (Σ ∪ {ε}) → P(Q). Define E(S), the ε-closure of S, as every state reachable from S using zero or more ε-transitions, including S itself. Define δ̂ε(S, ε) = E(S) and δ̂ε(S, xa) = E(⋃{δ(q, a) : q ∈ δ̂ε(S, x)}). It accepts iff δ̂ε({q₀}, w) ∩ F ≠ ∅. ε-transitions do not advance the input position. Closure must be taken initially and after every consumed symbol, including the last.

For each model, L(M) = {w ∈ Σ* : M accepts w}. A string containing a symbol outside Σ produces **INPUT ERROR**, not a mathematical rejection of a word in Σ*.

## UI input specification

1. Choose a preset or model type. Define the alphabet as comma-separated single-character symbols; click **Apply alphabet**.
2. Add named states. A radio button chooses the start state; checkboxes choose final states. Remove deletes that state and all references to it. Removing the start requires choosing another start.
3. The table contains each state–symbol pair, plus an ε column represented as rows for ENFA. Enter comma-separated destination names. Blank means no transition; a blank DFA cell is an error.
4. JSON import validates before replacing the editor. Export writes the current valid definition to the text box and downloads it. Strings and tests are separate from the automaton JSON.
5. Editing the machine or input clears stale traces and pauses playback. Valid edits redraw the graph; invalid drafts show an explanatory error.

## JSON schema

The machine schema is stored in [`automaton.schema.json`](automaton.schema.json), Draft 2020-12. Its structural contract is:

```text
type: "DFA" | "NFA" | "ENFA"
states: unique array of 1–128 state identifiers
alphabet: unique array of 0–12 single-code-point symbols
start: state identifier
accepting: unique array of state identifiers
transitions: array of {from: state identifier, symbol: string, to: unique state array}
```

The JSON schema validates structure. Runtime validation additionally checks state membership, alphabet membership, single Unicode code points, reserved symbols, uniqueness of each (from, symbol) row, DFA completeness, and the ENFA-only use of ε. Extra JSON properties are ignored by the engine and are allowed by the schema. The browser has a built-in validator; it does not fetch a schema or depend on a schema library.

### Sample 1: DFA for binary strings ending in 01

```json
{
  "type": "DFA",
  "states": ["q0", "q1", "q2"],
  "alphabet": ["0", "1"],
  "start": "q0",
  "accepting": ["q2"],
  "transitions": [
    {"from":"q0","symbol":"0","to":["q1"]},
    {"from":"q0","symbol":"1","to":["q0"]},
    {"from":"q1","symbol":"0","to":["q1"]},
    {"from":"q1","symbol":"1","to":["q2"]},
    {"from":"q2","symbol":"0","to":["q1"]},
    {"from":"q2","symbol":"1","to":["q0"]}
  ]
}
```

Separate string input: `0101` → ACCEPTED. q0 means no useful suffix, q1 means the current suffix is `0`, and q2 means the suffix is `01`.

### Sample 2: ε-NFA for a*b

```json
{
  "type":"ENFA",
  "states":["q0","q1","q2"],
  "alphabet":["a","b"],
  "start":"q0",
  "accepting":["q2"],
  "transitions":[
    {"from":"q0","symbol":"","to":["q1"]},
    {"from":"q1","symbol":"a","to":["q1"]},
    {"from":"q1","symbol":"b","to":["q2"]}
  ]
}
```

Separate string input: `aab` → ACCEPTED. The NFA preset for ends-in-01 is defined in Document 04 and `prototype/presets.js`.

## Validation rules and displayed errors

| Invalid condition | Displayed engine message |
|---|---|
| Missing/unknown model type | `Type must be DFA, NFA, or ENFA.` |
| Empty or oversized Q | `Define 1–128 states.` |
| Invalid identifier | `State names must start with a letter and contain at most 16 letters, digits, or underscores.` |
| Duplicate state | `State names must be unique.` |
| Missing/undefined start | `Choose exactly one start state from the defined states.` |
| Undefined or duplicate final state | `Accepting states must be unique defined states.` |
| Undefined source | `Transition source is an undefined state.` |
| Undefined/duplicate destination | `Transition destinations must be unique defined states.` |
| Unknown transition symbol / ε in DFA or NFA | `Transition symbol is not in the alphabet (ε is allowed only in ENFA).` |
| Duplicate (state, symbol) row | `Duplicate transition row; merge destinations into one row.` |
| Missing DFA transition | `Incomplete DFA: define δ(q0, 0).` (actual state/symbol substituted) |
| Empty or branching DFA destination | `Each DFA transition must have exactly one destination.` |
| Invalid string symbol | `Invalid input symbol "2": not in the alphabet.` |
| Oversized string | `Input is limited to 300 symbols for classroom visualization.` |
| Invalid JSON syntax | `Import failed:` followed by the browser's JSON parser message |
| Unreachable state | Warning: `Unreachable states: qU. They do not change the language.` |

Alphabet format errors and duplicate symbols also have explicit messages. Validation stops at the first error to keep corrections manageable. No incomplete DFA is silently completed with a trap state.
