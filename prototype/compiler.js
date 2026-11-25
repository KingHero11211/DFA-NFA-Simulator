/* Formal automaton construction. Pure functions, no DOM, no network.
 * Thompson construction -> epsilon removal / subset construction -> minimization.
 * Complete reachable products implement AND/OR; complement flips final states.
 */
(function (root) {
  "use strict";
  const LIMIT = 128;
  const error = (message) => {
    throw new Error(message);
  };
  function alphabetCheck(alphabet) {
    if (
      !Array.isArray(alphabet) ||
      !alphabet.length ||
      alphabet.length > 12 ||
      new Set(alphabet).size !== alphabet.length ||
      alphabet.some(
        (a) =>
          typeof a !== "string" || [...a].length !== 1 || /[\s,ε]/u.test(a),
      )
    )
      error(
        "Use 1–12 different single-character alphabet symbols; whitespace, comma and ε are reserved.",
      );
  }
  function machine(alphabet, rows, finals, start = 0, type = "DFA") {
    if (rows.length > LIMIT)
      error(
        `Construction needs more than ${LIMIT} states. Simplify the expression or condition.`,
      );
    const states = rows.map((_, i) => "q" + i),
      transitions = [];
    rows.forEach((row, i) =>
      alphabet.forEach((a, j) => {
        const to = Array.isArray(row[j]) ? row[j] : [row[j]];
        if (to.length)
          transitions.push({
            from: states[i],
            symbol: a,
            to: to.map((k) => states[k]),
          });
      }),
    );
    return {
      type,
      states,
      alphabet: [...alphabet],
      start: states[start],
      accepting: finals.map((i) => states[i]),
      transitions,
    };
  }
  function indexed(m) {
    const map = new Map(m.states.map((q) => [q, new Map()]));
    for (const t of m.transitions) map.get(t.from).set(t.symbol, t.to);
    return (q, a) => map.get(q).get(a) || [];
  }
  function closure(seeds, next) {
    const set = new Set(seeds),
      pending = [...set];
    while (pending.length) {
      for (const q of next(pending.pop(), ""))
        if (!set.has(q)) {
          set.add(q);
          pending.push(q);
        }
    }
    return [...set];
  }
  function determinize(m) {
    const next = indexed(m),
      order = new Map(m.states.map((q, i) => [q, i]));
    const key = (s) =>
      JSON.stringify([...s].sort((a, b) => order.get(a) - order.get(b)));
    const initial = closure([m.start], next),
      sets = [initial],
      ids = new Map([[key(initial), 0]]),
      rows = [],
      finals = [],
      finalSet = new Set(m.accepting);
    for (let i = 0; i < sets.length; i++) {
      if (sets[i].some((q) => finalSet.has(q))) finals.push(i);
      const row = [];
      for (const a of m.alphabet) {
        const target = closure(
            new Set(sets[i].flatMap((q) => next(q, a))),
            next,
          ),
          k = key(target);
        if (!ids.has(k)) {
          if (sets.length >= LIMIT)
            error(
              "Subset construction exceeded 128 states. Simplify the regular expression.",
            );
          ids.set(k, sets.length);
          sets.push(target);
        }
        row.push(ids.get(k));
      }
      rows.push(row);
    }
    return machine(m.alphabet, rows, finals);
  }
  function removeEpsilon(m) {
    const next = indexed(m),
      finalSet = new Set(m.accepting),
      transitions = [],
      accepting = [];
    for (const q of m.states) {
      const start = closure([q], next);
      if (start.some((s) => finalSet.has(s))) accepting.push(q);
      for (const a of m.alphabet) {
        const to = closure(new Set(start.flatMap((s) => next(s, a))), next);
        if (to.length) transitions.push({ from: q, symbol: a, to });
      }
    }
    return prune({
      type: "NFA",
      states: [...m.states],
      alphabet: [...m.alphabet],
      start: m.start,
      accepting,
      transitions,
    });
  }
  function prune(m) {
    const reachable = new Set([m.start]),
      pending = [m.start],
      next = indexed(m);
    while (pending.length) {
      const q = pending.pop();
      for (const a of [...m.alphabet, ""])
        for (const r of next(q, a))
          if (!reachable.has(r)) {
            reachable.add(r);
            pending.push(r);
          }
    }
    return {
      ...m,
      states: m.states.filter((q) => reachable.has(q)),
      accepting: m.accepting.filter((q) => reachable.has(q)),
      transitions: m.transitions.filter((t) => reachable.has(t.from)),
    };
  }
  function minimize(m) {
    if (m.type !== "DFA") m = determinize(m);
    m = prune(m);
    const next = indexed(m),
      finals = new Set(m.accepting);
    let parts = [
      m.states.filter((q) => finals.has(q)),
      m.states.filter((q) => !finals.has(q)),
    ].filter((a) => a.length);
    while (true) {
      const group = new Map(
          parts.flatMap((part, i) => part.map((q) => [q, i])),
        ),
        refined = [];
      for (const part of parts) {
        const buckets = new Map();
        for (const q of part) {
          const sig = JSON.stringify(
            m.alphabet.map((a) => group.get(next(q, a)[0])),
          );
          if (!buckets.has(sig)) buckets.set(sig, []);
          buckets.get(sig).push(q);
        }
        refined.push(...buckets.values());
      }
      if (refined.length === parts.length) break;
      parts = refined;
    }
    const group = new Map(parts.flatMap((part, i) => part.map((q) => [q, i]))),
      initial = group.get(m.start),
      order = [initial],
      ids = new Map([[initial, 0]]),
      rows = [],
      accept = [];
    for (let i = 0; i < order.length; i++) {
      const part = parts[order[i]],
        row = [];
      if (finals.has(part[0])) accept.push(i);
      for (const a of m.alphabet) {
        const g = group.get(next(part[0], a)[0]);
        if (!ids.has(g)) {
          ids.set(g, order.length);
          order.push(g);
        }
        row.push(ids.get(g));
      }
      rows.push(row);
    }
    return machine(m.alphabet, rows, accept);
  }
  function product(a, b, operation) {
    if (JSON.stringify(a.alphabet) !== JSON.stringify(b.alphabet))
      error("Combined conditions must use the same alphabet.");
    const an = indexed(a),
      bn = indexed(b),
      af = new Set(a.accepting),
      bf = new Set(b.accepting),
      pairs = [[a.start, b.start]],
      ids = new Map([[JSON.stringify(pairs[0]), 0]]),
      rows = [],
      finals = [];
    for (let i = 0; i < pairs.length; i++) {
      const [x, y] = pairs[i],
        accept =
          operation === "and" ? af.has(x) && bf.has(y) : af.has(x) || bf.has(y);
      if (accept) finals.push(i);
      const row = [];
      for (const c of a.alphabet) {
        const pair = [an(x, c)[0], bn(y, c)[0]],
          k = JSON.stringify(pair);
        if (!ids.has(k)) {
          if (pairs.length >= LIMIT)
            error(
              "Combined conditions exceed 128 reachable states. Use smaller counts or patterns.",
            );
          ids.set(k, pairs.length);
          pairs.push(pair);
        }
        row.push(ids.get(k));
      }
      rows.push(row);
    }
    return minimize(machine(a.alphabet, rows, finals));
  }
  function complement(m) {
    const finals = new Set(m.accepting);
    return { ...m, accepting: m.states.filter((q) => !finals.has(q)) };
  }
  function pattern(kind, word, alphabet) {
    alphabetCheck(alphabet);
    const chars = [...word],
      n = chars.length;
    if (chars.some((a) => !alphabet.includes(a)))
      error("The pattern contains a symbol outside the chosen alphabet.");
    if (n > 40) error("Patterns are limited to 40 symbols.");
    if (!n)
      return kind === "exact"
        ? machine(alphabet, [alphabet.map(() => 1), alphabet.map(() => 1)], [0])
        : machine(alphabet, [alphabet.map(() => 0)], [0]);
    const rows = [];
    if (kind === "starts" || kind === "exact") {
      const trap = n + 1;
      for (let i = 0; i <= trap; i++)
        rows.push(
          alphabet.map((a) =>
            i === trap
              ? trap
              : i === n
                ? kind === "starts"
                  ? n
                  : trap
                : a === chars[i]
                  ? i + 1
                  : trap,
          ),
        );
    } else {
      for (let i = 0; i <= n; i++)
        rows.push(
          alphabet.map((a) => {
            if (kind === "contains" && i === n) return n;
            const suffix = chars.slice(0, i).join("") + a;
            for (let k = n; k >= 0; k--)
              if (suffix.endsWith(chars.slice(0, k).join(""))) return k;
          }),
        );
    }
    return machine(alphabet, rows, [n]);
  }
  function counter(kind, value, symbol, alphabet, remainder = 0) {
    if (!Number.isInteger(value) || value < 0 || value > 40)
      error("Counts and lengths must be integers from 0 to 40.");
    if (kind === "mod" && value < 1) error("The modulus must be at least 1.");
    if (
      kind === "mod" &&
      (!Number.isInteger(remainder) || remainder < 0 || remainder >= value)
    )
      error("The remainder must be between 0 and modulus minus 1.");
    if (symbol !== null && !alphabet.includes(symbol))
      error("The counted symbol is outside the alphabet.");
    const size =
        kind === "mod" ? value : kind === "atleast" ? value + 1 : value + 2,
      rows = [],
      finals = [];
    for (let i = 0; i < size; i++) {
      rows.push(
        alphabet.map((a) =>
          symbol !== null && a !== symbol
            ? i
            : kind === "mod"
              ? (i + 1) % value
              : Math.min(i + 1, size - 1),
        ),
      );
      if (
        kind === "mod"
          ? i === remainder
          : kind === "exact"
            ? i === value
            : kind === "atleast"
              ? i === value
              : i <= value
      )
        finals.push(i);
    }
    return machine(alphabet, rows, finals);
  }
  function numericModulo(modulus, alphabet) {
    if (
      alphabet.length !== 2 ||
      !alphabet.includes("0") ||
      !alphabet.includes("1")
    )
      error("Binary-number divisibility requires alphabet {0,1}.");
    if (!Number.isInteger(modulus) || modulus < 1 || modulus > 40)
      error("Divisor must be an integer from 1 to 40.");
    const rows = [alphabet.map((a) => 1 + (Number(a) % modulus))];
    for (let r = 0; r < modulus; r++)
      rows.push(alphabet.map((a) => 1 + ((2 * r + Number(a)) % modulus)));
    return machine(alphabet, rows, [1]); // separate initial state rejects the empty string
  }
  function parseRegex(source, alphabet) {
    if (typeof source !== "string" || source.length > 160)
      error("Regular expressions are limited to 160 characters.");
    const chars = [...source];
    let pos = 0;
    const symbols = new Set();
    const peek = () => chars[pos];
    function alt() {
      const items = [concat()];
      while (peek() === "|") {
        pos++;
        items.push(concat());
      }
      return items.length === 1 ? items[0] : { kind: "alt", items };
    }
    function concat() {
      const items = [];
      while (pos < chars.length && ![")", "|"].includes(peek()))
        items.push(repeat());
      return !items.length
        ? { kind: "eps" }
        : items.length === 1
          ? items[0]
          : { kind: "concat", items };
    }
    function repeat() {
      let node = atom();
      if (["*", "+", "?"].includes(peek())) {
        node = {
          kind: { "*": "star", "+": "plus", "?": "optional" }[chars[pos++]],
          node,
        };
        if (["*", "+", "?"].includes(peek()))
          error("Use parentheses between repeated quantifiers.");
      }
      return node;
    }
    function atom() {
      const c = chars[pos++];
      if (c === "(") {
        const node = alt();
        if (chars[pos++] !== ")")
          error("Missing closing parenthesis in the regular expression.");
        return node;
      }
      if (c === "\\") {
        if (pos === chars.length)
          error("A trailing backslash needs a literal symbol.");
        const value = chars[pos++];
        if (/[dDsSwWbBpP0-9]/.test(value))
          error(
            "Regex shorthand classes and backreferences are unsupported. Use explicit symbols or [01].",
          );
        symbols.add(value);
        return { kind: "literal", value };
      }
      if (c === "ε") return { kind: "eps" };
      if (c === "∅") return { kind: "empty" };
      if (c === ".") return { kind: "any" };
      if (c === "[") {
        if (peek() === "^")
          error(
            "Negated character classes are unsupported. List the allowed symbols explicitly.",
          );
        const values = [];
        while (pos < chars.length && peek() !== "]") {
          let a = chars[pos++];
          if (a === "\\") {
            if (pos === chars.length) error("Incomplete class escape.");
            a = chars[pos++];
          }
          if (peek() === "-" && chars[pos + 1] && chars[pos + 1] !== "]") {
            pos++;
            const b = chars[pos++],
              start = a.codePointAt(0),
              end = b.codePointAt(0);
            if (end < start || end - start > 30)
              error(
                "Character ranges must be ascending and contain at most 31 symbols.",
              );
            for (let k = start; k <= end; k++)
              values.push(String.fromCodePoint(k));
          } else values.push(a);
        }
        if (chars[pos++] !== "]" || !values.length)
          error("Use a nonempty, closed character class such as [01].");
        for (const a of values) symbols.add(a);
        return { kind: "class", values: [...new Set(values)] };
      }
      if (c === undefined || /[\s*+?{}^$\]]/u.test(c))
        error(
          "Unsupported regex syntax. Use literals, (), |, *, +, ?, [ab], ., ε or ∅. Escape a literal metacharacter with a backslash.",
        );
      symbols.add(c);
      return { kind: "literal", value: c };
    }
    const ast = alt();
    if (pos !== chars.length)
      error("Unexpected closing parenthesis in the regular expression.");
    if (alphabet) alphabetCheck(alphabet);
    const resolved = alphabet
      ? [...alphabet]
      : symbols.size
        ? [...symbols]
        : ["0", "1"];
    alphabetCheck(resolved);
    if ([...symbols].some((a) => !resolved.includes(a)))
      error("Regex literal is outside the chosen alphabet.");
    return { ast, alphabet: resolved };
  }
  const quote = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function regexReference(ast, alphabet) {
    switch (ast.kind) {
      case "literal":
        return quote(ast.value);
      case "eps":
        return "";
      case "empty":
        return "(?!)";
      case "any":
        return "(?:" + alphabet.map(quote).join("|") + ")";
      case "class":
        return "(?:" + ast.values.map(quote).join("|") + ")";
      case "concat":
        return ast.items.map((n) => regexReference(n, alphabet)).join("");
      case "alt":
        return (
          "(?:" +
          ast.items.map((n) => regexReference(n, alphabet)).join("|") +
          ")"
        );
      default:
        return (
          "(?:" +
          regexReference(ast.node, alphabet) +
          ")" +
          { star: "*", plus: "+", optional: "?" }[ast.kind]
        );
    }
  }
  function thompson(ast, alphabet) {
    const states = [],
      raw = [];
    const fresh = () => {
      if (states.length >= LIMIT)
        error("Thompson construction exceeds 128 states. Shorten the regex.");
      states.push("q" + states.length);
      return states.length - 1;
    };
    const edge = (a, b, symbol = "") => raw.push({ a, b, symbol });
    function build(node) {
      const a = fresh(),
        b = fresh();
      if (node.kind === "eps") edge(a, b);
      else if (node.kind === "literal") edge(a, b, node.value);
      else if (node.kind === "class" || node.kind === "any")
        for (const c of node.kind === "class" ? node.values : alphabet)
          edge(a, b, c);
      else if (node.kind === "alt")
        for (const child of node.items) {
          const [x, y] = build(child);
          edge(a, x);
          edge(y, b);
        }
      else if (node.kind === "concat") {
        let tail = a;
        for (const child of node.items) {
          const [x, y] = build(child);
          edge(tail, x);
          tail = y;
        }
        edge(tail, b);
      } else if (node.kind !== "empty") {
        const [x, y] = build(node.node);
        edge(a, x);
        edge(y, b);
        if (node.kind === "star" || node.kind === "optional") edge(a, b);
        if (node.kind === "star" || node.kind === "plus") edge(y, x);
      }
      return [a, b];
    }
    const [a, b] = build(ast),
      groups = new Map();
    for (const t of raw) {
      const k = JSON.stringify([t.a, t.symbol]);
      if (!groups.has(k))
        groups.set(k, { from: states[t.a], symbol: t.symbol, to: [] });
      const row = groups.get(k);
      if (!row.to.includes(states[t.b])) row.to.push(states[t.b]);
    }
    return {
      type: "ENFA",
      states,
      alphabet: [...alphabet],
      start: states[a],
      accepting: [states[b]],
      transitions: [...groups.values()],
    };
  }
  function regex(source, alphabet, type = "DFA") {
    const parsed = parseRegex(source, alphabet),
      enfa = thompson(parsed.ast, parsed.alphabet),
      model =
        type === "ENFA"
          ? enfa
          : type === "NFA"
            ? removeEpsilon(enfa)
            : minimize(determinize(enfa));
    if (!["DFA", "NFA", "ENFA"].includes(type))
      error("Output model must be DFA, NFA or ENFA.");
    const reference = new RegExp(
      "^(?:" + regexReference(parsed.ast, parsed.alphabet) + ")$(?![\\s\\S])",
      "u",
    );
    return {
      model,
      ast: parsed.ast,
      accepts: (s) =>
        [...s].every((c) => parsed.alphabet.includes(c)) && reference.test(s),
      steps: [
        "Parse the regular expression into a syntax tree.",
        "Apply Thompson construction to create an ε-NFA.",
        ...(type === "DFA"
          ? [
              "Compute reachable ε-closed subsets, including the empty trap subset.",
              "Merge equivalent DFA states by partition refinement.",
            ]
          : type === "NFA"
            ? [
                "Remove ε-transitions using closures and retain separate possible destinations.",
              ]
            : [
                "Retain ε-transitions; simulation computes ε-closure initially and after every symbol.",
              ]),
      ],
    };
  }
  function convert(m, type) {
    if (type === "DFA") return minimize(m.type === "DFA" ? m : determinize(m));
    if (type === "NFA")
      return m.type === "ENFA" ? removeEpsilon(m) : { ...m, type: "NFA" };
    if (type === "ENFA") return { ...m, type: "ENFA" };
    error("Choose DFA, NFA or ENFA.");
  }
  const api = {
    LIMIT,
    alphabetCheck,
    machine,
    indexed,
    closure,
    determinize,
    removeEpsilon,
    minimize,
    product,
    complement,
    pattern,
    counter,
    numericModulo,
    parseRegex,
    regex,
    convert,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Compiler = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
