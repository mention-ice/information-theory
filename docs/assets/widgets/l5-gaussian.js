/* Lecture 5 widget: Gaussian channels (Section 5.7), in two views.
   One channel: C = (1/2) log(1 + SNR) bits per channel use against the SNR in decibels, with
   its high-SNR approximation (1/2) log SNR and its low-SNR approximation (SNR/2) log e, and the
   rate B log(1 + SNR) of a channel of bandwidth B.
   Parallel channels: noise levels N_1, N_2, N_3 and a total power S; the optimal powers are
   S_j = (ν − N_j)^+ with the water level ν such that sum_j S_j = S (water-filling, Problem 10),
   and C(S) = sum_j (1/2) log(1 + S_j/N_j) is compared with equal powers S/3.
   Usage in the class notes:  %web: l5-gaussian   (optional: view=parallel)
   Draws into every [data-widget="l5-gaussian"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l5-gaussian";
  var SVGNS = "http://www.w3.org/2000/svg";
  var BW = 20e6;                               // bandwidth of the example, in hertz (a Wi-Fi channel)
  var SUB = "₀₁₂₃₄₅₆₇₈₉";

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
    wrap.appendChild(el("span", "l5w-ctl-name", label));
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l5w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    wrap.input = input; wrap.output = out;
    return wrap;
  }
  function cap(snr) { return 0.5 * Math.log2(1 + snr); }
  function fmtSnr(x) { return x >= 10 ? String(Math.round(x)) : x >= 1 ? x.toFixed(2) : x.toFixed(3); }
  function waterfill(N, S) {                   // powers (ν − N_j)^+ that add up to S
    var sorted = N.slice().sort(function (a, b) { return a - b; }), nu = sorted[0] + S, sum = 0;
    for (var m = 1; m <= sorted.length; m++) {
      sum += sorted[m - 1];
      var cand = (S + sum) / m;
      if (m === sorted.length || cand <= sorted[m]) { nu = cand; break; }
    }
    return { nu: nu, P: N.map(function (v) { return Math.max(0, nu - v); }) };
  }
  function niceStep(span) {
    var raw = span / 5, e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var state = { view: args.view === "parallel" ? "parallel" : "scalar", db: 10, N: [1, 2, 4], S: 3 };
    root.classList.add("l5w", "l5w-ga");
    root.textContent = "";

    var top = el("div", "l5w-controls");
    var seg = el("div", "l5w-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "View");
    var vbtns = {};
    [["scalar", "one channel"], ["parallel", "parallel channels: water-filling"]].forEach(function (v) {
      var b = el("button", "l5w-btn", v[1]);
      b.type = "button";
      b.addEventListener("click", function () { state.view = v[0]; draw(); });
      vbtns[v[0]] = b;
      seg.appendChild(b);
    });
    top.appendChild(seg);
    root.appendChild(top);

    var cScalar = el("div", "l5w-controls");
    var dbS = slider("SNR (dB)", -10, 40, 1, state.db, function (v) { state.db = v; draw(); }, function (v) { return String(v); });
    dbS.input.setAttribute("aria-label", "Signal-to-noise ratio in decibels");
    cScalar.appendChild(dbS);
    root.appendChild(cScalar);
    var cPar = el("div", "l5w-controls");
    state.N.forEach(function (v, j) {
      var sl = slider("N" + SUB[j + 1], 0.2, 6, 0.1, v, function (x) { state.N[j] = x; draw(); }, function (x) { return x.toFixed(1); });
      sl.input.setAttribute("aria-label", "Noise level of channel " + (j + 1));
      cPar.appendChild(sl);
    });
    var sS = slider("power S", 0, 20, 0.1, state.S, function (x) { state.S = x; draw(); }, function (x) { return x.toFixed(1); });
    sS.input.setAttribute("aria-label", "Total power S");
    cPar.appendChild(sS);
    root.appendChild(cPar);

    var box = el("div", "l5w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Capacity of Gaussian channels" });
    box.appendChild(s);
    root.appendChild(box);

    function legendList(items) {
      var ul = el("ul", "l5w-legend");
      items.forEach(function (it) {
        var li = el("li");
        var sw = svg("svg", { "class": "l5w-sw", viewBox: "0 0 26 10", "aria-hidden": "true" });
        if (it[0] === "rect") sw.appendChild(svg("rect", { x: 4, y: 0, width: 18, height: 10, "class": it[1] }));
        else sw.appendChild(svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, "class": "l5w-line " + it[1] }));
        li.appendChild(sw);
        li.appendChild(document.createTextNode(it[2]));
        ul.appendChild(li);
      });
      root.appendChild(ul);
      return ul;
    }
    var legScalar = legendList([["line", "s-a", "C = ½ log(1 + SNR)"], ["line", "s-b s-dash", "high SNR: ½ log SNR"],
      ["line", "s-c s-dash", "low SNR: (SNR/2) log e"]]);
    var legPar = legendList([["rect", "l5w-ga-noise", "noise levels N₁, N₂, N₃"], ["rect", "l5w-ga-water", "powers S₁, S₂, S₃, poured on top"],
      ["line", "s-a s-dash", "water level ν"]]);
    var tscroll = el("div", "l5w-scroll");
    var table = el("table", "l5w-table");
    tscroll.appendChild(table);
    root.appendChild(tscroll);
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

    function frame(W, Hh, L, Rm, T, B, xlabel, ylabel) {
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      while (s.firstChild) s.removeChild(s.firstChild);
      s.appendChild(svg("text", { x: ((L + W - Rm) / 2).toFixed(1), y: Hh - 3, "class": "l5w-lbl", "text-anchor": "middle" }, xlabel));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 11, y: ym, "class": "l5w-lbl l5w-ylbl", "text-anchor": "middle", transform: "rotate(-90 11 " + ym + ")" }, ylabel));
    }

    function drawScalar(W) {
      var Hh = W < 420 ? 240 : 270, L = 46, Rm = 14, T = 12, B = 36, ymax = 7;
      function X(db) { return L + (db + 10) / 50 * (W - L - Rm); }
      function Y(v) { return T + (1 - v / ymax) * (Hh - T - B); }
      frame(W, Hh, L, Rm, T, B, "SNR = S/σ² in decibels", "bits per channel use");
      var g;
      for (g = 0; g <= ymax; g++) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - Rm, y2: Y(g).toFixed(1), "class": g ? "l5w-grid" : "l5w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l5w-tick", "text-anchor": "end" }, String(g)));
      }
      for (g = -10; g <= 40; g += 10) {
        s.appendChild(svg("line", { x1: X(g).toFixed(1), y1: Hh - B, x2: X(g).toFixed(1), y2: Hh - B + 4, "class": "l5w-axis" }));
        s.appendChild(svg("text", { x: X(g).toFixed(1), y: Hh - B + 16, "class": "l5w-tick", "text-anchor": "middle" }, String(g)));
      }
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - B, "class": "l5w-axis" }));
      var dC = "", dH = "", dL = "", db, first = true;
      for (db = -10; db <= 40.001; db += 0.25) {
        var snr = Math.pow(10, db / 10);
        dC += (db > -10 ? "L" : "M") + X(db).toFixed(1) + " " + Y(cap(snr)).toFixed(1);
        if (db >= 0) dH += (db > 0 ? "L" : "M") + X(db).toFixed(1) + " " + Y(0.5 * Math.log2(snr)).toFixed(1);
        var low = snr / 2 * Math.LOG2E;
        if (low <= ymax) { dL += (first ? "M" : "L") + X(db).toFixed(1) + " " + Y(low).toFixed(1); first = false; }
      }
      s.appendChild(svg("path", { d: dL, "class": "l5w-line s-c s-dash" }));
      s.appendChild(svg("path", { d: dH, "class": "l5w-line s-b s-dash" }));
      s.appendChild(svg("path", { d: dC, "class": "l5w-line s-a" }));
      var x = Math.pow(10, state.db / 10), c = cap(x);
      s.appendChild(svg("polyline", { points: L + "," + Y(c).toFixed(1) + " " + X(state.db).toFixed(1) + "," + Y(c).toFixed(1) + " " +
        X(state.db).toFixed(1) + "," + (Hh - B), "class": "l5w-cursor" }));
      s.appendChild(svg("circle", { cx: X(state.db).toFixed(1), cy: Y(c).toFixed(1), r: 5, "class": "l5w-mark s-a" }));
      readout.textContent = "SNR = " + state.db + " dB, i.e., S/σ² = " + fmtSnr(x) + ": C = ½ log(1 + " + fmtSnr(x) + ") = " + c.toFixed(3) +
        " bits per channel use. At high SNR, C ≈ ½ log SNR: each 3 dB more, i.e., twice the power, adds about half a bit. " +
        "At low SNR, C ≈ (SNR/2) log e grows linearly with the power. A channel of 20 MHz (a Wi-Fi channel) at this SNR carries at most " +
        "B log(1 + SNR) = " + (BW * Math.log2(1 + x) / 1e6).toFixed(1) + " Mbit/s.";
    }

    function drawParallel(W) {
      var Hh = W < 420 ? 240 : 270, L = 46, Rm = 14, T = 14, B = 40;
      var wf = waterfill(state.N, state.S), nu = wf.nu, K = state.N.length;
      var hmax = Math.max(nu, Math.max.apply(null, state.N)) * 1.12, step = niceStep(hmax);
      hmax = Math.ceil(hmax / step) * step;
      function Y(v) { return T + (1 - v / hmax) * (Hh - T - B); }
      var colW = (W - L - Rm) / K, barW = Math.min(110, colW * 0.62);
      function Xc(j) { return L + colW * (j + 0.5); }
      frame(W, Hh, L, Rm, T, B, "channel", "noise and power");
      var g;
      for (g = 0; g <= hmax + 1e-9; g += step) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - Rm, y2: Y(g).toFixed(1), "class": g ? "l5w-grid" : "l5w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l5w-tick", "text-anchor": "end" }, String(+g.toFixed(2))));
      }
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - B, "class": "l5w-axis" }));
      state.N.forEach(function (N, j) {
        var x0 = Xc(j) - barW / 2;
        if (wf.P[j] > 0) s.appendChild(svg("rect", { x: x0.toFixed(1), y: Y(nu).toFixed(1), width: barW.toFixed(1),
          height: (Y(N) - Y(nu)).toFixed(1), "class": "l5w-ga-water" }));
        s.appendChild(svg("rect", { x: x0.toFixed(1), y: Y(N).toFixed(1), width: barW.toFixed(1), height: (Y(0) - Y(N)).toFixed(1), "class": "l5w-ga-noise" }));
        s.appendChild(svg("text", { x: Xc(j).toFixed(1), y: Hh - B + 16, "class": "l5w-tick", "text-anchor": "middle" }, String(j + 1)));
        var yl = Math.min(Y(N), Y(nu)) - 6;
        s.appendChild(svg("text", { x: Xc(j).toFixed(1), y: Math.max(T + 9, yl).toFixed(1), "class": "l5w-lbl", "text-anchor": "middle" },
          "S" + SUB[j + 1] + " = " + wf.P[j].toFixed(2)));
      });
      s.appendChild(svg("line", { x1: L, y1: Y(nu).toFixed(1), x2: W - Rm, y2: Y(nu).toFixed(1), "class": "l5w-line s-a s-dash" }));
      s.appendChild(svg("text", { x: W - Rm - 2, y: (Y(nu) + 14).toFixed(1), "class": "l5w-lbl", "text-anchor": "end" }, "ν = " + nu.toFixed(2)));

      // table and readout
      table.textContent = "";
      var head = el("tr");
      ["channel", "noise", "power", "bits: ½ log(1 + power/noise)", "with equal powers"].forEach(function (h) { head.appendChild(el("th", null, h)); });
      table.appendChild(head);
      var tot = 0, totEq = 0, eq = state.S / K;
      state.N.forEach(function (N, j) {
        var c = cap(wf.P[j] / N), ce = cap(eq / N);
        tot += c; totEq += ce;
        var tr = el("tr");
        [String(j + 1), N.toFixed(1), wf.P[j].toFixed(2), c.toFixed(3), ce.toFixed(3)].forEach(function (v) { tr.appendChild(el("td", null, v)); });
        table.appendChild(tr);
      });
      var trT = el("tr", "l5w-ga-total");
      ["total", "", state.S.toFixed(1), tot.toFixed(3), totEq.toFixed(3)].forEach(function (v) { trT.appendChild(el("td", null, v)); });
      table.appendChild(trT);
      var off = [];
      state.N.forEach(function (N, j) { if (wf.P[j] === 0) off.push(j + 1); });
      var txt = "Water level ν = " + nu.toFixed(2) + ": C(S) = " + tot.toFixed(3) + " bits per channel use, against " + totEq.toFixed(3) +
        " with the power split equally. ";
      if (state.S === 0) txt = "Without power, nothing gets through: C(0) = 0. ";
      else if (off.length) txt += "Channel" + (off.length > 1 ? "s " + off.join(" and ") + " are" : " " + off[0] + " is") +
        " too noisy to get any power. ";
      txt += "With more power, the water rises and every channel is used. A MIMO channel becomes such parallel channels by the singular " +
        "value decomposition of H, with the noise levels 1/λ₁², 1/λ₂², … given by its singular values (Problem 10).";
      readout.textContent = txt;
    }

    function draw() {
      var scalar = state.view === "scalar";
      Object.keys(vbtns).forEach(function (k) { vbtns[k].setAttribute("aria-pressed", k === state.view ? "true" : "false"); });
      cScalar.hidden = !scalar; legScalar.hidden = !scalar;
      cPar.hidden = scalar; legPar.hidden = scalar; tscroll.hidden = scalar;
      lastW = Math.round(box.clientWidth) || 560;
      var W = Math.max(300, Math.min(600, lastW));
      if (scalar) drawScalar(W); else drawParallel(W);
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
