"use strict";
const { spawnSync } = require("node:child_process"),
  path = require("node:path"),
  fs = require("node:fs");
const root = path.resolve(__dirname, ".."),
  dest = path.join(root, "validation");
fs.mkdirSync(dest, { recursive: true });
const results = [];
for (const file of ["engine.test.js", "construction.test.js", "ui.test.js"]) {
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, STATE_STUDIO_RESULTS: dest },
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) {
    process.exitCode = 1;
    break;
  }
  results.push({
    suite: file,
    passed: Number(run.stdout.match(/PASS: (\d+)/)?.[1] || 0),
    failed: 0,
  });
}
if (!process.exitCode) {
  const summary = {
    date: "2026-11-25",
    node: process.version,
    total: results.reduce((n, r) => n + r.passed, 0),
    failed: 0,
    suites: results,
  };
  fs.writeFileSync(
    path.join(dest, "unit-summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(
    "PASS: " +
      summary.total +
      " unit, construction and UI-event checks combined.",
  );
}
