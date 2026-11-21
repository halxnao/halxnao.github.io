// HALXNAO — cube.js
// The logo animation on the homepage: a real 3D puzzle cube, drawn in chunky pixels.
// It scrambles itself with face turns, then solves itself by playing the same turns
// backwards, and the solved front face spells the name:
//
//        H A L
//        _ X _      ( _ = a blank sticker )
//        N A O
//
// How it works (read top to bottom, it is meant to be learned from):
//   1. The cube is 26 little cubes ("cubies"). Each has a position, an orientation (a 3x3 rotation
//      matrix) and coloured stickers on its outer faces.
//   2. A move turns one outer layer by 90 degrees. While it turns we rotate those cubies by an
//      angle between 0 and 90, so the motion is smooth.
//   3. To scramble we make random moves and REMEMBER them. To solve we play them backwards, each
//      reversed. That always ends exactly solved.
//   4. Drawing: rotate every point, squash it with simple perspective, sort faces far-to-near
//      (the "painter's algorithm") and fill them. Only the front stickers carry letters.
//   5. We draw on a small canvas and let the browser scale it up with hard edges (CSS
//      image-rendering: pixelated). That is what gives the pixel look.
//
// The canvas is decoration with a text label. If this file fails to load the page is simply a page.

(function () {
  var canvas = document.getElementById("logo-cube");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- tiny 3x3 matrix helpers (axis 0 = x right, 1 = y down, 2 = z toward the viewer) ----------
  var IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  function mul(A, B) {
    var R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++)
      R[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    return R;
  }
  function apply(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
            M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
            M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
  }
  function rot(axis, a) {                       // rotation by angle a (radians) around an axis
    var c = Math.cos(a), s = Math.sin(a);
    if (axis === 0) return [[1, 0, 0], [0, c, -s], [0, s, c]];
    if (axis === 1) return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
  }
  function snap(M) {                            // clean up rounding so turns stay exactly 90 degrees
    return M.map(function (row) { return row.map(Math.round); });
  }

  // ---------- 1. The cube ----------
  var COLORS = {                                // sticker colour by the direction the face points
    "0,0,1":  "#f1ead8",                        // front  (the logo face): white
    "0,0,-1": "#f2c14e",                        // back   : yellow
    "0,-1,0": "#6fb27a",                        // top    : green
    "0,1,0":  "#4f7fd8",                        // bottom : blue
    "1,0,0":  "#e5604d",                        // right  : red
    "-1,0,0": "#e8894a"                         // left   : orange
  };
  var LETTERS = [["H", "A", "L"], ["", "X", ""], ["N", "A", "O"]];   // the solved front face
  var GLYPHS = {                                // 5x5 pixel letters, "1" = filled
    H: ["10001", "10001", "11111", "10001", "10001"],
    A: ["01110", "10001", "11111", "10001", "10001"],
    L: ["10000", "10000", "10000", "10000", "11111"],
    X: ["10001", "01010", "00100", "01010", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001"],
    O: ["01110", "10001", "10001", "10001", "01110"]
  };
  var INK = "#0d1120", BODY = "#05070f";
  var NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

  var cubies;
  function buildCube() {
    cubies = [];
    for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;              // the hidden centre piece is not needed
      var stickers = {};
      if (x) stickers[[x, 0, 0]] = { color: COLORS[[x, 0, 0]] };
      if (y) stickers[[0, y, 0]] = { color: COLORS[[0, y, 0]] };
      if (z) stickers[[0, 0, z]] = { color: COLORS[[0, 0, z]] };
      if (z === 1) stickers[[0, 0, 1]].letter = LETTERS[y + 1][x + 1];
      cubies.push({ p: [x, y, z], R: IDENT, stickers: stickers });
    }
  }

  // ---------- 2. Moves ----------
  // { axis: 0|1|2, layer: -1|1, dir: +1|-1 }  (a quarter turn of one outer layer)
  function randomMoves(count) {
    var moves = [], prev = null;
    while (moves.length < count) {
      var m = { axis: Math.floor(Math.random() * 3), layer: Math.random() < 0.5 ? -1 : 1, dir: Math.random() < 0.5 ? 1 : -1 };
      if (prev && prev.axis === m.axis && prev.layer === m.layer) continue;   // never turn the same face twice in a row
      moves.push(m); prev = m;
    }
    return moves;
  }
  function inverse(m) { return { axis: m.axis, layer: m.layer, dir: -m.dir }; }
  function inLayer(c, m) { return Math.round(c.p[m.axis]) === m.layer; }

  function commit(m) {                           // finish a move: bake the turn into position + orientation
    var T = snap(rot(m.axis, m.dir * Math.PI / 2));
    cubies.forEach(function (c) {
      if (!inLayer(c, m)) return;
      c.p = snap([apply(T, c.p)])[0];
      c.R = snap(mul(T, c.R));
    });
  }

  // ---------- 3. Drawing ----------
  var W = 160, H = 160;
  var CAM = 9;                                   // camera distance (bigger = flatter, less perspective)
  var view = { yaw: -0.6, pitch: -0.45 };        // current view angles, radians
  var LIGHT = norm([-0.35, -0.7, 0.8]);

  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    return "rgb(" + Math.round((n >> 16) * k) + "," + Math.round(((n >> 8) & 255) * k) + "," + Math.round((n & 255) * k) + ")";
  }

  function project(v) {                          // view-space point -> canvas pixel
    var f = (W * 1.42) / (CAM - v[2]);
    return [W / 2 + v[0] * f, H / 2 + v[1] * f];
  }

  function poly(pts, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }   // a hair of overdraw hides seams
  }

  // move: the turn in progress (or null). angle: how far it has turned, radians.
  function draw(move, angle) {
    ctx.clearRect(0, 0, W, H);
    var V = mul(rot(0, view.pitch), rot(1, view.yaw));
    var turn = move ? rot(move.axis, angle) : IDENT;
    var faces = [];

    cubies.forEach(function (c) {
      var moving = move && inLayer(c, move);
      var VT = moving ? mul(V, turn) : V;
      var T = mul(VT, c.R);                      // local point -> view space (direction part)
      var pw = apply(VT, c.p);                   // cubie centre in view space

      NORMALS.forEach(function (n) {
        var nv = apply(T, n);
        var centre = [pw[0] + nv[0] * 0.5, pw[1] + nv[1] * 0.5, pw[2] + nv[2] * 0.5];
        // back-face culling: skip faces that point away from the camera
        if (dot(nv, [-centre[0], -centre[1], CAM - centre[2]]) <= 0) return;

        var a = (Math.abs(n[0]) ? 1 : 0), u = (a + 1) % 3, v = (a + 2) % 3;   // u,v: the two in-face axes
        var ua = [0, 0, 0], va = [0, 0, 0];
        if (!Math.abs(n[0]) && !Math.abs(n[1])) { ua[0] = 1; va[1] = 1; }      // front/back faces: u = x, v = y
        else if (Math.abs(n[0])) { ua[1] = 1; va[2] = 1; }                      // left/right faces
        else { ua[0] = 1; va[2] = 1; }                                           // top/bottom faces

        function pt(s, t, size) {                // a point on this face, s,t in [-size, +size]
          var l = [n[0] * 0.5 + ua[0] * s + va[0] * t, n[1] * 0.5 + ua[1] * s + va[1] * t, n[2] * 0.5 + ua[2] * s + va[2] * t];
          var w = apply(T, l);
          return project([pw[0] + w[0], pw[1] + w[1], pw[2] + w[2]]);
        }
        var light = 0.62 + 0.38 * Math.max(0, dot(norm(nv), LIGHT));
        faces.push({
          z: centre[2],
          body: [pt(-0.5, -0.5), pt(0.5, -0.5), pt(0.5, 0.5), pt(-0.5, 0.5)],
          sticker: c.stickers[n],
          pt: pt, light: light
        });
      });
    });

    faces.sort(function (a, b) { return a.z - b.z; });    // far first, near last
    faces.forEach(function (f) {
      poly(f.body, BODY, BODY);
      if (!f.sticker) return;
      var S = 0.42;                              // sticker half-size (the rest is black plastic border)
      poly([f.pt(-S, -S), f.pt(S, -S), f.pt(S, S), f.pt(-S, S)], shade(f.sticker.color, f.light), shade(f.sticker.color, f.light));
      if (f.sticker.letter) {                    // letters are drawn cell by cell so they follow the perspective
        var g = GLYPHS[f.sticker.letter], cs = (S * 2 * 0.62) / 5, o = -cs * 2.5;
        for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) {
          if (g[gy].charAt(gx) !== "1") continue;
          var x0 = o + gx * cs, y0 = o + gy * cs;
          poly([f.pt(x0, y0), f.pt(x0 + cs, y0), f.pt(x0 + cs, y0 + cs), f.pt(x0, y0 + cs)], INK, INK);
        }
      }
    });
  }

  // ---------- 4. The show ----------
  // hold (solved, facing us) -> scramble -> short pause -> solve -> back to hold
  var ANGLED = { yaw: -0.62, pitch: -0.48 };     // the 3D view used while turning
  var FRONT  = { yaw: -0.2,  pitch: -0.16 };     // nearly head-on, so the letters read clearly
  var HOLD_MS = 4200, SCRAMBLE_MS = 340, PAUSE_MS = 450, SOLVE_MS = 460, SCRAMBLE_COUNT = 8;

  var phase = "hold", phaseStart = 0, queue = [], history = [], current = null, moveStart = 0, moveMs = 0;

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }   // slow start, slow end

  function startMove(m, ms, now) { current = m; moveStart = now; moveMs = ms; }

  function frame(now) {
    if (!phaseStart) phaseStart = now;
    var target = FRONT, wobble = Math.sin(now / 1400) * 0.03;

    if (phase === "hold") {
      if (now - phaseStart > HOLD_MS) {
        buildCube();                              // fresh, exactly solved cube
        history = randomMoves(SCRAMBLE_COUNT);
        queue = history.slice();
        phase = "scramble"; phaseStart = now;
        startMove(queue.shift(), SCRAMBLE_MS, now);
      }
    } else {
      target = ANGLED;
      if (current && now - moveStart >= moveMs) {            // a move just finished
        commit(current); current = null;
        if (queue.length) {
          startMove(queue.shift(), phase === "solve" ? SOLVE_MS : SCRAMBLE_MS, now);
        } else if (phase === "scramble") {
          phase = "pause"; phaseStart = now;
        } else {                                              // solved!
          phase = "hold"; phaseStart = now;
        }
      }
      if (phase === "pause" && now - phaseStart > PAUSE_MS) {
        queue = history.slice().reverse().map(inverse);       // undo the scramble, last move first
        phase = "solve"; phaseStart = now;
        startMove(queue.shift(), SOLVE_MS, now);
      }
    }

    // glide the camera toward the wanted angle (a little each frame = smooth easing)
    view.yaw   += (target.yaw + wobble - view.yaw) * 0.06;
    view.pitch += (target.pitch + wobble * 0.5 - view.pitch) * 0.06;

    var angle = 0;
    if (current) angle = current.dir * (Math.PI / 2) * ease(Math.min(1, (now - moveStart) / moveMs));
    draw(current, angle);
  }

  // ---------- 5. Size, loop, good behaviour ----------
  function resize() {
    var w = canvas.clientWidth;
    if (!w) return;
    W = H = Math.round(w / 2);                   // 1 canvas pixel = 2 screen pixels: chunky but readable
    canvas.width = W; canvas.height = H;
    draw(current, 0);
  }

  buildCube();
  view.yaw = FRONT.yaw; view.pitch = FRONT.pitch;
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  if (reduceMotion) return;                      // visitors who prefer less motion just see the solved logo

  var visible = true, running = false;
  function loop(now) {
    if (!visible) { running = false; return; }
    frame(now);
    requestAnimationFrame(loop);
  }
  function start() { if (!running) { running = true; phaseStart = 0; requestAnimationFrame(loop); } }
  if ("IntersectionObserver" in window) {        // pause when scrolled out of view
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible) start(); }).observe(canvas);
  }
  start();
})();
