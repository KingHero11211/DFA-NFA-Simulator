/* UI only: all language decisions are delegated to engine.js. */
"use strict";
const $ = (id) => document.getElementById(id);
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const list = (x) =>
  x
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const setLabel = (a) => (a.length ? `{${a.join(", ")}}` : "∅");
let model,
  simulation = null,
  tree = null,
  cursor = 0,
  timer = null,
  alphabetDirty = false;
let constructionData = null,
  testRecords = [],
  graphZoom = 1;
function pause() {
  clearInterval(timer);
  timer = null;
}
function report(message, error = false) {
  $("message").textContent = message;
  $("message").className = error ? "error" : "success";
}
function invalidate() {
  pause();
  simulation = null;
  tree = null;
  cursor = 0;
  $("trace").innerHTML = "";
  $("paths").innerHTML = "";
  $("treeWarning").textContent = "";
  $("testResults").innerHTML = "";
  $("testSummary").textContent = "";
  testRecords = [];
  $("downloadTests").disabled = true;
  $("result").className = "result";
  $("result").textContent = "Ready — choose Run or Step.";
  $("consumed").textContent = "";
  $("remaining").textContent = $("input").value || "ε";
  $("stepLabel").textContent = "Step 0";
  $("back").disabled = true;
  $("step").disabled = false;
}
function checkDraft() {
  if (constructionData) {
    constructionData = null;
    $("constructionNotice").textContent =
      "Machine edited: the explanation and expected cases describe the original generated language. Re-generate to restore that machine, or update the expectations for your edited language.";
    $("testOrigin").textContent =
      "Expected cases describe the original generated language; the machine has been edited.";
  }
  invalidate();
  try {
    const v = Automata.validate(model);
    report(v.warnings.join(" ") || "Valid machine.");
    drawGraph();
  } catch (e) {
    report(e.message, true);
    $("graph").innerHTML =
      '<p class="hint">Complete the editor to draw a valid machine.</p>';
  }
  $("json").value = JSON.stringify(model, null, 2);
}
function edit() {
  $("type").value = model.type;
  if (!alphabetDirty) $("alphabet").value = model.alphabet.join(",");
  $("states").innerHTML = "";
  for (const q of model.states) {
    const row = document.createElement("div");
    row.className = "stateRow";
    row.innerHTML = `<b>${esc(q)}</b><label><input type="radio" name="start" aria-label="Start ${esc(q)}" ${model.start === q ? "checked" : ""}>Start</label><label><input type="checkbox" aria-label="Accept ${esc(q)}" ${model.accepting.includes(q) ? "checked" : ""}>Final</label><button aria-label="Remove ${esc(q)}">×</button>`;
    row.querySelector("[type=radio]").onchange = () => {
      model.start = q;
      checkDraft();
    };
    row.querySelector("[type=checkbox]").onchange = (e) => {
      model.accepting = e.target.checked
        ? [...model.accepting, q]
        : model.accepting.filter((s) => s !== q);
      checkDraft();
    };
    row.querySelector("button").onclick = () => {
      model.states = model.states.filter((s) => s !== q);
      model.accepting = model.accepting.filter((s) => s !== q);
      if (model.start === q) model.start = "";
      model.transitions = model.transitions
        .filter((t) => t.from !== q)
        .map((t) => ({ ...t, to: t.to.filter((s) => s !== q) }));
      edit();
      checkDraft();
    };
    $("states").append(row);
  }
  $("transitions").innerHTML = "";
  for (const q of model.states)
    for (const a of [
      ...model.alphabet,
      ...(model.type === "ENFA" ? [""] : []),
    ]) {
      const tr = document.createElement("tr");
      const found = model.transitions.find(
        (t) => t.from === q && t.symbol === a,
      );
      tr.innerHTML = `<td>${esc(q)}</td><td>${esc(a || "ε")}</td><td><input aria-label="Destinations for ${esc(q)}, ${esc(a || "epsilon")}" value="${esc(found ? found.to.join(",") : "")}"></td>`;
      tr.querySelector("input").oninput = (e) => {
        model.transitions = model.transitions.filter(
          (t) => !(t.from === q && t.symbol === a),
        );
        const to = list(e.target.value);
        if (to.length || model.type === "DFA")
          model.transitions.push({ from: q, symbol: a, to });
        checkDraft();
      };
      $("transitions").append(tr);
    }
  $("pathPanel").hidden = model.type === "DFA";
}
function load(key) {
  constructionData = null;
  $("construction").hidden = true;
  $("generationStatus").className = "";
  $("generationStatus").textContent =
    "Preset loaded. Enter a question above to construct another machine.";
  $("testOrigin").textContent =
    "Expected answers are supplied with the selected preset.";
  alphabetDirty = false;
  $("run").disabled = false;
  model = JSON.parse(JSON.stringify(Presets.machines[key]));
  $("input").value = Presets.examples[key];
  $("testCases").value = Presets.cases[key]
    .map((c) => JSON.stringify(c))
    .join("\n");
  edit();
  checkDraft();
}
function drawGraph(step = { states: [], edges: [] }) {
  const n = model.states.length,
    r = n > 8 ? 260 : 155,
    columns = Math.min(6, n),
    w = n > 8 ? columns * 230 + 100 : 850,
    h = n > 8 ? Math.ceil(n / columns) * 170 + 110 : 520,
    cx = w / 2,
    cy = h / 2;
  const positions = new Map(
    model.states.map((q, i) => [
      q,
      n > 8
        ? [
            110 +
              (Math.floor(i / columns) % 2
                ? columns - 1 - (i % columns)
                : i % columns) *
                230,
            110 + Math.floor(i / columns) * 170,
          ]
        : n === 1
          ? [cx, cy]
          : [
              cx + r * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n),
              cy + r * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n),
            ],
    ]),
  );
  const groups = new Map();
  for (const t of model.transitions)
    for (const dest of t.to) {
      const key = JSON.stringify([t.from, dest]);
      if (!groups.has(key))
        groups.set(key, { from: t.from, to: dest, labels: [] });
      groups.get(key).labels.push(t.symbol);
    }
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(model.type)} state diagram" style="width:${graphZoom * 100}%;height:auto;max-width:none"><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8" fill="#61768c"/></marker><marker id="activeArrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8" fill="#d16a0b"/></marker></defs>`;
  for (const edge of groups.values()) {
    const [x, y] = positions.get(edge.from),
      [u, v] = positions.get(edge.to);
    const active = step.edges.some(
      (e) =>
        e.from === edge.from &&
        e.to === edge.to &&
        edge.labels.includes(e.symbol),
    );
    let d, lx, ly;
    if (edge.from === edge.to) {
      d = `M ${x - 22} ${y - 23} C ${x - 85} ${y - 108}, ${x + 85} ${y - 108}, ${x + 22} ${y - 23}`;
      lx = x;
      ly = y - 88;
    } else {
      const dx = u - x,
        dy = v - y,
        len = Math.hypot(dx, dy),
        bend = groups.has(JSON.stringify([edge.to, edge.from])) ? 42 : 0;
      const mx = (x + u) / 2 - (dy / len) * bend,
        my = (y + v) / 2 + (dx / len) * bend;
      const a = Math.hypot(mx - x, my - y),
        b = Math.hypot(u - mx, v - my);
      d = `M ${x + ((mx - x) * 34) / a} ${y + ((my - y) * 34) / a} Q ${mx} ${my} ${u - ((u - mx) * 37) / b} ${v - ((v - my) * 37) / b}`;
      // Place labels away from the centre crossing, near 43% of each edge.
      const t = 0.43;
      lx =
        (1 - t) * (1 - t) * x +
        2 * (1 - t) * t * mx +
        t * t * u -
        (dy / len) * 6;
      ly =
        (1 - t) * (1 - t) * y +
        2 * (1 - t) * t * my +
        t * t * v +
        (dx / len) * 6 -
        9;
    }
    svg += `<path d="${d}" fill="none" stroke="${active ? "#d16a0b" : "#61768c"}" stroke-width="${active ? 3.5 : 1.7}" marker-end="url(#${active ? "activeArrow" : "arrow"})"/><text x="${lx}" y="${ly}" text-anchor="middle" font-size="14" fill="${active ? "#b14b00" : "#334c66"}" style="paint-order:stroke;stroke:#fff;stroke-width:6px;stroke-linejoin:round">${esc(edge.labels.map((a) => a || "ε").join(","))}</text>`;
  }
  const [sx, sy] = positions.get(model.start);
  svg += `<path d="M ${sx - 85} ${sy} L ${sx - 37} ${sy}" stroke="#61768c" stroke-width="2" marker-end="url(#arrow)"/><text x="${sx - 88}" y="${sy - 10}" font-size="11" fill="#61768c">start</text>`;
  for (const [q, [x, y]] of positions) {
    const active = step.states.includes(q),
      stroke = active ? "#155bd7" : "#61768c";
    svg += `<g><circle cx="${x}" cy="${y}" r="32" fill="${active ? "#dceaff" : "white"}" stroke="${stroke}" stroke-width="${active ? 3 : 2}"/>${model.accepting.includes(q) ? `<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${stroke}" stroke-width="1.7"/>` : ""}<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Consolas,monospace" font-size="${q.length > 7 ? 8 : 14}" fill="#173653">${esc(q)}</text></g>`;
  }
  $("graph").innerHTML = svg + "</svg>";
}
function initialize() {
  pause();
  try {
    if (alphabetDirty)
      throw new Error("Click Apply alphabet to use the edited alphabet.");
    simulation = Automata.simulate(model, $("input").value);
    tree =
      model.type === "DFA"
        ? null
        : Automata.enumeratePaths(model, $("input").value);
    cursor = 0;
    render();
    return true;
  } catch (e) {
    simulation = null;
    report(e.message, true);
    $("result").className = "result rejected";
    $("result").textContent = `INPUT ERROR — ${e.message}`;
    return false;
  }
}
function render() {
  const step = simulation.steps[cursor],
    chars = [...$("input").value],
    done = cursor === simulation.steps.length - 1;
  drawGraph(step);
  $("stepLabel").textContent = `Step ${cursor} / ${chars.length}`;
  $("consumed").textContent = chars.slice(0, cursor).join("");
  $("remaining").textContent =
    chars.slice(cursor).join("") || (chars.length ? "" : "ε");
  $("trace").innerHTML = simulation.steps
    .slice(0, cursor + 1)
    .map(
      (s) =>
        `<tr class="${s.i === cursor ? "traceCurrent" : ""}"><td>${s.i}</td><td>${esc(s.symbol === null ? "start / ε-closure" : s.symbol)}</td><td>${esc(setLabel(s.states))}</td><td>${esc(s.edges.map((e) => `${e.from} —${e.symbol || "ε"}→ ${e.to}`).join("; ") || "—")}</td></tr>`,
    )
    .join("");
  $("result").className =
    "result" + (done ? (simulation.accepted ? " accepted" : " rejected") : "");
  $("result").textContent = done
    ? `${simulation.accepted ? "ACCEPTED" : "REJECTED"} — ${simulation.reason}`
    : `Processing — ${cursor} of ${chars.length} symbols consumed; current states ${setLabel(step.states)}.`;
  $("back").disabled = cursor === 0;
  $("step").disabled = done;
  if (tree) {
    $("treeWarning").textContent = tree.truncated
      ? `Display truncated at ${tree.limit} nodes. Some branches / accepting paths may be omitted. The verdict uses the complete state-set simulation.`
      : "All finite path prefixes shown; repeated (state, input position) on a branch are summarized as ε cycles.";
    $("paths").innerHTML = tree.nodes
      .filter((n) => n.i <= cursor)
      .map(
        (n) =>
          `<tr class="${done && n.acceptingPath ? "acceptPath" : n.status.startsWith("dead") ? "dead" : ""}"><td>#${n.id} ← ${n.parent === null ? "root" : "#" + n.parent}</td><td style="padding-left:${10 + Math.min(n.depth, 15) * 10}px">${n.depth > 15 ? "… " : ""}${esc(n.via === null ? "start" : n.via || "ε")} → ${esc(n.q)}</td><td>${n.i}</td><td>${esc(done || n.i < cursor ? n.status : n.status === "branch" ? "branch" : "current frontier")}</td></tr>`,
      )
      .join("");
  }
  if (done) pause();
}
$("preset").onchange = (e) => load(e.target.value);
$("type").onchange = (e) => {
  model.type = e.target.value;
  model.transitions = model.transitions.filter(
    (t) => t.symbol !== "" || model.type === "ENFA",
  );
  edit();
  checkDraft();
};
$("alphabetApply").onclick = () => {
  alphabetDirty = false;
  model.alphabet = list($("alphabet").value);
  model.transitions = model.transitions.filter(
    (t) =>
      model.alphabet.includes(t.symbol) ||
      (model.type === "ENFA" && t.symbol === ""),
  );
  edit();
  checkDraft();
};
$("alphabet").oninput = () => {
  alphabetDirty = true;
  invalidate();
  report("Alphabet changed: click Apply alphabet before running.", true);
  $("run").disabled = true;
  $("step").disabled = true;
};
$("alphabetApply").addEventListener("click", () => {
  $("run").disabled = false;
  $("step").disabled = false;
});
$("addState").onclick = () => {
  const q = $("newState").value.trim();
  if (
    !/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(q) ||
    model.states.includes(q) ||
    model.states.length >= 128
  )
    return report("Use a unique valid state name (maximum 128 states).", true);
  model.states.push(q);
  $("newState").value = "";
  edit();
  checkDraft();
};
$("apply").onclick = checkDraft;
$("import").onclick = () => {
  try {
    const candidate = JSON.parse($("json").value);
    Automata.validate(candidate);
    model = candidate;
    alphabetDirty = false;
    $("run").disabled = false;
    edit();
    checkDraft();
    report(
      "JSON imported successfully. " +
        Automata.validate(model).warnings.join(" "),
    );
  } catch (e) {
    report(`Import failed: ${e.message}`, true);
  }
};
$("export").onclick = () => {
  try {
    if (alphabetDirty)
      throw new Error("Click Apply alphabet before exporting.");
    Automata.validate(model);
    $("json").value = JSON.stringify(model, null, 2);
    const url = URL.createObjectURL(
      new Blob([$("json").value], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "automaton.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    report("JSON exported.");
  } catch (e) {
    report(e.message, true);
  }
};
$("input").oninput = () => {
  invalidate();
  try {
    Automata.validate(model);
    drawGraph();
  } catch (e) {
    report(e.message, true);
  }
};
$("run").onclick = () => {
  pause();
  if (!simulation || cursor === simulation.steps.length - 1) {
    if (!initialize()) return;
  }
  if (simulation.steps.length === 1) return;
  timer = setInterval(
    () => {
      cursor++;
      render();
    },
    Number($("speed").value),
  );
};
$("step").onclick = () => {
  pause();
  if (!simulation) {
    initialize();
    return;
  }
  if (cursor < simulation.steps.length - 1) {
    cursor++;
    render();
  }
};
$("back").onclick = () => {
  pause();
  if (simulation && cursor > 0) {
    cursor--;
    render();
  }
};
$("pause").onclick = pause;
$("reset").onclick = () => initialize();
$("speed").oninput = () => {
  $("speedValue").textContent = $("speed").value + " ms";
  if (timer) {
    pause();
    timer = setInterval(
      () => {
        cursor++;
        render();
      },
      Number($("speed").value),
    );
  }
};
$("runTests").onclick = () => {
  pause();
  $("testResults").innerHTML = "";
  testRecords = [];
  $("downloadTests").disabled = true;
  try {
    if (alphabetDirty)
      throw new Error("Click Apply alphabet before running tests.");
    Automata.validate(model);
    const cases = $("testCases")
      .value.split("\n")
      .filter((s) => s.trim())
      .map((s, i) => {
        const c = JSON.parse(s);
        if (
          !Array.isArray(c) ||
          c.length !== 2 ||
          typeof c[0] !== "string" ||
          ![true, false, "ERROR"].includes(c[1])
        )
          throw new Error(`Invalid test case on line ${i + 1}.`);
        return c;
      });
    if (!cases.length) throw new Error("Add at least one test case.");
    let passed = 0;
    const label = (x) =>
      x === "ERROR" ? "ERROR" : x ? "ACCEPTED" : "REJECTED";
    for (const [input, expected] of cases) {
      let actual,
        detail = "";
      try {
        actual = Automata.simulate(model, input).accepted;
      } catch (e) {
        actual = "ERROR";
        detail = e.message;
      }
      const ok = actual === expected;
      if (ok) passed++;
      testRecords.push({
        input,
        expected: label(expected),
        actual: label(actual),
        pass: ok,
        reason: detail,
      });
      $("testResults").insertAdjacentHTML(
        "beforeend",
        `<tr><td>${esc(input || "ε")}</td><td>${label(expected)}</td><td title="${esc(detail)}">${label(actual)}</td><td class="${ok ? "success" : "error"}">${ok ? "PASS" : "FAIL"}</td></tr>`,
      );
    }
    $("testSummary").textContent =
      `${passed} / ${cases.length} passed against the current machine.`;
    $("downloadTests").disabled = false;
  } catch (e) {
    $("testSummary").textContent = e.message;
  }
};
// Generate first, validate, then replace the editor atomically. A rejected
// question cannot erase a working machine or its current trace.
$("generate").onclick = () => {
  pause();
  try {
    const alphabet = list($("questionAlphabet").value);
    const result = Questions.generate($("question").value, {
      alphabet: alphabet.length ? alphabet : undefined,
      type: $("outputType").value || "DFA",
      mode: $("questionMode").value || "question",
    });
    Automata.validate(result.model);
    constructionData = null;
    model = JSON.parse(JSON.stringify(result.model));
    alphabetDirty = false;
    graphZoom = 1;
    $("run").disabled = false;
    $("input").value = result.example;
    $("testCases").value = result.tests
      .map((row) => JSON.stringify(row))
      .join("\n");
    edit();
    checkDraft();
    constructionData = result;
    $("construction").hidden = false;
    $("interpretation").textContent = result.summary;
    $("constructionSteps").innerHTML = result.steps
      .map((s) => `<li>${esc(s)}</li>`)
      .join("");
    $("machineStats").textContent =
      `${model.type} · ${model.states.length} states · alphabet ${setLabel(model.alphabet)} · start ${model.start} · final states ${setLabel(model.accepting)} · ${result.tests.length} reference test cases`;
    $("constructionNotice").textContent = result.limits;
    $("generationStatus").className = "success";
    $("generationStatus").textContent =
      "Machine generated. Review the interpreted language, then use Run or Step below.";
    $("testOrigin").textContent =
      "Generated question expectations use direct string/count predicates. Regex expectations use an independently evaluated native regular expression.";
  } catch (e) {
    $("generationStatus").className = "error";
    $("generationStatus").textContent = e.message;
  }
};
document.querySelectorAll("[data-question]").forEach((button) =>
  button.addEventListener("click", () => {
    $("question").value = button.dataset.question;
    $("questionMode").value = "question";
    $("questionAlphabet").value = "";
    $("generate").onclick();
  }),
);
function downloadText(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("downloadTests").onclick = () => {
  if (!testRecords.length) return;
  const cell = (value) => '"' + String(value).replace(/"/g, '""') + '"';
  const rows = [
    [
      "Input (blank = epsilon)",
      "Expected",
      "Generated",
      "Check",
      "Error detail",
    ],
    ...testRecords.map((r) => [
      r.input,
      r.expected,
      r.actual,
      r.pass ? "PASS" : "FAIL",
      r.reason,
    ]),
  ];
  downloadText(
    "validation-results.csv",
    "\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
};
$("testCases").oninput = () => {
  testRecords = [];
  $("downloadTests").disabled = true;
  $("testResults").innerHTML = "";
  $("testSummary").textContent =
    "Cases changed; run them again to refresh results.";
};
function zoom(value) {
  try {
    Automata.validate(model);
    graphZoom = Math.max(0.5, Math.min(4, value));
    drawGraph(simulation ? simulation.steps[cursor] : undefined);
  } catch (e) {
    report(e.message, true);
  }
}
$("zoomIn").onclick = () => zoom(graphZoom + 0.25);
$("zoomOut").onclick = () => zoom(graphZoom - 0.25);
$("zoomFit").onclick = () => zoom(1);
$("downloadSvg").onclick = () => {
  try {
    Automata.validate(model);
    const svg = $("graph").querySelector("svg");
    if (svg) downloadText("automaton.svg", svg.outerHTML, "image/svg+xml");
  } catch (e) {
    report(e.message, true);
  }
};
load("dfa");
