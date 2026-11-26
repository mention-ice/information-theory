/* Lecture 4 widget: everyday applications of lossy compression, and a demo that compresses a
   picture in the browser in two ways: rounding each pixel to 2^b levels, or rounding the
   coefficients of the 8x8 cosine transform with a step (the lossy step of JPEG). The rate of
   each is the entropy of the rounded values (what an ideal lossless code needs, Lecture 3),
   the distortion is the mean squared error per pixel; both curves are drawn as in the notes,
   distortion on the horizontal axis.
   Usage in the class notes, at the end of the last section:
     %web: l4-applications place=end
   With place=end, the widget moves into its own section at the end of the page, after the
   exercises and before the links to the other lectures, and adds "Applications" to the links at
   the top of the page. Without place=end, it stays where the %web line is.
   Draws into every [data-widget="l4-applications"] element. No libraries, no network. */
(function () {
  "use strict";
  var NAME = "l4-applications";
  var SVGNS = "http://www.w3.org/2000/svg";
  var COUNT = 0;

  // ---- the examples --------------------------------------------------------------------------
  var APPS = [
    { title: "Photos (JPEG, HEIC)",
      body: "A camera cuts the picture into small blocks (8×8 pixels in JPEG), takes a cosine transform " +
            "of each block and rounds the coefficients, more coarsely for fine details that the eye " +
            "barely sees. The rounding is the lossy step, a quantization; the rounded values are then " +
            "coded without loss (Huffman codes in JPEG, arithmetic coding in HEIC). The quality " +
            "setting picks a point on the rate–distortion trade-off.",
      refs: [["quantization, then a lossless code", "#cn-4-1"], ["try it below", "#applications-demo"]] },
    { title: "Music (MP3, AAC)",
      body: "A model of hearing estimates, in each frequency band, how much noise the music masks, and " +
            "the encoder quantizes so that its noise stays below that level: the distortion measure " +
            "is designed for the ear, not the squared error. At 128 kbit/s, an MP3 file takes about " +
            "a tenth of the 1411 kbit/s of a CD.",
      refs: [["distortion", "#cn-4-1"], ["changing the distortion", "#p6"]] },
    { title: "Video streaming (H.264, HEVC, AV1)",
      body: "For every block, the encoder tries many ways to predict and quantize it, and keeps the one " +
            "that minimizes D + λR: λ fixes the slope at which it sits on the convex " +
            "rate–distortion curve. Streaming services store each film at several rates, and your " +
            "player moves along the curve as your bandwidth changes.",
      refs: [["convexity of R(D)", "#cn-4-2"]] },
    { title: "Phone calls (AMR, EVS)",
      body: "Classic digital telephony sends 8000 samples per second with 8 bits each: 64 kbit/s. " +
            "Mobile phones send speech at about 6 to 24 kbit/s: every 5 ms or so, the encoder searches " +
            "a codebook of excitation signals for the one whose synthesized sound is closest to your " +
            "voice, and sends its index (code-excited linear prediction).",
      refs: [["codebook and closest codeword", "#cn-4-4-2"]] },
    { title: "Microphones and cameras",
      body: "Every sensor rounds its measurements to a finite number of bits: scalar quantization, " +
            "before any compression. Each extra bit divides the squared error by about 4, i.e., 6 dB " +
            "per bit, as in D(R) = σ²2⁻²ᴿ for a Gaussian source.",
      refs: [["scalar quantization", "#p8"]] },
    { title: "Neural networks on your phone",
      body: "Speech recognition and photo processing run on phones with the weights of their networks " +
            "stored on 8 or even 4 bits instead of 32. The rounding is tuned so that the outputs " +
            "barely change: the distortion that matters is the error of the outputs, not of the " +
            "weights.",
      refs: [["distortion", "#cn-4-1"], ["changing the distortion", "#p6"]] },
    { title: "Scanned documents (JBIG2)",
      body: "Some scanners compress text by storing one image per distinct letter shape and replacing " +
            "every similar patch by its stored shape: a codebook of patches, with a pixel-wise " +
            "distortion. In 2013, some office copiers were found to change digits in scanned tables, " +
            "such as a 6 into an 8: two patches can be close pixel by pixel and mean different things.",
      refs: [["reconstruction codebook", "#cn-4-1"]] },
    { title: "Medical and scientific data",
      body: "When every value matters, the constraint is on the largest error, not the average one: " +
            "near-lossless modes, such as JPEG-LS for medical images or SZ for simulation data, " +
            "guarantee that every pixel or value stays within a tolerance. This costs more bits, " +
            "since every symbol must be close, not just most of them.",
      refs: [["average distortion", "#cn-4-1"]] }
  ];

  // ---- helpers ---------------------------------------------------------------------------------
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
  function rng(seed) {                                   // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- the picture: a small landscape, drawn by the script (no image file) ---------------------
  var W = 160, H = 120;
  function smooth(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
  function valueNoise(cell, seed) {                     // smooth random field in [0, 1]
    var r = rng(seed), gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, g = new Float64Array(gw * gh);
    for (var i = 0; i < g.length; i++) g[i] = r();
    return function (x, y) {
      var fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
      var tx = smooth(fx - ix), ty = smooth(fy - iy);
      var a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
  }
  var PICTURE = null;
  function picture() {
    if (PICTURE) return PICTURE;
    var img = new Uint8ClampedArray(W * H), r = rng(2026);
    var n1 = valueNoise(9, 11), n2 = valueNoise(3, 12), n3 = valueNoise(5, 13), n4 = valueNoise(2, 14);
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var v = 222 - 52 * (y / 70);                      // sky, darker towards the horizon
        var ds = Math.hypot(x - 126, y - 24);             // sun with a soft edge and a halo
        v += 30 * Math.exp(-ds * ds / 900);
        v = v + (250 - v) * (1 - smooth((ds - 9.5) / 1.5));
        var r1 = 58 + 9 * Math.sin(x / 13) + 5 * Math.sin(x / 5.3 + 1) + 3 * n1(x, 0);
        if (y > r1) v = 150 + 22 * n1(x, y) - 0.25 * (y - r1);          // far hills
        var r2 = 75 + 8 * Math.sin(x / 9 + 2) + 4 * Math.sin(x / 3.7) + 2 * n3(x, 3);
        if (y > r2) v = 112 + 30 * n3(x, y) - 0.4 * (y - r2);           // near hills
        if (y > 94) v = 78 + 34 * n2(x, y) + 18 * n4(x, y);            // grass
        // house: wall, roof, door, window
        if (x >= 28 && x < 62 && y >= 72 && y < 100) v = 188 + 6 * n4(x, y);
        var roofTop = 54, roofY = roofTop + Math.abs(x - 45) * 18 / 21;
        if (x >= 24 && x < 67 && y >= roofY && y < 72) v = 66 + 10 * n2(x, y);
        if (x >= 41 && x < 50 && y >= 84 && y < 100) v = 58;
        if (x >= 32 && x < 39 && y >= 77 && y < 84) v = (x === 35 || y === 80) ? 188 : 34;
        if (x >= 53 && x < 59 && y >= 77 && y < 84) v = (x === 56 || y === 80) ? 188 : 34;
        // tree
        if (x >= 105 && x < 109 && y >= 82 && y < 101) v = 62;
        var dt = Math.hypot(x - 107, (y - 74) * 1.15);
        if (dt < 11.5 + 2.5 * n2(x, y)) v = 70 + 46 * n4(x, y) + 20 * n2(x, y);
        v += (r() + r() + r() - 1.5) * 3;                 // a little sensor noise
        img[y * W + x] = Math.round(v);
      }
    }
    PICTURE = img;
    return img;
  }

  // ---- two lossy codes and their rates -----------------------------------------------------------
  function entropy(counts, total) {
    var h = 0;
    counts.forEach(function (c) { if (c > 0) h -= c / total * Math.log2(c / total); });
    return h;
  }
  function mse(a, b) { var s = 0; for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; } return s / a.length; }

  function roundPixels(img, b) {                        // 2^b levels, reconstruction at the middle
    var step = 256 / Math.pow(2, b), out = new Uint8ClampedArray(img.length), counts = new Map();
    for (var i = 0; i < img.length; i++) {
      var q = Math.floor(img[i] / step);
      out[i] = Math.round((q + 0.5) * step - 0.5);
      counts.set(q, (counts.get(q) || 0) + 1);
    }
    return { out: out, rate: entropy(counts, img.length), mse: mse(img, out), label: "b = " + b + (b === 1 ? " bit" : " bits") };
  }
  var COS = (function () {                              // orthonormal DCT-II matrix, 8 x 8
    var c = new Float64Array(64);
    for (var u = 0; u < 8; u++) for (var x = 0; x < 8; x++)
      c[u * 8 + x] = (u === 0 ? Math.sqrt(1 / 8) : Math.sqrt(2 / 8)) * Math.cos((2 * x + 1) * u * Math.PI / 16);
    return c;
  })();
  var COEFFS = null;
  function coefficients(img) {                          // DCT of every block, computed once
    if (COEFFS) return COEFFS;
    var nb = (W / 8) * (H / 8), all = new Float64Array(nb * 64), tmp = new Float64Array(64), blk = 0;
    for (var by = 0; by < H; by += 8) {
      for (var bx = 0; bx < W; bx += 8) {
        var u, v, x, y, s;
        for (u = 0; u < 8; u++) for (x = 0; x < 8; x++) {          // rows: tmp[u][x] = sum_y C[u][y] B[y][x]
          s = 0;
          for (y = 0; y < 8; y++) s += COS[u * 8 + y] * (img[(by + y) * W + bx + x] - 128);
          tmp[u * 8 + x] = s;
        }
        for (u = 0; u < 8; u++) for (v = 0; v < 8; v++) {          // F[u][v] = sum_x tmp[u][x] C[v][x]
          s = 0;
          for (x = 0; x < 8; x++) s += tmp[u * 8 + x] * COS[v * 8 + x];
          all[blk * 64 + u * 8 + v] = s;
        }
        blk++;
      }
    }
    COEFFS = all;
    return all;
  }
  function transformCode(img, step) {
    var F = coefficients(img), nb = F.length / 64, out = new Uint8ClampedArray(img.length);
    var counts = [], k;
    for (k = 0; k < 64; k++) counts.push(new Map());
    var tmp = new Float64Array(64), G = new Float64Array(64), prevDC = 0, blk = 0;
    for (var by = 0; by < H; by += 8) {
      for (var bx = 0; bx < W; bx += 8) {
        var u, v, x, y, s;
        for (k = 0; k < 64; k++) {
          var q = Math.round(F[blk * 64 + k] / step);
          var sym = k === 0 ? q - prevDC : q;               // DC: difference with the previous block
          if (k === 0) prevDC = q;
          counts[k].set(sym, (counts[k].get(sym) || 0) + 1);
          G[k] = q * step;
        }
        for (u = 0; u < 8; u++) for (x = 0; x < 8; x++) {          // tmp[u][x] = sum_v G[u][v] C[v][x]
          s = 0;
          for (v = 0; v < 8; v++) s += G[u * 8 + v] * COS[v * 8 + x];
          tmp[u * 8 + x] = s;
        }
        for (y = 0; y < 8; y++) for (x = 0; x < 8; x++) {          // B[y][x] = sum_u C[u][y] tmp[u][x]
          s = 0;
          for (u = 0; u < 8; u++) s += COS[u * 8 + y] * tmp[u * 8 + x];
          out[(by + y) * W + bx + x] = Math.round(s + 128);
        }
        blk++;
      }
    }
    var rate = 0;
    for (k = 0; k < 64; k++) rate += entropy(counts[k], nb);
    return { out: out, rate: rate / 64, mse: mse(img, out), label: "step " + step };
  }
  var BITS = [1, 2, 3, 4, 5, 6, 7];
  var STEPS = [256, 181, 128, 90, 64, 45, 32, 22, 16, 11, 8, 6, 4, 3, 2];
  var RESULTS = null;
  function results() {
    if (RESULTS) return RESULTS;
    var img = picture();
    RESULTS = { round: BITS.map(function (b) { return roundPixels(img, b); }),
                dct: STEPS.map(function (st) { return transformCode(img, st); }) };
    return RESULTS;
  }

  // ---- placement at the end of the page --------------------------------------------------------
  function moveToEnd(root) {                            // true if the widget now has its own section
    if (document.getElementById("applications")) return false;
    var sheet = root.closest(".sheet");
    if (!sheet) return false;
    var pager = sheet.querySelector("nav.pager");
    var sec = el("section", "block");
    sec.id = "applications";
    sec.setAttribute("aria-labelledby", "applications-h");
    var head = el("div", "block-head");
    var h = el("h2", null, "Everyday applications");
    h.id = "applications-h";
    head.appendChild(h);
    head.appendChild(el("p", "block-sub", APPS.length + " examples"));
    sec.appendChild(head);
    sec.appendChild(root);
    if (pager && pager.parentNode === sheet) sheet.insertBefore(sec, pager); else sheet.appendChild(sec);
    var jump = document.querySelector("nav.jump");
    if (jump) {
      var a = el("a", null, "Applications");
      a.href = "#applications";
      jump.appendChild(a);
    }
    return true;
  }

  // ---- build one widget ------------------------------------------------------------------------
  function build(host) {
    if (host.getAttribute("data-ready")) return;
    host.setAttribute("data-ready", "1");
    var args = parseArgs(host);
    var uid = ++COUNT;
    host.textContent = "";
    var root = el("div", "l4w l4w-app");
    host.appendChild(root);
    // in its own section, the cards need no frame around them
    if (args.place === "end" && moveToEnd(host)) host.classList.add("l4w-app-end");

    root.appendChild(el("p", "l4w-app-intro",
      "Photos, music, videos and phone calls are all compressed with losses: a quantization " +
      "chooses a reconstruction, then a lossless code describes it, and a quality setting moves " +
      "along a rate–distortion trade-off."));
    var grid = el("ul", "l4w-app-grid");
    APPS.forEach(function (ap) {
      var li = el("li", "l4w-app-card");
      li.appendChild(el("h3", "l4w-app-title", ap.title));
      li.appendChild(el("p", "l4w-app-body", ap.body));
      var refs = el("p", "l4w-app-refs");
      ap.refs.forEach(function (r, i) {
        if (i) refs.appendChild(document.createTextNode(" · "));
        var a = el("a", null, r[0]);
        a.href = r[1];
        refs.appendChild(a);
      });
      li.appendChild(refs);
      grid.appendChild(li);
    });
    root.appendChild(grid);

    // ---- demo ----
    var demo = el("div", "l4w-app-demo");
    if (!document.getElementById("applications-demo")) demo.id = "applications-demo";
    root.appendChild(demo);
    demo.appendChild(el("h3", "l4w-app-dtitle", "Try it: compress a picture"));
    demo.appendChild(el("p", "l4w-hint",
      "Round each pixel to fewer levels, or round the coefficients of the 8×8 cosine transform " +
      "(the lossy step of JPEG). Rates are entropies of the rounded values, what an ideal lossless " +
      "code needs (Lecture 3); the original has 8 bits per pixel."));
    var state = { method: "dct", bi: 2, si: 8 };
    var ctl = el("div", "l4w-controls");
    var seg = el("div", "l4w-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Compression method");
    var mbtns = {};
    [["round", "round each pixel"], ["dct", "8×8 cosine transform"]].forEach(function (m) {
      var b = el("button", "l4w-btn", m[1]);
      b.type = "button";
      b.addEventListener("click", function () { state.method = m[0]; syncSlider(); update(); });
      mbtns[m[0]] = b;
      seg.appendChild(b);
    });
    ctl.appendChild(seg);
    var sl = el("label", "l4w-ctl");
    var slName = el("span", "l4w-ctl-name", "quality");
    var input = document.createElement("input");
    input.type = "range"; input.min = 0; input.step = 1;
    var slOut = el("output", "l4w-ctl-val");
    sl.appendChild(slName); sl.appendChild(input); sl.appendChild(slOut);
    ctl.appendChild(sl);
    demo.appendChild(ctl);
    input.addEventListener("input", function () {
      if (state.method === "round") state.bi = +input.value; else state.si = +input.value;
      update();
    });
    function syncSlider() {
      var list = state.method === "round" ? BITS : STEPS;
      input.max = list.length - 1;
      input.value = state.method === "round" ? state.bi : state.si;
      input.setAttribute("aria-label", state.method === "round" ? "Bits per pixel" : "Quantization step, from coarse to fine");
    }

    var pics = el("div", "l4w-app-pics");
    function canvasBox(caption) {
      var fig = el("figure", "l4w-app-pic");
      var cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      fig.appendChild(cv);
      var cap = el("figcaption", null, caption);
      fig.appendChild(cap);
      pics.appendChild(fig);
      return { cv: cv, cap: cap };
    }
    var orig = canvasBox("original, 8 bits per pixel");
    var dec = canvasBox("");
    demo.appendChild(pics);

    var box = el("div", "l4w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Rate against distortion for the two methods" });
    box.appendChild(s);
    demo.appendChild(box);
    var legend = el("ul", "l4w-legend");
    [["s-b", "round each pixel, b = 1, …, 7 bits"], ["s-a", "8×8 cosine transform, steps 256 to 2"]].forEach(function (it) {
      var li = el("li");
      var sw = svg("svg", { "class": "l4w-sw", viewBox: "0 0 26 10", "aria-hidden": "true" });
      sw.appendChild(svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, "class": "l4w-line " + it[0] }));
      li.appendChild(sw);
      li.appendChild(document.createTextNode(it[1]));
      legend.appendChild(li);
    });
    demo.appendChild(legend);
    var readout = el("p", "l4w-readout");
    readout.setAttribute("aria-live", "polite");
    demo.appendChild(readout);

    function paint(cv, data) {
      var ctx = cv.getContext("2d");
      if (!ctx) return;
      var im = ctx.createImageData(W, H);
      for (var i = 0; i < data.length; i++) {
        im.data[4 * i] = im.data[4 * i + 1] = im.data[4 * i + 2] = data[i];
        im.data[4 * i + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
    }
    function rateAt(list, m) {                         // rate of a curve at the distortion m (log interpolation)
      var pts = list.slice().sort(function (a, b) { return a.mse - b.mse; });
      if (m < pts[0].mse) return { out: "below", pt: pts[0] };
      if (m > pts[pts.length - 1].mse) return { out: "above", pt: pts[pts.length - 1] };
      for (var i = 1; i < pts.length; i++) {
        if (m <= pts[i].mse) {
          var t = (Math.log(m) - Math.log(pts[i - 1].mse)) / (Math.log(pts[i].mse) - Math.log(pts[i - 1].mse));
          return { rate: pts[i - 1].rate + t * (pts[i].rate - pts[i - 1].rate) };
        }
      }
      return { out: "above", pt: pts[pts.length - 1] };
    }

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) chart();
      }).observe(box);
    }
    function chart() {
      var res = results(), cur = state.method === "round" ? res.round[state.bi] : res.dct[state.si];
      lastW = Math.round(box.clientWidth) || 560;
      var Wc = Math.max(300, Math.min(600, lastW));
      var Hc = Wc < 420 ? 230 : 260, L = 46, R = 14, T = 12, B = 36;
      var lmin = -0.5, lmax = 3.5, rmax = 7;           // log10 of the MSE, bits per pixel
      function X(m) { return L + (Math.log10(Math.max(m, 1e-3)) - lmin) / (lmax - lmin) * (Wc - L - R); }
      function Y(r) { return T + (1 - r / rmax) * (Hc - T - B); }
      s.setAttribute("viewBox", "0 0 " + Wc + " " + Hc);
      while (s.firstChild) s.removeChild(s.firstChild);
      var g;
      for (g = 0; g <= rmax; g += 1) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: Wc - R, y2: Y(g).toFixed(1), "class": g ? "l4w-grid" : "l4w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l4w-tick", "text-anchor": "end" }, String(g)));
      }
      [1, 10, 100, 1000].forEach(function (m) {
        s.appendChild(svg("line", { x1: X(m).toFixed(1), y1: Hc - B, x2: X(m).toFixed(1), y2: Hc - B + 4, "class": "l4w-axis" }));
        s.appendChild(svg("text", { x: X(m).toFixed(1), y: Hc - B + 16, "class": "l4w-tick", "text-anchor": "middle" }, String(m)));
      });
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hc - B, "class": "l4w-axis" }));
      s.appendChild(svg("text", { x: ((L + Wc - R) / 2).toFixed(1), y: Hc - 3, "class": "l4w-lbl", "text-anchor": "middle" },
        Wc < 460 ? "mean squared error (log scale)" : "distortion: mean squared error per pixel (log scale)"));
      var ym = ((T + Hc - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 11, y: ym, "class": "l4w-lbl l4w-ylbl", "text-anchor": "middle", transform: "rotate(-90 11 " + ym + ")" }, "bits per pixel"));
      [["round", "s-b"], ["dct", "s-a"]].forEach(function (m) {
        var list = res[m[0]], d = "";
        list.forEach(function (pt, i) { d += (i ? "L" : "M") + X(pt.mse).toFixed(1) + " " + Y(pt.rate).toFixed(1); });
        s.appendChild(svg("path", { d: d, "class": "l4w-line " + m[1] }));
        list.forEach(function (pt) {
          s.appendChild(svg("circle", { cx: X(pt.mse).toFixed(1), cy: Y(pt.rate).toFixed(1), r: 2.6, "class": "l4w-mark " + m[1] + " l4w-app-dot" }));
        });
      });
      s.appendChild(svg("circle", { cx: X(cur.mse).toFixed(1), cy: Y(cur.rate).toFixed(1), r: 6,
        "class": "l4w-mark " + (state.method === "round" ? "s-b" : "s-a") }));
    }
    function update() {
      Object.keys(mbtns).forEach(function (k) { mbtns[k].setAttribute("aria-pressed", k === state.method ? "true" : "false"); });
      var res = results(), cur = state.method === "round" ? res.round[state.bi] : res.dct[state.si];
      slName.textContent = state.method === "round" ? "bits per pixel" : "step";
      slOut.textContent = state.method === "round" ? String(BITS[state.bi]) : String(STEPS[state.si]);
      paint(dec.cv, cur.out);
      dec.cap.textContent = "decoded: " + cur.rate.toFixed(2) + " bits per pixel, error " + cur.mse.toFixed(1);
      chart();
      var other = state.method === "round" ? res.dct : res.round, r2 = rateAt(other, cur.mse);
      var name = state.method === "round" ? "Rounding each pixel to " + Math.pow(2, BITS[state.bi]) + " levels" :
        "Rounding the transform coefficients with the step " + STEPS[state.si];
      var cmp;
      if (state.method === "round") {
        cmp = r2.out === "above"
          ? "The cosine transform does better with only " + r2.pt.rate.toFixed(2) + " bits per pixel (error " + r2.pt.mse.toFixed(1) + ")"
          : r2.out === "below"
            ? "The cosine transform needs more than " + r2.pt.rate.toFixed(2) + " bits per pixel for so small an error"
            : "The cosine transform reaches the same error with about " + r2.rate.toFixed(2) + " bits per pixel";
        cmp += ": neighbouring pixels are alike, and the transform gathers this redundancy into a few coefficients.";
      } else {
        cmp = r2.out === "above"
          ? "Rounding the pixels to 2 levels gives a larger error, " + r2.pt.mse.toFixed(1) + ", with " + r2.pt.rate.toFixed(2) + " bits per pixel."
          : r2.out === "below"
            ? "Rounding the pixels needs more than " + r2.pt.rate.toFixed(2) + " bits per pixel for so small an error."
            : "Rounding the pixels needs about " + r2.rate.toFixed(2) + " bits per pixel for the same error.";
      }
      readout.textContent = name + " needs about " + cur.rate.toFixed(2) + " bits per pixel, with a mean squared error of " +
        cur.mse.toFixed(1) + " (a typical pixel is off by about " + Math.sqrt(cur.mse).toFixed(1) + " of 256 levels). " + cmp;
    }
    paint(orig.cv, picture());
    syncSlider();
    update();
  }

  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) build(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
