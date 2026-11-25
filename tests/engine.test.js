"use strict";
const assert = require("node:assert/strict");
const { simulate, validate, enumeratePaths } = require("../prototype/engine");
const { machines, cases } = require("../prototype/presets");
let count = 0;
function test(name, fn) {
  try {
    fn();
    count++;
  } catch (e) {
    console.error("FAIL:", name);
    throw e;
  }
}
function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
for (const key of Object.keys(machines))
  for (const [input, expected] of cases[key])
    test(`${key} ${JSON.stringify(input)}`, () => {
      if (expected === "ERROR")
        assert.throws(
          () => simulate(machines[key], input),
          /Invalid input symbol/,
        );
      else assert.equal(simulate(machines[key], input).accepted, expected);
    });
test("DFA accepted hand trace 0101", () =>
  assert.deepEqual(
    simulate(machines.dfa, "0101").steps.map((s) => s.states),
    [["q0"], ["q1"], ["q2"], ["q1"], ["q2"]],
  ));
test("DFA rejected hand trace 010", () =>
  assert.deepEqual(
    simulate(machines.dfa, "010").steps.map((s) => s.states),
    [["q0"], ["q1"], ["q2"], ["q1"]],
  ));
test("NFA accepted hand trace 0101", () =>
  assert.deepEqual(
    simulate(machines.nfa, "0101").steps.map((s) => s.states),
    [["q0"], ["q0", "q1"], ["q0", "q2"], ["q0", "q1"], ["q0", "q2"]],
  ));
test("NFA rejected hand trace 010", () =>
  assert.deepEqual(
    simulate(machines.nfa, "010").steps.map((s) => s.states),
    [["q0"], ["q0", "q1"], ["q0", "q2"], ["q0", "q1"]],
  ));
test("epsilon closure hand trace aab and edge", () => {
  const run = simulate(machines.enfa, "aab");
  assert.deepEqual(
    run.steps.map((s) => s.states),
    [["q0", "q1"], ["q1"], ["q1"], ["q2"]],
  );
  assert.deepEqual(run.steps[0].edges, [{ from: "q0", symbol: "", to: "q1" }]);
});
for (const [name, change, re] of [
  ["missing start", (m) => (m.start = ""), /start state/],
  ["undefined source", (m) => (m.transitions[0].from = "missing"), /source/],
  [
    "undefined destination",
    (m) => (m.transitions[0].to = ["missing"]),
    /destinations/,
  ],
  [
    "unknown transition symbol",
    (m) => (m.transitions[0].symbol = "x"),
    /symbol/,
  ],
  ["incomplete DFA", (m) => m.transitions.pop(), /Incomplete DFA/],
  ["branching DFA", (m) => (m.transitions[0].to = ["q0", "q1"]), /exactly one/],
  ["duplicate state", (m) => m.states.push("q0"), /unique/],
  [
    "duplicate transition",
    (m) => m.transitions.push(m.transitions[0]),
    /Duplicate transition/,
  ],
  [
    "epsilon in NFA",
    (m) => {
      m.type = "NFA";
      m.transitions[0].symbol = "";
    },
    /only in ENFA/,
  ],
  ["duplicate alphabet", (m) => m.alphabet.push("0"), /unique/],
  ["empty DFA destination", (m) => (m.transitions[0].to = []), /exactly one/],
  [
    "undefined accepting state",
    (m) => (m.accepting = ["missing"]),
    /Accepting/,
  ],
  [
    "multi-character alphabet",
    (m) => (m.alphabet = ["01"]),
    /single-character/,
  ],
])
  test(name, () => {
    const m = clone(machines.dfa);
    change(m);
    assert.throws(() => validate(m), re);
  });
test("unreachable DFA state: warning, language unchanged", () => {
  const m = clone(machines.dfa);
  m.states.push("qU");
  for (const a of m.alphabet)
    m.transitions.push({ from: "qU", symbol: a, to: ["qU"] });
  assert.match(validate(m).warnings[0], /qU/);
  for (const [s, e] of cases.dfa)
    if (e !== "ERROR") assert.equal(simulate(m, s).accepted, e);
});
test("NFA with no path stays empty", () => {
  const m = clone(machines.nfa);
  m.transitions = [];
  const r = simulate(m, "01");
  assert.equal(r.accepted, false);
  assert.deepEqual(
    r.steps.map((s) => s.states),
    [["q0"], [], []],
  );
  assert.match(r.reason, /No path/);
});
test("epsilon cycle terminates and accepts empty string via closure", () => {
  const m = {
    type: "ENFA",
    states: ["s", "f"],
    alphabet: ["a"],
    start: "s",
    accepting: ["f"],
    transitions: [
      { from: "s", symbol: "", to: ["f"] },
      { from: "f", symbol: "", to: ["s"] },
    ],
  };
  assert.equal(simulate(m, "").accepted, true);
  const tree = enumeratePaths(m, "");
  assert.equal(tree.truncated, false);
  assert(tree.nodes.some((n) => n.status === "ε-cycle summarized"));
  assert(tree.nodes.some((n) => n.status === "accepting"));
});
test("epsilon after final character is included", () => {
  const m = {
    type: "ENFA",
    states: ["s", "t", "f"],
    alphabet: ["a"],
    start: "s",
    accepting: ["f"],
    transitions: [
      { from: "s", symbol: "a", to: ["t"] },
      { from: "t", symbol: "", to: ["f"] },
    ],
  };
  assert.equal(simulate(m, "a").accepted, true);
});
test("tree shows separate accepting and dead branches", () => {
  const t = enumeratePaths(machines.nfa, "0101");
  assert.equal(t.truncated, false);
  assert.equal(t.nodes.filter((n) => n.status === "accepting").length, 1);
  assert(t.nodes.some((n) => n.status.startsWith("dead")));
  assert.equal(t.nodes.filter((n) => n.acceptingPath).length, 5);
});
test("tree cap explicit and independent of verdict", () => {
  const t = enumeratePaths(machines.nfa, "0101", 2);
  assert.equal(t.nodes.length, 2);
  assert(t.truncated);
  assert(simulate(machines.nfa, "0101").accepted);
});
test("functions do not mutate definitions", () => {
  const m = clone(machines.enfa),
    before = JSON.stringify(m);
  simulate(m, "aab");
  enumeratePaths(m, "aab");
  assert.equal(JSON.stringify(m), before);
});
test("single Unicode code point alphabet", () => {
  const m = {
    type: "DFA",
    states: ["s"],
    alphabet: ["😀"],
    start: "s",
    accepting: ["s"],
    transitions: [{ from: "s", symbol: "😀", to: ["s"] }],
  };
  assert.equal(simulate(m, "😀😀").steps.length, 3);
});
test("input cap is an explicit error", () =>
  assert.throws(() => simulate(machines.dfa, "0".repeat(301)), /300/));
test("empty alphabet with accepting start accepts ε", () => {
  const m = {
    type: "DFA",
    states: ["s"],
    alphabet: [],
    start: "s",
    accepting: ["s"],
    transitions: [],
  };
  assert(simulate(m, "").accepted);
});
function strings(alphabet, max) {
  let level = [""],
    all = [""];
  for (let i = 0; i < max; i++) {
    level = level.flatMap((s) => alphabet.map((a) => s + a));
    all.push(...level);
  }
  return all;
}
// Independent language predicates, not copies of the transition algorithm.
for (const s of strings(["0", "1"], 8))
  for (const key of ["dfa", "nfa"])
    test(`exhaustive ${key} ${s}`, () =>
      assert.equal(simulate(machines[key], s).accepted, s.endsWith("01")));
const extraLanguages = {
  even_ones: (s) => [...s].filter((a) => a === "1").length % 2 === 0,
  starts_one: (s) => s.startsWith("1"),
  contains_00: (s) => s.includes("00"),
};
for (const s of strings(["0", "1"], 8))
  for (const [key, predicate] of Object.entries(extraLanguages))
    test(`exhaustive ${key} ${s}`, () =>
      assert.equal(simulate(machines[key], s).accepted, predicate(s)));
for (const s of strings(["a", "b"], 7))
  test(`exhaustive enfa ${s}`, () =>
    assert.equal(simulate(machines.enfa, s).accepted, /^a*b$/.test(s)));
for (const key of ["nfa", "enfa"])
  for (const s of strings(machines[key].alphabet, 5))
    test(`tree/sets agree ${key} ${s}`, () => {
      const t = enumeratePaths(machines[key], s);
      assert.equal(t.truncated, false);
      assert.equal(
        t.nodes.some((n) => n.status === "accepting"),
        simulate(machines[key], s).accepted,
      );
    });
console.log(
  `PASS: ${count} tests; ${Object.values(cases).reduce((n, rows) => n + rows.length, 0)} documented preset cases, exact hand traces, validation errors, exhaustive language checks, and tree/set agreement.`,
);
