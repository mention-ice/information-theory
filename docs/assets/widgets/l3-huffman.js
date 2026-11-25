/* Lecture 3 widget: the Huffman algorithm, one merge at a time.
   Usage in the class notes:  %web: l3-huffman p=0.3,0.25,0.25,0.15,0.05
   As in the notes (2026-11-11): each merge of two least likely groups puts one bit in front of
   the codeword of every symbol in them, 0 for the more likely group and 1 for the other, so that
   the codewords are read on the merge tree from the root. The merge tree is drawn as in the notes
   (root on the left, 0 on the upper branch, to the more likely group), with the table of the
   lengths and codewords on the right; the probabilities can be edited, and ties broken either way.
   Draws into every [data-widget="l3-huffman"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l3-huffman";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NAMES = "abcdefghijkl";
  var SUB = "₀₁₂₃₄₅₆₇₈₉";

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
  function button(label, onClick, aria) {
    var b = el("button", "l3w-btn", label);
    b.type = "button";
    if (aria) b.setAttribute("aria-label", aria);
    b.addEventListener("click", onClick);
    return b;
  }
  function sub(k) { return String(k).split("").map(function (c) { return SUB[+c]; }).join(""); }
  function grp(n) { return "{" + n.syms.join(", ") + "}"; }
  function words(n) { return (n.syms.length > 1 ? "the codewords of " : "the codeword of ") + n.syms.join(", "); }
  function fmtP(p) { return String(+p.toFixed(4)); }
  function parseList(text) {
    var parts = text.split(/[,;\s]+/).filter(function (t) { return t; });
    if (parts.length < 2) return { err: "Type at least two probabilities, e.g. 0.5, 0.3, 0.2." };
    if (parts.length > NAMES.length) return { err: "At most " + NAMES.length + " symbols." };
    var ps = [];
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].match(/^(\d*\.?\d+)\s*(?:\/\s*(\d*\.?\d+))?$/);
      var v = m ? (m[2] ? parseFloat(m[1]) / parseFloat(m[2]) : parseFloat(m[1])) : NaN;
      if (!(v > 0) || !isFinite(v)) return { err: "Cannot read “" + parts[i] + "”: use positive numbers (0.25) or fractions (1/4)." };
      ps.push(v);
    }
    var tot = ps.reduce(function (a, b) { return a + b; }, 0);
    return { ps: ps.map(function (p) { return p / tot; }), normalized: Math.abs(tot - 1) > 1e-9 };
  }

  // The Huffman algorithm. Ties: "leaves" merges the symbols before the merged nodes (and the
  // later symbols first, as in the example of the notes); "merged" merges the merged nodes first.
  function huffman(ps, tie) {
    var M = ps.length;
    var nodes = ps.map(function (p, i) { return { id: i, p: p, leaf: true, name: NAMES[i], idx: i, step: 0, kids: null, parent: null, syms: [NAMES[i]] }; });
    var list = nodes.slice(), merges = [];
    for (var step = 1; step < M; step++) {
      list.sort(function (x, y) {
        if (Math.abs(x.p - y.p) > 1e-12) return x.p - y.p;
        if (x.leaf !== y.leaf) return ((tie === "leaves") === x.leaf) ? -1 : 1;
        if (x.leaf) return y.idx - x.idx;
        return x.step - y.step;
      });
      var a = list[0], b = list[1];                  // the two least probable nodes, p(a) <= p(b)
      // b, the more likely one, gets the bit 0. In a tie, as when the merged symbol is put last and
      // the symbols are sorted stably: a symbol before a group, the first symbol, the older group
      if (Math.abs(a.p - b.p) <= 1e-12 && (a.leaf !== b.leaf ? a.leaf : (a.leaf ? a.idx < b.idx : a.step < b.step))) {
        var tmp = a; a = b; b = tmp;
      }
      var node = { id: nodes.length, p: a.p + b.p, leaf: false, name: "ñ" + sub(M - step), step: step, kids: [b, a], parent: null,
        syms: b.syms.concat(a.syms) };
      a.parent = node; b.parent = node;
      nodes.push(node);
      merges.push({ a: a, b: b, node: node, before: list.slice() });
      list = list.slice(2);
      list.push(node);
    }
    var root = list[0];
    // the codewords are read on the merge tree from the root, with 0 to the more likely child
    // (kids[0]) and 1 to the other; the lengths are the depths of the leaves
    var leaves = [];
    (function walk(n, word) {
      n.word = word;
      n.depth = word.length;
      if (n.leaf) { leaves.push(n); n.height = 0; return; }
      walk(n.kids[0], word + "0");
      walk(n.kids[1], word + "1");
      n.height = 1 + Math.max(n.kids[0].height, n.kids[1].height);
    })(root, "");
    var Lbar = 0;
    leaves.forEach(function (n) { Lbar += n.p * n.depth; });
    return { nodes: nodes, merges: merges, root: root, order: leaves, Lbar: Lbar, M: M };
  }
  function H(ps) { var h = 0; ps.forEach(function (p) { if (p > 0) h -= p * Math.log2(p); }); return h; }
  function shannonLen(p) { return Math.max(0, Math.ceil(-Math.log2(p) - 1e-9)); }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    root.classList.add("l3w", "l3w-hf");
    root.innerHTML = "";
    var initial = (args.p || "0.3,0.25,0.25,0.15,0.05").split(",").join(", ");
    var state = { text: initial, tie: "leaves", t: 0, run: null, err: "", normalized: false };

    var controls = el("div", "l3w-controls");
    var lab = el("label", "l3w-field");
    lab.appendChild(el("span", "l3w-ctl-name", "Q ="));
    var input = document.createElement("input");
    input.type = "text"; input.value = state.text; input.spellcheck = false;
    input.setAttribute("aria-label", "Probabilities q_i, separated by commas");
    function apply() { state.text = input.value; rebuild(true); }
    input.addEventListener("change", apply);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") apply(); });
    lab.appendChild(input);
    controls.appendChild(lab);
    [["example", initial], ["ties", "0.4, 0.2, 0.2, 0.1, 0.1"], ["dyadic", "0.5, 0.25, 0.125, 0.0625, 0.0625"],
     ["[0.9, 0.1]²", "0.81, 0.09, 0.09, 0.01"]].forEach(function (p) {
      controls.appendChild(button(p[0], function () { input.value = p[1]; state.text = p[1]; rebuild(true); }));
    });
    root.appendChild(controls);

    var steps = el("div", "l3w-controls");
    var bRestart = button("⟲ restart", function () { state.t = 0; draw(); }, "Restart");
    var bBack = button("◂ back", function () { if (state.t > 0) { state.t--; draw(); } }, "Undo one merge");
    var bNext = button("merge ▸", function () { if (state.run && state.t < state.run.M - 1) { state.t++; draw(); } }, "Merge the two least likely groups");
    var bAll = button("all ▸▸", function () { if (state.run) { state.t = state.run.M - 1; draw(); } }, "Run all the merges");
    [bRestart, bBack, bNext, bAll].forEach(function (b) { steps.appendChild(b); });
    var tieBox = el("span", "l3w-ctl");
    tieBox.appendChild(el("span", "l3w-ctl-name", "ties:"));
    var tog = el("span", "l3w-seg");
    tog.setAttribute("role", "group");
    tog.setAttribute("aria-label", "How ties are broken");
    var bLeaves = button("symbols first", function () { state.tie = "leaves"; rebuild(false); });
    var bMerged = button("groups first", function () { state.tie = "merged"; rebuild(false); });
    tog.appendChild(bLeaves); tog.appendChild(bMerged);
    tieBox.appendChild(tog);
    steps.appendChild(tieBox);
    root.appendChild(steps);

    var box = el("div", "l3w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Huffman merge tree, with the table of the lengths and codewords" });
    box.appendChild(s);
    root.appendChild(box);
    var readout = el("p", "l3w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    function rebuild(resetStep) {
      var parsed = parseList(state.text);
      state.err = parsed.err || "";
      state.run = parsed.err ? null : huffman(parsed.ps, state.tie);
      state.other = parsed.err ? null : huffman(parsed.ps, state.tie === "leaves" ? "merged" : "leaves");
      state.normalized = !!parsed.normalized;
      if (resetStep || !state.run) state.t = 0;
      else state.t = Math.min(state.t, state.run.M - 1);
      draw();
    }

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }

    function draw() {
      bLeaves.setAttribute("aria-pressed", String(state.tie === "leaves"));
      bMerged.setAttribute("aria-pressed", String(state.tie === "merged"));
      while (s.firstChild) s.removeChild(s.firstChild);
      var run = state.run;
      bBack.disabled = !run || state.t === 0;
      bRestart.disabled = !run || state.t === 0;
      bNext.disabled = bAll.disabled = !run || state.t >= run.M - 1;
      if (!run) { s.setAttribute("viewBox", "0 0 10 1"); readout.textContent = state.err; return; }
      lastW = Math.round(box.clientWidth) || 600;
      var W = Math.max(300, Math.min(640, lastW));
      var narrow = W < 460;
      var M = run.M, t = state.t, done = t === M - 1;
      var rowH = M > 8 ? 24 : 30, T = 34;
      var Hh = T + M * rowH + 6;
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      // table columns on the right
      // table columns: header, x offset, anchor
      var cols = narrow ? [["", 0, "start"], ["qᵢ", 18, "start"], ["lᵢ", 76, "middle"], ["codeword", 98, "start"]] :
        [["", 0, "start"], ["qᵢ", 26, "start"], ["lᵢ", 96, "middle"], ["codeword", 126, "start"], ["⌈log 1/qᵢ⌉", 246, "middle"]];
      var tableW = narrow ? 158 : 292;
      var xTab = W - tableW;
      var xLeaf = xTab - 22, xRoot = 16;
      var dx = (xLeaf - xRoot) / Math.max(1, run.root.height);
      var pos = {};
      run.order.forEach(function (n, i) { pos[n.id] = { x: xLeaf, y: T + i * rowH + rowH / 2 }; });
      (function place(n) {
        if (n.leaf) return pos[n.id];
        var u = place(n.kids[0]), v = place(n.kids[1]);
        pos[n.id] = { x: xLeaf - n.height * dx, y: (u.y + v.y) / 2 };
        return pos[n.id];
      })(run.root);

      // header of the table
      cols.forEach(function (c) {
        s.appendChild(svg("text", { x: (xTab + c[1]).toFixed(1), y: T - 10, "class": "l3w-th", "text-anchor": c[2] }, c[0]));
      });
      s.appendChild(svg("line", { x1: xTab - 4, y1: T - 4, x2: W - 2, y2: T - 4, "class": "l3w-axis" }));

      var next = done ? null : run.merges[t];
      var alive = {};
      // nodes alive after t merges: the list before merge t+1 (or the root)
      (done ? [run.root] : next.before).forEach(function (n) { alive[n.id] = true; });

      // edges of the merges done so far, with their bits: 0 on the upper edge, to the more likely
      // group, drawn above it, and 1 on the lower edge, drawn below it
      run.merges.slice(0, t).forEach(function (m) {
        var P = pos[m.node.id];
        m.node.kids.forEach(function (kid, k) {
          var C = pos[kid.id];
          var cx2 = kid.leaf ? C.x - 5 : C.x;
          s.appendChild(svg("line", { x1: P.x.toFixed(1), y1: P.y.toFixed(1), x2: cx2.toFixed(1), y2: C.y.toFixed(1), "class": "l3w-edge is-on" }));
          if (dx < 20) return;                       // too dense to label: the table has the codewords
          var ex = cx2 - P.x, ey = C.y - P.y, len = Math.sqrt(ex * ex + ey * ey) || 1, sg = k === 0 ? 1 : -1;
          s.appendChild(svg("text", { x: ((P.x + cx2) / 2 + 7 * sg * ey / len).toFixed(1),
            y: ((P.y + C.y) / 2 - 7 * sg * ex / len + 3.5).toFixed(1), "class": "l3w-bit", "text-anchor": "middle" }, String(k)));
        });
      });
      // internal nodes created so far, with their probabilities
      run.merges.slice(0, t).forEach(function (m) {
        var P = pos[m.node.id];
        s.appendChild(svg("circle", { cx: P.x.toFixed(1), cy: P.y.toFixed(1), r: 3.4,
          "class": "l3w-inode" + (alive[m.node.id] ? " is-alive" : "") + (next && (next.a === m.node || next.b === m.node) ? " is-next" : "") }));
        // label above-left of an upper child (or the root), below-left of a lower child: away from the incoming edge
        var up = !m.node.parent || m.node.parent.kids[0] === m.node;
        var lbl = svg("text", { x: (P.x - 5).toFixed(1), y: (P.y + (up ? -6 : 13)).toFixed(1), "class": "l3w-plbl", "text-anchor": "end" }, fmtP(m.node.p));
        s.appendChild(lbl);
      });
      // leaves and table rows
      run.order.forEach(function (n, i) {
        var P = pos[n.id];
        var isNext = next && (next.a === n || next.b === n);
        if (i % 2 === 1) s.appendChild(svg("rect", { x: xTab - 4, y: (P.y - rowH / 2).toFixed(1), width: tableW + 2, height: rowH, "class": "l3w-stripe" }));
        s.appendChild(svg("circle", { cx: (P.x - 5).toFixed(1), cy: P.y.toFixed(1), r: 4.2,
          "class": "l3w-leaf" + (alive[n.id] ? " is-alive" : "") + (isNext ? " is-next" : "") }));
        // the bits so far, one for each merge of the symbol's group: the end of its codeword, since
        // each merge puts its bit in front
        var known = 0;
        for (var a = n.parent; a && a.step <= t; a = a.parent) known++;
        var cells = [n.name, fmtP(n.p), String(known), done ? n.word : (known ? "…" + n.word.slice(n.depth - known) : ""),
          String(shannonLen(n.p))];
        cols.forEach(function (c, k) {
          s.appendChild(svg("text", { x: (xTab + c[1]).toFixed(1), y: (P.y + 4).toFixed(1), "text-anchor": c[2],
            "class": k === 0 ? "l3w-sym" : (k === 3 ? "l3w-cw" : "l3w-td") }, cells[k]));
        });
      });

      // readout
      var ps = run.order.map(function (n) { return n.p; });
      var msg = state.normalized ? "(The numbers were scaled to add up to 1.) " : "";
      if (!done) {
        var listTxt = next.before.map(function (n) { return grp(n) + " " + fmtP(n.p); }).join(", ");
        msg += (t === 0 ? "No merge yet" : t + " of " + (M - 1) + " merges done") + ". The groups: " + listTxt +
          ". Next: merge the two least likely groups, " + grp(next.b) + " (" + fmtP(next.b.p) + ") and " + grp(next.a) +
          " (" + fmtP(next.a.p) + "), into a group of probability " + fmtP(next.node.p) + ": the bit 0 goes in front of " +
          words(next.b) + ", and the bit 1 in front of " + words(next.a) + ".";
        if (t === 0) msg += " Each merge puts one bit in front of the codeword of every symbol in the two merged groups, " +
          "0 for the more likely group and 1 for the other, so that the codewords are read on the merge tree from the root.";
      } else {
        var h = H(ps);
        var Lsh = run.order.reduce(function (a, n) { return a + n.p * shannonLen(n.p); }, 0);
        msg += "Done: the codewords are read on the merge tree from the root, the lengths are the depths of the leaves, " +
          "and Σ 2^−lᵢ = 1. Expected length Σ qᵢ lᵢ = " + fmtP(run.Lbar) + " bits, against H(Q) = " + h.toFixed(4) +
          " bits; the Shannon code (lengths ⌈log 1/qᵢ⌉) needs " + fmtP(Lsh) + " bits. No UD code has a smaller expected length.";
        if (Math.abs(run.Lbar - h) < 1e-9) msg += " Here L̄ = H(Q), since all the qᵢ are powers of 1/2.";
        if (state.text.replace(/\s/g, "") === "0.81,0.09,0.09,0.01") {
          msg += " This Q is [0.9, 0.1]², the distribution of blocks of 2 symbols: " + fmtP(run.Lbar / 2) +
            " bits per source symbol, against 1 bit without blocks and an entropy of 0.469 bits per source symbol.";
        }
        var byNum = function (x, y) { return x - y; };
        var mine = run.order.map(function (n) { return n.depth; }).sort(byNum).join(",");
        var other = state.other.order.map(function (n) { return n.depth; }).sort(byNum).join(",");
        if (mine !== other) {
          msg += " Breaking the ties the other way gives the lengths " + other.split(",").join(", ") +
            " instead of " + mine.split(",").join(", ") + ": another optimal code, with the same expected length.";
        }
      }
      readout.textContent = msg;
    }
    rebuild(true);
  }

  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
