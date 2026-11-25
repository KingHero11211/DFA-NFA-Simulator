(function (root) {
  const dfa = {
    type: "DFA",
    states: ["q0", "q1", "q2"],
    alphabet: ["0", "1"],
    start: "q0",
    accepting: ["q2"],
    transitions: [
      { from: "q0", symbol: "0", to: ["q1"] },
      { from: "q0", symbol: "1", to: ["q0"] },
      { from: "q1", symbol: "0", to: ["q1"] },
      { from: "q1", symbol: "1", to: ["q2"] },
      { from: "q2", symbol: "0", to: ["q1"] },
      { from: "q2", symbol: "1", to: ["q0"] },
    ],
  };
  const nfa = {
    type: "NFA",
    states: ["q0", "q1", "q2"],
    alphabet: ["0", "1"],
    start: "q0",
    accepting: ["q2"],
    transitions: [
      { from: "q0", symbol: "0", to: ["q0", "q1"] },
      { from: "q0", symbol: "1", to: ["q0"] },
      { from: "q1", symbol: "1", to: ["q2"] },
    ],
  };
  const enfa = {
    type: "ENFA",
    states: ["q0", "q1", "q2"],
    alphabet: ["a", "b"],
    start: "q0",
    accepting: ["q2"],
    transitions: [
      { from: "q0", symbol: "", to: ["q1"] },
      { from: "q1", symbol: "a", to: ["q1"] },
      { from: "q1", symbol: "b", to: ["q2"] },
    ],
  };
  const even_ones = {
    type: "DFA",
    states: ["q0", "q1"],
    alphabet: ["0", "1"],
    start: "q0",
    accepting: ["q0"],
    transitions: [
      { from: "q0", symbol: "0", to: ["q0"] },
      { from: "q0", symbol: "1", to: ["q1"] },
      { from: "q1", symbol: "0", to: ["q1"] },
      { from: "q1", symbol: "1", to: ["q0"] },
    ],
  };
  const starts_one = {
    type: "DFA",
    states: ["q0", "q1", "q2"],
    alphabet: ["0", "1"],
    start: "q0",
    accepting: ["q1"],
    transitions: [
      { from: "q0", symbol: "0", to: ["q2"] },
      { from: "q0", symbol: "1", to: ["q1"] },
      { from: "q1", symbol: "0", to: ["q1"] },
      { from: "q1", symbol: "1", to: ["q1"] },
      { from: "q2", symbol: "0", to: ["q2"] },
      { from: "q2", symbol: "1", to: ["q2"] },
    ],
  };
  const contains_00 = {
    type: "DFA",
    states: ["q0", "q1", "q2"],
    alphabet: ["0", "1"],
    start: "q0",
    accepting: ["q2"],
    transitions: [
      { from: "q0", symbol: "0", to: ["q1"] },
      { from: "q0", symbol: "1", to: ["q0"] },
      { from: "q1", symbol: "0", to: ["q2"] },
      { from: "q1", symbol: "1", to: ["q0"] },
      { from: "q2", symbol: "0", to: ["q2"] },
      { from: "q2", symbol: "1", to: ["q2"] },
    ],
  };
  const binary = [
    ["", false],
    ["0", false],
    ["1", false],
    ["01", true],
    ["001", true],
    ["101", true],
    ["0101", true],
    ["1101", true],
    ["10", false],
    ["010", false],
    ["011", false],
    ["111", false],
    ["2", "ERROR"],
  ];
  const epsilon = [
    ["", false],
    ["a", false],
    ["b", true],
    ["ab", true],
    ["aab", true],
    ["aaab", true],
    ["aaaaab", true],
    ["ba", false],
    ["bb", false],
    ["aba", false],
    ["aaa", false],
    ["abb", false],
    ["c", "ERROR"],
  ];
  const evenCases = [
    ["", true],
    ["0", true],
    ["1", false],
    ["00", true],
    ["01", false],
    ["10", false],
    ["11", true],
    ["101", true],
    ["100", false],
    ["001", false],
    ["1100", true],
    ["1111", true],
    ["2", "ERROR"],
  ];
  const startsCases = [
    ["", false],
    ["0", false],
    ["1", true],
    ["00", false],
    ["01", false],
    ["10", true],
    ["11", true],
    ["101", true],
    ["100", true],
    ["001", false],
    ["1100", true],
    ["1111", true],
    ["2", "ERROR"],
  ];
  const containsCases = [
    ["", false],
    ["0", false],
    ["1", false],
    ["00", true],
    ["01", false],
    ["10", false],
    ["11", false],
    ["101", false],
    ["100", true],
    ["001", true],
    ["1100", true],
    ["1111", false],
    ["2", "ERROR"],
  ];
  const api = {
    machines: { dfa, nfa, enfa, even_ones, starts_one, contains_00 },
    cases: {
      dfa: binary,
      nfa: binary,
      enfa: epsilon,
      even_ones: evenCases,
      starts_one: startsCases,
      contains_00: containsCases,
    },
    examples: {
      dfa: "0101",
      nfa: "0101",
      enfa: "aab",
      even_ones: "101",
      starts_one: "101",
      contains_00: "100",
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Presets = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
