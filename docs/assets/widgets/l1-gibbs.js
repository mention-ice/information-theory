/* Lecture 1 illustration: maximum entropy under a cost constraint E_P[c(X)] <= a on
   X = {0, 1, ..., M-1}. The maximizer is the Gibbs distribution q(x) = exp(-beta c(x)) / Z.
   Usage in the class notes:  %web: l1-gibbs          optional arguments: M=10 cost=x|x2 a=2
   Draws into every [data-widget="l1-gibbs"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l1-gibbs", SVGNS = "http://www.w3.org/2000/svg", LOG2E = Math.LOG2E;

  function parseArgs(el) {
    var out = {};
    (el.getAttribute("data-args") || "").split(/\s+/).forEach(function (kv) {
      var m = kv.match(/^([A-Za-z_][\w-]*)=(.*)$/);
      if (m) out[m[1]] = m[2];
    });
    return out;
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, s, cls, anchor) {
    var t = svg("text", { x: x, y: y, "class": cls || "", "text-anchor": anchor || "middle" }, parent);
    t.textContent = s;
    return t;
  }
  function fmt(x, d) { return x === Infinity ? "∞" : x.toFixed(d == null ? 3 : d); }

  // the Gibbs distribution for a given beta: weights exp(-beta c(x)) (c(0) = 0, so no overflow)
  function gibbs(costs, beta) {
    var w = costs.map(function (c) { return Math.exp(-beta * c); });
    var Z = w.reduce(function (s, v) { return s + v; }, 0);
    var q = w.map(function (v) { return v / Z; });
    var mean = q.reduce(function (s, v, i) { return s + v * costs[i]; }, 0);
    return { q: q, Z: Z, mean: mean, beta: beta };
  }
  // beta >= 0 with E_Q[c(X)] = a, or beta = 0 if the uniform distribution already meets the constraint
  function solve(costs, a) {
    var g0 = gibbs(costs, 0);
    if (a >= g0.mean) return g0;
    if (a <= 0) {
      var q = costs.map(function (c) { return c === 0 ? 1 : 0; });
      var n0 = q.reduce(function (s, v) { return s + v; }, 0);
      return { q: q.map(function (v) { return v / n0; }), Z: n0, mean: 0, beta: Infinity };
    }
    var lo = 0, hi = 1;
    while (gibbs(costs, hi).mean > a && hi < 1e6) hi *= 2;
    for (var k = 0; k < 80; k++) {
      var mid = (lo + hi) / 2;
      if (gibbs(costs, mid).mean > a) lo = mid; else hi = mid;
    }
    return gibbs(costs, (lo + hi) / 2);
  }
  function entropy(q) {
    return q.reduce(function (s, v) { return v > 0 ? s - v * Math.log(v) * LOG2E : s; }, 0);
  }
  function niceMax(v) {
    var steps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1];
    for (var i = 0; i < steps.length; i++) if (v <= steps[i] + 1e-12) return steps[i];
    return 1;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var st = {
      M: Math.max(2, Math.min(16, parseInt(args.M, 10) || 10)),
      cost: args.cost === "x2" ? "x2" : "x",
      a: null
    };
    root.classList.add("l1w", "l1g");
    root.innerHTML = "";

    var controls = el("div", "l1w-controls");
    var toggle = el("div", "l1w-toggle");
    toggle.setAttribute("role", "group");
    toggle.setAttribute("aria-label", "cost function");
    var buttons = {};
    [["x", "c(x) = x"], ["x2", "c(x) = x²"]].forEach(function (d) {
      var b = el("button", "", d[1]);
      b.type = "button";
      b.addEventListener("click", function () {
        if (st.cost === d[0]) return;
        var frac = st.a / rangeMax();
        st.cost = d[0];
        setRange(frac);
        draw();
      });
      toggle.appendChild(b);
      buttons[d[0]] = b;
    });
    controls.appendChild(toggle);

    var aWrap = el("label", "l1w-ctl");
    aWrap.appendChild(el("span", "l1w-ctl-name", "budget <i>a</i>"));
    var aIn = document.createElement("input");
    aIn.type = "range"; aIn.min = "0";
    var aOut = el("output", "l1w-ctl-val");
    aWrap.appendChild(aIn); aWrap.appendChild(aOut);
    controls.appendChild(aWrap);

    var mWrap = el("label", "l1w-ctl");
    mWrap.appendChild(el("span", "l1w-ctl-name", "<i>M</i> = |𝒳|"));
    var mIn = document.createElement("input");
    mIn.type = "range"; mIn.min = "2"; mIn.max = "16"; mIn.step = "1"; mIn.value = String(st.M);
    var mOut = el("output", "l1w-ctl-val", String(st.M));
    mWrap.appendChild(mIn); mWrap.appendChild(mOut);
    controls.appendChild(mWrap);
    root.appendChild(controls);

    var figure = el("div", "l1w-figure");
    var fig = svg("svg", { role: "img", "aria-label": "The Gibbs distribution q(x) for x = 0, ..., M-1" }, figure);
    root.appendChild(figure);
    var stats = el("dl", "l1w-stats");
    root.appendChild(stats);
    var readout = el("p", "l1w-readout");
    root.appendChild(readout);

    function costs() {
      var c = [];
      for (var x = 0; x < st.M; x++) c.push(st.cost === "x2" ? x * x : x);
      return c;
    }
    function uniformMean() { return gibbs(costs(), 0).mean; }
    function rangeMax() { return Math.max(1, Math.ceil(uniformMean() * 1.3)); }
    function setRange(frac) {
      var max = rangeMax();
      aIn.max = String(max);
      aIn.step = String(max / 200);
      st.a = Math.min(max, Math.max(0, frac * max));
      aIn.value = String(st.a);
    }
    aIn.addEventListener("input", function () { st.a = +aIn.value; draw(); });
    mIn.addEventListener("input", function () {
      var frac = st.a / rangeMax();
      st.M = +mIn.value; mOut.textContent = String(st.M);
      setRange(frac);
      draw();
    });
    var a0 = parseFloat(args.a);
    setRange(isFinite(a0) ? a0 / rangeMax() : 0.35);

    function draw() {
      buttons.x.setAttribute("aria-pressed", st.cost === "x" ? "true" : "false");
      buttons.x2.setAttribute("aria-pressed", st.cost === "x2" ? "true" : "false");
      aOut.textContent = fmt(st.a, 2);
      var c = costs(), g = solve(c, st.a), H = entropy(g.q), logM = Math.log(st.M) * LOG2E;
      var mu0 = uniformMean();

      // bar chart of q(x), with the uniform level 1/M dashed
      while (fig.firstChild) fig.removeChild(fig.firstChild);
      var W = Math.max(280, Math.min(560, Math.round(figure.clientWidth || 520))), Hh = W < 420 ? 190 : 220,
          L = 40, Rm = 10, T = 26, B = 30;
      fig.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      fig.setAttribute("width", W); fig.setAttribute("height", Hh);
      var qmax = niceMax(Math.max(Math.max.apply(null, g.q), 1 / st.M) * 1.05);
      var pw = W - L - Rm, ph = Hh - T - B;
      function Y(v) { return T + ph * (1 - v / qmax); }
      svg("line", { x1: L, y1: T + ph, x2: W - Rm, y2: T + ph, "class": "l1w-axis" }, fig);
      svg("line", { x1: L, y1: T, x2: L, y2: T + ph, "class": "l1w-axis" }, fig);
      [0, qmax / 2, qmax].forEach(function (v) {
        text(fig, L - 6, Y(v) + 4, v === 0 ? "0" : v.toFixed(2), "l1w-tick", "end");
      });
      var slot = pw / st.M, bw = Math.max(3, slot * 0.68);
      g.q.forEach(function (v, x) {
        var cx = L + slot * (x + 0.5);
        svg("rect", { x: cx - bw / 2, y: Y(v), width: bw, height: Math.max(T + ph - Y(v), 0), rx: 1.5, "class": "l1g-bar" }, fig);
        if (slot >= 22 || x % 2 === 0) text(fig, cx, T + ph + 15, String(x), "l1w-tick");
      });
      var yu = Y(1 / st.M);
      svg("line", { x1: L, y1: yu, x2: W - Rm, y2: yu, "class": "l1g-uni" }, fig);
      text(fig, W - Rm, yu - 5, "1/M", "l1w-tick", "end");
      text(fig, L + pw / 2, Hh - 2, "x", "l1w-lbl");
      text(fig, 4, 12, "q(x)", "l1w-lbl", "start");

      var beta = g.beta;
      stats.innerHTML =
        '<div><dt>β</dt><dd>' + fmt(beta) + '</dd></div>' +
        '<div><dt>Z</dt><dd>' + fmt(g.Z) + '</dd></div>' +
        '<div><dt>E<sub>Q</sub>[c(X)]</dt><dd>' + fmt(g.mean) + '</dd></div>' +
        '<div><dt>H(Q)</dt><dd>' + fmt(H) + ' bits</dd></div>' +
        '<div><dt>log M</dt><dd>' + fmt(logM) + ' bits</dd></div>';
      if (beta === Infinity) {
        readout.innerHTML = "With <i>a</i> = 0, only <i>x</i> = 0 has cost 0: Q puts all its mass there and <i>H</i>(Q) = 0.";
      } else if (beta === 0) {
        readout.innerHTML = "The constraint is inactive: the uniform distribution already has E[<i>c</i>(X)] = " + fmt(mu0, 2) +
          " ≤ <i>a</i>, so β = 0, Q is uniform and <i>H</i>(Q) = log <i>M</i>.";
      } else {
        readout.innerHTML = "The constraint is active: β > 0 is chosen so that E<sub>Q</sub>[<i>c</i>(X)] = <i>a</i>. " +
          "Every P with E<sub>P</sub>[<i>c</i>(X)] ≤ <i>a</i> has <i>H</i>(P) ≤ <i>H</i>(Q) = log <i>Z</i> + β<i>a</i> log <i>e</i> = " + fmt(H) + " bits.";
      }
    }
    draw();
    var lastW = figure.clientWidth;
    function resize() { if (figure.clientWidth !== lastW) { lastW = figure.clientWidth; draw(); } }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(figure);
    else window.addEventListener("resize", resize);
  }

  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
