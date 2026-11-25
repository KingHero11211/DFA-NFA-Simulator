/* Event-logic smoke tests with a DOM stand-in, NOT a browser/layout test. */
"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const root = path.join(__dirname, ".."),
  html = fs.readFileSync(path.join(root, "prototype/index.html"), "utf8");
class Element {
  constructor() {
    this.value = "";
    this.textContent = "";
    this.className = "";
    this.children = [];
    this.selectors = {};
    this.listeners = {};
    this.disabled = false;
  }
  set innerHTML(s) {
    this.html = s;
    this.children = [];
    this.selectors = {};
  }
  get innerHTML() {
    return this.html || "";
  }
  append(child) {
    this.children.push(child);
  }
  querySelector(s) {
    return this.selectors[s] || (this.selectors[s] = new Element());
  }
  addEventListener(event, fn) {
    (this.listeners[event] || (this.listeners[event] = [])).push(fn);
  }
  insertAdjacentHTML(where, s) {
    this.html = (this.html || "") + s;
  }
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length);
const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
elements.speed.value = "700";
let timerId = 0;
const timers = new Map();
const context = vm.createContext({
  console,
  document: {
    getElementById: (id) => {
      assert(elements[id], `Missing HTML element ${id}`);
      return elements[id];
    },
    createElement: () => new Element(),
    querySelectorAll: () => [],
  },
  setInterval: (fn) => {
    timers.set(++timerId, fn);
    return timerId;
  },
  clearInterval: (id) => timers.delete(id),
  setTimeout: (fn) => fn(),
});
for (const file of [
  "engine.js",
  "compiler.js",
  "questions.js",
  "presets.js",
  "app.js",
])
  vm.runInContext(
    fs.readFileSync(path.join(root, "prototype", file), "utf8"),
    context,
    { filename: file },
  );
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
function event(id, kind = "click", value) {
  const e = elements[id];
  if (value !== undefined) e.value = value;
  if (e["on" + kind]) e["on" + kind]({ target: e });
  for (const f of e.listeners[kind] || []) f({ target: e });
}
function ticks(n = 400) {
  for (let i = 0; i < n && timers.size; i++)
    for (const f of [...timers.values()]) f();
}
test("boot renders SVG and editor", () => {
  assert.match(elements.graph.innerHTML, /<svg/);
  assert.equal(elements.states.children.length, 3);
  assert.equal(elements.transitions.children.length, 6);
});
test("initial step does not consume input", () => {
  event("step");
  assert.match(elements.stepLabel.textContent, /0 \/ 4/);
});
test("forward and backward select trace snapshots", () => {
  event("step");
  assert.equal(elements.consumed.textContent, "0");
  event("back");
  assert.equal(elements.consumed.textContent, "");
});
test("run, pause, resume, complete", () => {
  event("run");
  ticks(1);
  event("pause");
  assert.equal(timers.size, 0);
  const consumed = elements.consumed.textContent;
  event("run");
  assert.equal(elements.consumed.textContent, consumed);
  ticks();
  assert.match(elements.result.textContent, /^ACCEPTED/);
  assert.equal(elements.step.disabled, true);
});
test("reset returns to initial snapshot", () => {
  event("reset");
  assert.equal(elements.consumed.textContent, "");
  assert.match(elements.result.textContent, /Processing/);
});
test("rejected input", () => {
  event("input", "input", "010");
  event("run");
  ticks();
  assert.match(elements.result.textContent, /^REJECTED/);
});
test("invalid input shows error", () => {
  event("input", "input", "2");
  event("run");
  assert.match(elements.result.textContent, /INPUT ERROR/);
});
test("blank string finishes at step zero", () => {
  event("input", "input", "");
  event("run");
  assert.match(elements.result.textContent, /^REJECTED/);
  assert.equal(timers.size, 0);
});
test("all documented DFA cases pass in panel", () => {
  event("runTests");
  assert.match(elements.testSummary.textContent, /13 \/ 13/);
});
test("NFA preset shows tree and accepting path", () => {
  event("preset", "change", "nfa");
  event("run");
  ticks();
  assert.match(elements.result.textContent, /^ACCEPTED/);
  assert.match(elements.paths.innerHTML, /acceptPath/);
  assert.match(elements.paths.innerHTML, /dead: no transition/);
  assert.equal(elements.pathPanel.hidden, false);
});
test("NFA test panel", () => {
  event("runTests");
  assert.match(elements.testSummary.textContent, /13 \/ 13/);
});
test("ENFA shows closure before consuming input", () => {
  event("preset", "change", "enfa");
  event("step");
  assert.match(elements.trace.innerHTML, /q0, q1/);
  event("run");
  ticks();
  assert.match(elements.result.textContent, /^ACCEPTED/);
});
test("ENFA test panel", () => {
  event("runTests");
  assert.match(elements.testSummary.textContent, /13 \/ 13/);
});
test("invalid import retains model", () => {
  elements.json.value = "{}";
  event("import");
  assert.match(elements.message.textContent, /Import failed/);
  event("runTests");
  assert.match(elements.testSummary.textContent, /13 \/ 13/);
});
test("custom imported machine controls results", () => {
  elements.json.value = JSON.stringify({
    type: "DFA",
    states: ["s"],
    alphabet: ["x"],
    start: "s",
    accepting: ["s"],
    transitions: [{ from: "s", symbol: "x", to: ["s"] }],
  });
  event("import");
  event("input", "input", "xxx");
  event("run");
  ticks();
  assert.match(elements.result.textContent, /^ACCEPTED/);
  assert.match(elements.graph.innerHTML, />s</);
});
test("pending alphabet edit prevents stale simulation and tests", () => {
  event("alphabet", "input", "y");
  event("reset");
  assert.match(elements.result.textContent, /INPUT ERROR/);
  event("runTests");
  assert.match(elements.testSummary.textContent, /Apply alphabet/);
  event("alphabetApply");
  assert.match(elements.message.textContent, /Incomplete DFA/);
});
test("adding state is dynamic", () => {
  event("preset", "change", "nfa");
  elements.newState.value = "q3";
  event("addState");
  assert.equal(elements.states.children.length, 4);
  assert.match(elements.message.textContent, /Unreachable states: q3/);
});
test("table edit changes dynamic transitions", () => {
  const input = elements.transitions.children[0].querySelector("input");
  input.value = "q1";
  input.oninput({ target: input });
  event("input", "input", "001");
  event("run");
  ticks();
  assert.match(elements.result.textContent, /^REJECTED/);
});
test("remove state cleans references", () => {
  elements.states.children[3].querySelector("button").onclick();
  assert.equal(elements.states.children.length, 3);
  assert.doesNotMatch(elements.json.value, /q3/);
});
test("invalid case syntax reports a message", () => {
  elements.testCases.value = "not-json";
  event("runTests");
  assert(elements.testSummary.textContent);
  assert.doesNotMatch(elements.testSummary.textContent, /passed/);
});
for (const [key, accepted, rejected, blankAccepts] of [
  ["even_ones", "101", "1", true],
  ["starts_one", "101", "01", false],
  ["contains_00", "100", "101", false],
])
  test(`${key}: selectable preset, example, editor, cases and outcomes`, () => {
    assert(
      html.includes(`option value="${key}"`),
      `Missing dropdown option ${key}`,
    );
    event("preset", "change", key);
    assert.equal(elements.pathPanel.hidden, true);
    assert.equal(elements.states.children.length, key === "even_ones" ? 2 : 3);
    assert.equal(elements.input.value, accepted);
    event("run");
    ticks();
    assert.match(elements.result.textContent, /^ACCEPTED/);
    event("runTests");
    assert.match(elements.testSummary.textContent, /13 \/ 13/);
    event("input", "input", rejected);
    event("run");
    ticks();
    assert.match(elements.result.textContent, /^REJECTED/);
    event("input", "input", "");
    event("run");
    assert.match(
      elements.result.textContent,
      blankAccepts ? /^ACCEPTED/ : /^REJECTED/,
    );
  });
test("question generator loads constructed machine and independent cases", () => {
  elements.question.value = "Binary strings with exactly two 1s";
  elements.outputType.value = "DFA";
  elements.questionMode.value = "question";
  elements.questionAlphabet.value = "";
  event("generate");
  assert.equal(elements.construction.hidden, false);
  assert.match(elements.interpretation.textContent, /exactly 2/);
  assert.equal(elements.states.children.length, 4);
  event("input", "input", "101");
  event("run");
  ticks();
  assert.match(elements.result.textContent, /^ACCEPTED/);
  event("runTests");
  assert.match(elements.testSummary.textContent, /passed/);
  assert.doesNotMatch(elements.testResults.innerHTML, />FAIL</);
});
test("unsupported question keeps working definition", () => {
  const saved = elements.json.value;
  elements.question.value = "Please solve an arbitrary programming problem";
  event("generate");
  assert.match(elements.generationStatus.textContent, /could not interpret/);
  assert.equal(elements.json.value, saved);
});
test("regex generator and ENFA playback", () => {
  elements.question.value = "a*b";
  elements.questionMode.value = "regex";
  elements.outputType.value = "ENFA";
  elements.questionAlphabet.value = "a,b";
  event("generate");
  assert.match(elements.machineStats.textContent, /ENFA/);
  event("input", "input", "aab");
  event("run");
  ticks();
  assert.match(elements.result.textContent, /^ACCEPTED/);
  assert.equal(elements.pathPanel.hidden, false);
});
test("editing constructed machine marks original question expectations", () => {
  elements.states.children[0]
    .querySelector("[type=checkbox]")
    .onchange({ target: { checked: true } });
  assert.match(elements.constructionNotice.textContent, /Machine edited/);
});
test("edited test cases invalidate CSV export", () => {
  event("runTests");
  assert.equal(elements.downloadTests.disabled, false);
  event("testCases", "input", '["", false]');
  assert.equal(elements.downloadTests.disabled, true);
});
console.log(
  `PASS: ${count} UI event smoke tests (DOM stand-in; browser rendering not tested).`,
);
