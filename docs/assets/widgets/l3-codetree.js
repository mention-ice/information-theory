/* Lecture 3 widget: binary strings as the nodes of a tree and as dyadic intervals of [0,1).
   Usage in the class notes:
     %web: l3-codetree code=10,101,110
       click the nodes to choose the codewords; the widget shows their intervals ℐ(y), the
       Kraft sum, and whether the code is uniquely decodable (UD) and a prefix code;
     %web: l3-codetree shannon=0.3,0.3,0.1,0.1,0.1,0.1
       builds the Shannon code of the given probabilities (editable), with exact arithmetic:
       the dyadic code with the lengths ⌈log 1/qᵢ⌉, as in the class notes since 2026-11-11.
   Draws into every [data-widget="l3-codetree"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l3-codetree";
  var SVGNS = "http://www.w3.org/2000/svg";
  var MAXQ = 12;           // Shannon mode: at most 12 probabilities
  var MAXL = 7;            // ... each at least 2^-7, so that the codewords have at most 7 bits

  function parseArgs(el) {
    var out = {};
    (el.getAttribute("data-args") || "").split(/\s+/).forEach(function (kv) {
      var m = kv.match(/^([A-Za-z_][\w-]*)=(.*)$/);
      if (m) out[m[1]] = m[2];
    });
    return out;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function button(label, onClick) {
    var b = el("button", "l3w-btn", label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // ---- exact rationals with BigInt -------------------------------------------------------
  function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }
  function rat(n, d) { var g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; }
  function radd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function rcmp(a, b) { var x = a.n * b.d, y = b.n * a.d; return x < y ? -1 : (x > y ? 1 : 0); }
  function rnum(a) { return Number(a.n) / Number(a.d); }
  function parseRat(s) {
    s = s.trim();
    var m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (m) return BigInt(m[2]) > 0n ? rat(BigInt(m[1]), BigInt(m[2])) : null;
    m = s.match(/^(\d*)(?:\.(\d*))?$/);
    if (!m || (m[1] === "" && !m[2])) return null;
    var frac = m[2] || "";
    return rat(BigInt((m[1] || "0") + frac), 10n ** BigInt(frac.length));
  }
  function fmtRat(a) {
    var v = rnum(a);
    if (a.d === 1n) return String(a.n);
    var dec = Number.isInteger(v * 1e6) ? String(v) : v.toFixed(4).replace(/0+$/, "");
    var pow2 = (a.d & (a.d - 1n)) === 0n;
    return pow2 && a.d <= 1024n ? a.n + "/" + a.d + " = " + dec : dec;
  }

  // ---- codes ------------------------------------------------------------------------------
  function isPrefix(u, v) { return u.length <= v.length && v.slice(0, u.length) === u; }
  function prefixViolation(code) {
    for (var i = 0; i < code.length; i++)
      for (var j = 0; j < code.length; j++)
        if (i !== j && isPrefix(code[i], code[j])) return [code[i], code[j]];
    return null;
  }
  // Shortest bit string with two different parses, or null if the code is UD
  // (the dangling-suffix test of Sardinas and Patterson, with the parses kept).
  function ambiguity(code) {
    if (code.indexOf("") >= 0) return { bits: "", a: [""], b: ["", ""] };
    var queue = [], seen = {};
    code.forEach(function (u) {
      code.forEach(function (v) {
        if (u !== v && isPrefix(u, v)) queue.push({ w: v.slice(u.length), behind: [u], ahead: [v] });
      });
    });
    while (queue.length) {
      var s = queue.shift();
      if (seen[s.w]) continue;
      seen[s.w] = true;
      for (var i = 0; i < code.length; i++) {
        var c = code[i];
        if (c === s.w) {
          var a = s.behind.concat([c]);
          return { bits: a.join(""), a: a, b: s.ahead };
        }
        if (isPrefix(c, s.w)) queue.push({ w: s.w.slice(c.length), behind: s.behind.concat([c]), ahead: s.ahead });
        else if (isPrefix(s.w, c)) queue.push({ w: c.slice(s.w.length), behind: s.ahead, ahead: s.behind.concat([c]) });
      }
    }
    return null;
  }
  function show(y) { return y === "" ? "∅" : y; }
  function r(y) { var v = 0; for (var i = 0; i < y.length; i++) if (y[i] === "1") v += Math.pow(2, -(i + 1)); return v; }
  function allNodes(D) {
    var out = [""];
    for (var d = 1; d <= D; d++)
      for (var x = 0; x < (1 << d); x++) {
        var s = x.toString(2);
        out.push("0".repeat(d - s.length) + s);
      }
    return out;
  }
  function H(ps) { var h = 0; ps.forEach(function (p) { if (p > 0) h -= p * Math.log2(p); }); return h; }

  // ---- dyadic code: intervals of lengths 2^-l_i side by side from 0 -----------------------
  // For lengths l_1 <= ... <= l_M with sum 2^-l_i <= 1, the i-th codeword is
  // r_i = 2^-l_1 + ... + 2^-l_{i-1} (a multiple of 2^-l_i) written with l_i bits.
  function dyadic(ls) {
    var Lmax = ls.reduce(function (m, l) { return Math.max(m, l); }, 0);
    var num = 0n;                                              // r_i = num / 2^Lmax
    return ls.map(function (l) {
      var k = num >> BigInt(Lmax - l);
      num += 1n << BigInt(Lmax - l);
      return { k: k, r: rat(k, 1n << BigInt(l)), y: l ? k.toString(2).padStart(l, "0") : "" };
    });
  }

  // ---- Shannon code with exact arithmetic: the dyadic code with l_i = ceil(log 1/q_i) ------
  function shannon(qs) {
    var sorted = qs.slice().sort(function (a, b) { return rcmp(b, a); });
    var ls = sorted.map(function (q) {
      var l = 0;
      while ((q.n << BigInt(l)) < q.d) l++;                    // smallest l with 2^-l <= q
      return l;
    });
    var dy = dyadic(ls);
    var s = rat(0n, 1n), rows = [];                            // s = q_1 + ... + q_{i-1}
    sorted.forEach(function (q, i) {
      rows.push({ i: i + 1, q: q, l: ls[i], s: s, k: dy[i].k, r: dy[i].r, y: dy[i].y });
      s = radd(s, q);
    });
    return { rows: rows, total: s };
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var mode = args.shannon != null ? "shannon" : "code";
    root.classList.add("l3w", "l3w-ct");
    root.innerHTML = "";

    var initialCode = (args.code || "").split(",").map(function (s) { return s.trim(); })
      .filter(function (s) { return /^[01]{0,5}$/.test(s) && s !== ""; });
    var state = { code: initialCode.slice(), qtext: (args.shannon || "").split(",").join(", "), qs: null, err: "" };

    var controls = el("div", "l3w-controls");
    var input = null;
    if (mode === "code") {
      controls.appendChild(el("span", "l3w-hint", "Click a node to add or remove a codeword."));
      controls.appendChild(button("Reset", function () { state.code = initialCode.slice(); draw(); }));
      controls.appendChild(button("Clear", function () { state.code = []; draw(); }));
    } else {
      var lab = el("label", "l3w-field");
      lab.appendChild(el("span", "l3w-ctl-name", "Q ="));
      input = document.createElement("input");
      input.type = "text"; input.value = state.qtext; input.spellcheck = false;
      input.setAttribute("aria-label", "Probabilities q_i, separated by commas");
      input.addEventListener("change", function () { state.qtext = input.value; parseQ(); draw(); });
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { state.qtext = input.value; parseQ(); draw(); } });
      lab.appendChild(input);
      controls.appendChild(lab);
      [["example", state.qtext], ["dyadic", "1/2, 1/4, 1/8, 1/8"], ["0.4, 0.3, 0.2, 0.1", "0.4, 0.3, 0.2, 0.1"]].forEach(function (p) {
        controls.appendChild(button(p[0], function () { state.qtext = p[1]; input.value = p[1]; parseQ(); draw(); }));
      });
    }
    root.appendChild(controls);

    var box = el("div", "l3w-figure");
    var s = svg("svg", { role: "img", "aria-label": mode === "code" ?
      "Binary tree of the strings of at most 5 bits; the codewords and their intervals in [0,1)" :
      "Shannon code: the partition of [0,1) by the probabilities, and the intervals of the codewords" });
    box.appendChild(s);
    root.appendChild(box);
    var status = el("div", "l3w-status");
    root.appendChild(status);
    var readout = el("p", "l3w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);
    var tableBox = el("div", "l3w-scroll");
    root.appendChild(tableBox);

    function parseQ() {
      state.err = ""; state.qs = null;
      var parts = state.qtext.split(/[,;\s]+/).filter(function (t) { return t; });
      if (!parts.length) { state.err = "Type probabilities, e.g. 0.5, 0.25, 0.25."; return; }
      if (parts.length > MAXQ) { state.err = "At most " + MAXQ + " probabilities."; return; }
      var qs = [];
      for (var i = 0; i < parts.length; i++) {
        var q = parseRat(parts[i]);
        if (!q) { state.err = "Cannot read “" + parts[i] + "”: use decimals (0.25) or fractions (1/4)."; return; }
        if (q.n === 0n) { state.err = "The probabilities must be positive (q_M > 0)."; return; }
        if ((q.n << BigInt(MAXL)) < q.d) { state.err = "Each probability must be at least 1/128 here, for a readable drawing."; return; }
        qs.push(q);
      }
      var tot = qs.reduce(radd, rat(0n, 1n));
      if (rcmp(tot, rat(1n, 1n)) > 0) { state.err = "The probabilities add up to " + rnum(tot).toFixed(4).replace(/0+$/, "") + " > 1."; return; }
      state.qs = qs;
    }
    if (mode === "shannon") parseQ();

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }

    function draw() {
      lastW = Math.round(box.clientWidth) || 560;
      var W = Math.max(300, Math.min(600, lastW));
      var L = 46, R = 14, T = 16;
      function X(t) { return L + t * (W - L - R); }
      function cx(y) { return X(r(y) + Math.pow(2, -y.length) / 2); }
      while (s.firstChild) s.removeChild(s.firstChild);

      var code, rows = null, D;
      if (mode === "code") {
        code = state.code.slice().sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); });
        D = Math.max(4, Math.min(5, code.reduce(function (m, y) { return Math.max(m, y.length); }, 0)));
      } else {
        if (state.qs) {
          var sh = shannon(state.qs);
          rows = sh.rows;
          code = rows.map(function (row) { return row.y; });
        } else code = [];
        D = Math.max(3, code.reduce(function (m, y) { return Math.max(m, y.length); }, 0));
      }
      var Dfull = Math.min(D, 5);                       // the faint full tree stops at depth 5
      // nested intervals (a codeword below another one) are drawn on separate rows
      var nest = {}, rowsN = 1;
      code.forEach(function (y) {
        nest[y] = code.filter(function (u) { return u !== y && isPrefix(u, y); }).length;
        rowsN = Math.max(rowsN, nest[y] + 1);
      });
      var LV = W < 420 ? 26 : 30;
      var treeH = T + D * LV;
      var qBarY = treeH + 26, qBarH = 22;
      var barH = 18;
      var axisY = (mode === "shannon" ? qBarY + qBarH + 42 : treeH + 40 + rowsN * (barH + 4));
      function barY(y) { return axisY - 6 - barH - (nest[y] || 0) * (barH + 4); }
      var Hh = axisY + 30;
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);

      var inCode = {};
      code.forEach(function (y) { inCode[y] = true; });
      var bad = {};
      if (mode === "code") {
        code.forEach(function (u) { code.forEach(function (v) { if (u !== v && isPrefix(u, v)) { bad[u] = true; bad[v] = true; } }); });
      }
      var onPath = {};
      code.forEach(function (y) { for (var k = 0; k <= y.length; k++) onPath[y.slice(0, k)] = true; });

      // edges of the full tree (faint) and of the code tree (strong)
      var gEdges = svg("g", {});
      s.appendChild(gEdges);
      var nodes = allNodes(D);
      nodes.forEach(function (y) {
        if (!y) return;
        var parent = y.slice(0, -1);
        var strong = onPath[y];
        if (y.length > Dfull && !strong) return;
        gEdges.appendChild(svg("line", { x1: cx(parent).toFixed(1), y1: (T + parent.length * LV).toFixed(1),
          x2: cx(y).toFixed(1), y2: (T + y.length * LV).toFixed(1), "class": strong ? "l3w-edge is-on" : "l3w-edge" }));
      });
      // bit labels on the first two levels
      ["0", "1", "00", "01", "10", "11"].forEach(function (y) {
        var parent = y.slice(0, -1);
        var mx = (cx(parent) + cx(y)) / 2, my = T + (parent.length + 0.5) * LV;
        var dx = y[y.length - 1] === "0" ? -7 : 7;
        s.appendChild(svg("text", { x: (mx + dx).toFixed(1), y: (my - 2).toFixed(1), "class": "l3w-bit", "text-anchor": "middle" }, y[y.length - 1]));
      });
      // guides from the codewords down to their intervals
      code.forEach(function (y) {
        s.appendChild(svg("line", { x1: cx(y).toFixed(1), y1: (T + y.length * LV).toFixed(1), x2: cx(y).toFixed(1),
          y2: (mode === "shannon" ? qBarY - 4 : barY(y)).toFixed(1), "class": "l3w-guide" }));
      });
      // nodes
      var leafGap = (W - L - R) / Math.pow(2, Dfull);
      var rad = Math.max(2.6, Math.min(6, leafGap / 2.8));
      nodes.forEach(function (y) {
        if (y.length > Dfull && !inCode[y]) return;
        var clickable = mode === "code" && y !== "";
        var cls = "l3w-node" + (inCode[y] ? " is-cw" : "") + (bad[y] ? " is-bad" : "") + (clickable ? " is-click" : "");
        var c = svg("circle", { cx: cx(y).toFixed(1), cy: (T + y.length * LV).toFixed(1), r: (y.length > 3 ? rad : Math.max(rad, 4.5)).toFixed(1), "class": cls });
        c.appendChild(svg("title", {}, y === "" ? "∅ (the root)" : y + (inCode[y] ? " (codeword)" : "")));
        if (clickable) {
          var hit = svg("circle", { cx: cx(y).toFixed(1), cy: (T + y.length * LV).toFixed(1),
            r: Math.min(12, Math.max(rad + 2, (y.length === Dfull ? leafGap : 2 * leafGap) / 2)).toFixed(1), "class": "l3w-hit" });
          hit.setAttribute("aria-hidden", "true");
          s.appendChild(hit);
          c.setAttribute("tabindex", "0");
          c.setAttribute("role", "button");
          c.setAttribute("aria-pressed", String(!!inCode[y]));
          c.setAttribute("aria-label", "node " + show(y));
          var toggle = function () {
            var k = state.code.indexOf(y);
            if (k >= 0) state.code.splice(k, 1); else state.code.push(y);
            draw();
            var again = s.querySelector('circle[aria-label="node ' + show(y) + '"]');
            if (again && document.activeElement !== again && again.focus) again.focus();
          };
          c.addEventListener("click", toggle);
          hit.addEventListener("click", toggle);
          c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
        }
        s.appendChild(c);
      });
      // codeword labels
      code.forEach(function (y, k) {
        // below the node, unless the faint tree goes on below it (then above)
        var deep = y.length >= 4 && y.length < Dfull;
        var label = mode === "shannon" ? "y" + subs(k + 1) : show(y);
        var t = svg("text", { x: cx(y).toFixed(1), y: (T + y.length * LV + (deep ? -9 : 15)).toFixed(1),
          "class": "l3w-cwlbl" + (bad[y] ? " is-bad" : ""), "text-anchor": "middle" }, label);
        if (!y) t.setAttribute("y", (T - 6).toFixed(1));
        s.appendChild(t);
      });

      // Shannon mode: the partition of [0,1) by Q
      if (mode === "shannon" && rows) {
        rows.forEach(function (row) {
          var a = rnum(row.s), b = a + rnum(row.q);
          s.appendChild(svg("rect", { x: X(a).toFixed(1), y: qBarY, width: Math.max(0.5, X(b) - X(a)).toFixed(1), height: qBarH, "class": "l3w-qcell" }));
          if (X(b) - X(a) > 26) {
            s.appendChild(svg("text", { x: ((X(a) + X(b)) / 2).toFixed(1), y: qBarY + 15, "class": "l3w-tick", "text-anchor": "middle" },
              String(rnum(row.q)).length <= 6 ? String(rnum(row.q)) : rnum(row.q).toFixed(3)));
          }
          s.appendChild(svg("line", { x1: X(a).toFixed(1), y1: qBarY - 4, x2: X(a).toFixed(1), y2: qBarY, "class": "l3w-axis" }));
        });
        s.appendChild(svg("text", { x: L - 8, y: qBarY + 15, "class": "l3w-lbl", "text-anchor": "end" }, "qᵢ"));
      }

      // intervals ℐ(y) of the codewords
      code.forEach(function (y) {
        var a = r(y), b = a + Math.pow(2, -y.length);
        s.appendChild(svg("rect", { x: X(a).toFixed(1), y: barY(y), width: Math.max(0.8, X(b) - X(a) - 0.6).toFixed(1), height: barH,
          "class": "l3w-int" + (bad[y] ? " is-bad" : "") }));
        var lbl = mode === "shannon" ? y : show(y);
        if (X(b) - X(a) > lbl.length * 6.2 + 4) {
          s.appendChild(svg("text", { x: ((X(a) + X(b)) / 2).toFixed(1), y: barY(y) + 13, "class": "l3w-intlbl", "text-anchor": "middle" }, lbl));
        }
      });
      // row label in the left margin, centred on the rows of intervals
      var rowsTop = axisY - 6 - barH - (rowsN - 1) * (barH + 4), rowsBot = axisY - 6;
      s.appendChild(svg("text", { x: L - 8, y: ((rowsTop + rowsBot) / 2 + 4).toFixed(1), "class": "l3w-lbl", "text-anchor": "end" },
        mode === "shannon" ? "ℐ(yᵢ)" : "ℐ(y)"));
      // axis [0,1) with dyadic ticks
      s.appendChild(svg("line", { x1: X(0), y1: axisY, x2: X(1), y2: axisY, "class": "l3w-axis" }));
      var nt = Math.pow(2, Math.min(D, W < 420 ? 4 : 5));
      for (var j = 0; j <= nt; j++) {
        var t = j / nt, major = (j * 4) % nt === 0;
        s.appendChild(svg("line", { x1: X(t).toFixed(1), y1: axisY, x2: X(t).toFixed(1), y2: axisY + (major ? 5 : 3), "class": "l3w-axis" }));
        if (major) s.appendChild(svg("text", { x: X(t).toFixed(1), y: axisY + 17, "class": "l3w-tick", "text-anchor": "middle" },
          ["0", "1/4", "1/2", "3/4", "1"][j * 4 / nt]));
      }

      // status and numbers
      status.innerHTML = "";
      readout.textContent = "";
      tableBox.innerHTML = "";
      if (mode === "code") drawCodeStatus(code, D); else drawShannon(rows);
    }

    function chip(ok, label) {
      var c = el("span", "l3w-chip " + (ok ? "is-yes" : "is-no"), (ok ? "✓ " : "✗ ") + label);
      return c;
    }
    function kraft(code) {
      var Lmax = code.reduce(function (m, y) { return Math.max(m, y.length); }, 0);
      var num = 0n;
      code.forEach(function (y) { num += 1n << BigInt(Lmax - y.length); });
      return rat(num, 1n << BigInt(Lmax));
    }

    function subs(n) {
      var d = "₀₁₂₃₄₅₆₇₈₉";
      return String(n).replace(/[0-9]/g, function (c) { return d[+c]; });
    }

    function sup(n) {
      var d = "⁰¹²³⁴⁵⁶⁷⁸⁹";
      return String(n).replace(/-/g, "⁻").replace(/[0-9]/g, function (c) { return d[+c]; });
    }

    function drawCodeStatus(code, D) {
      if (!code.length) {
        readout.textContent = "No codeword yet. The root is the empty string ∅; the left child of a node y is y0, the right child y1, and the interval ℐ(y) below the tree holds the numbers whose binary expansion starts with y.";
        return;
      }
      var k = kraft(code);
      var pv = prefixViolation(code);
      var amb = ambiguity(code);
      status.appendChild(chip(true, "lossless"));
      status.appendChild(chip(!amb, "uniquely decodable"));
      status.appendChild(chip(!pv, "prefix code"));
      var terms = code.map(function (y) { return "2" + sup(-y.length); }).join(" + ");
      var msg = "Code {" + code.map(show).join(", ") + "}. Kraft sum " + terms + " = " + fmtRat(k) + ". ";
      if (!pv) {
        msg += "No codeword is a prefix of another: the intervals are disjoint. ";
        msg += rcmp(k, rat(1n, 1n)) === 0 ? "They fill [0,1): no codeword can be added." :
          "The gaps in [0,1) have total length " + fmtRat(radd(rat(1n, 1n), rat(-k.n, k.d))) + ": codewords can be added or shortened.";
      } else {
        msg += "The codeword " + show(pv[0]) + " is a prefix of " + show(pv[1]) + ", so ℐ(" + show(pv[1]) + ") ⊆ ℐ(" + show(pv[0]) + ") (red). ";
        if (amb) {
          msg += pv[0] === "" ? "Not UD: the empty codeword makes x and xx indistinguishable. " :
            "Not UD: " + amb.bits + " = " + amb.a.map(show).join("·") + " = " + amb.b.map(show).join("·") + ". ";
        } else {
          msg += "Yet the code is UD: no bit string has two parses. ";
        }
        msg += rcmp(k, rat(1n, 1n)) <= 0 ? "Since the Kraft sum is at most 1, the dyadic code {" +
            dyadic(code.map(function (y) { return y.length; })).map(function (d) { return show(d.y); }).join(", ") +
            "} is a prefix code with the same lengths (Kraft–McMillan theorem, achievability)." :
          "Since the Kraft sum exceeds 1, no UD code has these lengths (Kraft–McMillan theorem, converse).";
      }
      readout.textContent = msg;
    }

    function drawShannon(rows) {
      if (!rows) { readout.textContent = state.err; return; }
      var tbl = el("table", "l3w-table");
      var head = el("tr");
      ["i", "qᵢ", "lᵢ = ⌈log 1/qᵢ⌉", "rᵢ = k/2^lᵢ", "yᵢ", "ℐ(yᵢ)"].forEach(function (h) { head.appendChild(el("th", null, h)); });
      tbl.appendChild(head);
      rows.forEach(function (row) {
        var tr = el("tr");
        tr.appendChild(el("td", null, String(row.i)));
        tr.appendChild(el("td", null, String(+rnum(row.q).toFixed(6))));
        tr.appendChild(el("td", null, String(row.l)));
        tr.appendChild(el("td", "l3w-bin", row.k + "/" + (1n << BigInt(row.l))));   // not reduced: y_i is k in l_i bits
        tr.appendChild(el("td", "l3w-bin", row.y || "∅"));
        var a = rnum(row.r);
        tr.appendChild(el("td", "l3w-bin", "[" + +a.toFixed(6) + ", " + +(a + Math.pow(2, -row.l)).toFixed(6) + ")"));
        tbl.appendChild(tr);
      });
      tableBox.appendChild(tbl);
      var code = rows.map(function (row) { return row.y; });
      var k = kraft(code);
      var tot = rows.reduce(function (a, row) { return radd(a, row.q); }, rat(0n, 1n));
      var msg = "The Shannon code is the dyadic code with the lengths lᵢ: the intervals ℐ(yᵢ), of lengths " +
        "2^−lᵢ ≤ qᵢ, are placed side by side from 0, so ℐ(yᵢ) starts at rᵢ = 2^−l₁ + … + 2^−lᵢ₋₁ = k/2^lᵢ, and yᵢ is " +
        "k written with lᵢ bits. The intervals are disjoint, so the code is a prefix code. Kraft sum " + fmtRat(k) +
        (rcmp(k, rat(1n, 1n)) < 0 ? ": the rest of [0,1) is unused, so some codewords could be shortened. " : ". ");
      if (rcmp(tot, rat(1n, 1n)) === 0) {
        var Lbar = rows.reduce(function (a, row) { return a + rnum(row.q) * row.l; }, 0);
        var h = H(rows.map(function (row) { return rnum(row.q); }));
        msg += "Expected length Σ qᵢ lᵢ = " + (+Lbar.toFixed(4)) + " bits, entropy H(Q) = " + h.toFixed(4) +
          " bits: H(Q) ≤ L̄ < H(Q) + 1" + (Math.abs(Lbar - h) < 1e-9 ? ", with equality since Q is dyadic." : ".");
      } else {
        msg += "The qᵢ add up to " + fmtRat(tot) + " < 1, which is allowed.";
      }
      readout.textContent = msg;
    }

    draw();
  }

  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
