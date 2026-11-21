// HALXNAO — pixels.js
// Draws the small, soft pixel animations (a grid of tiny squares).
//
// How to use it in HTML:
//   <canvas class="pixels" data-mode="wave" data-cell="10" aria-hidden="true"></canvas>
//
//   data-mode : "wave"      a slow rolling wave of lit squares
//               "eq"        equalizer bars (music)
//               "transfer"  files travelling between two devices
//               "player"    a pixel video screen with a play button in the middle, sound
//                           waves spreading out to both sides and a progress bar under it
//                           (for apps that play video AND audio)
//               "twinkle"   a calm grid where single squares fade in and out
//                           (like a contribution graph). Colours come from
//                           data-palette="#6fb27a,#39c5cf,#7aa2ec"
//   data-cell : size of one square in CSS pixels (default 8)
//
// The squares take the canvas's CSS `color`, so a tone class in CSS
// (.tone-green, .tone-cyan, .tone-blue) changes the colour.
// The canvas is decoration only. If this file fails to load, the page
// is simply a clean page without the animation.

(function () {
  var canvases = document.querySelectorAll("canvas.pixels");
  if (!canvases.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FRAME_MS = 1000 / 12; // 12 frames per second gives the stepped, pixel feel
  var GAP = 2;              // space between squares, in CSS pixels

  Array.prototype.forEach.call(canvases, setup);

  function setup(canvas) {
    var ctx = canvas.getContext("2d");
    var mode = canvas.dataset.mode || "wave";
    var cell = Number(canvas.dataset.cell) || 8;
    var palette = (canvas.dataset.palette || "").split(",").filter(Boolean).map(hexToRgb);
    var cols = 0, rows = 0, ox = 0, rgb = "255,255,255", state = null;
    var t = 0, last = 0, visible = true, running = false;

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.floor(w / cell);
      rows = Math.floor(h / cell);
      ox = (w - cols * cell) / 2; // centre the grid so both sides match
      rgb = readColor(canvas);
      state = makeState();
      draw();
    }

    // One square. x and y count squares, not pixels. a = opacity 0..1
    function square(x, y, a, color) {
      if (a <= 0) return;
      ctx.fillStyle = "rgba(" + (color || rgb) + "," + (Math.round(a * 5) / 5) + ")"; // 5 steps of brightness
      ctx.fillRect(ox + x * cell, y * cell, cell - GAP, cell - GAP);
    }

    function makeState() {
      if (mode === "eq") {
        var bars = Math.floor(cols / 2);
        return { h: fill(bars, 0.3), target: fill(bars, 0.3), off: Math.floor((cols - (bars * 2 - 1)) / 2), scroll: 0 };
      }
      if (mode === "twinkle") {
        // About 1 square in 11 takes part. Each has its own colour, start time and speed.
        var cells = [];
        for (var n = 0; n < cols * rows; n++) {
          if (Math.random() < 0.09) {
            cells.push({
              x: n % cols, y: Math.floor(n / cols),
              seed: Math.random(), period: 5 + Math.random() * 6,
              color: palette.length ? palette[Math.floor(Math.random() * palette.length)] : rgb
            });
          }
        }
        return { cells: cells };
      }
      if (mode === "transfer") {
        var packets = [];
        for (var i = 0; i < 4; i++) packets.push(i * (cols / 4));
        return { packets: packets };
      }
      return {};
    }

    function step(dt) {
      t += dt;
      if (mode === "eq") {
        for (var i = 0; i < state.h.length; i++) {
          if (Math.random() < 0.18) {
            // taller bars in the middle, shorter at the edges
            var env = Math.sin((Math.PI * (i + 0.5)) / state.h.length);
            state.target[i] = 0.12 + Math.random() * 0.88 * (0.35 + 0.65 * env);
          }
          state.h[i] += (state.target[i] - state.h[i]) * 0.5;
        }
      } else if (mode === "transfer") {
        for (var p = 0; p < state.packets.length; p++) {
          state.packets[p] += dt * 9; // squares per second
          if (state.packets[p] > cols - 6) state.packets[p] = 5;
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      if (mode === "eq") drawEq();
      else if (mode === "player") drawPlayer();
      else if (mode === "transfer") drawTransfer();
      else if (mode === "twinkle") drawTwinkle();
      else drawWave();
    }

    // Faint grid, plus single squares that slowly brighten and fade out again
    function drawTwinkle() {
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) square(x, y, 0.09);
      for (var i = 0; i < state.cells.length; i++) {
        var c = state.cells[i];
        var p = (t / c.period + c.seed) % 1;          // 0..1 through this square's cycle
        if (p < 0.5) square(c.x, c.y, 0.15 + 0.85 * Math.sin(Math.PI * p / 0.5), c.color);
      }
    }

    // Faint grid everywhere, with a slow wave of brighter squares moving through it
    function drawWave() {
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var v = Math.sin(x * 0.22 + t * 0.9) + Math.sin(y * 0.35 - t * 0.6) + Math.sin((x + y) * 0.12 + t * 0.4);
          var a = (v + 3) / 6;
          square(x, y, 0.06 + a * a * 0.9);
        }
      }
    }

    // Bars one square wide, one square apart, built from the bottom up
    function drawEq() {
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) square(x, y, 0.06);
      for (var i = 0; i < state.h.length; i++) {
        var height = Math.max(1, Math.round(state.h[i] * rows));
        for (var k = 0; k < height; k++) {
          var top = k === height - 1;
          square(state.off + i * 2, rows - 1 - k, top ? 1 : 0.55);
        }
      }
    }

    // A pixel video screen in the middle (outline + play button), sound waves that
    // travel outward from both sides of it, and a progress bar underneath.
    // Everything is mirrored around the centre column, so left and right match.
    function drawPlayer() {
      var x, y;
      var scrH = Math.max(5, rows - 5);                     // screen height in squares
      if (scrH % 2 === 0) scrH--;                           // odd, so the middle line is a whole row
      var scrW = Math.round(scrH * 16 / 9);                 // 16:9 like a video
      var left = Math.floor((cols - scrW) / 2), right = left + scrW - 1;
      var top = Math.max(0, Math.floor((rows - scrH - 2) / 2)), bottom = top + scrH - 1;   // screen + gap + bar, centred
      var midY = (top + bottom) / 2;

      for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) square(x, y, 0.05);

      // screen: soft fill + bright outline
      for (y = top; y <= bottom; y++) {
        for (x = left; x <= right; x++) {
          var edge = y === top || y === bottom || x === left || x === right;
          square(x, y, edge ? 0.9 : 0.07);
        }
      }
      // play button: a right-pointing triangle built from columns that get shorter (odd heights keep it centred)
      var th = scrH - 4 - ((scrH - 4) % 2 === 0 ? 1 : 0);  // triangle height, odd
      var tw = Math.ceil(th * 0.8);                         // triangle width
      var pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
      var tx = Math.floor((left + right) / 2) - Math.floor(tw / 2);
      for (var j = 0; j < tw; j++) {
        var colH = 2 * Math.round((th * (1 - j / tw) - 1) / 2) + 1;
        for (var k = 0; k < colH; k++) square(tx + j, Math.round(midY - (colH - 1) / 2 + k), pulse);
      }
      // sound waves: bars centred on the screen's middle line, travelling outward, fading with distance
      var maxD = Math.max(1, Math.floor(cols / 2) - Math.floor(scrW / 2) - 2);
      for (var side = -1; side <= 1; side += 2) {
        for (var d = 2; d <= maxD; d += 2) {
          var bx = side < 0 ? left - d : right + d;
          if (bx < 0 || bx >= cols) continue;
          var env = Math.pow(Math.max(0, 1 - d / maxD), 0.7);
          var amp = (0.3 + 0.7 * Math.abs(Math.sin(d * 0.5 - t * 3.2))) * (0.6 + 0.4 * Math.sin(t * 1.3 + d * 0.2)) * env;
          var h = Math.max(1, Math.round(amp * scrH));
          for (var m = 0; m < h; m++) {
            square(bx, Math.round(midY - (h - 1) / 2 + m), 0.35 + 0.65 * env);
          }
        }
      }
      // progress bar under the screen, with a dot that slowly travels along it
      var barY = bottom + 2;
      if (barY < rows) {
        for (x = left; x <= right; x++) square(x, barY, 0.3);
        var pos = left + Math.floor(((t / 12) % 1) * scrW);
        for (x = left; x <= pos; x++) square(x, barY, 0.8);
        square(Math.min(pos + 1, right), barY, 1);
      }
    }

    // A lane across the middle, a device block at each end, packets moving left to right
    function drawTransfer() {
      var lane = Math.floor(rows / 2);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) square(x, y, 0.05);
      for (var x2 = 5; x2 < cols - 5; x2 += 2) square(x2, lane, 0.25);
      block(1, lane - 2, 3, 5, 0.6);                 // left device
      block(cols - 4, lane - 2, 3, 5, 0.6);          // right device
      for (var p = 0; p < state.packets.length; p++) {
        var px = Math.floor(state.packets[p]);
        block(px, lane - 1, 2, 3, 1);                // the file
        for (var tail = 1; tail <= 4; tail++) square(px - tail, lane, 0.6 - tail * 0.13); // fading trail
      }
    }

    function block(x, y, w, h, a) {
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) square(x + xx, y + yy, a);
    }

    function loop(now) {
      if (!running) return;
      if (now - last >= FRAME_MS) {
        step((now - last) / 1000);
        last = now;
        draw();
      }
      requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion || !visible) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
    function stop() { running = false; }

    if (reduceMotion) t = 2; // static frame for people who asked for less motion

    // Pause when scrolled out of view, so it costs nothing
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }).observe(canvas);
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    resize();
    start();
  }

  function fill(n, v) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(v);
    return a;
  }

  // "#6fb27a" -> "111,178,122"
  function hexToRgb(hex) {
    var h = hex.trim().replace("#", "");
    return parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16);
  }

  // "rgb(111, 178, 122)" -> "111,178,122"
  function readColor(el) {
    var m = getComputedStyle(el).color.match(/\d+/g);
    return m ? m.slice(0, 3).join(",") : "255,255,255";
  }
})();
