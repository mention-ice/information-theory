/* Lecture 5 widget: everyday applications of channel coding, and a demo that sends a text
   through a binary symmetric channel BSC(p) in the browser, in three ways: without a code,
   with each bit repeated 3 times (majority vote), and with the Hamming code of length 7
   (4 data bits, syndrome decoding, which corrects one flipped bit per block: the closest
   codeword, Problem 7). Each character is sent as 7 bits (ASCII). The capacity C = 1 - H_2(p)
   of Section 5.3 is the largest rate of long codes with a vanishing error probability.
   Usage in the class notes, at the end of the last section:
     %web: l5-applications place=end
   With place=end, the widget moves into its own section at the end of the page, after the
   exercises and before the links to the other lectures, and adds "Applications" to the links at
   the top of the page. Without place=end, it stays where the %web line is.
   Draws into every [data-widget="l5-applications"] element. No libraries, no network. */
(function () {
  "use strict";
  var NAME = "l5-applications";
  var COUNT = 0;
  var MAXLEN = 60, DEFAULT_TEXT = "Below capacity, long codes make errors vanish.";

  // ---- the examples --------------------------------------------------------------------------
  var APPS = [
    { title: "Wi-Fi and 5G",
      body: "5G and recent Wi-Fi protect their data with long LDPC codes (Gallager, 1962), and 5G sends its " +
            "control messages with polar codes, the first practical codes proved to reach the capacity " +
            "(Arıkan, 2009). The transmitter picks the modulation and the code rate that fit the current " +
            "signal-to-noise ratio, so that the rate follows the capacity as the SNR changes.",
      refs: [["capacity", "#cn-5-3"], ["Gaussian channels", "#cn-5-7-2"]] },
    { title: "Several antennas (MIMO)",
      body: "With t antennas at the transmitter and r at the receiver, the channel is an r × t matrix H. Its " +
            "singular value decomposition turns it into parallel channels, and the capacity grows like " +
            "min(t, r) · ½ log SNR at high SNR, instead of ½ log SNR: this is how Wi-Fi, 4G and 5G send " +
            "several streams in the same band at the same time.",
      refs: [["MIMO capacity", "#cn-5-7-2"], ["parallel channels", "#p10"]] },
    { title: "Retransmissions (hybrid ARQ)",
      body: "When a packet fails its check, the receiver asks for more: Wi-Fi sends the packet again, and 4G " +
            "and 5G send extra parity bits that the receiver combines with what it already has. Feedback " +
            "does not increase the capacity of a memoryless channel, but it makes good schemes much simpler, " +
            "as for the erasure channel.",
      refs: [["feedback", "#cn-5-3"], ["erasure channel", "#p4"]] },
    { title: "Deep-space probes",
      body: "Far from the Earth, the received power is tiny, and at low SNR the capacity ½ log(1 + SNR) ≈ " +
            "(SNR/2) log e grows linearly with the power: each bit needs a minimum energy. Voyager 2 sent its " +
            "pictures of Uranus and Neptune with a convolutional code combined with a Reed–Solomon code; " +
            "recent missions use turbo and LDPC codes, within about 1 dB of the capacity.",
      refs: [["scalar Gaussian channel", "#cn-5-7-2"]] },
    { title: "QR codes",
      body: "A QR code stores its message with a Reed–Solomon code on bytes. Four levels trade the rate for " +
            "robustness: about 7%, 15%, 25% or 30% of the bytes can be restored, so that a QR code with a " +
            "stain, or a logo in the middle, still reads. A higher level means a lower rate, hence a larger " +
            "code for the same message.",
      refs: [["rate and error probability", "#cn-5-1"]] },
    { title: "CDs and DVDs",
      body: "A CD protects the music with two Reed–Solomon codes and interleaving: the symbols of each " +
            "codeword are spread along the track, so that a scratch damages a few symbols of many codewords " +
            "instead of one whole codeword, and the errors look independent, as on a memoryless channel. " +
            "Bursts of about 3500 bits, 2.4 mm of track, are corrected exactly.",
      refs: [["memoryless channels", "#cn-5-2"]] },
    { title: "Flash memory and hard disks",
      body: "Each cell of a flash memory stores 3 or 4 bits as a voltage level, and worn cells are often " +
            "misread. The controller protects each page with an LDPC code and turns raw error rates of 10⁻³ " +
            "or more into fewer than one error in 10¹⁵ bits. Every page must be readable, not only most of " +
            "them: a guarantee on the maximal error probability.",
      refs: [["error probability", "#cn-5-1"], ["maximal error probability", "#p8"]] },
    { title: "Cloud storage",
      body: "Data centers used to keep three copies of every file: a repetition code of rate 1/3. They now cut " +
            "a file into blocks and add parity blocks with a Reed–Solomon code, for example 4 parity blocks " +
            "for 10 data blocks: any 10 of the 14 blocks restore the file, so that any 4 failed disks are " +
            "tolerated, at the rate 10/14 instead of 1/3.",
      refs: [["repetition codes", "#cn-5-1"], ["erasures", "#p4"]] },
    { title: "DSL lines",
      body: "A DSL modem splits the telephone line into thousands of narrow subchannels (up to 4096 in " +
            "VDSL2), measures the noise of each, and loads more bits where the SNR is high and none where it " +
            "is too low: parallel Gaussian channels, with an allocation close to water-filling.",
      refs: [["parallel channels", "#cn-5-7-2"], ["water-filling", "#p10"]] },
    { title: "Broadcast and downloads (fountain codes)",
      body: "On the Internet, a packet either arrives intact or is lost: an erasure channel. Fountain codes, " +
            "such as the Raptor codes of mobile TV and broadcast standards, let a sender transmit as many " +
            "coded packets as needed; any set of slightly more than k packets restores the k original ones, " +
            "at a rate close to the capacity 1 − δ, without any feedback.",
      refs: [["erasure channel", "#cn-5-2"], ["its capacity", "#p4"]] }
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
  function h2(p) { return (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  // ---- three ways to send bits -------------------------------------------------------------------
  function clean(str) {                                  // printable ASCII only, at most MAXLEN characters
    return str.replace(/[^\x20-\x7E]/g, "?").slice(0, MAXLEN);
  }
  function toBits(str) {
    var b = [];
    for (var i = 0; i < str.length; i++) for (var k = 6; k >= 0; k--) b.push((str.charCodeAt(i) >> k) & 1);
    return b;
  }
  function toText(bits, len) {
    var out = [];
    for (var i = 0; i < len; i++) {
      var c = 0;
      for (var k = 0; k < 7; k++) c = (c << 1) | bits[7 * i + k];
      out.push(c);
    }
    return out;
  }
  var SCHEMES = [
    { key: "none", name: "no code", rate: "rate 1",
      enc: function (b) { return b.slice(); },
      dec: function (r) { return r.slice(); } },
    { key: "rep", name: "each bit 3 times", rate: "rate 1/3",
      enc: function (b) { var o = []; b.forEach(function (x) { o.push(x, x, x); }); return o; },
      dec: function (r) { var o = []; for (var i = 0; i + 2 < r.length; i += 3) o.push(r[i] + r[i + 1] + r[i + 2] >= 2 ? 1 : 0); return o; } },
    { key: "ham", name: "Hamming code", rate: "rate 4/7",
      // positions 1..7 hold p1 p2 d1 p4 d2 d3 d4; the syndrome is the position of a single flipped bit
      enc: function (b) {
        var o = [];
        for (var i = 0; i < b.length; i += 4) {
          var d1 = b[i] || 0, d2 = b[i + 1] || 0, d3 = b[i + 2] || 0, d4 = b[i + 3] || 0;
          o.push(d1 ^ d2 ^ d4, d1 ^ d3 ^ d4, d1, d2 ^ d3 ^ d4, d2, d3, d4);
        }
        return o;
      },
      dec: function (r) {
        var o = [];
        for (var i = 0; i + 6 < r.length; i += 7) {
          var w = r.slice(i, i + 7), syn = 0;
          for (var j = 0; j < 7; j++) if (w[j]) syn ^= j + 1;
          if (syn) w[syn - 1] ^= 1;
          o.push(w[2], w[4], w[5], w[6]);
        }
        return o;
      } }
  ];

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
    var root = el("div", "l5w l5w-app");
    host.appendChild(root);
    // in its own section, the cards need no frame around them
    if (args.place === "end" && moveToEnd(host)) host.classList.add("l5w-app-end");

    root.appendChild(el("p", "l5w-app-intro",
      "Every digital link adds redundancy to survive the noise: phones, disks, QR codes and space probes all " +
      "use channel codes, and the best of them work close to the capacity."));
    var grid = el("ul", "l5w-app-grid");
    APPS.forEach(function (ap) {
      var li = el("li", "l5w-app-card");
      li.appendChild(el("h3", "l5w-app-title", ap.title));
      li.appendChild(el("p", "l5w-app-body", ap.body));
      var refs = el("p", "l5w-app-refs");
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
    var demo = el("div", "l5w-app-demo");
    if (!document.getElementById("applications-demo")) demo.id = "applications-demo";
    root.appendChild(demo);
    demo.appendChild(el("h3", "l5w-app-dtitle", "Try it: send a text through a noisy channel"));
    demo.appendChild(el("p", "l5w-hint",
      "Each character is sent as 7 bits, and the channel flips each bit with probability p. Compare no code, the " +
      "repetition of each bit 3 times, and the Hamming code, which adds 3 parity bits to every 4 bits and corrects " +
      "one flipped bit per block of 7."));
    var state = { p: 0.05, seed: 2026, text: DEFAULT_TEXT };
    var ctl = el("div", "l5w-controls");
    var tl = el("label", "l5w-ctl l5w-app-tl");
    tl.appendChild(el("span", "l5w-ctl-name", "text"));
    var tin = document.createElement("input");
    tin.type = "text"; tin.maxLength = MAXLEN; tin.value = state.text; tin.className = "l5w-app-input";
    tin.setAttribute("aria-label", "Text to send, at most " + MAXLEN + " characters");
    tin.id = "l5w-app-text-" + uid;
    tl.appendChild(tin);
    ctl.appendChild(tl);
    demo.appendChild(ctl);
    var ctl2 = el("div", "l5w-controls");
    var pl = el("label", "l5w-ctl");
    pl.appendChild(el("span", "l5w-ctl-name", "p"));
    var pin = document.createElement("input");
    pin.type = "range"; pin.min = 0; pin.max = 0.2; pin.step = 0.005; pin.value = state.p;
    pin.setAttribute("aria-label", "Probability p that the channel flips a bit");
    var pout = el("output", "l5w-ctl-val", state.p.toFixed(3));
    pl.appendChild(pin); pl.appendChild(pout);
    ctl2.appendChild(pl);
    var bAgain = el("button", "l5w-btn", "send again");
    bAgain.type = "button";
    ctl2.appendChild(bAgain);
    demo.appendChild(ctl2);
    var rows = el("div", "l5w-app-rows");
    demo.appendChild(rows);
    var readout = el("p", "l5w-readout");
    readout.setAttribute("aria-live", "polite");
    demo.appendChild(readout);

    tin.addEventListener("input", function () { state.text = tin.value; update(); });
    pin.addEventListener("input", function () { state.p = +pin.value; pout.textContent = state.p.toFixed(3); update(); });
    bAgain.addEventListener("click", function () { state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0; update(); });

    function update() {
      var text = clean(state.text) || " ", L = text.length, bits = toBits(text), p = state.p, C = 1 - h2(p);
      rows.textContent = "";
      var stats = {};
      SCHEMES.forEach(function (sc, si) {
        var tx = sc.enc(bits), r = rng(state.seed + 977 * si), flips = 0;
        // the same uniforms for every p: a larger p only adds flips
        var rx = tx.map(function (b) { var f = r() < p; if (f) flips++; return b ^ (f ? 1 : 0); });
        var dec = sc.dec(rx).slice(0, bits.length), codes = toText(dec, L), wrongBits = 0, wrongChars = 0;
        for (var i = 0; i < bits.length; i++) if (dec[i] !== bits[i]) wrongBits++;
        var row = el("div", "l5w-app-row");
        var hd = el("div", "l5w-app-rhead");
        hd.appendChild(el("span", "l5w-app-name", sc.name));
        hd.appendChild(el("span", "l5w-app-meta", sc.rate + " · " + group(tx.length) + " channel uses"));
        row.appendChild(hd);
        var out = el("div", "l5w-app-text");
        codes.forEach(function (c, i) {
          var ok = c === text.charCodeAt(i);
          if (!ok) wrongChars++;
          var ch = c >= 32 && c < 127 ? String.fromCharCode(c) : "·";
          out.appendChild(el("span", ok ? null : "l5w-err", ch));
        });
        row.appendChild(out);
        row.appendChild(el("p", "l5w-app-stat", flips + " flipped " + (flips === 1 ? "bit" : "bits") + " on the channel, " +
          wrongBits + " wrong after decoding: " + wrongChars + " of " + L + " characters wrong."));
        rows.appendChild(row);
        stats[sc.key] = { uses: tx.length };
      });
      var txt;
      if (p === 0) txt = "Without noise, C = 1: no code is needed.";
      else {
        var need = Math.ceil(7 * L / C);
        txt = "The capacity of the BSC(" + p.toFixed(3) + ") is C = 1 − H₂(p) = " + C.toFixed(3) + " bit per channel use: long codes of a rate " +
          "just below C send these " + 7 * L + " bits in about " + group(need) + " channel uses, with an error probability as small as " +
          "desired (Section 5.5). ";
        if (C < 1 / 3) txt += "Here both codes have rates above C: no code of such a rate, however long, has a small error probability (Section 5.4).";
        else if (C < 4 / 7) txt += "Here the Hamming code's rate 4/7 is above C: no code of this rate, however long, has a small error probability (Section 5.4).";
        else txt += "The repetition code needs " + group(stats.rep.uses) + " channel uses, and its errors do not vanish.";
      }
      readout.textContent = txt;
    }
    update();
  }

  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) build(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
