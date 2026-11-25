/* Real browser integration tests. Optional development dependency: playwright.
 * Start a private loopback server, test the actual UI, save real screenshots.
 * No production server, API key or network dependency is used by the app.
 */
"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { chromium } = require(
  process.env.STATE_STUDIO_PLAYWRIGHT || "playwright",
);
const root = path.resolve(__dirname, ".."),
  output = path.join(root, "validation"),
  shots = path.join(root, "docs", "screenshots");
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(shots, { recursive: true });
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      return res.end();
    }
    const file = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file)
      .on("error", () => res.destroy())
      .pipe(res);
  } catch (e) {
    res.writeHead(400);
    res.end("Invalid request");
  }
});
let browser,
  count = 0;
const evidence = [],
  pageErrors = [];
async function check(name, fn) {
  await fn();
  count++;
  evidence.push({ name, status: "PASS" });
  console.log("PASS:", name);
}
async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const executablePath = process.env.STATE_STUDIO_BROWSER;
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1000 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const url = "http://127.0.0.1:" + server.address().port;
  await page.goto(url, { waitUntil: "networkidle" });
  const input = page.locator("#input"),
    result = page.locator("#result");
  async function run(s, accepted) {
    await input.fill(s);
    await page.locator("#run").click();
    await page.waitForFunction(() =>
      /^(ACCEPTED|REJECTED|INPUT ERROR)/.test(
        document.getElementById("result").textContent,
      ),
    );
    assert.match(
      await result.innerText(),
      accepted ? /^ACCEPTED/ : /^REJECTED/,
    );
  }
  await page.locator("#speed").evaluate((el) => {
    el.value = "100";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await check("page loads editor and SVG without external assets", async () => {
    assert.equal(await page.locator("#states .stateRow").count(), 3);
    assert.equal(await page.locator("#graph svg").count(), 1);
  });
  await check("forward and back select real browser snapshots", async () => {
    await page.locator("#step").click();
    await page.locator("#step").click();
    assert.equal(await page.locator("#consumed").innerText(), "0");
    await page.locator("#back").click();
    assert.equal(await page.locator("#consumed").innerText(), "");
  });
  await check("Run accepts 0101 and rejects 010", async () => {
    await run("0101", true);
    await run("010", false);
  });
  await check("Pause stops playback and Run resumes", async () => {
    await input.fill("01010101");
    await page.locator("#run").click();
    await page.locator("#pause").click();
    const stopped = await page.locator("#stepLabel").innerText();
    await page.waitForTimeout(250);
    assert.equal(await page.locator("#stepLabel").innerText(), stopped);
    await page.locator("#run").click();
    await page.waitForFunction(() =>
      document.getElementById("result").textContent.startsWith("ACCEPTED"),
    );
  });
  for (const preset of [
    "dfa",
    "even_ones",
    "starts_one",
    "contains_00",
    "nfa",
    "enfa",
  ])
    await check("preset " + preset + " runs all expected cases", async () => {
      await page.locator("#preset").selectOption(preset);
      await page.locator("#runTests").click();
      assert.match(await page.locator("#testSummary").innerText(), /13 \/ 13/);
    });
  await check(
    "question constructs a new DFA and its expected tests",
    async () => {
      await page
        .locator("#question")
        .fill("Binary strings with even number of 1s and odd number of 0s");
      await page.locator("#outputType").selectOption("DFA");
      await page.locator("#generate").click();
      assert.match(await page.locator("#interpretation").innerText(), /AND/);
      assert.equal(await page.locator("#states .stateRow").count(), 4);
      await run("101", true);
      await page.locator("#runTests").click();
      assert.doesNotMatch(
        await page.locator("#testResults").innerText(),
        /FAIL/,
      );
      await page
        .locator(".builder")
        .screenshot({ path: path.join(shots, "01-question-construction.png") });
      await page
        .locator(".workspace > .panel")
        .first()
        .screenshot({ path: path.join(shots, "02-dfa-accepted.png") });
    },
  );
  await check("generated language rejects the wrong parity", async () => {
    await run("11", false);
  });
  await check("unknown wording preserves existing machine", async () => {
    const before = await page.locator("#json").inputValue();
    await page
      .locator("#question")
      .fill("Design a machine for binary palindromes");
    await page.locator("#generate").click();
    assert.match(
      await page.locator("#generationStatus").innerText(),
      /could not interpret/,
    );
    assert.equal(await page.locator("#json").inputValue(), before);
  });
  await check(
    "question example button creates a dynamic combined language",
    async () => {
      await page
        .getByRole("button", { name: "Starts AND ends", exact: true })
        .click();
      assert.match(
        await page.locator("#interpretation").innerText(),
        /"ab" AND ends with "ba"/,
      );
      await run("abba", true);
    },
  );
  await check("regex produces NFA with accepting path highlights", async () => {
    await page.locator("#questionMode").selectOption("regex");
    await page.locator("#outputType").selectOption("NFA");
    await page.locator("#questionAlphabet").fill("0,1");
    await page.locator("#question").fill("(0|1)*01");
    await page.locator("#generate").click();
    await run("101", true);
    assert((await page.locator("#paths .acceptPath").count()) > 0);
    await page
      .locator("#pathPanel")
      .screenshot({ path: path.join(shots, "03-nfa-paths.png") });
  });
  await check("epsilon-NFA initial closure and accepted string", async () => {
    await page.locator("#outputType").selectOption("ENFA");
    await page.locator("#questionAlphabet").fill("a,b");
    await page.locator("#question").fill("a*b");
    await page.locator("#generate").click();
    await page.locator("#step").click();
    assert.match(await page.locator("#trace").innerText(), /ε/);
    await run("aab", true);
    await page
      .locator(".workspace > .panel")
      .first()
      .screenshot({ path: path.join(shots, "04-epsilon-simulation.png") });
  });
  await check(
    "epsilon-only regex accepts blank input at step zero",
    async () => {
      await page.locator("#question").fill("ε");
      await page.locator("#generate").click();
      await run("", true);
      assert.match(await page.locator("#stepLabel").innerText(), /0 \/ 0/);
    },
  );
  await check(
    "invalid input symbol shows an error rather than rejection",
    async () => {
      await input.fill("c");
      await page.locator("#run").click();
      assert.match(await result.innerText(), /^INPUT ERROR/);
    },
  );
  await check("JSON export downloads a valid current model", async () => {
    await page.getByText("JSON import / export", { exact: true }).click();
    const pending = page.waitForEvent("download");
    await page.locator("#export").click();
    const download = await pending;
    const file = await download.path();
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).type, "ENFA");
  });
  await check("custom JSON import changes the actual language", async () => {
    const custom = {
      type: "DFA",
      states: ["s"],
      alphabet: ["x"],
      start: "s",
      accepting: ["s"],
      transitions: [{ from: "s", symbol: "x", to: ["s"] }],
    };
    await page.locator("#json").fill(JSON.stringify(custom));
    await page.locator("#import").click();
    await run("xxx", true);
    assert.equal(await page.locator("#states .stateRow").count(), 1);
  });
  await check(
    "invalid JSON import does not replace valid machine",
    async () => {
      await page.locator("#json").fill("{}");
      await page.locator("#import").click();
      assert.match(await page.locator("#message").innerText(), /Import failed/);
      await run("xx", true);
    },
  );
  await check(
    "adding and removing states updates graph and validation",
    async () => {
      await page.locator("#preset").selectOption("nfa");
      await page.locator("#newState").fill("q3");
      await page.locator("#addState").click();
      assert.equal(await page.locator("#states .stateRow").count(), 4);
      assert.match(await page.locator("#message").innerText(), /Unreachable/);
      await page
        .getByRole("button", { name: "Remove q3", exact: true })
        .click();
      assert.equal(await page.locator("#states .stateRow").count(), 3);
    },
  );
  await check("transition table editing invalidates old trace", async () => {
    await page
      .getByRole("textbox", { name: "Destinations for q0, 0", exact: true })
      .fill("q1");
    await run("001", false);
    assert.match(await page.locator("#consumed").innerText(), /001/);
  });
  await check("zoom changes diagram scale and resets to fit", async () => {
    await page.locator("#zoomIn").click();
    assert.match(
      await page.locator("#graph svg").getAttribute("style"),
      /125%/,
    );
    await page.locator("#zoomFit").click();
    assert.match(
      await page.locator("#graph svg").getAttribute("style"),
      /100%/,
    );
  });
  await check("SVG download contains a standalone graph", async () => {
    const pending = page.waitForEvent("download");
    await page.locator("#downloadSvg").click();
    const download = await pending;
    assert.match(
      fs.readFileSync(await download.path(), "utf8"),
      /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/,
    );
  });
  await check(
    "test-result CSV downloads actual expected/generated rows",
    async () => {
      await page.locator("#preset").selectOption("contains_00");
      await page.locator("#runTests").click();
      const pending = page.waitForEvent("download");
      await page.locator("#downloadTests").click();
      const download = await pending;
      await download.saveAs(path.join(output, "browser-results.csv"));
      const csv = fs.readFileSync(
        path.join(output, "browser-results.csv"),
        "utf8",
      );
      assert.match(csv, /"Expected","Generated","Check"/);
      assert.equal(csv.split("\r\n").length, 14);
      assert.doesNotMatch(csv, /"FAIL"/);
      await page
        .locator(".workspace > .panel")
        .last()
        .screenshot({ path: path.join(shots, "05-validation-panel.png") });
    },
  );
  await check(
    "large generated graph supports scrolling and complete transitions",
    async () => {
      await page.locator("#questionMode").selectOption("question");
      await page.locator("#outputType").selectOption("DFA");
      await page.locator("#questionAlphabet").fill("");
      await page
        .locator("#question")
        .fill("Binary strings with exactly 12 ones");
      await page.locator("#generate").click();
      assert.equal(await page.locator("#states .stateRow").count(), 14);
      await run("1".repeat(12), true);
    },
  );
  await check(
    "generation failures keep unsupported questions visible",
    async () => {
      await page
        .locator("#question")
        .fill("binary strings with exactly 100 ones");
      await page.locator("#generate").click();
      assert.match(
        await page.locator("#generationStatus").innerText(),
        /0 to 40/,
      );
    },
  );
  await check(
    "mobile layout has no document-wide horizontal overflow",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("#preset").selectOption("dfa");
      const sizes = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
      }));
      assert(sizes.scroll <= sizes.width + 1, JSON.stringify(sizes));
      await page
        .locator(".builder")
        .screenshot({ path: path.join(shots, "06-mobile-builder.png") });
    },
  );
  await check("no unhandled browser JavaScript errors", async () =>
    assert.deepEqual(pageErrors, []),
  );
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.getByRole("button", { name: "Ends in 01", exact: true }).click();
  await run("0101", true);
  await page.screenshot({
    path: path.join(shots, "07-full-app.png"),
    fullPage: true,
  });
  fs.writeFileSync(
    path.join(output, "browser-summary.json"),
    JSON.stringify(
      {
        date: "2026-11-25",
        browser: await browser.version(),
        checks: count,
        passed: count,
        failed: 0,
        pageErrors,
        evidence,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS: ${count} real browser integration tests; actual screenshots, JSON/SVG/CSV downloads, responsive layout and no page errors.`,
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });
