/* Lecture 1 illustration: one channel P_{Y|X} (binary symmetric, crossover eps) and two input
   distributions P_X = Bern(p) and Q_X = Bern(q).
   Usage in the class notes:
     %web: l1-channel                 joint distributions and information measures under P_X and Q_X
     %web: l1-channel view=dpi        data processing: D(P_X||Q_X) >= D(P_{Y|X}oP_X || P_{Y|X}oQ_X)
   Optional arguments: p=0.2 q=0.5 eps=0.1. Draws into every [data-widget="l1-channel"]. No libraries. */
(function () {
  "use strict";
  var NAME = "l1-channel", SVGNS = "http://www.w3.org/2000/svg";

  // ---- information measures of Bernoulli distributions, in bits
  function log2(x) { return Math.log(x) / Math.LN2; }
  function h2(p) {
    var h = 0;
    if (p > 0) h -= p * log2(p);
    if (p < 1) h -= (1 - p) * log2(1 - p);
    return Math.max(h, 0);
  }
  function kl(a, b) {            // D(Bern(a) || Bern(b))
    var d = 0;
    if (a > 0) { if (b <= 0) return Infinity; d += a * log2(a / b); }
    if (a < 1) { if (b >= 1) return Infinity; d += (1 - a) * log2((1 - a) / (1 - b)); }
    return Math.max(d, 0);
  }
  function star(p, e) { return p * (1 - e) + (1 - p) * e; }   // p * eps
  function f2(x) { return x.toFixed(2); }
  function f3(x) { return x === Infinity ? "∞" : x.toFixed(3); }

  // ---- names of the distributions, as in the notes (upright letters)
  var PX = "P<sub>X</sub>", QX = "Q<sub>X</sub>", K = "P<sub>Y|X</sub>";
  var PY = K + "∘" + PX, QY = K + "∘" + QX;

  function parseArgs(el) {
    var out = {};
    (el.getAttribute("data-args") || "").split(/\s+/).forEach(function (kv) {
      var m = kv.match(/^([A-Za-z_][\w-]*)=(.*)$/);
      if (m) out[m[1]] = m[2];
    });
    return out;
  }
  function unit(v, d) { var x = parseFloat(v); return isFinite(x) ? Math.min(Math.max(x, 0), 1) : d; }
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
  function label(parent, x, y, parts, cls, anchor) {
    // parts: [["P", ""], ["Y|X", "sub"], ...]: text with subscripts, drawn with tspans
    var t = svg("text", { x: x, y: y, "class": cls || "", "text-anchor": anchor || "middle" }, parent);
    var down = false;
    parts.forEach(function (p) {
      var s = svg("tspan", {}, t);
      if (p[1] === "sub" && !down) { s.setAttribute("dy", "3.5"); s.setAttribute("font-size", "80%"); down = true; }
      else if (p[1] !== "sub" && down) { s.setAttribute("dy", "-3.5"); down = false; }
      else if (p[1] === "sub") s.setAttribute("font-size", "80%");
      s.textContent = p[0];
    });
    return t;
  }
  function slider(html, value, onInput) {
    var wrap = el("label", "l1w-ctl");
    wrap.appendChild(el("span", "l1w-ctl-name", html));
    var input = document.createElement("input");
    input.type = "range"; input.min = "0"; input.max = "1"; input.step = "0.01"; input.value = String(value);
    var out = el("output", "l1w-ctl-val", f2(value));
    input.addEventListener("input", function () { out.textContent = f2(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    return wrap;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var a = parseArgs(root);
    var dpi = a.view === "dpi";
    var st = { p: unit(a.p, dpi ? 0.2 : 0.2), q: unit(a.q, dpi ? 0.6 : 0.5), e: unit(a.eps, dpi ? 0.15 : 0.1) };
    root.classList.add("l1w", "l1c");
    root.innerHTML = "";

    var controls = el("div", "l1w-controls");
    controls.appendChild(slider(PX + " = Bern(<i>p</i>)", st.p, function (v) { st.p = v; draw(); }));
    controls.appendChild(slider(QX + " = Bern(<i>q</i>)", st.q, function (v) { st.q = v; draw(); }));
    controls.appendChild(slider("crossover ε", st.e, function (v) { st.e = v; draw(); }));
    root.appendChild(controls);

    var figure = el("div", "l1w-figure");
    var fig = svg("svg", { role: "img", "aria-label": "The channel with its two inputs and two outputs" }, figure);
    root.appendChild(figure);
    var legend = el("p", "l1c-legend");
    root.appendChild(legend);
    var below = el("div", dpi ? "l1c-dpi" : "l1c-cards");
    root.appendChild(below);

    var W = 0;
    function layout() {
      var w = Math.round((figure.clientWidth || 520));
      return Math.max(300, Math.min(560, w));
    }

    function drawDiagram() {
      var p = st.p, q = st.q, e = st.e, py = star(p, e), qy = star(q, e);
      while (fig.firstChild) fig.removeChild(fig.firstChild);
      var H = 196, R = 12, LAB = 34, GAP = 7;
      var G = Math.max(96, Math.min(150, Math.round(W * 0.25)));
      var BAR = Math.floor((W - G - 2 * (LAB + R + GAP)) / 2);
      var XL = Math.round((W - G) / 2), XR = XL + G;
      var Y0 = 72, Y1 = 150;
      fig.setAttribute("viewBox", "0 0 " + W + " " + H);
      fig.setAttribute("width", W);
      fig.setAttribute("height", H);

      label(fig, XL - R - GAP - BAR / 2, 20, [["inputs ", ""], ["x", ""]], "l1w-lbl");
      label(fig, (XL + XR) / 2, 20, [["P", ""], ["Y|X", "sub"]], "l1w-lbl");
      label(fig, XR + R + GAP + BAR / 2, 20, [["outputs ", ""], ["y", ""]], "l1w-lbl");

      // edges: width grows with the transition probability
      [[Y0, Y0, 1 - e], [Y0, Y1, e], [Y1, Y0, e], [Y1, Y1, 1 - e]].forEach(function (d) {
        svg("line", { x1: XL + R, y1: d[0], x2: XR - R, y2: d[1], "class": "l1c-edge",
                      "stroke-width": (0.5 + 6 * d[2]).toFixed(2) }, fig);
      });
      var mx = (XL + XR) / 2;
      label(fig, mx, Y0 - 9, [["1−ε", ""]], "l1w-tick");
      label(fig, mx, Y1 + 18, [["1−ε", ""]], "l1w-tick");
      label(fig, XL + R + 22, (Y0 + Y1) / 2 - 12, [["ε", ""]], "l1w-tick");
      label(fig, XL + R + 22, (Y0 + Y1) / 2 + 19, [["ε", ""]], "l1w-tick");

      [[XL, Y0, "0"], [XL, Y1, "1"], [XR, Y0, "0"], [XR, Y1, "1"]].forEach(function (n) {
        svg("circle", { cx: n[0], cy: n[1], r: R, "class": "l1c-node" }, fig);
        label(fig, n[0], n[1] + 4, [[n[2], ""]], "l1c-nodelab");
      });

      function bar(x, y, v, dir, cls) {
        var w = Math.max(v * BAR, 0);
        svg("rect", { x: dir < 0 ? x - w : x, y: y, width: Math.max(w, 0.5), height: 9, rx: 1.5, "class": cls }, fig);
        label(fig, dir < 0 ? x - w - 4 : x + w + 4, y + 8.5, [[f2(v), ""]], "l1w-tick", dir < 0 ? "end" : "start");
      }
      var xl = XL - R - GAP, xr = XR + R + GAP;
      bar(xl, Y0 - 11, 1 - p, -1, "l1c-P"); bar(xl, Y0 + 2, 1 - q, -1, "l1c-Q");
      bar(xl, Y1 - 11, p, -1, "l1c-P");     bar(xl, Y1 + 2, q, -1, "l1c-Q");
      bar(xr, Y0 - 11, 1 - py, 1, "l1c-P"); bar(xr, Y0 + 2, 1 - qy, 1, "l1c-Q");
      bar(xr, Y1 - 11, py, 1, "l1c-P");     bar(xr, Y1 + 2, qy, 1, "l1c-Q");
    }

    function jointTable(r, cls, name) {
      var e = st.e;
      var j = [[(1 - r) * (1 - e), (1 - r) * e], [r * e, r * (1 - e)]], ry = star(r, e);
      return '<table class="l1c-table"><caption>pmf of ' + name + K + '</caption>' +
        '<tr><th></th><th><i>y</i> = 0</th><th><i>y</i> = 1</th><th class="m">' + name + '</th></tr>' +
        '<tr><th><i>x</i> = 0</th><td>' + f3(j[0][0]) + '</td><td>' + f3(j[0][1]) + '</td><td class="m">' + f3(1 - r) + '</td></tr>' +
        '<tr><th><i>x</i> = 1</th><td>' + f3(j[1][0]) + '</td><td>' + f3(j[1][1]) + '</td><td class="m">' + f3(r) + '</td></tr>' +
        '<tr class="m"><th>' + K + '∘' + name + '</th><td>' + f3(1 - ry) + '</td><td>' + f3(ry) + '</td><td></td></tr></table>';
    }
    function card(r, cls, name, letter) {
      var e = st.e, ry = star(r, e), hy = h2(ry), hyx = h2(e);
      return '<div class="l1c-card ' + cls + '"><p class="l1c-card-h">' + name + ' = Bern(<i>' + letter + '</i>) = Bern(' + f2(r) + ')</p>' +
        jointTable(r, cls, name) +
        '<dl class="l1c-measures">' +
        '<div><dt><i>H</i>(' + name + ')</dt><dd>' + f3(h2(r)) + '</dd></div>' +
        '<div><dt><i>H</i>(' + K + '∘' + name + ')</dt><dd>' + f3(hy) + '</dd></div>' +
        '<div><dt><i>H</i>(' + K + ' | ' + name + ')</dt><dd>' + f3(hyx) + '</dd></div>' +
        '<div><dt><i>I</i>(' + name + ', ' + K + ')</dt><dd>' + f3(Math.max(hy - hyx, 0)) + '</dd></div>' +
        '</dl></div>';
    }

    function drawText() {
      var p = st.p, q = st.q, e = st.e, py = star(p, e), qy = star(q, e);
      legend.innerHTML = '<span class="l1c-key l1c-P"></span>' + PX + ' and ' + PY + ' = Bern(<i>p</i>⋆ε) = Bern(' + f3(py) + ')' +
        '<br><span class="l1c-key l1c-Q"></span>' + QX + ' and ' + QY + ' = Bern(<i>q</i>⋆ε) = Bern(' + f3(qy) + ')';
      if (!dpi) {
        below.innerHTML = '<div class="l1c-grid">' + card(p, "l1c-cP", PX, "p") + card(q, "l1c-cQ", QX, "q") + '</div>' +
          '<p class="l1w-readout">Both columns are <i>H</i>(X), <i>H</i>(Y), <i>H</i>(Y | X) and <i>I</i>(X; Y), in bits, ' +
          'for the same random variables under two joint distributions.</p>';
        return;
      }
      var dx = kl(p, q), dy = kl(py, qy);
      var scale = dx === Infinity ? (dy > 0 ? dy * 1.6 : 1) : dx;
      var wx = dx === Infinity ? 100 : (scale > 0 ? 100 : 0);
      var wy = scale > 0 ? Math.min(dy / scale, 1) * 100 : 0;
      below.innerHTML =
        '<div class="l1c-drow"><span class="l1c-dlab"><i>D</i>(' + PX + ' ‖ ' + QX + ')</span>' +
        '<span class="l1c-dbar' + (dx === Infinity ? " is-inf" : "") + '"><span style="width:' + wx.toFixed(1) + '%"></span></span><b>' + f3(dx) + '</b></div>' +
        '<div class="l1c-drow"><span class="l1c-dlab"><i>D</i>(' + PY + ' ‖ ' + QY + ')</span>' +
        '<span class="l1c-dbar"><span style="width:' + wy.toFixed(1) + '%"></span></span><b>' + f3(dy) + '</b></div>' +
        '<p class="l1w-readout">Divergences in bits: after the channel, the two distributions are closer, ' +
        f3(dx) + ' ≥ ' + f3(dy) + (e === 0.5 ? '; with ε = 0.5 the output does not depend on the input.' : '.') + '</p>';
    }

    function draw() { drawDiagram(); drawText(); }
    function resize() { var w = layout(); if (w !== W) { W = w; drawDiagram(); } }
    W = layout();
    draw();
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
