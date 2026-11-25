/* Controlled-English/Hinglish questions -> formal conditions -> constructed FA.
 * This is an offline, deterministic parser, not a general-purpose AI chatbot.
 * Every atom is fully matched; unsupported wording never becomes a guessed model.
 */
(function (root) {
  "use strict";
  const C =
    typeof module !== "undefined" && module.exports
      ? require("./compiler")
      : root.Compiler;
  const fail = (s) => {
    throw new Error(s);
  };
  const numbers = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  function number(s) {
    const n = /^\d+$/.test(s) ? Number(s) : numbers[s.toLowerCase()];
    if (!Number.isInteger(n) || n < 0 || n > 40)
      fail("Use counts or lengths from 0 to 40.");
    return n;
  }
  const unquote = (s) => {
    s = s.trim();
    return /^(['"]).*\1$/s.test(s) ? s.slice(1, -1) : s;
  };
  function split(text, operator) {
    let depth = 0,
      quote = "",
      escaped = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quote) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || (c === "'" && (!i || !/\w/.test(text[i - 1])))) {
        quote = c;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") depth--;
      if (depth < 0) fail("Unbalanced parentheses in the question.");
      if (
        !depth &&
        text.slice(i).match(new RegExp("^\\s+" + operator + "\\s+", "i"))
      ) {
        const match = text
          .slice(i)
          .match(new RegExp("^\\s+" + operator + "\\s+", "i"))[0];
        return [text.slice(0, i), text.slice(i + match.length)];
      }
    }
    if (depth || quote) fail("Close all parentheses and quotation marks.");
    return null;
  }
  function outer(text) {
    if (text[0] !== "(" || text.at(-1) !== ")") return false;
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "(") depth++;
      if (text[i] === ")") depth--;
      if (depth === 0 && i < text.length - 1) return false;
    }
    return depth === 0;
  }
  function parseCondition(text, depth = 0) {
    if (depth > 16) fail("Use fewer nested conditions.");
    text = text.trim();
    while (outer(text)) text = text.slice(1, -1).trim();
    const or = split(text, "or");
    if (or)
      return {
        kind: "or",
        left: parseCondition(or[0], depth + 1),
        right: parseCondition(or[1], depth + 1),
      };
    const and = split(text, "and");
    if (and)
      return {
        kind: "and",
        left: parseCondition(and[0], depth + 1),
        right: parseCondition(and[1], depth + 1),
      };
    if (/^(?:not\s+|(?:does|do)\s+not\s+|doesn't\s+)/i.test(text))
      return {
        kind: "not",
        node: parseCondition(
          text.replace(/^(?:not\s+|(?:does|do)\s+not\s+|doesn't\s+)/i, ""),
          depth + 1,
        ),
      };
    text = text
      .replace(/^(?:that|which|jo|whose)\s+/i, "")
      .replace(/^(?:have|has|with|having)\s+/i, "")
      .replace(/^of\s+(?=length)/i, "");
    let m;
    if (
      (m = text.match(
        /^(?:start(?:s|ing)?\s+with|begin(?:s|ning)?\s+with)\s+(.+)$/i,
      ))
    )
      return { kind: "starts", word: unquote(m[1]) };
    if ((m = text.match(/^(?:end(?:s|ing)?\s+(?:with|in))\s+(.+)$/i)))
      return { kind: "ends", word: unquote(m[1]) };
    if (
      (m = text.match(
        /^(?:contain(?:s|ing)?|include(?:s|ing)?)\s+(.+?)(?:\s+at\s+least\s+once)?$/i,
      ))
    )
      return {
        kind: "contains",
        word: unquote(
          m[1].replace(
            /^(?:(?:the|a)\s+)?(?:substring|pattern|sequence)\s+/i,
            "",
          ),
        ),
      };
    if (
      (m = text.match(/^(?:without|do not contain|does not contain)\s+(.+)$/i))
    )
      return { kind: "not", node: { kind: "contains", word: unquote(m[1]) } };
    if ((m = text.match(/^no\s+consecutive\s+['"]?([a-z0-9])['"]?(?:s)?$/i)))
      return { kind: "not", node: { kind: "contains", word: m[1] + m[1] } };
    if (
      (m = text.match(
        /^(.+?)\s+(?:se|pe|par)\s+(?:start|shuru)\s*(?:ho(?:ti|te)?\s*(?:hai|hain)?|hone\s+wali)?$/i,
      ))
    )
      return { kind: "starts", word: unquote(m[1]) };
    if (
      (m = text.match(
        /^(.+?)\s+(?:se|pe|par)\s+(?:end|khatam)\s*(?:ho(?:ti|te)?\s*(?:hai|hain)?|hone\s+wali)?$/i,
      ))
    )
      return { kind: "ends", word: unquote(m[1]) };
    if ((m = text.match(/^(?:exactly|equal\s+to)\s+(['"].*['"])$/i)))
      return { kind: "exact", word: unquote(m[1]) };
    if (
      /^(?:only\s+(?:the\s+)?empty\s+string|empty\s+string\s+only)$/i.test(text)
    )
      return { kind: "exact", word: "" };
    if (/^(?:all\s+strings|any\s+string|all)$/i.test(text))
      return { kind: "all" };
    if (
      (m = text.match(
        /^(?:an?\s+)?(even|odd)\s+(?:number|count)\s+of\s+['"]?([a-z0-9])['"]?(?:'s|s)?$/i,
      ))
    )
      return {
        kind: "count",
        mode: "mod",
        n: 2,
        r: m[1].toLowerCase() === "odd" ? 1 : 0,
        symbol: m[2],
      };
    if (
      (m = text.match(
        /^(?:the\s+)?(?:number|count)\s+of\s+['"]?([a-z0-9])['"]?(?:'s|s)?\s+(?:is\s+)?(even|odd)$/i,
      ))
    )
      return {
        kind: "count",
        mode: "mod",
        n: 2,
        r: m[2].toLowerCase() === "odd" ? 1 : 0,
        symbol: m[1],
      };
    if (
      (m = text.match(
        /^(exactly|at\s+least|at\s+most)\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:occurrences\s+of\s+)?['"]?([a-z0-9])['"]?(?:'s|s)?$/i,
      ))
    )
      return {
        kind: "count",
        mode: { exactly: "exact", "at least": "atleast", "at most": "atmost" }[
          m[1].toLowerCase()
        ],
        n: number(m[2]),
        symbol: m[3],
      };
    if (
      (m = text.match(
        /^(?:the\s+)?(?:number|count)\s+of\s+['"]?([a-z0-9])['"]?(?:'s|s)?\s+(?:is\s+)?(?:divisible\s+by|a\s+multiple\s+of)\s+(\d+)$/i,
      ))
    )
      return {
        kind: "count",
        mode: "mod",
        n: number(m[2]),
        r: 0,
        symbol: m[1],
      };
    if (
      (m = text.match(
        /^(?:the\s+)?(?:number|count)\s+of\s+['"]?([a-z0-9])['"]?(?:'s|s)?\s+mod(?:ulo)?\s+(\d+)\s*(?:=|is)\s*(\d+)$/i,
      ))
    )
      return {
        kind: "count",
        mode: "mod",
        n: number(m[2]),
        r: number(m[3]),
        symbol: m[1],
      };
    if ((m = text.match(/^(?:an?\s+)?(even|odd)\s+length$/i)))
      return {
        kind: "length",
        mode: "mod",
        n: 2,
        r: m[1].toLowerCase() === "odd" ? 1 : 0,
      };
    if (
      (m = text.match(
        /^length\s+(?:is\s+)?(exactly|at\s+least|at\s+most)\s+(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)$/i,
      ))
    )
      return {
        kind: "length",
        mode: { exactly: "exact", "at least": "atleast", "at most": "atmost" }[
          m[1].toLowerCase()
        ],
        n: number(m[2]),
      };
    if ((m = text.match(/^length\s*(?:is|=)\s*(\d+)$/i)))
      return { kind: "length", mode: "exact", n: number(m[1]) };
    if (
      (m = text.match(
        /^length\s+(?:is\s+)?(?:divisible\s+by|a\s+multiple\s+of)\s+(\d+)$/i,
      ))
    )
      return { kind: "length", mode: "mod", n: number(m[1]), r: 0 };
    if ((m = text.match(/^length\s+mod(?:ulo)?\s+(\d+)\s*(?:=|is)\s*(\d+)$/i)))
      return { kind: "length", mode: "mod", n: number(m[1]), r: number(m[2]) };
    if (
      (m = text.match(
        /^(?:binary\s+)?numbers?\s+(?:that\s+(?:are\s+)?)?(?:is\s+)?divisible\s+by\s+(\d+)$/i,
      ))
    )
      return { kind: "numeric", n: number(m[1]) };
    fail(
      `I could not interpret the whole condition: “${text}”. Use a supported question example, combine conditions with AND/OR/NOT, or enter a regular expression. No machine was generated.`,
    );
  }
  function symbols(node) {
    if (node.left) return [...symbols(node.left), ...symbols(node.right)];
    if (node.node) return symbols(node.node);
    return node.word !== undefined
      ? [...node.word]
      : node.symbol
        ? [node.symbol]
        : [];
  }
  function parse(question, explicitAlphabet) {
    if (typeof question !== "string" || !question.trim())
      fail("Enter a language question first.");
    if (question.length > 800) fail("Questions are limited to 800 characters.");
    let text = question
      .trim()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, " ")
      .replace(/[.?]\s*$/, "");
    const binary = /\bbinary\s+(?:strings?|numbers?)\b/i.test(text);
    let declared;
    text = text
      .replace(
        /\b(?:over\s+(?:the\s+)?(?:alphabet\s*)?|alphabet\s*[:=]?\s*)\{([^}]+)\}/gi,
        (_, s) => {
          const a = s.split(",").map((c) => unquote(c.trim()));
          if (declared && JSON.stringify(declared) !== JSON.stringify(a))
            fail("Conflicting alphabet declarations.");
          declared = a;
          return "";
        },
      )
      .replace(/\s+/g, " ")
      .trim();
    text = text
      .replace(/\bzeros\b/gi, "0s")
      .replace(/\bones\b/gi, "1s")
      .replace(/\baur\b/gi, "and")
      .replace(/\bya\b/gi, "or");
    text = text.replace(
      /^(?:please\s+)?(?:design|construct|build|create|draw|generate|make)\s+(?:(?:an?|the)\s+)?(?:epsilon[- ]?nfa|ε[- ]?nfa|dfa|nfa|finite\s+automaton|automaton|machine)\s*/i,
      "",
    );
    text = text.replace(/^(?:dfa|nfa|ε-nfa)\s+/i, "");
    for (let i = 0; i < 8; i++) {
      const old = text;
      text = text
        .replace(
          /^(?:for\s+|(?:that|which)\s+(?:accepts?|recognizes?)\s+|accept(?:s|ing)?\s+|recognizes?\s+)/i,
          "",
        )
        .replace(/^(?:all|a|the)\s+(?=(?:binary\s+)?strings?\b)/i, "")
        .replace(/^(?:binary\s+)?strings?\s*(?:(?:that|which|jo)\s+)?/i, "")
        .trim();
      if (text === old) break;
    }
    if (!text) text = "all";
    const spec = parseCondition(text),
      inferred = symbols(spec),
      alpha =
        explicitAlphabet && explicitAlphabet.length
          ? [...explicitAlphabet]
          : declared ||
            (!binary && inferred.some((c) => /[ab]/.test(c))
              ? ["a", "b"]
              : ["0", "1"]);
    if (
      declared &&
      explicitAlphabet &&
      explicitAlphabet.length &&
      JSON.stringify([...declared].sort()) !==
        JSON.stringify([...explicitAlphabet].sort())
    )
      fail("Question alphabet and alphabet field disagree. Make them match.");
    if (
      binary &&
      !(alpha.length === 2 && alpha.includes("0") && alpha.includes("1"))
    )
      fail("A binary question needs alphabet {0,1}.");
    C.alphabetCheck(alpha);
    if (inferred.some((c) => !alpha.includes(c)))
      fail(
        "A literal pattern or counted symbol is outside the alphabet. Quote patterns and specify an alphabet such as over {a,b}.",
      );
    return { spec, alphabet: alpha };
  }
  function describe(n) {
    if (n.left)
      return (
        "(" +
        describe(n.left) +
        " " +
        n.kind.toUpperCase() +
        " " +
        describe(n.right) +
        ")"
      );
    if (n.kind === "not") return "NOT (" + describe(n.node) + ")";
    if (["starts", "ends", "contains", "exact"].includes(n.kind))
      return (
        {
          starts: "starts with ",
          ends: "ends with ",
          contains: "contains ",
          exact: "is exactly ",
        }[n.kind] + JSON.stringify(n.word)
      );
    if (n.kind === "all") return "all strings";
    if (n.kind === "numeric")
      return `nonempty binary numbers divisible by ${n.n} (leading zeros allowed)`;
    const target =
      n.kind === "length"
        ? "length"
        : `number of ${JSON.stringify(n.symbol)} symbols`;
    return n.mode === "mod"
      ? `${target} modulo ${n.n} equals ${n.r}`
      : `${target} is ${{ exact: "exactly", atleast: "at least", atmost: "at most" }[n.mode]} ${n.n}`;
  }
  function evaluate(n, s) {
    if (n.kind === "and") return evaluate(n.left, s) && evaluate(n.right, s);
    if (n.kind === "or") return evaluate(n.left, s) || evaluate(n.right, s);
    if (n.kind === "not") return !evaluate(n.node, s);
    if (n.kind === "starts") return s.startsWith(n.word);
    if (n.kind === "ends") return s.endsWith(n.word);
    if (n.kind === "contains") return s.includes(n.word);
    if (n.kind === "exact") return s === n.word;
    if (n.kind === "all") return true;
    if (n.kind === "numeric") {
      if (!s.length) return false;
      let remainder = 0;
      for (const a of s) remainder = (remainder * 2 + Number(a)) % n.n;
      return remainder === 0;
    }
    const count =
      n.kind === "length"
        ? [...s].length
        : [...s].filter((a) => a === n.symbol).length;
    return n.mode === "mod"
      ? count % n.n === n.r
      : n.mode === "exact"
        ? count === n.n
        : n.mode === "atleast"
          ? count >= n.n
          : count <= n.n;
  }
  function construct(n, alphabet) {
    if (n.left)
      return C.product(
        construct(n.left, alphabet),
        construct(n.right, alphabet),
        n.kind,
      );
    if (n.kind === "not")
      return C.minimize(C.complement(construct(n.node, alphabet)));
    if (n.kind === "all")
      return C.machine(alphabet, [alphabet.map(() => 0)], [0]);
    if (["starts", "ends", "contains", "exact"].includes(n.kind))
      return C.minimize(C.pattern(n.kind, n.word, alphabet));
    if (n.kind === "numeric") return C.minimize(C.numericModulo(n.n, alphabet));
    return C.minimize(
      C.counter(
        n.mode,
        n.n,
        n.kind === "length" ? null : n.symbol,
        alphabet,
        n.r || 0,
      ),
    );
  }
  function boundaryWords(n, alphabet) {
    if (n.left)
      return [
        ...boundaryWords(n.left, alphabet),
        ...boundaryWords(n.right, alphabet),
      ];
    if (n.node) return boundaryWords(n.node, alphabet);
    if (n.word !== undefined)
      return [
        n.word,
        alphabet[0] + n.word,
        n.word + alphabet[0],
        n.word + n.word,
      ];
    const symbol = n.symbol || alphabet[0],
      n0 = n.n || 2;
    return [
      symbol.repeat(Math.max(0, n0 - 1)),
      symbol.repeat(n0),
      symbol.repeat(n0 + 1),
      symbol.repeat(Math.min(80, n0 * 2)),
    ];
  }
  function testCases(alphabet, accepts, special = []) {
    const words = new Set(["", ...special.filter((s) => [...s].length <= 300)]);
    let level = [""];
    for (let i = 0; i < 5 && words.size < 2000; i++) {
      const next = [];
      for (const s of level) {
        for (const a of alphabet) {
          const t = s + a;
          words.add(t);
          next.push(t);
          if (words.size >= 2000) break;
        }
        if (words.size >= 2000) break;
      }
      level = next;
    }
    const accepted = [],
      rejected = [];
    for (const s of words)
      (accepts(s) ? accepted : rejected).push([s, accepts(s)]);
    const selected = new Map([["", ["", accepts("")]]]);
    for (const s of special)
      if ([...s].length <= 300) selected.set(s, [s, accepts(s)]);
    for (
      let i = 0;
      i < Math.max(accepted.length, rejected.length) && selected.size < 40;
      i++
    ) {
      if (accepted[i]) selected.set(accepted[i][0], accepted[i]);
      if (rejected[i]) selected.set(rejected[i][0], rejected[i]);
    }
    const invalid =
      ["#", "2", "x", "!"].find((a) => !alphabet.includes(a)) || " ";
    selected.set(invalid, [invalid, "ERROR"]);
    return [...selected.values()];
  }
  function generate(
    question,
    { alphabet, type = "DFA", mode = "question" } = {},
  ) {
    if (!["DFA", "NFA", "ENFA"].includes(type))
      fail("Choose DFA, NFA or ENFA.");
    let model,
      accepts,
      steps,
      summary,
      spec,
      special = [];
    if (mode === "regex") {
      const built = C.regex(
        question,
        alphabet && alphabet.length ? alphabet : undefined,
        type,
      );
      ({ model, accepts, steps } = built);
      summary = `Whole-string language of regex: ${question || "ε"}`;
      spec = { kind: "regex", source: question };
    } else {
      const parsed = parse(question, alphabet);
      spec = parsed.spec;
      alphabet = parsed.alphabet;
      summary = describe(spec);
      accepts = (s) =>
        [...s].every((a) => alphabet.includes(a)) && evaluate(spec, s);
      special = boundaryWords(spec, alphabet);
      if (
        type !== "DFA" &&
        ["starts", "ends", "contains", "exact"].includes(spec.kind)
      ) {
        const literal = (s) =>
            [...s]
              .map((a) => (/[.*+?^${}()|[\]\\]/.test(a) ? "\\" + a : a))
              .join(""),
          any = "(" + alphabet.map(literal).join("|") + ")*",
          word = literal(spec.word) || "ε";
        const source =
          spec.kind === "starts"
            ? word + any
            : spec.kind === "ends"
              ? any + word
              : spec.kind === "contains"
                ? any + word + any
                : word;
        const built = C.regex(source, alphabet, type);
        model = built.model;
        steps = ["Interpret the full question as: " + summary, ...built.steps];
      } else {
        model = C.convert(construct(spec, alphabet), type);
        steps = [
          "Interpret the full question as: " + summary,
          "Construct pattern-progress states, counters or remainder states for each condition.",
          "Use reachable product states for AND/OR; flip final states for NOT.",
          "Merge equivalent DFA states and rename them from q0.",
        ];
        if (type !== "DFA")
          steps.push(
            "This construction is also a valid " +
              (type === "NFA" ? "NFA" : "ε-NFA") +
              "; some generated machines are deterministic and need no branching or ε-moves.",
          );
      }
    }
    const tests = testCases(model.alphabet, accepts, special),
      example = tests.find(([s, r]) => s && r === true)?.[0] || "";
    return {
      model,
      summary,
      steps,
      spec,
      question,
      mode,
      tests,
      example,
      accepts,
      limits:
        "Offline supported-language parser. Unsupported or ambiguous wording is refused; use regex mode for other regular languages.",
    };
  }
  const api = {
    parse,
    parseCondition,
    evaluate,
    describe,
    construct,
    generate,
    testCases,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Questions = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
