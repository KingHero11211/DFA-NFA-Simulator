"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const Q = require("../prototype/questions"),
  C = require("../prototype/compiler"),
  E = require("../prototype/engine");
let count = 0;
const records = [];
function test(name, fn) {
  try {
    fn();
    count++;
  } catch (e) {
    console.error("FAIL:", name);
    throw e;
  }
}
function words(alphabet, max) {
  let level = [""],
    all = [""];
  for (let i = 0; i < max; i++) {
    level = level.flatMap((s) => alphabet.map((a) => s + a));
    all.push(...level);
  }
  return all;
}
const binary = words(["0", "1"], 7),
  letters = words(["a", "b"], 6);
const ones = (s) => [...s].filter((c) => c === "1").length,
  zeros = (s) => [...s].filter((c) => c === "0").length;
const fixtures = [
  ["Design a DFA for binary strings ending in 01", (s) => s.endsWith("01")],
  [
    "Construct an NFA that accepts all binary strings starting with 10",
    (s) => s.startsWith("10"),
  ],
  ["binary strings containing 001", (s) => s.includes("001")],
  ["binary strings that do not contain 00", (s) => !s.includes("00")],
  ["binary strings with even number of 1s", (s) => ones(s) % 2 === 0],
  ["binary strings with odd number of 0s", (s) => zeros(s) % 2 === 1],
  ["binary strings with exactly two 1s", (s) => ones(s) === 2],
  ["binary strings with at least 3 zeros", (s) => zeros(s) >= 3],
  ["binary strings with at most 2 ones", (s) => ones(s) <= 2],
  ["binary strings with number of 1s divisible by 3", (s) => ones(s) % 3 === 0],
  ["binary strings with number of 0s modulo 3 = 2", (s) => zeros(s) % 3 === 2],
  ["binary strings whose length is exactly 3", (s) => s.length === 3],
  ["binary strings of length at least 2", (s) => s.length >= 2],
  ["binary strings with length at most 4", (s) => s.length <= 4],
  ["binary strings with even length", (s) => s.length % 2 === 0],
  ["binary strings with odd length", (s) => s.length % 2 === 1],
  ["binary strings with length divisible by 3", (s) => s.length % 3 === 0],
  ["binary strings with length modulo 4 = 1", (s) => s.length % 4 === 1],
  [
    "binary numbers divisible by 3",
    (s) => s.length > 0 && parseInt(s, 2) % 3 === 0,
  ],
  [
    "binary numbers divisible by 5",
    (s) => s.length > 0 && parseInt(s, 2) % 5 === 0,
  ],
  [
    "binary strings starting with 1 and ending in 00",
    (s) => s.startsWith("1") && s.endsWith("00"),
  ],
  [
    "binary strings with even number of 1s and odd number of 0s",
    (s) => ones(s) % 2 === 0 && zeros(s) % 2 === 1,
  ],
  [
    "binary strings starting with 01 or ending with 10",
    (s) => s.startsWith("01") || s.endsWith("10"),
  ],
  [
    "binary strings not (contains 00 or contains 11)",
    (s) => !s.includes("00") && !s.includes("11"),
  ],
  [
    "binary strings starting with 0 or ending in 1 and even length",
    (s) => s.startsWith("0") || (s.endsWith("1") && s.length % 2 === 0),
  ],
  [
    "binary strings (starting with 0 or ending in 1) and even length",
    (s) => (s.startsWith("0") || s.endsWith("1")) && s.length % 2 === 0,
  ],
  ["binary strings with no consecutive 1s", (s) => !s.includes("11")],
  ['binary strings exactly "010"', (s) => s === "010"],
  ["binary strings only empty string", (s) => s === ""],
  ["binary strings with exactly zero 1s", (s) => ones(s) === 0],
  ["binary strings with at least 0 ones", () => true],
  ["binary strings jo 01 se end hoti hain", (s) => s.endsWith("01")],
  ["binary strings 1 se shuru ho", (s) => s.startsWith("1")],
  [
    "binary strings with even number of 1s aur odd number of 0s",
    (s) => ones(s) % 2 === 0 && zeros(s) % 2 === 1,
  ],
];
for (const [question, predicate] of fixtures)
  for (const type of ["DFA", "NFA", "ENFA"]) {
    const r = Q.generate(question, { type });
    E.validate(r.model);
    for (const s of binary)
      test(`${type} ${question} / ${s}`, () => {
        const actual = E.simulate(r.model, s).accepted,
          expected = predicate(s);
        assert.equal(actual, expected);
        records.push({
          group: "question",
          type,
          source: question,
          input: s,
          expected,
          actual,
          pass: actual === expected,
        });
      });
    test(`independent generated cases ${type} ${question}`, () => {
      for (const [s, expected] of r.tests) {
        if (expected === "ERROR") assert.throws(() => E.simulate(r.model, s));
        else {
          assert.equal(expected, predicate(s));
          assert.equal(E.simulate(r.model, s).accepted, expected);
        }
      }
    });
  }
for (const [question, predicate] of [
  [
    "strings over {a,b} starting with ab and ending in ba",
    (s) => s.startsWith("ab") && s.endsWith("ba"),
  ],
  [
    "strings over {a,b} with exactly two a's",
    (s) => [...s].filter((c) => c === "a").length === 2,
  ],
  ["strings over {a,b} that do not contain bb", (s) => !s.includes("bb")],
])
  for (const type of ["DFA", "NFA", "ENFA"]) {
    const r = Q.generate(question, { type });
    for (const s of letters)
      test(`${type} ${question} ${s}`, () =>
        assert.equal(E.simulate(r.model, s).accepted, predicate(s)));
  }
const regexes = [
  "(0|1)*01",
  "0*1*",
  "(00|11)*",
  "(01|10)+",
  "0?1+",
  "(0|ε)1",
  "∅",
  "ε",
  "",
  "[01]*00[01]*",
  ".(01)?",
  "(0|1)(0|1)",
  "(0|01)*",
  "(00|0)*",
  "(0|1)*",
  "((0|1)*)*",
];
for (const regex of regexes)
  for (const type of ["DFA", "NFA", "ENFA"]) {
    const r = Q.generate(regex, { mode: "regex", type, alphabet: ["0", "1"] });
    const js = new RegExp(
      "^(?:" + regex.replace(/ε/g, "").replace(/∅/g, "(?!)") + ")$",
    );
    for (const s of binary)
      test(`regex ${regex} ${type} ${s}`, () => {
        const expected = js.test(s),
          actual = E.simulate(r.model, s).accepted;
        assert.equal(actual, expected);
        records.push({
          group: "regex",
          type,
          source: regex,
          input: s,
          expected,
          actual,
          pass: actual === expected,
        });
      });
  }
for (const regex of ["a*b", "(ab|ba)+", "[a-b]*ab", "a?b+", "a.b"])
  for (const type of ["DFA", "NFA", "ENFA"]) {
    const r = Q.generate(regex, { mode: "regex", type, alphabet: ["a", "b"] }),
      reference = new RegExp("^(?:" + regex + ")$");
    for (const s of letters)
      test(`letters regex ${regex} ${type} ${s}`, () =>
        assert.equal(E.simulate(r.model, s).accepted, reference.test(s)));
  }
for (const question of [
  "binary strings with equal number of 0s and 1s",
  "binary palindromes",
  "ending in 01 then print a message",
  "binary strings containing 01 and something random",
  "binary strings ending in 02",
  "binary strings with exactly -1 ones",
  "binary strings with number of 1s modulo 0 = 0",
  "binary strings with number of 1s modulo 2 = 3",
  "binary numbers divisible by 0",
  "binary strings with exactly 41 ones",
])
  test("unsupported question " + question, () =>
    assert.throws(() => Q.generate(question)),
  );
for (const regex of [
  "(",
  "0)",
  "[",
  "[]",
  "[^01]",
  "0**",
  "0{2}",
  "\\d+",
  "(0)\\1",
  "(?=0)1",
  "[z-a]",
  "0\\",
])
  test("unsupported regex " + regex, () =>
    assert.throws(() => Q.generate(regex, { mode: "regex" })),
  );
test("conflicting alphabet refuses construction", () =>
  assert.throws(
    () =>
      Q.generate("strings over {a,b} ending in a", { alphabet: ["0", "1"] }),
    /disagree/,
  ));
test("binary question refuses other alphabet", () =>
  assert.throws(
    () => Q.generate("binary strings ending in 01", { alphabet: ["a", "b"] }),
    /binary/,
  ));
test("epsilon-only exact pattern accepts only empty input", () => {
  const r = Q.generate('binary strings exactly ""');
  assert(E.simulate(r.model, "").accepted);
  assert(!E.simulate(r.model, "0").accepted);
});
test("fresh arbitrary patterns are constructed dynamically", () => {
  for (const pattern of ["101101", "00001", "1100101"]) {
    const r = Q.generate("binary strings ending in " + pattern);
    for (const s of [pattern, "0" + pattern, pattern + "0", ""])
      assert.equal(E.simulate(r.model, s).accepted, s.endsWith(pattern));
  }
});
test("count threshold is not a pre-made preset", () => {
  const r = Q.generate("binary strings with exactly 17 ones");
  for (const n of [0, 16, 17, 18])
    assert.equal(E.simulate(r.model, "1".repeat(n)).accepted, n === 17);
});
test("compiler resource limit refuses overlarge construction", () =>
  assert.throws(() => Q.generate("0".repeat(100), { mode: "regex" }), /128/));
test("DFA minimization produces 3 states for ends-in-01", () =>
  assert.equal(
    Q.generate("(0|1)*01", { mode: "regex" }).model.states.length,
    3,
  ));
test("reachable subset construction includes trap where needed", () => {
  const m = C.determinize(C.regex("01", ["0", "1"], "NFA").model);
  E.validate(m);
  assert(!E.simulate(m, "000").accepted);
});
test("question NFA can expose multiple computation branches", () => {
  const r = Q.generate("binary strings ending in 01", { type: "NFA" }),
    tree = E.enumeratePaths(r.model, "0101");
  assert(tree.nodes.some((n) => n.status === "accepting"));
  assert(tree.nodes.some((n) => n.status.startsWith("dead")));
});
test("conversion functions do not mutate their input", () => {
  const m = C.regex("a*b", ["a", "b"], "ENFA").model,
    before = JSON.stringify(m);
  C.removeEpsilon(m);
  C.determinize(m);
  C.minimize(C.determinize(m));
  assert.equal(JSON.stringify(m), before);
});
test("common question phrasing variants preserve semantics", () => {
  for (const q of [
    "DFA for a binary string containing substring 01",
    "Construct a DFA that accepts a binary string containing the pattern 01",
  ]) {
    const r = Q.generate(q);
    for (const s of binary)
      assert.equal(E.simulate(r.model, s).accepted, s.includes("01"));
  }
  const r = Q.generate("strings with length is 3");
  assert(E.simulate(r.model, "010").accepted);
});
test("escaped metacharacters and Unicode literals", () => {
  for (const symbol of ["*", ".", "|", "😀"]) {
    const source = symbol === "😀" ? symbol : "\\" + symbol;
    const r = Q.generate(source, { mode: "regex", alphabet: [symbol, "x"] });
    assert(E.simulate(r.model, symbol).accepted);
    assert(!E.simulate(r.model, "x").accepted);
  }
});
test("quoted operator words are literal patterns", () => {
  const r = Q.generate('strings over {a,n,d} containing "and"');
  assert(E.simulate(r.model, "and").accepted);
  assert(!E.simulate(r.model, "ana").accepted);
});
test("literal word binary is not a binary-alphabet declaration", () => {
  const r = Q.generate('strings over {b,i,n,a,r,y} containing "binary"');
  assert(E.simulate(r.model, "binary").accepted);
});
test("whitespace in imported state identifier is rejected", () =>
  assert.throws(() =>
    E.validate({
      type: "DFA",
      states: ["s\n"],
      alphabet: [],
      start: "s\n",
      accepting: [],
      transitions: [],
    }),
  ));
// A deterministic randomized regression set exercises nested regex construction.
let seed = 20261125;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
function expression(depth) {
  if (!depth || random() < 0.3) return random() < 0.5 ? "0" : "1";
  const a = expression(depth - 1),
    choice = Math.floor(random() * 4);
  return choice === 0
    ? "(" + a + "|" + expression(depth - 1) + ")"
    : choice === 1
      ? "(" + a + expression(depth - 1) + ")"
      : choice === 2
        ? "(" + a + ")*"
        : "(" + a + ")?";
}
for (let i = 0; i < 30; i++) {
  const source = expression(3),
    model = Q.generate(source, { mode: "regex", alphabet: ["0", "1"] }).model,
    reference = new RegExp("^(?:" + source + ")$");
  for (const s of words(["0", "1"], 6))
    test("random regex " + i + " " + s, () =>
      assert.equal(E.simulate(model, s).accepted, reference.test(s)),
    );
}
if (process.env.STATE_STUDIO_RESULTS) {
  fs.mkdirSync(process.env.STATE_STUDIO_RESULTS, { recursive: true });
  const csv = (value) => '"' + String(value).replace(/"/g, '""') + '"';
  fs.writeFileSync(
    path.join(process.env.STATE_STUDIO_RESULTS, "construction-results.csv"),
    [
      "Group,Model,Question or regex,Input (blank = epsilon),Expected,Actual,Check",
      ...records.map((r) =>
        [
          r.group,
          r.type,
          r.source,
          r.input,
          r.expected ? "ACCEPTED" : "REJECTED",
          r.actual ? "ACCEPTED" : "REJECTED",
          r.pass ? "PASS" : "FAIL",
        ]
          .map(csv)
          .join(","),
      ),
    ].join("\r\n"),
  );
}
console.log(
  `PASS: ${count} construction tests; controlled questions, all three models, independent language predicates, native regex oracles, limits and random nested expressions.`,
);
