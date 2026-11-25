# Final live demonstration and viva guide

## Seven minute demonstration

1. **Introduce the project:** “We construct a machine from a supported language question or regex, then show string processing using a graph, trace and result.” Name Aaryan, Prejval Yadav and Sakshi.
2. **Teacher-requested feature:** Generate `Binary strings with even number of 1s and odd number of 0s` as DFA. Read the interpreted language. Explain two parity counters and their product. `101` accepts; `11` rejects. Run generated tests.
3. **Step and Back:** Generate ends-in-01. Step first initializes position zero, then consumes one symbol at a time. `0101` accepts, `010` rejects. Back selects a saved snapshot. A final state at an earlier prefix is insufficient.
4. **NFA:** Generate NFA for `Binary strings ending in 01`. Run `101`, point to active states and an accepting parent-linked path.
5. **Epsilon:** Select Regex, ENFA, alphabet `a,b`, regex `a*b`. Show initial closure. `aab` and `b` accept; blank rejects. Regex `ε` accepts blank.
6. **Edge cases:** Invalid symbol gives INPUT ERROR. Unknown `binary palindromes` is refused without replacing the machine. Even-1s preset accepts blank because zero is even.
7. **Evidence:** Show report, expected/actual CSV, test summaries, source modules, JSON export and CSV download. Each member explains their assigned part. Explain controlled-language and resource limits.

## Hinglish explanation

“Sir, pehle user ko states aur transitions khud dene padte the. Ab supported question ko formal conditions mein convert karke rules se machine construct hoti hai. Even 1s aur odd 0s ke liye do counters combine hote hain. Sirf preset select nahi ho raha: count ya pattern badalkar nayi machine construct kar sakte hain.”

“DFA mein ek current state; NFA mein possible states ka set hota hai. Puri input ke baad koi accepting state active hai toh accept. Epsilon closure free moves include karta hai. Graph aur trace saved snapshots display karte hain.”

“Yeh unrestricted AI nahi hai. Unknown question par answer guess nahi hota. Supported question forms aur regex input available hain.”

## Viva questions

| Question | Answer |
|---|---|
| DFA definition? | (Q, Sigma, delta, q0, F); exactly one defined next state per state-symbol pair. |
| Must every NFA branch accept? | No. One full-input path ending in a final state suffices. |
| Epsilon closure? | States reachable by zero or more free moves, including seed states. |
| How does generation work? | Parse the full supported condition, construct patterns/counters, combine products/complements, minimize. Regex uses Thompson plus subset/epsilon removal. |
| Paid AI API? | No. The app runs explicit algorithms offline. |
| Only presets? | No. New literal patterns, numerical counts and combinations construct fresh machines. |
| Unbounded a^n b^n? | No finite automaton recognizes that language; do not promise one. |
| Why can an NFA look deterministic? | Every DFA is a special case of an NFA. |
| Why minimize? | Merge equivalent states without changing accepted strings. |
| Why independent expectations? | They use string/count predicates or native regex evaluation rather than FA transitions. |
| Are finite tests a proof? | No. Short exhaustive and boundary tests support the implementation; invariants explain correctness. |
| What if tree truncates? | Warn the user. The full state-set result remains independent. |
| Complexity? | DFA transition work O(n); NFA/ENFA O((n+1)(V+E)); subset/path growth may be exponential. |

Extract the final folder, rehearse offline, confirm administrative details and let all three members operate the demo. Keep the interpretation visible while explaining results.
