/* Pure simulation functions; usable as window.Automata or require('./engine'). */
(function (root) {
  "use strict";
  const fail = (message) => {
    throw new Error(message);
  };
  const unique = (a) => [...new Set(a)];
  function validate(m) {
    if (!m || typeof m !== "object" || Array.isArray(m))
      fail("Automaton must be a JSON object.");
    if (!["DFA", "NFA", "ENFA"].includes(m.type))
      fail("Type must be DFA, NFA, or ENFA.");
    if (!Array.isArray(m.states) || !m.states.length || m.states.length > 128)
      fail("Define 1–128 states.");
    if (
      m.states.some(
        (q) =>
          typeof q !== "string" ||
          q.trim() !== q ||
          !/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(q),
      )
    )
      fail(
        "State names must start with a letter and contain at most 16 letters, digits, or underscores.",
      );
    if (unique(m.states).length !== m.states.length)
      fail("State names must be unique.");
    if (
      !Array.isArray(m.alphabet) ||
      m.alphabet.length > 12 ||
      m.alphabet.some(
        (a) =>
          typeof a !== "string" || [...a].length !== 1 || /[\s,ε]/u.test(a),
      )
    )
      fail(
        "Alphabet must contain at most 12 single-character symbols; whitespace, comma, and ε are reserved.",
      );
    if (unique(m.alphabet).length !== m.alphabet.length)
      fail("Alphabet symbols must be unique.");
    if (!m.states.includes(m.start))
      fail("Choose exactly one start state from the defined states.");
    if (
      !Array.isArray(m.accepting) ||
      m.accepting.some((q) => !m.states.includes(q)) ||
      unique(m.accepting).length !== m.accepting.length
    )
      fail("Accepting states must be unique defined states.");
    if (!Array.isArray(m.transitions)) fail("Transitions must be an array.");
    const seen = new Set();
    for (const t of m.transitions) {
      if (!t || typeof t !== "object" || !m.states.includes(t.from))
        fail("Transition source is an undefined state.");
      if (
        !m.alphabet.includes(t.symbol) &&
        !(m.type === "ENFA" && t.symbol === "")
      )
        fail(
          "Transition symbol is not in the alphabet (ε is allowed only in ENFA).",
        );
      const key = JSON.stringify([t.from, t.symbol]);
      if (seen.has(key))
        fail("Duplicate transition row; merge destinations into one row.");
      seen.add(key);
      if (
        !Array.isArray(t.to) ||
        t.to.some((q) => !m.states.includes(q)) ||
        unique(t.to).length !== t.to.length
      )
        fail("Transition destinations must be unique defined states.");
      if (m.type === "DFA" && t.to.length !== 1)
        fail("Each DFA transition must have exactly one destination.");
    }
    if (m.type === "DFA")
      for (const q of m.states)
        for (const a of m.alphabet) {
          if (!seen.has(JSON.stringify([q, a])))
            fail(`Incomplete DFA: define δ(${q}, ${a}).`);
        }
    const reachable = new Set([m.start]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of m.transitions)
        if (reachable.has(t.from))
          for (const q of t.to)
            if (!reachable.has(q)) {
              reachable.add(q);
              changed = true;
            }
    }
    const absent = m.states.filter((q) => !reachable.has(q));
    return {
      warnings: absent.length
        ? [
            `Unreachable states: ${absent.join(", ")}. They do not change the language.`,
          ]
        : [],
    };
  }
  function index(m) {
    const map = new Map(m.states.map((q) => [q, new Map()]));
    for (const t of m.transitions) map.get(t.from).set(t.symbol, t.to);
    return (q, a) => map.get(q).get(a) || [];
  }
  function closure(seeds, next) {
    const states = new Set(seeds),
      stack = [...states],
      edges = [];
    while (stack.length) {
      const q = stack.pop();
      for (const r of next(q, "")) {
        edges.push({ from: q, symbol: "", to: r });
        if (!states.has(r)) {
          states.add(r);
          stack.push(r);
        }
      }
    }
    return { states: [...states], edges };
  }
  function simulate(m, input) {
    const { warnings } = validate(m);
    if (typeof input !== "string") fail("Input must be a string.");
    const chars = [...input];
    if (chars.length > 300)
      fail("Input is limited to 300 symbols for classroom visualization.");
    const bad = chars.find((a) => !m.alphabet.includes(a));
    if (bad !== undefined)
      fail(`Invalid input symbol "${bad}": not in the alphabet.`);
    const next = index(m);
    let current =
      m.type === "ENFA"
        ? closure([m.start], next)
        : { states: [m.start], edges: [] };
    const steps = [
      { i: 0, symbol: null, states: current.states, edges: current.edges },
    ];
    for (let i = 0; i < chars.length; i++) {
      const moved = [],
        edges = [];
      for (const q of current.states)
        for (const r of next(q, chars[i])) {
          moved.push(r);
          edges.push({ from: q, symbol: chars[i], to: r });
        }
      current =
        m.type === "ENFA"
          ? closure(unique(moved), next)
          : { states: unique(moved), edges: [] };
      steps.push({
        i: i + 1,
        symbol: chars[i],
        states: current.states,
        edges: [...edges, ...current.edges],
      });
    }
    const finals = new Set(m.accepting);
    const accepted = current.states.some((q) => finals.has(q));
    const reason = accepted
      ? `Consumed the whole string; active accepting state(s): ${current.states.filter((q) => finals.has(q)).join(", ")}.`
      : !current.states.length
        ? "No path consumed the whole string."
        : `Consumed the whole string; ended in non-accepting state(s): ${current.states.join(", ")}.`;
    return { accepted, reason, steps, warnings };
  }
  // Enumerate path prefixes without merging branches. Repeated (state, index)
  // on one branch is an epsilon cycle: summarize it rather than loop forever.
  function enumeratePaths(m, input, limit = 1500) {
    simulate(m, input); // same validation; acceptance never depends on this tree
    if (!Number.isInteger(limit) || limit < 1)
      fail("Path limit must be a positive integer.");
    const chars = [...input],
      next = index(m),
      nodes = [];
    const pending = [
      {
        q: m.start,
        i: 0,
        parent: null,
        via: null,
        history: new Set(),
        depth: 0,
      },
    ];
    while (pending.length && nodes.length < limit) {
      const task = pending.pop(),
        id = nodes.length;
      const key = JSON.stringify([task.q, task.i]);
      const cycle = task.history.has(key),
        final = task.i === chars.length;
      const options = [];
      if (!cycle) {
        if (m.type === "ENFA")
          for (const q of next(task.q, ""))
            options.push({ q, i: task.i, via: "" });
        if (!final)
          for (const q of next(task.q, chars[task.i]))
            options.push({ q, i: task.i + 1, via: chars[task.i] });
      }
      const status = cycle
        ? "ε-cycle summarized"
        : final
          ? m.accepting.includes(task.q)
            ? "accepting"
            : "non-accepting end"
          : options.length
            ? "branch"
            : "dead: no transition";
      nodes.push({
        id,
        parent: task.parent,
        q: task.q,
        i: task.i,
        via: task.via,
        depth: task.depth,
        status,
        acceptingPath: false,
      });
      const history = new Set(task.history);
      history.add(key);
      for (let j = options.length - 1; j >= 0; j--)
        pending.push({
          ...options[j],
          parent: id,
          history,
          depth: task.depth + 1,
        });
    }
    for (const n of nodes)
      if (n.status === "accepting") {
        let k = n.id;
        while (k !== null && !nodes[k].acceptingPath) {
          nodes[k].acceptingPath = true;
          k = nodes[k].parent;
        }
      }
    return { nodes, truncated: pending.length > 0, limit };
  }
  const api = { validate, simulate, enumeratePaths, closure };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Automata = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
