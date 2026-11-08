/*
  Fundo animado com tema de universo, desenhado num <canvas> atrás da coluna da esquerda.
  Usado só no app da TV (o Chromecast antigo não aguenta animação contínua).

  HomeDashUniverso.start(canvas, estilo)
    estilo: "estrelas" | "nebulosa" | "galaxia" | "constelacoes"

  Para não pesar na TV: no máximo 30 quadros por segundo, resolução limitada,
  sprites pré-desenhados e pausa quando a página não está visível.
*/
(function () {
  "use strict";

  var FPS = 30;
  var TAU = Math.PI * 2;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  // sprite de brilho (círculo com degradê), desenhado uma vez e reutilizado
  function glowSprite(size, rgb) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    var gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, "rgba(" + rgb + ",1)");
    gr.addColorStop(0.25, "rgba(" + rgb + ",0.55)");
    gr.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }

  var STAR_TINTS = ["255,255,255", "200,220,255", "255,236,210", "180,200,255"];

  function makeStars(n, w, h) {
    var s = [];
    for (var i = 0; i < n; i++) {
      var depth = Math.random();
      s.push({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.4 + depth * depth * 1.6,
        a: 0.25 + depth * 0.6,
        tw: rnd(0.4, 1.6), ph: Math.random() * TAU,
        d: depth,
        tint: STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0]
      });
    }
    return s;
  }

  function drawStars(g, stars, t, sprites, unit) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph));
      g.globalAlpha = a;
      var r = s.r * unit;
      if (r < 1.1) {
        g.fillStyle = "rgb(" + s.tint + ")";
        g.fillRect(s.x, s.y, r * 1.4, r * 1.4);
      } else {
        var sp = sprites[s.tint];
        var size = r * 6;
        g.drawImage(sp, s.x - size / 2, s.y - size / 2, size, size);
      }
    }
    g.globalAlpha = 1;
  }

  // ---------- 1. campo de estrelas com estrelas cadentes ----------
  function Estrelas(w, h, unit) {
    var sprites = {};
    STAR_TINTS.forEach(function (t) { sprites[t] = glowSprite(32, t); });
    var stars = makeStars(Math.round(w * h / 3500), w, h);
    var shoots = [];
    var nextShoot = rnd(4, 10);
    return function (g, t, dt) {
      g.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x -= dt * unit * (2 + s.d * 10);
        if (s.x < -4) { s.x = w + 4; s.y = Math.random() * h; }
      }
      drawStars(g, stars, t, sprites, unit);
      nextShoot -= dt;
      if (nextShoot <= 0) {
        nextShoot = rnd(7, 18);
        var ang = rnd(0.35, 0.65);
        shoots.push({ x: rnd(w * 0.2, w), y: rnd(-h * 0.05, h * 0.4), vx: -Math.cos(ang), vy: Math.sin(ang), life: 0, max: rnd(0.9, 1.5) });
      }
      g.lineCap = "round";
      for (var k = shoots.length - 1; k >= 0; k--) {
        var m = shoots[k];
        m.life += dt;
        var p = m.life / m.max;
        if (p >= 1) { shoots.splice(k, 1); continue; }
        var speed = unit * 520;
        var hx = m.x + m.vx * speed * m.life, hy = m.y + m.vy * speed * m.life;
        var len = unit * 120;
        var fade = Math.sin(p * Math.PI);
        var gr = g.createLinearGradient(hx, hy, hx - m.vx * len, hy - m.vy * len);
        gr.addColorStop(0, "rgba(255,255,255," + (0.9 * fade) + ")");
        gr.addColorStop(1, "rgba(160,190,255,0)");
        g.strokeStyle = gr;
        g.lineWidth = unit * 1.6;
        g.beginPath();
        g.moveTo(hx, hy);
        g.lineTo(hx - m.vx * len, hy - m.vy * len);
        g.stroke();
      }
    };
  }

  // ---------- 2. nebulosa colorida que respira devagar ----------
  function Nebulosa(w, h, unit) {
    var sprites = {};
    STAR_TINTS.forEach(function (t) { sprites[t] = glowSprite(32, t); });
    var stars = makeStars(Math.round(w * h / 5000), w, h);
    // nuvens: degradês grandes que se movem em órbitas lentas
    var palette = ["120,70,200", "60,110,220", "200,80,160", "40,170,190", "90,60,180"];
    var clouds = [];
    for (var i = 0; i < 7; i++) {
      clouds.push({
        cx: rnd(0.05, 0.95) * w, cy: rnd(0.05, 0.95) * h,
        rx: rnd(0.04, 0.1) * w, ry: rnd(0.04, 0.1) * h,
        r: rnd(0.35, 0.6) * Math.max(w, h),
        sp: rnd(0.015, 0.04) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * TAU,
        a: rnd(0.10, 0.2),
        spr: glowSprite(128, palette[i % palette.length])
      });
    }
    // as nuvens são desenhadas numa tela pequena e ampliadas: fica suave e barato
    var low = document.createElement("canvas");
    var LS = 0.2;
    low.width = Math.max(1, Math.round(w * LS));
    low.height = Math.max(1, Math.round(h * LS));
    var lg = low.getContext("2d");
    var acc = 1;
    return function (g, t, dt) {
      acc += dt;
      if (acc >= 0.2) { // nuvens mudam devagar: redesenha 5x por segundo
        acc = 0;
        lg.clearRect(0, 0, low.width, low.height);
        lg.globalCompositeOperation = "lighter";
        for (var i = 0; i < clouds.length; i++) {
          var c = clouds[i];
          var x = (c.cx + Math.cos(t * c.sp + c.ph) * c.rx) * LS;
          var y = (c.cy + Math.sin(t * c.sp * 1.3 + c.ph) * c.ry) * LS;
          var r = c.r * LS * (0.9 + 0.1 * Math.sin(t * 0.07 + c.ph));
          lg.globalAlpha = c.a * (0.8 + 0.2 * Math.sin(t * 0.11 + c.ph * 2));
          lg.drawImage(c.spr, x - r, y - r, r * 2, r * 2);
        }
        lg.globalAlpha = 1;
        lg.globalCompositeOperation = "source-over";
      }
      g.clearRect(0, 0, w, h);
      g.drawImage(low, 0, 0, w, h);
      for (var k = 0; k < stars.length; k++) {
        var s = stars[k];
        s.y -= dt * unit * (0.5 + s.d * 2.5);
        if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
      }
      drawStars(g, stars, t, sprites, unit);
    };
  }

  // ---------- 3. galáxia espiral girando ----------
  function Galaxia(w, h, unit) {
    var sprites = {};
    STAR_TINTS.forEach(function (t) { sprites[t] = glowSprite(32, t); });
    var stars = makeStars(Math.round(w * h / 7000), w, h);
    var cx = w * 0.52, cy = h * 0.55;
    var R = Math.min(w, h) * 0.62;
    var tilt = 0.45; // achatamento: a galáxia é vista um pouco de lado
    var rot = -0.35;
    var cosR = Math.cos(rot), sinR = Math.sin(rot);
    var core = glowSprite(256, "255,214,170");
    var halo = glowSprite(256, "120,110,220");
    var parts = [];
    var N = 1400, ARMS = 2;
    for (var i = 0; i < N; i++) {
      var d = Math.pow(Math.random(), 0.7); // mais partículas perto do centro
      var arm = (i % ARMS) * (TAU / ARMS);
      var spread = (1 - d) * 0.9 + 0.25;
      parts.push({
        d: d,
        a0: arm + d * 5.2 + rnd(-spread, spread) * 0.6,
        off: rnd(-1, 1) * 0.06 * R * (1 - d * 0.5),
        sz: rnd(0.8, 2.0) * unit,
        al: rnd(0.35, 0.95) * (1 - d * 0.4),
        // centro amarelado, braços azulados
        col: d < 0.25 ? "255,220,180" : (Math.random() < 0.15 ? "255,160,200" : "170,195,255")
      });
    }
    return function (g, t) {
      g.clearRect(0, 0, w, h);
      drawStars(g, stars, t, sprites, unit);
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.28;
      g.drawImage(halo, cx - R * 1.1, cy - R * 1.1 * tilt * 1.3, R * 2.2, R * 2.2 * tilt * 1.3);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        // as de dentro giram mais rápido que as de fora
        var a = p.a0 + t * 0.05 / (0.25 + p.d);
        var rr = p.d * R + p.off;
        var x = Math.cos(a) * rr, y = Math.sin(a) * rr * tilt;
        var X = cx + x * cosR - y * sinR, Y = cy + x * sinR + y * cosR;
        g.globalAlpha = p.al;
        g.fillStyle = "rgb(" + p.col + ")";
        g.fillRect(X, Y, p.sz, p.sz);
      }
      g.globalAlpha = 0.5 + 0.05 * Math.sin(t * 0.5);
      var cs = R * 0.55;
      g.drawImage(core, cx - cs, cy - cs * 0.7, cs * 2, cs * 1.4);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    };
  }

  // ---------- 4. constelações: pontos que se ligam quando se aproximam ----------
  function Constelacoes(w, h, unit) {
    var sprites = {};
    STAR_TINTS.forEach(function (t) { sprites[t] = glowSprite(32, t); });
    var stars = makeStars(Math.round(w * h / 6000), w, h);
    var dot = glowSprite(32, "190,210,255");
    var n = Math.round(w * h / 22000);
    var pts = [];
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * TAU, v = rnd(4, 10) * unit;
      pts.push({ x: Math.random() * w, y: Math.random() * h, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: rnd(1.2, 2.4) * unit });
    }
    var LINK = 150 * unit, LINK2 = LINK * LINK;
    return function (g, t, dt) {
      g.clearRect(0, 0, w, h);
      drawStars(g, stars, t, sprites, unit);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
      }
      g.lineWidth = unit;
      g.strokeStyle = "rgb(150,180,255)";
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d2 = dx * dx + dy * dy;
          if (d2 < LINK2) {
            g.globalAlpha = 0.35 * (1 - d2 / LINK2);
            g.beginPath();
            g.moveTo(pts[a].x, pts[a].y);
            g.lineTo(pts[b].x, pts[b].y);
            g.stroke();
          }
        }
      }
      g.globalAlpha = 0.9;
      for (var k = 0; k < pts.length; k++) {
        var q = pts[k], s = q.r * 5;
        g.drawImage(dot, q.x - s / 2, q.y - s / 2, s, s);
      }
      g.globalAlpha = 1;
    };
  }

  var STYLES = { estrelas: Estrelas, nebulosa: Nebulosa, galaxia: Galaxia, constelacoes: Constelacoes };

  function start(canvas, style) {
    var make = STYLES[style] || STYLES.estrelas;
    var g = canvas.getContext("2d");
    var draw = null, w = 0, h = 0;
    function resize() {
      // resolução limitada: em TVs 4K o WebView reporta densidade alta e pesaria muito
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      h = canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      // unidade: 1 px numa tela de 1080 linhas
      draw = make(w, h, h / 1080);
    }
    resize();
    window.addEventListener("resize", resize);
    var t0 = performance.now(), last = t0, raf = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS - 2) return;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      draw(g, (now - t0) / 1000, dt);
    }
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
  }

  window.HomeDashUniverso = { start: start, estilos: Object.keys(STYLES) };
})();
