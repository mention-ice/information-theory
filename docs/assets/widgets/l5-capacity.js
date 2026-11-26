/* Lecture 5 widget: the information capacity C_I = max over P_X of I(P_X, P_{Y|X}) (Section 5.3)
   for three binary-input channels, with the input distribution P_X = Bern(λ):
     BSC(p):     I = H_2(λ ⋆ p) − H_2(p),           maximum 1 − H_2(p) at λ = 1/2 (Section 5.3);
     BEC(δ):     I = (1 − δ) H_2(λ),                 maximum 1 − δ at λ = 1/2 (Problem 4);
     Z-channel:  a 1 is received as a 0 with probability q, I = H_2(λ(1 − q)) − λ H_2(q),
                 maximum at λ < 1/2 (Problem 6, q = 1/2: λ = 2/5 and C_I = log 5 − 2).
   A diagram of the channel shows its transition probabilities and the distributions of the
   input and of the output; the chart shows I against λ and its maximum.
   Usage in the class notes:  %web: l5-capacity
   (optional: ch=bsc|bec|z, and p=, d= or q= for the parameter of the channel).
   Draws into every [data-widget="l5-capacity"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l5-capacity";
  var SVGNS = "http://www.w3.org/2000/svg";
  var CH = {
    bsc: { label: "BSC", name: "p", aria: "Crossover probability p", def: 0.1 },
    bec: { label: "BEC", name: "δ", aria: "Erasure probability δ", def: 0.2 },
    z:   { label: "Z-channel", name: "q", aria: "Probability q that a 1 is received as a 0", def: 0.5 }
  };

  function parseArgs(node) {
    var out = {};
    (node.getAttribute("data-args") || "").split(/\s+/).forEach(function (kv) {
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
  function slider(label, min, max, step, value, onInput, show) {
    var wrap = el("label", "l5w-ctl");
    var name = el("span", "l5w-ctl-name", label);
    wrap.appendChild(name);
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l5w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    wrap.input = input; wrap.output = out; wrap.name = name;
    return wrap;
  }
  function rich(node, parts) {                 // text with <sub> parts: ["C", ["sub", "I"], " = 0.53"]
    node.textContent = "";
    parts.forEach(function (x) {
      if (typeof x === "string") node.appendChild(document.createTextNode(x));
      else node.appendChild(el(x[0], null, x[1]));
    });
  }
  function svgSub(x, y, cls, anchor, a, sub, b) {   // "a" with a subscript, then "b"
    var t = svg("text", { x: x, y: y, "class": cls, "text-anchor": anchor });
    t.appendChild(document.createTextNode(a));
    t.appendChild(svg("tspan", { dy: 3, "font-size": "8" }, sub));
    t.appendChild(svg("tspan", { dy: -3 }, b));
    return t;
  }
  function h2(p) { return (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }
  function f2(v) { return v.toFixed(2); }
  function f3(v) { return v.toFixed(3); }

  // ---- the channels: transition probabilities and mutual information ----------------------------
  function channel(ch, a) {                    // outputs and rows W(y|x) for x = 0, 1
    if (ch === "bsc") return { out: ["0", "1"], W: [[1 - a, a], [a, 1 - a]] };
    if (ch === "bec") return { out: ["0", "?", "1"], W: [[1 - a, a, 0], [0, a, 1 - a]] };
    return { out: ["0", "1"], W: [[1, 0], [a, 1 - a]] };
  }
  function info(ch, a, lam) {
    if (ch === "bsc") { var py = lam * (1 - a) + (1 - lam) * a; return { I: h2(py) - h2(a), HY: h2(py), HYX: h2(a), py1: py }; }
    if (ch === "bec") return { I: (1 - a) * h2(lam), HY: h2(a) + (1 - a) * h2(lam), HYX: h2(a), py1: lam * (1 - a) };
    var p1 = lam * (1 - a);
    return { I: h2(p1) - lam * h2(a), HY: h2(p1), HYX: lam * h2(a), py1: p1 };
  }
  function best(ch, a) {                       // I is concave in λ: golden-section search
    var lo = 0, hi = 1, g = (Math.sqrt(5) - 1) / 2;
    var x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = info(ch, a, x1).I, fx2 = info(ch, a, x2).I;
    for (var i = 0; i < 80; i++) {
      if (f1 < fx2) { lo = x1; x1 = x2; f1 = fx2; x2 = lo + g * (hi - lo); fx2 = info(ch, a, x2).I; }
      else { hi = x2; x2 = x1; fx2 = f1; x1 = hi - g * (hi - lo); f1 = info(ch, a, x1).I; }
    }
    var lam = (lo + hi) / 2, C = Math.max(0, info(ch, a, lam).I);
    if (C < 1e-9) return { lam: 0.5, C: 0 };
    if (ch !== "z") lam = 0.5;                 // symmetric channels: exactly 1/2
    return { lam: lam, C: info(ch, a, lam).I };
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var par = { bsc: CH.bsc.def, bec: CH.bec.def, z: CH.z.def };
    function argNum(v) { var x = parseFloat(v); return (x >= 0 && x <= 1) ? Math.round(x * 100) / 100 : null; }
    if (argNum(args.p) !== null) par.bsc = argNum(args.p);
    if (argNum(args.d) !== null) par.bec = argNum(args.d);
    if (argNum(args.q) !== null) par.z = argNum(args.q);
    var state = { ch: CH[args.ch] ? args.ch : "bsc", lam: 0.3 };
    root.classList.add("l5w", "l5w-cap");
    root.textContent = "";

    var controls = el("div", "l5w-controls");
    var seg = el("div", "l5w-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Channel");
    var btns = {};
    Object.keys(CH).forEach(function (k) {
      var b = el("button", "l5w-btn", CH[k].label);
      b.type = "button";
      b.addEventListener("click", function () { state.ch = k; syncParam(); draw(); });
      btns[k] = b;
      seg.appendChild(b);
    });
    controls.appendChild(seg);
    var aS = slider("p", 0, 1, 0.01, par[state.ch], function (v) { par[state.ch] = v; draw(); }, f2);
    controls.appendChild(aS);
    root.appendChild(controls);
    var controls2 = el("div", "l5w-controls");
    var lS = slider("λ = ℙ(X = 1)", 0, 1, 0.01, state.lam, function (v) { state.lam = v; draw(); }, f2);
    lS.input.setAttribute("aria-label", "Input distribution: probability λ of the input 1");
    controls2.appendChild(lS);
    var bBest = el("button", "l5w-btn", "best λ");
    bBest.type = "button";
    bBest.addEventListener("click", function () {
      state.lam = Math.round(best(state.ch, par[state.ch]).lam * 100) / 100;
      lS.input.value = state.lam; lS.output.textContent = f2(state.lam);
      draw();
    });
    controls2.appendChild(bBest);
    root.appendChild(controls2);
    function syncParam() {
      aS.name.textContent = CH[state.ch].name;
      aS.input.value = par[state.ch];
      aS.output.textContent = f2(par[state.ch]);
      aS.input.setAttribute("aria-label", CH[state.ch].aria);
      Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-pressed", k === state.ch ? "true" : "false"); });
    }

    var row = el("div", "l5w-cap-row");
    var dbox = el("div", "l5w-cap-chan");
    var ds = svg("svg", { viewBox: "0 0 250 150", role: "img", "aria-label": "Diagram of the channel with its transition probabilities" });
    dbox.appendChild(ds);
    row.appendChild(dbox);
    var box = el("div", "l5w-figure l5w-cap-plot");
    var s = svg("svg", { role: "img", "aria-label": "Mutual information against the input distribution, and its maximum" });
    box.appendChild(s);
    row.appendChild(box);
    root.appendChild(row);
    var readout = el("p", "l5w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }

    function drawChannel(ch, a, lam) {
      while (ds.firstChild) ds.removeChild(ds.firstChild);
      var c = channel(ch, a), xi = 82, xo = 178, r = 11;
      var yin = [40, 116], yout = c.out.length === 3 ? [26, 78, 130] : [40, 116];
      var px = [1 - lam, lam], py = c.out.map(function (_, j) { return px[0] * c.W[0][j] + px[1] * c.W[1][j]; });
      ds.appendChild(svgSub(26, 12, "l5w-cap-head", "middle", "P", "X", ""));
      ds.appendChild(svgSub(226, 12, "l5w-cap-head", "middle", "P", "Y", ""));
      ds.appendChild(svg("text", { x: xi, y: 12, "class": "l5w-cap-head", "text-anchor": "middle" }, "X"));
      ds.appendChild(svg("text", { x: xo, y: 12, "class": "l5w-cap-head", "text-anchor": "middle" }, "Y"));
      var labels = [];
      for (var x = 0; x < 2; x++) {
        for (var j = 0; j < c.out.length; j++) {
          var w = c.W[x][j];
          if (w <= 0) continue;
          var x1 = xi + r, y1 = yin[x], x2 = xo - r, y2 = yout[j];
          ds.appendChild(svg("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": "l5w-cap-edge",
            "stroke-width": (0.7 + 3.3 * w).toFixed(2) }));
          // label position: near the input for crossing edges, in the middle otherwise
          var dy = y2 - y1, t, ox = 0, oy;
          if (Math.abs(dy) < 12) { t = 0.5; oy = x === 0 ? -6 : 15; }
          else if (c.out.length === 3) { t = 0.5; oy = x === 0 ? 14 : -6; ox = -4; }
          else { t = 0.27; oy = x === 0 ? -2 : 10; }
          labels.push(svg("text", { x: (x1 + t * (x2 - x1) + ox).toFixed(1), y: (y1 + t * dy + oy).toFixed(1),
            "class": "l5w-lbl l5w-cap-w", "text-anchor": "middle" }, w === 1 ? "1" : f2(w)));
        }
      }
      labels.forEach(function (t) { ds.appendChild(t); });
      function node(cx, cy, txt) {
        ds.appendChild(svg("circle", { cx: cx, cy: cy, r: r, "class": "l5w-cap-node" }));
        ds.appendChild(svg("text", { x: cx, y: cy + 4, "class": "l5w-cap-ntext", "text-anchor": "middle" }, txt));
      }
      node(xi, yin[0], "0"); node(xi, yin[1], "1");
      c.out.forEach(function (o, j) { node(xo, yout[j], o); });
      yin.forEach(function (y, i) { ds.appendChild(svg("text", { x: 26, y: y + 4, "class": "l5w-cap-prob", "text-anchor": "middle" }, f2(px[i]))); });
      yout.forEach(function (y, j) { ds.appendChild(svg("text", { x: 226, y: y + 4, "class": "l5w-cap-prob", "text-anchor": "middle" }, f2(py[j]))); });
    }

    function draw() {
      var ch = state.ch, a = par[ch], lam = state.lam;
      syncParam();
      drawChannel(ch, a, lam);
      var cur = info(ch, a, lam), bst = best(ch, a);

      lastW = Math.round(box.clientWidth) || 420;
      var W = Math.max(280, Math.min(520, lastW));
      var Hh = W < 380 ? 220 : 250, L = 54, Rm = 14, T = 12, B = 36;
      function X(l) { return L + l * (W - L - Rm); }
      function Y(v) { return T + (1 - v) * (Hh - T - B); }
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      while (s.firstChild) s.removeChild(s.firstChild);
      var g;
      for (g = 0; g <= 1.0001; g += 0.25) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - Rm, y2: Y(g).toFixed(1), "class": g ? "l5w-grid" : "l5w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l5w-tick", "text-anchor": "end" }, String(g)));
      }
      for (g = 0; g <= 1.0001; g += 0.25) {
        s.appendChild(svg("line", { x1: X(g).toFixed(1), y1: Hh - B, x2: X(g).toFixed(1), y2: Hh - B + 4, "class": "l5w-axis" }));
        s.appendChild(svg("text", { x: X(g).toFixed(1), y: Hh - B + 16, "class": "l5w-tick", "text-anchor": "middle" }, String(g)));
      }
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - B, "class": "l5w-axis" }));
      s.appendChild(svg("text", { x: ((L + W - Rm) / 2).toFixed(1), y: Hh - 3, "class": "l5w-lbl", "text-anchor": "middle" }, "λ = ℙ(X = 1)"));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 11, y: ym, "class": "l5w-lbl l5w-ylbl", "text-anchor": "middle", transform: "rotate(-90 11 " + ym + ")" }, "I(X; Y) in bits"));

      var d = "", k;
      for (k = 0; k <= 200; k++) { var l = k / 200; d += (k ? "L" : "M") + X(l).toFixed(1) + " " + Y(info(ch, a, l).I).toFixed(1); }
      s.appendChild(svg("path", { d: d, "class": "l5w-line s-a" }));
      // maximum
      s.appendChild(svg("line", { x1: L, y1: Y(bst.C).toFixed(1), x2: W - Rm, y2: Y(bst.C).toFixed(1), "class": "l5w-line s-limit s-dash" }));
      var right = bst.lam < 0.6, lx = X(bst.lam) + (right ? 10 : -10), ly = Y(bst.C) - 8;
      if (ly < T + 10) ly = Y(bst.C) + 16;
      s.appendChild(svgSub(lx.toFixed(1), ly.toFixed(1), "l5w-lbl", right ? "start" : "end", "C", "I", " = " + f3(bst.C)));
      s.appendChild(svg("circle", { cx: X(bst.lam).toFixed(1), cy: Y(bst.C).toFixed(1), r: 4.5, "class": "l5w-mark s-hollow s-limit" }));
      // cursor
      s.appendChild(svg("line", { x1: X(lam).toFixed(1), y1: Hh - B, x2: X(lam).toFixed(1), y2: Y(cur.I).toFixed(1), "class": "l5w-cursor" }));
      s.appendChild(svg("circle", { cx: X(lam).toFixed(1), cy: Y(cur.I).toFixed(1), r: 5, "class": "l5w-mark s-a" }));

      var L2 = "λ = " + f2(lam), parts;
      if (ch === "bsc") {
        parts = ["With the input Bern(λ), " + L2 + ", the output is Bern(λ ⋆ p) = Bern(" + f2(cur.py1) + "), so I(X; Y) = H(Y) − H(Y|X) = H₂(" +
          f2(cur.py1) + ") − H₂(" + f2(a) + ") = " + f3(cur.HY) + " − " + f3(cur.HYX) + " = " + f3(cur.I) + " bit. "];
        if (bst.C === 0) parts.push("For p = 1/2, the output is independent of the input: the information capacity C", ["sub", "I"], " is 0.");
        else parts.push("The maximum over λ is the information capacity C", ["sub", "I"], " = 1 − H₂(p) = " + f3(bst.C) +
          " bit per channel use, at λ = 1/2 (Section 5.3).");
      } else if (ch === "bec") {
        parts = ["With the input Bern(λ), " + L2 + ": each bit arrives with probability 1 − δ = " + f2(1 - a) +
          ", and then the receiver knows it, so I(X; Y) = (1 − δ) H₂(λ) = " + f2(1 - a) + " × " + f3(h2(lam)) + " = " + f3(cur.I) + " bit. "];
        if (bst.C === 0) parts.push("For δ = 1, every bit is erased: C", ["sub", "I"], " = 0.");
        else parts.push("The maximum is C", ["sub", "I"], " = 1 − δ = " + f3(bst.C) + " bit per channel use, at λ = 1/2 (Problem 4).");
      } else {
        parts = ["With the input Bern(λ), " + L2 + ": a 1 becomes a 0 with probability q = " + f2(a) + ", so ℙ(Y = 1) = λ(1 − q) = " +
          f3(cur.py1) + " and I(X; Y) = H₂(" + f3(cur.py1) + ") − λH₂(q) = " + f3(cur.HY) + " − " + f3(cur.HYX) + " = " + f3(cur.I) + " bit. "];
        if (bst.C === 0) parts.push("For q = 1, every input gives Y = 0: C", ["sub", "I"], " = 0.");
        else if (a < 0.005) parts.push("Without noise, the maximum is C", ["sub", "I"], " = 1 bit per channel use, at λ = 1/2.");
        else parts.push("The maximum, C", ["sub", "I"], " = " + f3(bst.C) + " bit per channel use, is at λ = " + f3(bst.lam) +
          ", below 1/2: the 1s, which may be lost, are sent less often (Problem 6).");
      }
      rich(readout, parts);
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
