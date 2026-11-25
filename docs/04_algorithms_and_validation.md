# 4. Algorithms, correctness and validation

> Design documentation carried forward from M1. The final implementation adds controlled-language/regex construction, up to 128 states, zoom and actual browser verification. See the final README, CODE_GUIDE, technical report and VALIDATION_REPORT for current scope and measured results.
**Rubric:** Algorithm Selection & Correctness (1/5)

## Shared notation and model definitions

n = input length in Unicode code points; V = |Q|; E = number of individual destination edges, including ε edges; Eε = number of ε edges. A row with two destinations counts as two edges. Transitions are indexed by source and symbol before simulation. Complexity below describes the simulation after validation, assuming constant-average-time set/map operations. Model validation and index construction are separate setup work; the implementation also checks reachability for warnings.

All examples use start q0 and final set {q2}.

| Model | Alphabet | State | On first symbol (0 or a) | On second symbol (1 or b) | On ε |
|---|---|---|---|---|---|
| DFA, ends-in-01 | {0,1} | q0 | q1 | q0 | — |
| DFA | {0,1} | q1 | q1 | q2 | — |
| DFA | {0,1} | q2 | q1 | q0 | — |
| NFA, ends-in-01 | {0,1} | q0 | {q0,q1} | {q0} | — |
| NFA | {0,1} | q1 | ∅ | {q2} | — |
| NFA | {0,1} | q2 | ∅ | ∅ | — |
| ENFA, a*b | {a,b} | q0 | ∅ | ∅ | {q1} |
| ENFA | {a,b} | q1 | {q1} | {q2} | ∅ |
| ENFA | {a,b} | q2 | ∅ | ∅ | ∅ |

The NFA stays at q0 while scanning any prefix. On `0` it can also guess that the final `01` begins here, entering q1. q1 requires a `1` to enter q2. q2 has no outgoing edges, so this guess succeeds only when input ends there. The DFA remembers the longest useful suffix: no match, `0`, or `01`. The ENFA moves for free to q1, loops on any number of `a` symbols, then consumes exactly one `b` to reach q2.

## Algorithm 1: DFA simulation

```text
SIMULATE_DFA(M, w):
    validate M; check every input symbol belongs to Σ
    build transition index
    q ← q0
    record snapshot(0, no symbol, {q}, no edges)
    for i = 0 .. length(w)-1:
        old ← q
        q ← δ(q, w[i])
        record snapshot(i+1, w[i], {q}, edge old --w[i]--> q)
    accepted ← (q ∈ F)
    return snapshots, accepted, reason
```

Each symbol causes exactly one transition. No missing transition is guessed: an incomplete DFA fails validation before simulation. The prototype uses its shared set engine for a DFA, where the active set always has one member; this is equivalent to the pseudocode.

Time: O(n) after indexing, plus O(V) to prepare the final-state lookup. Decision working memory: O(1) for the current state, excluding the model/index/final set. Stored trace: O(n). Indexing takes O(V + E) space/time. For empty input, the initial state alone decides whether the DFA accepts; there is no transition.

## Algorithm 2: NFA state-set simulation with ε-closure

```text
EPSILON_CLOSURE(S):
    visited ← set(S)
    stack ← elements(S)
    usedEdges ← empty list
    while stack is not empty:
        q ← pop(stack)
        for each r ∈ δ(q, ε):
            record edge q --ε--> r in usedEdges
            if r ∉ visited:
                add r to visited; push r onto stack
    return visited, usedEdges

SIMULATE_NFA(M, w):
    validate M and all symbols of w; build transition index
    if model is ENFA: S, edges ← EPSILON_CLOSURE({q0})
    else: S ← {q0}; edges ← empty
    record initial snapshot
    for i = 0 .. length(w)-1:
        T ← empty set; edges ← empty list
        for each q ∈ S:
            for each r ∈ δ(q, w[i]):
                add r to T
                record q --w[i]--> r in edges
        if model is ENFA:
            S, epsilonEdges ← EPSILON_CLOSURE(T)
            append epsilonEdges to edges
        else: S ← T
        record snapshot(i+1, w[i], S, edges)
    return (S ∩ F ≠ ∅), snapshots, reason
```

The union keeps every possible destination but deduplicates states reached through different histories. It does not create or store all 2^V subsets ahead of time; it computes only the set reached at the next input position. For a plain NFA, missing entries return ∅ and ε-closure is not used. An empty active set stays empty.

For ε-closure, each reachable state is popped once; all its ε edges are inspected. Therefore closure terminates with cycles and costs O(V + Eε) time and O(V) working memory, plus recorded edges. State-set simulation costs O((n+1)(V+E)) as a general upper bound. The `(n+1)` includes the initial closure when n = 0. Working memory excluding stored trace/index is O(V+E) when retaining used edges; current-state sets alone require O(V). The stored snapshots cost O((n+1)(V+E)) in the worst case because both sets and edges are kept for playback. Membership in F uses a set. The prototype additionally runs the optional tree enumeration for display; its cost is separate.

One snapshot includes one consumed symbol plus all ε moves reachable afterward. ε edges are highlighted together for that snapshot, not as separate timed input-consuming steps. Snapshot 0 shows the initial closure and its edges.

## Algorithm 3: Computation-path/tree enumeration

```text
ENUMERATE_PATHS(M, w, limit):
    pending ← [(q0, position 0, parent NONE, empty history)]
    nodes ← []
    while pending not empty and count(nodes) < limit:
        task ← pop(pending)
        create node for task; keep a unique ID and parent ID
        if (task.state, task.position) occurs in this branch's history:
            mark "ε-cycle summarized"; do not expand this node
            continue
        if all input is consumed:
            mark node accepting if state ∈ F, else non-accepting end
        options ← every enabled ε edge (ENFA only)
        if input remains:
            append every transition labelled by the next input symbol
        if input remains and options is empty:
            mark dead: no transition
        add this configuration to a copy of branch history
        push one child task for EACH option, with this node as parent
        advance position only for symbol-labelled edges
    for each accepting node:
        mark the node and its parent chain as an accepting path
    return nodes and whether unexplored tasks remain
```

Branches with the same current state are kept separate because their parent IDs differ. At end-of-input, ε edges may still be expanded; reaching a final state with all symbols consumed is already a valid accepting endpoint. The simulator marks all accepting parent chains, not an arbitrary single successful path.

There can be exponentially many paths in input length. In an ε-cycle there are infinitely many literal walks, so displaying “every walk” is impossible. A repeated `(state, position)` on the same branch is safely summarized: the loop consumes no symbol and removing it preserves a finite accepting continuation. This summarizes cycles without losing the existence of an accepting path. Without a display cap, every path prefix without a repeated configuration is explored. Dead ends and non-accepting full-input endpoints are distinguished.

The implemented display cap is K = 1,500 nodes. It explicitly reports truncation and may omit even an accepting path in the display; the acceptance banner always comes from Algorithm 2 and remains complete. A branch has at most V(n+1) distinct configurations before repetition. With copied history sets and branching factor b ≤ 2V, enumeration has upper bounds O(K(V(n+1)+b)) time and O(K(V(n+1)+b)) memory, in addition to validation/simulation setup. These are conservative bounds for this implementation, not a polynomial bound on an unrestricted tree. Large trees are a presentation limitation of the prototype.

## Correctness argument by invariant

**DFA invariant:** after i symbols, q = δ̂(q₀, w[0:i]). Initially i=0 and q=q₀ by the empty-string rule. If the invariant holds at i, setting q to δ(q,w[i]) establishes it at i+1 by the recursive definition of δ̂. At n, testing q∈F is exactly the acceptance definition.

**NFA invariant:** after i symbols, S is exactly the set of states reachable by consuming that prefix. Initially S={q₀}. The next union includes every and only successor reached on w[i]; therefore the invariant is preserved. ENFA uses E({q₀}) initially and E(move(S,w[i])) afterward, so all free moves before, between and after symbols are included. Closure's visited set is sound because every inserted state follows an ε edge from a previously reachable state; it is complete because every reachable state's outgoing ε edges are eventually inspected. At n, S∩F≠∅ is precisely existential acceptance.

**Tree argument:** each child is a legal transition and has the correct input position, so each root-to-node path represents a valid run prefix. Every enabled alternative is expanded unless cycle summarization or the disclosed cap applies. Removing an ε-cycle preserves reachability of any accepting continuation. The result algorithm does not depend on display enumeration.

## Fully hand-solved DFA examples

### Accepted input: 0101

| Step | Symbol read | Current state(s) | Transition used | Note |
|---|---|---|---|---|
| 0 | — | q0 | Start | Nothing consumed |
| 1 | 0 | q1 | δ(q0,0)=q1 | Suffix 0 |
| 2 | 1 | q2 | δ(q1,1)=q2 | Prefix 01 currently accepted, but input remains |
| 3 | 0 | q1 | δ(q2,0)=q1 | Acceptance is decided only after full input |
| 4 | 1 | q2 | δ(q1,1)=q2 | Full input consumed; q2 ∈ F |

**Verdict: ACCEPTED.** The string ends in 01.

### Rejected input: 010

| Step | Symbol read | Current state(s) | Transition used | Note |
|---|---|---|---|---|
| 0 | — | q0 | Start | Nothing consumed |
| 1 | 0 | q1 | δ(q0,0)=q1 | Suffix 0 |
| 2 | 1 | q2 | δ(q1,1)=q2 | More input remains |
| 3 | 0 | q1 | δ(q2,0)=q1 | Full input consumed; q1 ∉ F |

**Verdict: REJECTED.** Ending in a final state at an earlier prefix does not suffice.

## Fully hand-solved NFA examples

### Accepted input: 0101

| Step | Symbol read | Current state(s) | Transition used | Note |
|---|---|---|---|---|
| 0 | — | {q0} | Start | No ε moves |
| 1 | 0 | {q0,q1} | δ(q0,0)={q0,q1} | Two branches |
| 2 | 1 | {q0,q2} | δ(q0,1)∪δ(q1,1)={q0}∪{q2} | q2 branch has consumed 01 |
| 3 | 0 | {q0,q1} | δ(q0,0)∪δ(q2,0)={q0,q1}∪∅ | Old q2 branch dies |
| 4 | 1 | {q0,q2} | δ(q0,1)∪δ(q1,1)={q0}∪{q2} | Full input; set intersects F |

**Verdict: ACCEPTED.** A successful path is q0 —0→ q0 —1→ q0 —0→ q1 —1→ q2.

```text
q0 @0
├─0→ q0 @1
│     └─1→ q0 @2
│           ├─0→ q0 @3
│           │     └─1→ q0 @4 [non-accepting end]
│           └─0→ q1 @3
│                 └─1→ q2 @4 [ACCEPTING PATH]
└─0→ q1 @1
      └─1→ q2 @2 [DEAD: no transition on next 0]
```

`@i` is the number of consumed symbols. These are separate histories, even where they share an input prefix.

### Rejected input: 010

| Step | Symbol read | Current state(s) | Transition used | Note |
|---|---|---|---|---|
| 0 | — | {q0} | Start | Initial set |
| 1 | 0 | {q0,q1} | δ(q0,0)={q0,q1} | Branch on 0 |
| 2 | 1 | {q0,q2} | {q0}∪{q2} | q2 reached before end |
| 3 | 0 | {q0,q1} | {q0,q1}∪∅ | No final state remains |

**Verdict: REJECTED.**

```text
q0 @0
├─0→ q0 @1
│     └─1→ q0 @2
│           ├─0→ q0 @3 [non-accepting end]
│           └─0→ q1 @3 [non-accepting end]
└─0→ q1 @1
      └─1→ q2 @2 [DEAD: no transition on next 0]
```

## Hand-solved ε-NFA example

For a*b, calculate the closures directly: E({q0})={q0,q1} via q0—ε→q1; E({q1})={q1}; E({q2})={q2}; E(∅)=∅. There are no other ε edges.

### Accepted input: aab

| Step | Symbol read | Current state(s) | Transition used | Note |
|---|---|---|---|---|
| 0 | ε (no input consumed) | {q0,q1} | q0—ε→q1 | Initial ε-closure includes q0 itself |
| 1 | a | {q1} | move={q1}; E({q1})={q1} | q0 has no a edge; q1 loops |
| 2 | a | {q1} | q1—a→q1; closure unchanged | Second a |
| 3 | b | {q2} | q1—b→q2; E({q2})={q2} | Full input; final state present |

**Verdict: ACCEPTED.** Path q0 —ε→ q1 —a→ q1 —a→ q1 —b→ q2.

### Rejected input: a

| Step | Symbol read | Current state(s) | Transition used | Note |
|---|---|---|---|---|
| 0 | ε (no input consumed) | {q0,q1} | E({q0})={q0,q1} | Free initial move |
| 1 | a | {q1} | move={q1}; E({q1})={q1} | Full input; no b was read |

**Verdict: REJECTED.** For empty input, {q0,q1}∩{q2}=∅, so it also rejects. For `b`, the initial closure allows q1—b→q2, so it accepts without any a.

## Shared test cases: DFA and NFA (13 each)

The following exact pairs are stored in `prototype/presets.js`, loaded into the browser test editor, and exercised by `tests/engine.test.js`. A=ACCEPTED, R=REJECTED. ERROR is input validation, not R.

| String | DFA expected | NFA expected | Reason |
|---|---|---|---|
| ε (blank) | R | R | No final suffix |
| 0 | R | R | Missing final 1 |
| 1 | R | R | No suffix 01 |
| 01 | A | A | Shortest member |
| 001 | A | A | Ends in 01 |
| 101 | A | A | Ends in 01 |
| 0101 | A | A | Accepted hand trace |
| 1101 | A | A | Ends in 01 |
| 10 | R | R | Ends in 10 |
| 010 | R | R | Rejected hand trace |
| 011 | R | R | Final suffix 11 |
| 111 | R | R | No 0 |
| 2 | ERROR | ERROR | Outside {0,1} |

## Shared test cases: ε-NFA (13)

| String | Expected | Reason |
|---|---|---|
| ε (blank) | R | Initial closure has no q2 |
| a | R | No b |
| b | A | Zero a symbols then b |
| ab | A | One a then b |
| aab | A | Hand trace |
| aaab | A | Three a symbols then b |
| aaaaab | A | Five a symbols then b |
| ba | R | Symbols after b cannot be consumed |
| bb | R | Only one b allowed |
| aba | R | No transition from q2 on a |
| aaa | R | Missing b |
| abb | R | Extra b |
| c | ERROR | Outside {a,b} |

## Three additional common DFA presets

These provide ready-made alternatives without changing the simulator algorithm. Each uses Q = {q0,q1} or {q0,q1,q2}, alphabet {0,1}, and start q0. The dropdown automatically loads the machine, example input and matching test cases.

| Preset | State meaning | On 0 | On 1 | Accepting? |
|---|---|---|---|---|
| Even number of 1s | q0: even count so far | q0 | q1 | Yes |
| Even number of 1s | q1: odd count so far | q1 | q0 | No |
| Starts with 1 | q0: no input yet | q2 | q1 | No |
| Starts with 1 | q1: first symbol was 1 | q1 | q1 | Yes |
| Starts with 1 | q2: first symbol was 0 (trap) | q2 | q2 | No |
| Contains 00 | q0: no 00, no trailing 0 | q1 | q0 | No |
| Contains 00 | q1: no 00, one trailing 0 | q2 | q0 | No |
| Contains 00 | q2: already saw 00 | q2 | q2 | Yes |

Short manual traces: even-1s on `101` is q0 → q1 → q1 → q0 (accept); starts-with-1 on `101` is q0 → q1 → q1 → q1 (accept); contains-00 on `100` is q0 → q0 → q1 → q2 (accept). Their default inputs are those accepted examples. Empty input is accepted only by even-1s, since zero is even.

The following 13 cases per added preset are shared by the browser panel and Node tests. A = ACCEPTED, R = REJECTED.

| String | Even number of 1s | Starts with 1 | Contains 00 |
|---|---|---|---|
| ε (blank) | A | R | R |
| 0 | A | R | R |
| 1 | R | A | R |
| 00 | A | R | A |
| 01 | R | R | R |
| 10 | R | A | R |
| 11 | A | A | R |
| 101 | A | A | R |
| 100 | R | A | A |
| 001 | R | R | A |
| 1100 | A | A | A |
| 1111 | A | A | R |
| 2 | ERROR | ERROR | ERROR |

## Additional structural / edge-case validation

| Fixture / input | Expected | Validation purpose |
|---|---|---|
| DFA plus non-final qU, qU—0→qU and qU—1→qU, no incoming edges; all valid documented binary cases | Same verdicts as base DFA; unreachable warning for qU | Unreachable states do not change L(M) |
| NFA preset with all transition rows removed; `01` | R; sets {q0}, ∅, ∅ | No path; empty set remains empty |
| ENFA: s—ε→f, f—ε→s, F={f}; blank | A; tree summarizes cycle | ε-cycle terminates; closure can accept ε |
| ENFA: s—a→t, t—ε→f, F={f}; `a` | A | Closure after final symbol |
| DFA with missing row | ERROR | Total transition function enforced |
| DFA with two destinations | ERROR | Determinism enforced |
| Undefined start/source/destination/final, duplicate states/rows/alphabet | ERROR | Model membership and uniqueness |
| NFA containing ε-transition | ERROR | ε allowed only in ENFA mode |
| Empty-alphabet DFA, one accepting start; blank | A | Empty Σ is valid |
| DFA with one accepting state and 😀 self-loop; `😀😀` | A, 3 snapshots | Code-point rather than UTF-16-unit processing |
| 301-symbol input | ERROR | Classroom trace limit |
| NFA `0101` with tree cap 2 | Truncation true, state-set verdict A | Display limits cannot affect acceptance |

## Reproducible checks

From the package root, run `node tests/engine.test.js`. Besides the 78 preset pairs, tests assert exact manual traces and used ε edges; validate malformed models; check non-mutation, cycles and truncation; enumerate all binary strings of length ≤8 for each ends-in-01 model against `s.endsWith('01')`; check each added DFA against an independent predicate (even count of 1s, `startsWith('1')`, or `includes('00')`) over those same 511 binary strings; enumerate all {a,b} strings of length ≤7 against `/^a*b$/`; and compare tree acceptance with state-set acceptance for both nondeterministic presets up to length 5.

Independent language predicates detect errors that could be missed by merely comparing two similar implementations. Test counts and the browser-verification limitation are recorded in the README and validation report. Passing these finite tests supports the implementation; the invariant above explains the algorithm for general valid inputs.
