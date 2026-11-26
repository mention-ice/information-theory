/* Lecture 4 widget: the rate-distortion function of a binary source Bern(p) with the Hamming
   distortion (Section 4.5), R(D) = H_2(p) - H_2(D) for D < p (p <= 1/2), 0 beyond, with
   the test channel that attains it: Xhat ~ Bern(q), Z ~ Bern(D) independent, X = Xhat + Z
   (mod 2), q = (p - D)/(1 - 2D). Also drawn: time sharing between lossless coding (rate
   H_2(p), distortion 0) and sending nothing (rate 0, distortion p), and, for fair bits, the
   simple codes of the notes (majority votes on 3, 5, ..., 11 bits, Problem 2; Hamming codes
   of length 7, 15, 31, Problem 3; keeping a fraction of the bits).
   Usage in the class notes:  %web: l4-binary p=0.5
   Draws into every [data-widget="l4-binary"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l4-binary";
  var SVGNS = "http://www.w3.org/2000/svg";

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
    var wrap = el("label", "l4w-ctl");
    wrap.appendChild(el("span", "l4w-ctl-name", label));
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l4w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    wrap.input = input; wrap.output = out;
    return wrap;
  }
  function h2(p) { return (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }
  function rd(p, D) { return D >= p ? 0 : h2(p) - h2(D); }       // p <= 1/2

  // simple codes for fair bits: majority votes (Problem 2) and Hamming codes (Problem 3)
  function binom(n, k) { var c = 1; for (var i = 1; i <= k; i++) c = c * (n - k + i) / i; return c; }
  var MAJ = [3, 5, 7, 9, 11].map(function (n) {
    var e = 0;
    for (var w = 0; w <= n; w++) e += binom(n, w) * Math.min(w, n - w);
    return { n: n, D: e / Math.pow(2, n) / n, R: 1 / n };
  });
  var HAM = [3, 4, 5].map(function (m) {
    var n = Math.pow(2, m) - 1;
    return { n: n, k: n - m, D: Math.pow(2, -m), R: (n - m) / n };
  });

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var p0 = parseFloat(args.p);
    if (!(p0 > 0 && p0 < 1)) p0 = 0.5;
    if (p0 > 0.5) p0 = 1 - p0;
    var state = { p: Math.max(0.02, Math.round(p0 * 100) / 100), D: 0.1 };
    root.classList.add("l4w", "l4w-bn");
    root.textContent = "";

    var controls = el("div", "l4w-controls");
    controls.appendChild(slider("P(1) = p", 0.02, 0.5, 0.01, state.p, function (v) {
      state.p = Math.round(v * 100) / 100; draw();
    }, function (v) { return v.toFixed(2); }));
    controls.appendChild(slider("D", 0, 0.5, 0.005, state.D, function (v) {
      state.D = Math.round(v * 1000) / 1000; draw();
    }, function (v) { return v.toFixed(3); }));
    root.appendChild(controls);

    var box = el("div", "l4w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Rate-distortion function of a binary source with the Hamming distortion" });
    box.appendChild(s);
    root.appendChild(box);

    var legend = el("ul", "l4w-legend");
    function legendItem(kind, cls, text) {
      var li = el("li");
      var sw = svg("svg", { "class": "l4w-sw", viewBox: "0 0 26 10", "aria-hidden": "true" });
      if (kind === "line") sw.appendChild(svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, "class": "l4w-line " + cls }));
      else if (kind === "dot") sw.appendChild(svg("circle", { cx: 13, cy: 5, r: 4, "class": "l4w-mark " + cls }));
      else sw.appendChild(svg("rect", { x: 9, y: 1, width: 8, height: 8, "class": "l4w-mark " + cls }));
      li.appendChild(sw);
      li.appendChild(document.createTextNode(text));
      legend.appendChild(li);
      return li;
    }
    legendItem("line", "s-limit", "R(D) = H₂(p) − H₂(D)");
    var lgTs = legendItem("line", "s-b s-dash", "");
    var lgMaj = legendItem("dot", "s-a", "majority votes on 3, 5, …, 11 bits");
    var lgHam = legendItem("square", "s-c", "Hamming codes of length 7, 15, 31");
    root.appendChild(legend);

    // the test channel
    var chan = el("div", "l4w-bn-chan");
    var cs = svg("svg", { viewBox: "0 0 400 112", role: "img", "aria-label": "Test channel: X = Xhat + Z modulo 2" });
    chan.appendChild(cs);
    root.appendChild(chan);
    var readout = el("p", "l4w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    function nodeBox(x, y, w, h, title, sub, cls) {
      var g = svg("g", { "class": "l4w-bn-node " + (cls || "") });
      g.appendChild(svg("rect", { x: x, y: y, width: w, height: h, rx: 8 }));
      g.appendChild(svg("text", { x: x + w / 2, y: y + 18, "text-anchor": "middle", "class": "l4w-bn-t1" }, title));
      g.appendChild(svg("text", { x: x + w / 2, y: y + 37, "text-anchor": "middle", "class": "l4w-bn-t2" }, sub));
      cs.appendChild(g);
    }
    function arrow(x1, y1, x2, y2) {
      cs.appendChild(svg("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": "l4w-bn-arrow" }));
      var a = Math.atan2(y2 - y1, x2 - x1), L = 7;
      var pts = [[x2, y2], [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)], [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)]];
      cs.appendChild(svg("polygon", { points: pts.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "), "class": "l4w-bn-head" }));
    }
    function drawChannel(p, D) {
      while (cs.firstChild) cs.removeChild(cs.firstChild);
      var De = Math.min(D, p), q = D >= p ? 0 : (p - D) / (1 - 2 * D);
      nodeBox(2, 6, 134, 46, "reconstruction", D >= p ? "X̂ = 0 always" : "X̂ ~ Bern(" + q.toFixed(3) + ")", "s-rec");
      nodeBox(264, 6, 134, 46, "source", "X ~ Bern(" + p.toFixed(2) + ")", "s-src");
      nodeBox(133, 62, 134, 46, "error", "Z ~ Bern(" + De.toFixed(3) + ")", "s-err");
      cs.appendChild(svg("circle", { cx: 200, cy: 29, r: 12, "class": "l4w-bn-xor" }));
      cs.appendChild(svg("line", { x1: 192, y1: 29, x2: 208, y2: 29, "class": "l4w-bn-xorx" }));
      cs.appendChild(svg("line", { x1: 200, y1: 21, x2: 200, y2: 37, "class": "l4w-bn-xorx" }));
      arrow(136, 29, 187, 29);
      arrow(212, 29, 263, 29);
      arrow(200, 62, 200, 42);
    }

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }

    function draw() {
      var p = state.p, D = state.D, Hp = h2(p), fair = Math.abs(p - 0.5) < 1e-9;
      lastW = Math.round(box.clientWidth) || 560;
      var W = Math.max(300, Math.min(600, lastW));
      var Hh = W < 420 ? 250 : 290, L = 54, Rm = 14, T = 12, B = 36;
      function X(d) { return L + d / 0.5 * (W - L - Rm); }
      function Y(r) { return T + (1 - r) * (Hh - T - B); }
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      while (s.firstChild) s.removeChild(s.firstChild);
      var g;
      for (g = 0; g <= 1.0001; g += 0.25) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - Rm, y2: Y(g).toFixed(1), "class": g ? "l4w-grid" : "l4w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l4w-tick", "text-anchor": "end" }, String(+g.toFixed(2))));
      }
      for (g = 0; g <= 0.5001; g += 0.1) {
        s.appendChild(svg("line", { x1: X(g).toFixed(1), y1: Hh - B, x2: X(g).toFixed(1), y2: Hh - B + 4, "class": "l4w-axis" }));
        s.appendChild(svg("text", { x: X(g).toFixed(1), y: Hh - B + 16, "class": "l4w-tick", "text-anchor": "middle" }, String(+g.toFixed(1))));
      }
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - B, "class": "l4w-axis" }));
      s.appendChild(svg("text", { x: ((L + W - Rm) / 2).toFixed(1), y: Hh - 3, "class": "l4w-lbl", "text-anchor": "middle" }, "distortion D (bit error rate)"));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 12, y: ym, "class": "l4w-lbl l4w-ylbl", "text-anchor": "middle", transform: "rotate(-90 12 " + ym + ")" }, "rate R (bits per symbol)"));
      // time sharing between lossless coding (0, H_2(p)) and sending nothing (p, 0)
      s.appendChild(svg("line", { x1: X(0).toFixed(1), y1: Y(Hp).toFixed(1), x2: X(p).toFixed(1), y2: Y(0).toFixed(1), "class": "l4w-line s-b s-dash" }));
      // R(D)
      var d = "";
      for (var j = 0; j <= 240; j++) {
        var dd = 0.5 * j / 240;
        d += (j ? "L" : "M") + X(dd).toFixed(1) + " " + Y(rd(p, dd)).toFixed(1);
      }
      s.appendChild(svg("path", { d: d, "class": "l4w-line s-limit" }));
      // simple codes, for fair bits
      [lgMaj, lgHam].forEach(function (li) { li.style.display = fair ? "" : "none"; });
      lgTs.lastChild.textContent = fair ? "keep a fraction R of the bits (time sharing)" :
        "time sharing: lossless coding and sending nothing";
      if (fair) {
        MAJ.forEach(function (c) {
          s.appendChild(svg("circle", { cx: X(c.D).toFixed(1), cy: Y(c.R).toFixed(1), r: 4.2, "class": "l4w-mark s-a" }));
        });
        HAM.forEach(function (c) {
          s.appendChild(svg("rect", { x: (X(c.D) - 4.2).toFixed(1), y: (Y(c.R) - 4.2).toFixed(1), width: 8.4, height: 8.4, "class": "l4w-mark s-c" }));
        });
      }
      // the chosen distortion
      var r0 = rd(p, D);
      s.appendChild(svg("line", { x1: X(D).toFixed(1), y1: T, x2: X(D).toFixed(1), y2: Hh - B, "class": "l4w-cursor" }));
      s.appendChild(svg("circle", { cx: X(D).toFixed(1), cy: Y(r0).toFixed(1), r: 5, "class": "l4w-mark s-limit" }));
      if (p < 0.5) {
        s.appendChild(svg("text", { x: X(p).toFixed(1), y: (Y(0) - 8).toFixed(1), "class": "l4w-lbl", "text-anchor": "middle" }, "D = p"));
      }

      drawChannel(p, D);
      var txt;
      if (D >= p) {
        txt = "D = " + D.toFixed(3) + " ≥ p: R(D) = 0. Sending nothing and outputting 0…0 gives a wrong bit with probability p = " +
          p.toFixed(2) + " ≤ D.";
      } else {
        var q = (p - D) / (1 - 2 * D);
        txt = "R(" + D.toFixed(3) + ") = H₂(" + p.toFixed(2) + ") − H₂(" + D.toFixed(3) + ") = " + Hp.toFixed(3) + " − " +
          h2(D).toFixed(3) + " = " + r0.toFixed(3) + " bit per symbol" +
          (D > 0 ? ", against " + (Hp * (1 - D / p)).toFixed(3) + " with time sharing" : ": lossless coding") +
          ". The test channel draws X̂ ~ Bern(" + q.toFixed(3) + ") and flips it with probability D, independently: X = X̂ + Z (mod 2) ~ Bern(" +
          p.toFixed(2) + "), wrong with probability D, and I(X; X̂) = H(X) − H(Z) = R(D).";
      }
      if (fair) {
        txt += " Simple codes stay above the curve: the majority vote on 3 bits has (D, R) = (0.25, 0.333), while R(0.25) = " +
          rd(0.5, 0.25).toFixed(3) + "; the Hamming code of length 7 has (0.125, 0.571), while R(0.125) = " + rd(0.5, 0.125).toFixed(3) + ".";
      }
      readout.textContent = txt;
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
