"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const E = require("../prototype/engine"),
  Q = require("../prototype/questions"),
  P = require("../prototype/presets");
const root = path.resolve(__dirname, ".."),
  dest = path.join(root, "validation"),
  examples = path.join(root, "examples");
fs.mkdirSync(dest, { recursive: true });
fs.mkdirSync(examples, { recursive: true });
const label = (x) => (x === "ERROR" ? "ERROR" : x ? "ACCEPTED" : "REJECTED"),
  csv = (v) => '"' + String(v).replace(/"/g, '""') + '"';
const presetRows = [];
for (const [key, m] of Object.entries(P.machines))
  for (const [input, expected] of P.cases[key]) {
    let actual;
    try {
      actual = E.simulate(m, input).accepted;
    } catch (e) {
      actual = "ERROR";
    }
    assert.equal(actual, expected);
    presetRows.push([key, input, label(expected), label(actual), "PASS"]);
  }
fs.writeFileSync(
  path.join(dest, "preset-results.csv"),
  [
    ["Preset", "Input (blank = epsilon)", "Expected", "Actual", "Check"],
    ...presetRows,
  ]
    .map((row) => row.map(csv).join(","))
    .join("\r\n"),
);
const fixtures = [
  {
    question: "Design a DFA for binary strings ending in 01",
    type: "DFA",
    cases: [
      ["0101", true],
      ["010", false],
      ["", false],
    ],
  },
  {
    question: "Binary strings with even number of 1s and odd number of 0s",
    type: "DFA",
    cases: [
      ["101", true],
      ["11", false],
      ["0", true],
      ["", false],
    ],
  },
  {
    question: "Binary strings starting with 1 and ending in 00",
    type: "DFA",
    cases: [
      ["100", true],
      ["001", false],
    ],
  },
  {
    question: "Binary strings with exactly two 1s",
    type: "DFA",
    cases: [
      ["101", true],
      ["111", false],
    ],
  },
  {
    question: "Binary strings with length at most 4",
    type: "DFA",
    cases: [
      ["0101", true],
      ["01010", false],
      ["", true],
    ],
  },
  {
    question: "Binary numbers divisible by 3",
    type: "DFA",
    cases: [
      ["110", true],
      ["101", false],
      ["0", true],
      ["", false],
    ],
  },
  {
    question: "Strings over {a,b} starting with ab and ending in ba",
    type: "DFA",
    cases: [
      ["abba", true],
      ["abab", false],
    ],
  },
  {
    question: "Binary strings with no consecutive 1s",
    type: "DFA",
    cases: [
      ["1010", true],
      ["110", false],
    ],
  },
  {
    question: "Binary strings ending in 01",
    type: "NFA",
    cases: [
      ["101", true],
      ["010", false],
    ],
  },
  {
    question: "a*b",
    mode: "regex",
    alphabet: ["a", "b"],
    type: "ENFA",
    cases: [
      ["aab", true],
      ["aba", false],
      ["", false],
      ["b", true],
    ],
  },
];
const rows = [];
fixtures.forEach((f, i) => {
  const r = Q.generate(f.question, {
    type: f.type,
    mode: f.mode || "question",
    alphabet: f.alphabet,
  });
  for (const [s, expected] of f.cases) {
    const generated = E.simulate(r.model, s);
    assert.equal(generated.accepted, expected);
    rows.push([
      i + 1,
      f.type,
      f.question,
      s,
      label(expected),
      label(generated.accepted),
      "PASS",
      generated.steps
        .map((step) => step.states.join("|") || "EMPTY")
        .join(" -> "),
    ]);
  }
  if ([0, 1, 8, 9].includes(i))
    fs.writeFileSync(
      path.join(examples, `generated-${i + 1}-${f.type.toLowerCase()}.json`),
      JSON.stringify(r.model, null, 2),
    );
});
fs.writeFileSync(
  path.join(examples, "demo-questions.json"),
  JSON.stringify(fixtures, null, 2),
);
fs.writeFileSync(
  path.join(dest, "manual-and-generated.csv"),
  [
    [
      "Example",
      "Model",
      "Question or regex",
      "Input (blank = epsilon)",
      "Expected",
      "Actual",
      "Check",
      "State-set trace",
    ],
    ...rows,
  ]
    .map((row) => row.map(csv).join(","))
    .join("\r\n"),
);
fs.writeFileSync(
  path.join(dest, "manual-summary.json"),
  JSON.stringify(
    {
      date: "2026-11-25",
      examples: fixtures.length,
      cases: rows.length,
      passed: rows.length,
      failed: 0,
    },
    null,
    2,
  ),
);
console.log(
  `PASS: evidence exported for ${presetRows.length} preset cases and ${rows.length} manually specified generated-machine cases.`,
);
