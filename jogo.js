/* O Segredo do Farol · Gustavo Aventureiro — motor do jogo (HTML + JavaScript, offline, sem bibliotecas).
   Mundo aberto em blocos (vista oblíqua), fases com missões, forças novas (armadura de Deus, Ef 6),
   tesouros, conchas e nuvens cinzentas que a Espada da Palavra transforma em flores (sem violência).
   Controlos: setas/WASD + OK/Enter/Espaço (TV, teclado); joystick + botão da espada (toque).
   Guarda o progresso e o ranking só neste aparelho (localStorage); nada é enviado. */
(function () {
  "use strict";
  const D = window.FAROL_DADOS, ic = window.icone;
  const $ = (s) => document.querySelector(s);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ================= Preferências e armazenamento local ================= */
  const ler = (k, d) => { try { const v = localStorage.getItem("farol." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const guardar = (k, v) => { try { localStorage.setItem("farol." + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: continua */ } };
  const pref = Object.assign({ som: true, voz: true, movimento: true }, ler("pref", {}));
  let mmReduz = false;
  try { mmReduz = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (mmReduz && ler("pref", null) === null) pref.movimento = false;
  const aplicarMovimento = () => document.documentElement.classList.toggle("sem-movimento", !pref.movimento);
  aplicarMovimento();

  /* ================= Som (WebAudio sintetizado) ================= */
  let ac = null;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === "suspended") ac.resume(); return ac; }
  function nota(f, t0, dur, tipo, vol) {
    const a = audio(); if (!a || !pref.som) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = tipo || "sine"; o.frequency.value = f;
    const t = a.currentTime + (t0 || 0);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function ruido(dur, freq, vol) {
    const a = audio(); if (!a || !pref.som) return;
    const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "bandpass"; f.frequency.value = freq || 1800; g.gain.value = vol || 0.25;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  const SFX = {
    moeda: () => { nota(988, 0, .08, "square", .08); nota(1319, .07, .18, "square", .08); },
    concha: () => { nota(1568, 0, .1, "triangle", .12); nota(2093, .06, .15, "triangle", .1); },
    espada: () => ruido(.18, 2600, .22),
    salto: () => { nota(392, 0, .12, "square", .06); nota(587, .06, .12, "square", .06); },
    brilho: () => { [1047, 1319, 1568, 2093].forEach((f, i) => nota(f, i * .06, .2, "triangle", .1)); },
    certo: () => { [523, 659, 784, 1047].forEach((f, i) => nota(f, i * .09, .25, "triangle", .14)); },
    erro: () => { nota(330, 0, .15, "sine", .12); nota(262, .14, .22, "sine", .12); },
    bau: () => { ruido(.12, 400, .3); [784, 988, 1175, 1568].forEach((f, i) => nota(f, .1 + i * .07, .2, "square", .06)); },
    forca: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i * .1, .35, "triangle", .14)); },
    silva: () => ruido(.15, 900, .25),
    empurra: () => nota(196, 0, .18, "sine", .14),
    escudo: () => { nota(880, 0, .12, "sine", .12); nota(1760, .02, .2, "sine", .06); },
    lampada: (i) => nota(523 * Math.pow(1.19, i), 0, .3, "triangle", .14)
  };

  /* ================= Voz (síntese do próprio aparelho, offline) ================= */
  let vozes = [];
  function carregarVozes() { try { vozes = speechSynthesis.getVoices(); } catch (e) { vozes = []; } }
  if ("speechSynthesis" in window) { carregarVozes(); try { speechSynthesis.onvoiceschanged = carregarVozes; } catch (e) {} }
  function escolherVoz() {
    return vozes.find((v) => /pt[-_]PT/i.test(v.lang)) || vozes.find((v) => /^pt/i.test(v.lang)) || null;
  }
  function falar(txt, depois) {
    if (!pref.voz || !("speechSynthesis" in window)) { if (depois) setTimeout(depois, 300); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt.replace(/[‘’“”"]/g, ""));
      const v = escolherVoz(); if (v) u.voice = v; u.lang = v ? v.lang : "pt-PT"; u.rate = 0.95; u.pitch = 1.1;
      if (depois) u.onend = depois;
      speechSynthesis.speak(u);
    } catch (e) { if (depois) depois(); }
  }
  const calar = () => { try { speechSynthesis.cancel(); } catch (e) {} };

  let balaoT = 0;
  function dizer(txt, comVoz) {
    const b = $("#balao"); b.textContent = txt; b.classList.add("ver");
    clearTimeout(balaoT); balaoT = setTimeout(() => b.classList.remove("ver"), Math.max(2600, txt.length * 70));
    if (comVoz !== false) falar(txt);
  }

  /* ================= Mundo ================= */
  const W = 64, H = 40;
  const G = 0, P = 1, S = 2, M = 3, R = 4, A = 5, F = 6, X = 7, C = 8, L = 9, Hh = 10;
  const ALT = [0.5, 0.42, 0.3, 0, 1.3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.95];
  const ANDAVEL = [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1];
  let mapa = new Uint8Array(W * H);
  const ix = (x, y) => y * W + x;
  const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? R : mapa[ix(x, y)];
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

  const TRILHO = [[5, 33], [10, 31], [14, 29], [19, 27], [22, 29], [25, 32], [28, 31], [31, 28], [34, 25], [37, 24], [40, 22], [43, 19.5], [45.5, 17], [47, 14], [49, 12], [52, 10], [54, 10.5], [57.5, 10.2]];
  const FASE_POS = [[10, 31], [19, 27], [25, 32], [34, 25], [43, 19.5], [49, 12], [53.6, 10.4], [57.5, 10.2]];
  const LAMP_POS = [[38.5, 22.6], [40.5, 20.8], [42, 18.4], [45.2, 18.2], [46.6, 15.6]];
  const BAUS = [[2, 25], [12, 24], [14, 32], [22, 22], [27, 24], [36, 31], [40, 30], [50, 26], [35, 5], [45, 9], [56, 11], [8, 5]];
  const CERCADOS = [3, 6]; // baús rodeados de silvas (precisam da espada)

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = l ? cl(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  const distTrilho = (x, y) => { let d = 99; for (let i = 0; i < TRILHO.length - 1; i++) d = Math.min(d, distSeg(x, y, TRILHO[i][0], TRILHO[i][1], TRILHO[i + 1][0], TRILHO[i + 1][1])); return d; };
  const eMar = (x, y) => {
    if (y >= 35 + Math.floor(1.3 * Math.sin(x * 0.35))) return true;
    const borda = y < 13 ? 61 : (y > 30 ? 57 : 58);
    return x >= borda + Math.floor(Math.sin(y * 0.6));
  };
  const zonaEscura = (x, y) => x >= 36 && y >= 15 && y <= 33;

  function gerarMundo() {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const r = hash(x, y), dT = distTrilho(x + .5, y + .5);
      let t = G;
      if (eMar(x, y)) t = M;
      else if (dT <= 1.15) t = P;
      else if (x <= 1 || y <= 1) t = A;
      else if (x >= 39 && y <= 13) t = (r < .04 ? R : (r < .14 ? F : Hh));
      else if (x >= 37 && y >= 15 && y <= 33) t = (dT < 2.3 ? G : (r < .5 ? A : (r < .6 ? F : G)));
      else t = r < .05 ? A : r < .08 ? R : r < .16 ? F : G;
      mapa[ix(x, y)] = t;
    }
    // areia junto ao mar
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = mapa[ix(x, y)]; if (t === M || t === P) continue;
      let perto = false; for (let dy = -2; dy <= 2 && !perto; dy++) for (let dx = -2; dx <= 2; dx++) if (tile(x + dx, y + dy) === M && Math.abs(dx) + Math.abs(dy) <= 3) { perto = true; break; }
      if (perto && (t === G || t === F || t === A)) mapa[ix(x, y)] = S;
    }
    // Cordilheira A (x=30..31) e cordilheira B (y=14, x>=38) e muro do planalto (x=38, y<=14), com silvas no trilho
    const muro = (x, y) => { if (tile(x, y) === M) return; mapa[ix(x, y)] = distTrilho(x + .5, y + .5) <= 1.3 ? X : R; };
    for (let y = 0; y < H; y++) { muro(30, y); muro(31, y); }
    for (let x = 38; x < W; x++) { muro(x, 14); }
    for (let y = 0; y <= 14; y++) { muro(38, y); }
    // casa da família
    for (let y = 29; y <= 30; y++) for (let x = 1; x <= 3; x++) mapa[ix(x, y)] = C;
    // farol
    for (let y = 7; y <= 8; y++) for (let x = 57; x <= 58; x++) mapa[ix(x, y)] = L;
    // clareiras das paragens e lâmpadas
    FASE_POS.forEach(([fx, fy]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = Math.floor(fx) + dx, y = Math.floor(fy) + dy, t = tile(x, y); if (t === A || t === R) mapa[ix(x, y)] = zonaEscura(x, y) ? G : (x >= 39 && y <= 13 ? Hh : G); } });
    // baús
    BAUS.forEach(([bx, by], i) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = bx + dx, y = by + dy, t = tile(x, y); if (t === M || t === L || t === C) continue;
        if (CERCADOS.includes(i) && (dx || dy)) mapa[ix(x, y)] = X;
        else if (t === A || t === R || t === X) mapa[ix(x, y)] = (x >= 39 && y <= 13) ? Hh : G;
      }
    });
    estado.cortadas.forEach((k) => { if (mapa[k] === X) mapa[k] = P; });
  }

  /* ================= Estado do jogo ================= */
  const NOVO = () => ({ fase: 0, pontos: 0, porFase: {}, forcas: [], baus: [], conchas: [], cortadas: [], nuvens: 0, px: 6, py: 33, terminado: false });
  let estado = Object.assign(NOVO(), ler("estado", {}));
  let conchas = [];
  function gerarConchas() {
    conchas = []; let n = 0;
    for (let y = 2; y < H && n < 24; y++) for (let x = 2; x < W && n < 24; x++) {
      if (mapa[ix(x, y)] === S && hash(x * 3, y * 7) < 0.09) conchas.push({ id: n++, x: x + .5, y: y + .5 });
    }
  }
  const tem = (f) => estado.forcas.includes(f);
  const salvar = () => guardar("estado", estado);

  /* ================= Canvas, câmara e entidades ================= */
  const cv = $("#mundo"), cx = cv.getContext("2d");
  const escuro = document.createElement("canvas"), ex = escuro.getContext("2d");
  let VW = 0, VH = 0, T = 64, K = 18, DPR = 1;
  function redimensionar() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    VW = window.innerWidth; VH = window.innerHeight;
    cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    escuro.width = cv.width; escuro.height = cv.height;
    const deitado = VW >= VH;
    T = Math.round(cl(deitado ? Math.min(VW / 15, VH / 8.5) : Math.min(VW / 8.5, VH / 14), 36, 150));
    K = T * 0.3;
  }
  window.addEventListener("resize", redimensionar);

  const jog = { x: 6, y: 33, vx: 0, vy: 0, dir: "baixo", passo: 0, golpe: 0, salto: 0, empurrao: 0, escudoFlash: 0 };
  const rasto = [];
  const familia = [
    { nome: "Théo", rosto: "theo", caracois: true, cabelo: "#e8c25a", camisa: "#d8483b", calca: "#2f5aa0", esc: .78, logo: "caranguejo", x: 5, y: 33 },
    { nome: "Cristiane", rosto: "cristiane", cabelo: "#8a5a2b", camisa: "#f6f1e6", calca: "#7aa0cf", esc: 1.05, chapeu: true, x: 4, y: 33 },
    { nome: "Alexandre", rosto: "alexandre", cabelo: "#5a3418", camisa: "#5f8a3e", calca: "#b7a27a", esc: 1.12, barba: true, x: 3, y: 33 }
  ];
  const GUST = { nome: "Gustavo", rosto: "gustavo", caracois: true, cabelo: "#5a3418", camisa: "#2f6fd6", calca: "#a89870", esc: .82, logo: "barco" };
  let nuvens = [], particulas = [], gaivotas = [];
  let cam = { x: 6, y: 30 }, tempo = 0, escuroA = 0, farolAceso = false, festa = 0;
  let cena = false; // true enquanto há um ecrã aberto (o mundo pára)

  function criarNuvens() {
    nuvens = [];
    if (!tem("espada")) return;
    const sitios = [[35, 20], [39, 27], [44, 25], [48, 21], [50, 29], [41, 16.5], [52, 18], [34, 10], [45, 6], [53, 12]];
    sitios.forEach(([x, y]) => { if (ANDAVEL[tile(Math.floor(x), Math.floor(y))]) nuvens.push({ x, y, ox: x, oy: y, f: Math.random() * 6, renasce: 0 }); });
  }
  for (let i = 0; i < 5; i++) gaivotas.push({ x: Math.random() * W, y: 30 + Math.random() * 10, v: .8 + Math.random() * .8, f: Math.random() * 6 });

  /* ================= Entrada: teclado, comando de TV, toque ================= */
  const teclas = new Set();
  const joy = { ativo: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  const DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
  const VOLTAR = ["Escape", "Backspace", "GoBack", "BrowserBack", "p", "P"];
  document.addEventListener("keydown", (e) => {
    audio();
    const k = e.key, dir = DIRS[k] || ({ 37: "left", 38: "up", 39: "right", 40: "down" })[e.keyCode];
    const voltar = VOLTAR.includes(k) || e.keyCode === 10009 || e.keyCode === 461;
    const ecr = ecraAtivo();
    if (ecr) {
      if (dir) { e.preventDefault(); navEspacial(dir); }
      else if (voltar && ecr.id === "ecra-pausa") { e.preventDefault(); fecharPausa(); }
      else if ((k === " " ) && document.activeElement && document.activeElement.tagName === "BUTTON") { /* nativo */ }
      return;
    }
    if (dir) { e.preventDefault(); teclas.add(dir); }
    else if (k === "Enter" || k === " " || k === "z" || k === "x" || k === "j" || e.keyCode === 13) { e.preventDefault(); if (!e.repeat) acao(); }
    else if (voltar) { e.preventDefault(); abrirPausa(); }
  });
  document.addEventListener("keyup", (e) => { const dir = DIRS[e.key] || ({ 37: "left", 38: "up", 39: "right", 40: "down" })[e.keyCode]; if (dir) teclas.delete(dir); });
  window.addEventListener("blur", () => teclas.clear());

  const usaToque = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  const joyEl = $("#joy"), pino = $("#joy-pino");
  cv.addEventListener("pointerdown", (e) => {
    audio();
    if (cena || e.pointerType === "mouse" && !usaToque) return;
    joy.ativo = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
    joyEl.style.left = e.clientX + "px"; joyEl.style.top = e.clientY + "px"; joyEl.classList.add("ativo");
    $("#dica-joy").style.display = "none";
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  cv.addEventListener("pointermove", (e) => {
    if (!joy.ativo || e.pointerId !== joy.id) return;
    const r = joyEl.offsetWidth / 2 || 60; let dx = (e.clientX - joy.ox) / r, dy = (e.clientY - joy.oy) / r;
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    joy.dx = dx; joy.dy = dy; pino.style.transform = `translate(${dx * r * .6}px,${dy * r * .6}px)`;
  });
  const soltar = (e) => { if (e.pointerId !== joy.id) return; joy.ativo = false; joy.dx = joy.dy = 0; joyEl.classList.remove("ativo"); pino.style.transform = ""; };
  cv.addEventListener("pointerup", soltar); cv.addEventListener("pointercancel", soltar);
  // computador: clicar no mundo também usa a espada
  cv.addEventListener("click", (e) => { if (!usaToque && !cena) acao(); });
  $("#b-espada").innerHTML = ic("espada");
  $("#b-espada").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); audio(); if (!cena) acao(); });

  /* ================= Ações do Gustavo ================= */
  let avisoT = 0;
  function acao() {
    if (tem("espada")) {
      if (jog.golpe > 0) return;
      jog.golpe = 0.32; SFX.espada(); golpear();
    } else if (jog.salto <= 0) { jog.salto = 0.45; SFX.salto(); }
  }
  const DIRV = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
  function golpear() {
    const [dx, dy] = DIRV[jog.dir], alc = tem("luz") ? 1.9 : 1.35;
    const cxg = jog.x + dx * .8, cyg = jog.y + dy * .8;
    // silvas
    let cortou = 0;
    for (let y = Math.floor(cyg - alc); y <= Math.floor(cyg + alc); y++) for (let x = Math.floor(cxg - alc); x <= Math.floor(cxg + alc); x++) {
      if (tile(x, y) !== X) continue;
      if (Math.hypot(x + .5 - cxg, y + .5 - cyg) > alc) continue;
      mapa[ix(x, y)] = P; estado.cortadas.push(ix(x, y)); cortou++; if (r3) r3.tileMudou(x, y);
      for (let i = 0; i < (pref.movimento ? 8 : 3); i++) particulas.push({ x: x + .5, y: y + .5, z: .4, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, vz: 2 + Math.random() * 2, vida: .8, cor: i % 2 ? "#3f8f3a" : "#7cc45a", tipo: "folha" });
    }
    if (cortou) { SFX.silva(); desenharMinimapaBase(); salvar(); }
    // nuvens cinzentas → flores
    nuvens.forEach((n) => {
      if (n.renasce > 0) return;
      if (Math.hypot(n.x - cxg, n.y - cyg) < alc + .3) {
        n.renasce = 25; estado.nuvens++; SFX.brilho();
        const qt = pref.movimento ? 18 : 6;
        for (let i = 0; i < qt; i++) { const a = i / qt * Math.PI * 2; particulas.push({ x: n.x, y: n.y, z: .8, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, vz: 1 + Math.random() * 2, vida: 1.2, cor: ["#ff8fb1", "#ffd54a", "#fff", "#b48cff"][i % 4], tipo: i % 3 ? "brilho" : "flor" }); }
        const fx = Math.floor(n.x), fy = Math.floor(n.y); if (tile(fx, fy) === G) { mapa[ix(fx, fy)] = F; if (r3) r3.tileMudou(fx, fy); }
        if (estado.nuvens === 1) dizer("Boa! A luz da Palavra transformou a nuvem cinzenta em flores!");
      }
    });
  }

  /* ================= Atualização ================= */
  function andavel(x, y) { const t = tile(Math.floor(x), Math.floor(y)); return !!ANDAVEL[t]; }
  function livre(x, y, r) { return andavel(x - r, y - r) && andavel(x + r, y - r) && andavel(x - r, y + r) && andavel(x + r, y + r); }

  function atualizar(dt) {
    tempo += dt;
    if (!cena) {
      let mx = 0, my = 0;
      if (teclas.has("left")) mx -= 1; if (teclas.has("right")) mx += 1; if (teclas.has("up")) my -= 1; if (teclas.has("down")) my += 1;
      if (joy.ativo && Math.hypot(joy.dx, joy.dy) > .2) { mx = joy.dx; my = joy.dy; }
      const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      const vel = tem("botas") ? 4.4 : 3.3;
      let vx = mx * vel, vy = my * vel;
      if (jog.empurrao > 0) { vx = jog.vx; vy = jog.vy; jog.empurrao -= dt; }
      const r = .28;
      const nx = jog.x + vx * dt, ny = jog.y + vy * dt;
      if (livre(nx, jog.y, r)) jog.x = nx; if (livre(jog.x, ny, r)) jog.y = ny;
      if (m > .1) {
        jog.passo += dt * vel * 2.2;
        jog.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? "esq" : "dir") : (my < 0 ? "cima" : "baixo");
        const u = rasto[0]; if (!u || Math.hypot(u.x - jog.x, u.y - jog.y) > .12) { rasto.unshift({ x: jog.x, y: jog.y }); if (rasto.length > 60) rasto.pop(); }
      } else jog.passo = 0;
      if (jog.golpe > 0) jog.golpe -= dt; if (jog.salto > 0) jog.salto -= dt; if (jog.escudoFlash > 0) jog.escudoFlash -= dt;

      // família segue o rasto
      familia.forEach((f, i) => { const alvo = rasto[Math.min(rasto.length - 1, (i + 1) * 7)]; if (alvo) { const d = Math.hypot(alvo.x - f.x, alvo.y - f.y); f.anda = d > .05; f.x = lerp(f.x, alvo.x, cl(dt * 6, 0, 1)); f.y = lerp(f.y, alvo.y, cl(dt * 6, 0, 1)); f.dir = jog.dir; f.passo = f.anda ? jog.passo + i : 0; } });

      verificarEncontros();
    }
    // nuvens
    nuvens.forEach((n) => {
      if (n.renasce > 0) { n.renasce -= dt; if (n.renasce <= 0) { n.x = n.ox; n.y = n.oy; } return; }
      n.f += dt;
      const d = Math.hypot(jog.x - n.x, jog.y - n.y);
      let tx = n.ox + Math.sin(n.f * .5) * 1.5, ty = n.oy + Math.cos(n.f * .4) * 1.2;
      if (d < 4 && !cena) { tx = jog.x; ty = jog.y; }
      const sp = d < 4 ? .9 : .6;
      const ddx = tx - n.x, ddy = ty - n.y, dd = Math.hypot(ddx, ddy) || 1;
      n.x += ddx / dd * sp * dt; n.y += ddy / dd * sp * dt;
      if (d < .75 && !cena && jog.empurrao <= 0) {
        if (tem("escudo")) { jog.escudoFlash = .5; SFX.escudo(); n.x -= (jog.x - n.x) / d * 1.5; n.y -= (jog.y - n.y) / d * 1.5; }
        else { jog.vx = (jog.x - n.x) / d * 5; jog.vy = (jog.y - n.y) / d * 5; jog.empurrao = .25; SFX.empurra(); }
      }
    });
    // partículas
    particulas = particulas.filter((p) => { p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 6 * dt; if (p.z < 0) { p.z = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } return p.vida > 0; });
    gaivotas.forEach((g) => { g.x += g.v * dt; g.f += dt * 6; if (g.x > W + 4) { g.x = -4; g.y = 28 + Math.random() * 12; } });
    // câmara
    const k = cl(dt * 4, 0, 1);
    cam.x = lerp(cam.x, focoCam ? focoCam.x : jog.x, k); cam.y = lerp(cam.y, focoCam ? focoCam.y : jog.y - .5, k);
    const mxv = VW / T / 2, myv = VH / T / 2;
    cam.x = cl(cam.x, mxv, W - mxv); cam.y = cl(cam.y, myv - 2.5, H - myv);
    // escuridão da floresta
    const alvoEsc = zonaEscura(jog.x, jog.y) && estado.fase < 8 ? (estado.fase >= 5 ? .45 : .8) : 0;
    escuroA = lerp(escuroA, alvoEsc, cl(dt * 2, 0, 1));
    if (festa > 0) { festa -= dt; if (Math.random() < (pref.movimento ? .5 : .1)) fogo(); }
  }
  let focoCam = null;

  let ultimoAviso = "";
  function avisar(id, txt) { if (ultimoAviso === id && performance.now() - avisoT < 6000) return; ultimoAviso = id; avisoT = performance.now(); dizer(txt); }

  function verificarEncontros() {
    // conchas
    conchas.forEach((c) => { if (estado.conchas.includes(c.id)) return; if (Math.hypot(c.x - jog.x, c.y - jog.y) < .6) { estado.conchas.push(c.id); SFX.concha(); pulo("#h-conchas"); faisca(c.x, c.y, "#ffd9b8"); atualizarHud(); salvar(); } });
    // baús
    BAUS.forEach(([bx, by], i) => {
      if (estado.baus.includes(i)) return;
      if (Math.hypot(bx + .5 - jog.x, by + .5 - jog.y) < .85) {
        estado.baus.push(i); SFX.bau(); pulo("#h-tesouros");
        for (let k = 0; k < (pref.movimento ? 16 : 5); k++) particulas.push({ x: bx + .5, y: by + .5, z: .5, vx: (Math.random() - .5) * 2.4, vy: (Math.random() - .5) * 2.4, vz: 3 + Math.random() * 2.5, vida: 1.4, cor: ["#4fc3f7", "#ffd54a", "#ff8fb1", "#7ee081"][k % 4], tipo: "gema" });
        const n = estado.baus.length;
        dizer(n === BAUS.length ? "Encontraste todos os tesouros! Que aventureiro!" : `Um tesouro! Já tens ${n} de ${BAUS.length}.`);
        atualizarHud(); salvar();
      }
    });
    // silvas sem espada
    if (!tem("espada")) {
      const [dx, dy] = DIRV[jog.dir];
      if (tile(Math.floor(jog.x + dx * .6), Math.floor(jog.y + dy * .6)) === X) avisar("silva", "Estas silvas fecham o caminho. Vais precisar de uma força nova!");
    }
    // paragens
    FASE_POS.forEach(([fx, fy], i) => {
      const d = Math.hypot(fx - jog.x, fy + .4 - jog.y);
      if (d > .95) return;
      if (i === estado.fase) correrFase(i);
      else if (i > estado.fase) { avisar("lock" + i, "Ainda não! Primeiro vai à placa que brilha. Segue a seta amarela."); }
      else if (i < estado.fase && !revisitada[i]) { revisitada[i] = true; reverPaginas(i); }
    });
    FASE_POS.forEach(([fx, fy], i) => { if (Math.hypot(fx - jog.x, fy + .4 - jog.y) > 1.8) revisitada[i] = false; });
  }
  const revisitada = {};

  function faisca(x, y, cor) { for (let k = 0; k < (pref.movimento ? 8 : 3); k++) particulas.push({ x, y, z: .3, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, vz: 2 + Math.random() * 2, vida: .7, cor, tipo: "brilho" }); }
  function fogo() {
    const x = 51 + Math.random() * 12, y = 2 + Math.random() * 6, cor = ["#ffd54a", "#ff8fb1", "#4fc3f7", "#7ee081", "#fff"][Math.floor(Math.random() * 5)];
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; particulas.push({ x, y, z: 4, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, vz: 1, vida: 1.1, cor, tipo: "brilho" }); }
  }

  /* ================= Desenho ================= */
  const COR = {
    [G]: ["#7cc45a", "#4f9a3c"], [P]: ["#d9a866", "#a97a45"], [S]: ["#f3dfa2", "#d6bd78"], [M]: ["#2f8fd6", "#1f6aa8"],
    [R]: ["#a3abb5", "#6f7880"], [A]: ["#6fb84f", "#478a36"], [F]: ["#7cc45a", "#4f9a3c"], [X]: ["#6fb84f", "#478a36"],
    [C]: ["#7cc45a", "#4f9a3c"], [L]: ["#9bd17a", "#5f9a46"], [Hh]: ["#8ccf62", "#5a9f43"]
  };
  const sx = (x) => (x - cam.x) * T + VW / 2;
  const sy = (y) => (y - cam.y) * T + VH / 2;

  function rect(x, y, w, h, c) { cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); }

  function desenharTile(x, y) {
    const t = tile(x, y), h = ALT[t] * K, X0 = sx(x), Y0 = sy(y);
    const [cTop, cLado] = COR[t];
    if (t === M) {
      const o = Math.sin(tempo * 1.6 + x * .7 + y * .5);
      rect(X0, Y0, T + 1, T + 1, o > .6 ? "#3a9be0" : cTop);
      if (pref.movimento || true) rect(X0 + T * .15, Y0 + T * (.45 + o * .12), T * .4, T * .06, "#ffffff55");
      if (tile(x, y - 1) === S || tile(x, y - 1) === Hh || tile(x, y - 1) === G) rect(X0, Y0 + T * .05 + Math.sin(tempo * 2 + x) * T * .04, T + 1, T * .1, "#ffffffaa");
      return;
    }
    // face da frente (se o vizinho de baixo for mais baixo)
    const hb = ALT[tile(x, y + 1)] * K;
    if (h > hb) rect(X0, Y0 + T - h, T + 1, h - hb + 1, cLado);
    rect(X0, Y0 - h, T + 1, T + 1, cTop);
    // textura de blocos
    const r = hash(x, y);
    if (t === G || t === Hh || t === A || t === F || t === X || t === C || t === L) {
      rect(X0 + T * (.15 + r * .5), Y0 - h + T * (.2 + (r * 7 % 1) * .5), T * .1, T * .1, "#00000014");
      rect(X0 + T * (.6 - r * .3), Y0 - h + T * (.6 - (r * 13 % 1) * .3), T * .08, T * .08, "#ffffff22");
    } else if (t === P || t === S) {
      rect(X0 + T * (.2 + r * .5), Y0 - h + T * (.3 + (r * 5 % 1) * .4), T * .07, T * .07, "#0000001c");
    } else if (t === R) {
      rect(X0 + 2, Y0 - h + 2, T - 3, T * .12, "#ffffff33");
    }
    rect(X0, Y0 - h, T + 1, Math.max(1, T * .04), "#ffffff26");
  }

  function desenharArvore(x, y) {
    const X0 = sx(x), Y0 = sy(y) - ALT[A] * K, r = hash(x, y), esc = zonaEscura(x, y);
    rect(X0 + T * .4, Y0 + T * .1, T * .2, T * .5, "#7a4d22");
    const cor1 = esc ? "#2f7a3e" : (r < .5 ? "#3fa34d" : "#4cae52"), cor2 = esc ? "#246330" : "#2f8a3e";
    rect(X0 + T * .1, Y0 - T * .55, T * .8, T * .7, cor1);
    rect(X0 + T * .1, Y0 + T * .05, T * .8, T * .12, cor2);
    rect(X0 + T * .25, Y0 - T * .95, T * .5, T * .45, cor1);
    rect(X0 + T * .25, Y0 - T * .95, T * .5, T * .08, "#ffffff22");
    rect(X0 + T * .1, Y0 - T * .55, T * .8, T * .06, "#ffffff22");
  }
  function desenharFlor(x, y) {
    const X0 = sx(x), Y0 = sy(y) - ALT[F] * K, r = hash(x, y);
    const cores = ["#ffd54a", "#ffd54a", "#fff", "#ff8fb1"];
    for (let i = 0; i < 3; i++) { const fx = X0 + T * (.2 + ((r * (i + 3) * 7) % 1) * .6), fy = Y0 + T * (.25 + ((r * (i + 5) * 11) % 1) * .55); rect(fx, fy, T * .1, T * .1, cores[(i + Math.floor(r * 4)) % 4]); rect(fx + T * .03, fy + T * .1, T * .04, T * .08, "#3f8f3a"); }
  }
  function desenharSilva(x, y) {
    const X0 = sx(x), Y0 = sy(y) - ALT[X] * K;
    rect(X0 + T * .05, Y0 - T * .35, T * .9, T * .9, "#2f6b2c");
    rect(X0 + T * .15, Y0 - T * .5, T * .7, T * .3, "#3d7f37");
    for (let i = 0; i < 6; i++) { const a = hash(x + i, y) ; rect(X0 + T * (.1 + a * .75), Y0 + T * (-.4 + ((a * 9) % 1) * .8), T * .07, T * .07, i % 2 ? "#c43a52" : "#e9e3c9"); }
  }
  function desenharRocha(x, y) { /* a rocha é o próprio bloco alto */ }
  function desenharCasa(x, y) {
    const X0 = sx(x), Y0 = sy(y + 1) - ALT[C] * K;
    rect(X0 + T * .1, Y0 - T * 1.7, T * 2.8, T * 1.7, "#f6efe0");
    rect(X0 + T * .1, Y0 - T * .1, T * 2.8, T * .1, "#d9ccb0");
    cx.fillStyle = "#d8483b"; cx.beginPath(); cx.moveTo(X0 - T * .1, Y0 - T * 1.6); cx.lineTo(X0 + T * 1.5, Y0 - T * 2.6); cx.lineTo(X0 + T * 3.1, Y0 - T * 1.6); cx.closePath(); cx.fill();
    rect(X0 + T * 1.25, Y0 - T * 1, T * .5, T * 1, "#8a5a2b");
    rect(X0 + T * .4, Y0 - T * 1.3, T * .55, T * .45, "#7fc8f8"); rect(X0 + T * 2.05, Y0 - T * 1.3, T * .55, T * .45, "#7fc8f8");
  }
  function desenharFarol(x, y) {
    const X0 = sx(x), Y0 = sy(y + 1) - ALT[L] * K, w = T * 1.4, l = X0 + T * .3;
    for (let i = 0; i < 5; i++) rect(l, Y0 - T * (i + 1) * .9, w, T * .9, i % 2 ? "#d8483b" : "#fbfbf6");
    rect(l - T * .15, Y0 - T * 4.65, w + T * .3, T * .2, "#123a5a");
    const luz = farolAceso ? "#fff6a8" : "#c9d6e0";
    rect(l + T * .1, Y0 - T * 5.35, w - T * .2, T * .7, luz);
    rect(l + T * .1, Y0 - T * 5.35, T * .08, T * .7, "#123a5a"); rect(l + w - T * .18, Y0 - T * 5.35, T * .08, T * .7, "#123a5a");
    cx.fillStyle = "#d8483b"; cx.beginPath(); cx.moveTo(l - T * .1, Y0 - T * 5.35); cx.lineTo(l + w / 2, Y0 - T * 6); cx.lineTo(l + w + T * .1, Y0 - T * 5.35); cx.closePath(); cx.fill();
    rect(l + w * .4, Y0 - T * .8, w * .25, T * .8, "#8a5a2b");
    if (farolAceso) {
      const ox = l + w / 2, oy = Y0 - T * 5;
      const g = cx.createRadialGradient(ox, oy, 0, ox, oy, T * 2.2); g.addColorStop(0, "#fff8c0ee"); g.addColorStop(1, "#fff8c000");
      cx.fillStyle = g; cx.beginPath(); cx.arc(ox, oy, T * 2.2, 0, Math.PI * 2); cx.fill();
      const ang = pref.movimento ? tempo * 1.2 : 2.6;
      cx.save(); cx.globalCompositeOperation = "lighter"; cx.translate(ox, oy); cx.rotate(ang);
      const gb = cx.createLinearGradient(0, 0, T * 14, 0); gb.addColorStop(0, "#fff6b0aa"); gb.addColorStop(1, "#fff6b000");
      cx.fillStyle = gb; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(T * 14, -T * 1.6); cx.lineTo(T * 14, T * 1.6); cx.closePath(); cx.fill();
      cx.restore();
    }
  }
  function desenharLampada(i) {
    const [x, y] = LAMP_POS[i], X0 = sx(x), Y0 = sy(y) - ALT[G] * K, acesa = estado.fase >= 5;
    rect(X0 - T * .04, Y0 - T * 1.2, T * .08, T * 1.2, "#3a3f4a");
    rect(X0 - T * .14, Y0 - T * 1.42, T * .28, T * .26, acesa ? "#fff1a8" : "#5a6070");
    rect(X0 - T * .18, Y0 - T * 1.48, T * .36, T * .07, "#3a3f4a");
  }
  function desenharBau(i) {
    const [bx, by] = BAUS[i], X0 = sx(bx + .5), Y0 = sy(by + .5) - ALT[tile(bx, by)] * K + T * .2, aberto = estado.baus.includes(i);
    const w = T * .7, h = T * .42;
    rect(X0 - w / 2, Y0 - h, w, h, "#9a5b26"); rect(X0 - w / 2, Y0 - h * .55, w, h * .14, "#f2b544");
    if (aberto) { rect(X0 - w / 2, Y0 - h * 1.9, w, h * .5, "#7a441a"); rect(X0 - w / 2 + 3, Y0 - h - 3, w - 6, 5, "#ffd54a"); }
    else {
      rect(X0 - w / 2, Y0 - h * 1.35, w, h * .4, "#b06a2e"); rect(X0 - T * .06, Y0 - h * 1.05, T * .12, T * .14, "#ffd54a");
      if (pref.movimento) { const b = (Math.sin(tempo * 4 + i) + 1) / 2; rect(X0 + w * .3, Y0 - h * 1.6 - b * 6, T * .08, T * .08, "#fff"); }
    }
  }
  function desenharConcha(c) {
    const X0 = sx(c.x), Y0 = sy(c.y) - ALT[S] * K, b = pref.movimento ? Math.sin(tempo * 3 + c.id) * T * .04 : 0;
    cx.fillStyle = "#f7b98b"; cx.beginPath(); cx.moveTo(X0, Y0 + b); cx.lineTo(X0 - T * .18, Y0 - T * .16 + b); cx.quadraticCurveTo(X0, Y0 - T * .38 + b, X0 + T * .18, Y0 - T * .16 + b); cx.closePath(); cx.fill();
    rect(X0 - T * .01, Y0 - T * .3 + b, T * .03, T * .28, "#d67e46");
  }
  function desenharParagem(i) {
    const [fx, fy] = FASE_POS[i]; if (i === 7) return; // a 8.ª é o farol
    const X0 = sx(fx), Y0 = sy(fy) - ALT[tile(Math.floor(fx), Math.floor(fy))] * K;
    const cores = ["#f4b942", "#f4b942", "#176b87", "#176b87", "#f27c38", "#1ea6a8", "#1ea6a8", "#7d63a8"];
    const proxima = i === estado.fase, feita = i < estado.fase;
    if (proxima) {
      const p = pref.movimento ? (Math.sin(tempo * 4) + 1) / 2 : .5;
      cx.strokeStyle = `rgba(255,213,74,${.5 + p * .5})`; cx.lineWidth = T * .08;
      cx.beginPath(); cx.ellipse(X0, Y0, T * (.55 + p * .15), T * (.28 + p * .08), 0, 0, Math.PI * 2); cx.stroke();
    }
    rect(X0 - T * .05, Y0 - T * 1.1, T * .1, T * 1.1, "#7a4d22");
    rect(X0 - T * .42, Y0 - T * 1.45, T * .84, T * .55, "#c98d4f"); rect(X0 - T * .42, Y0 - T * 1.45, T * .84, T * .06, "#e2b27a");
    cx.fillStyle = feita ? "#2f9e5b" : cores[i]; cx.beginPath(); cx.arc(X0, Y0 - T * 1.17, T * .2, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#fff"; cx.font = `900 ${Math.round(T * .26)}px Trebuchet MS, sans-serif`; cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(feita ? "✓" : String(i + 1), X0, Y0 - T * 1.15);
    if (!proxima && !feita) { rect(X0 + T * .2, Y0 - T * 1.05, T * .2, T * .16, "#6f7880"); }
  }

  const PELE = "#f2c6a0";
  const imgRosto = {};
  Object.keys(window.ROSTOS || {}).forEach((k) => { const i = new Image(); i.src = window.ROSTOS[k]; imgRosto[k] = i; });
  function desenharPessoa(p, x, y, dir, passo, gear, saltoZ) {
    const u = T / 18 * p.esc, X0 = sx(x), base = sy(y) - ALT[tile(Math.floor(x), Math.floor(y))] * K - (saltoZ || 0);
    // sombra
    cx.fillStyle = "#00000030"; cx.beginPath(); cx.ellipse(X0, sy(y) - ALT[tile(Math.floor(x), Math.floor(y))] * K, u * 5, u * 1.8, 0, 0, Math.PI * 2); cx.fill();
    const lado = dir === "esq" ? -1 : dir === "dir" ? 1 : 0, costas = dir === "cima";
    const pa = Math.sin(passo * 3) * u * 1.6;
    // pernas
    const sap = gear && gear.botas ? "#7a4a24" : "#2b3a55";
    rect(X0 - u * 3.2, base - u * 6 + Math.max(0, pa), u * 2.8, u * 6 - Math.max(0, pa), p.calca);
    rect(X0 + u * .4, base - u * 6 + Math.max(0, -pa), u * 2.8, u * 6 - Math.max(0, -pa), p.calca);
    rect(X0 - u * 3.4, base - u * (gear && gear.botas ? 3 : 1.6), u * 3.2, u * (gear && gear.botas ? 3 : 1.6), sap);
    rect(X0 + u * .2, base - u * (gear && gear.botas ? 3 : 1.6), u * 3.2, u * (gear && gear.botas ? 3 : 1.6), sap);
    // tronco
    rect(X0 - u * 4.2, base - u * 13, u * 8.4, u * 7.4, p.camisa);
    if (!costas && p.logo === "barco") { rect(X0 - u * .2, base - u * 11.5, u * .5, u * 3.5, "#fff"); cx.fillStyle = "#fff"; cx.beginPath(); cx.moveTo(X0 + u * .5, base - u * 11.3); cx.lineTo(X0 + u * 2.4, base - u * 8.6); cx.lineTo(X0 + u * .5, base - u * 8.6); cx.fill(); rect(X0 - u * 1.8, base - u * 8.2, u * 4, u * .8, "#d8483b"); }
    if (!costas && p.logo === "caranguejo") { rect(X0 - u * 1.6, base - u * 10.5, u * 3.2, u * 2, "#ff7a5c"); rect(X0 - u * 2.6, base - u * 11.4, u * 1, u * 1, "#ff7a5c"); rect(X0 + u * 1.6, base - u * 11.4, u * 1, u * 1, "#ff7a5c"); }
    if (gear && gear.cinto) { rect(X0 - u * 4.2, base - u * 7.4, u * 8.4, u * 1.2, "#8a5a2b"); rect(X0 - u * .8, base - u * 7.6, u * 1.6, u * 1.6, "#f2b544"); }
    // braços
    rect(X0 - u * 5.6, base - u * 12.6 - pa * .4, u * 1.6, u * 5.6, PELE);
    rect(X0 + u * 4, base - u * 12.6 + pa * .4, u * 1.6, u * 5.6, PELE);
    // cabeça
    const hy = base - u * 20.5;
    rect(X0 - u * 4.4, hy, u * 8.8, u * 7.8, PELE);
    rect(X0 - u * 4.8, hy - u * 1.2, u * 9.6, u * 3.2, p.cabelo);
    if (costas) rect(X0 - u * 4.6, hy, u * 9.2, u * 7, p.cabelo);
    else {
      rect(X0 - u * 4.8, hy, u * 1.4 + (lado < 0 ? u * 2 : 0), u * 4, p.cabelo); rect(X0 + u * 3.4 - (lado > 0 ? u * 2 : 0), hy, u * 1.4 + (lado > 0 ? u * 2 : 0), u * 4, p.cabelo);
      const ox = lado * u * 1.6;
      rect(X0 - u * 2.4 + ox, hy + u * 3.4, u * 1.3, u * 1.6, "#1b2433"); rect(X0 + u * 1.1 + ox, hy + u * 3.4, u * 1.3, u * 1.6, "#1b2433");
      rect(X0 - u * 2.1 + ox, hy + u * 3.5, u * .5, u * .5, "#fff"); rect(X0 + u * 1.4 + ox, hy + u * 3.5, u * .5, u * .5, "#fff");
      rect(X0 - u * 1.2 + ox, hy + u * 5.8, u * 2.4, u * .7, "#b4534a");
      rect(X0 - u * 3.6 + ox, hy + u * 5, u * 1.2, u * .7, "#f39b9b88"); rect(X0 + u * 2.4 + ox, hy + u * 5, u * 1.2, u * .7, "#f39b9b88");
      if (p.barba) rect(X0 - u * 4.4, hy + u * 5.2, u * 8.8, u * 2.6, p.cabelo), rect(X0 - u * 1.2 + ox, hy + u * 5.8, u * 2.4, u * .7, "#b4534a");
    }
    const fr = imgRosto[p.rosto];
    if (fr && fr.complete && fr.naturalWidth && !costas) { cx.save(); cx.beginPath(); cx.arc(X0 + lado * u * .8, hy + u * 3.6, u * 5.2, 0, Math.PI * 2); cx.clip(); cx.drawImage(fr, X0 + lado * u * .8 - u * 5.2, hy + u * 3.6 - u * 5.2, u * 10.4, u * 10.4); cx.restore(); }
    if (p.chapeu) { rect(X0 - u * 7, hy - u * .6, u * 14, u * 1.4, "#e8c27a"); rect(X0 - u * 4.4, hy - u * 3.4, u * 8.8, u * 3, "#efcf8c"); rect(X0 - u * 4.4, hy - u * 1.4, u * 8.8, u * .9, "#1d3a6b"); }
    if (gear && gear.capacete) { rect(X0 - u * 5, hy - u * 2.2, u * 10, u * 3.6, "#c9d3dd"); rect(X0 - u * 5, hy + u * .9, u * 10, u * .9, "#f2b544"); rect(X0 - u * .6, hy - u * 4.4, u * 1.2, u * 2.4, "#d8483b"); rect(X0 - u * .3, hy - u * 2.2, u * .6, u * 3.2, "#f2b544"); }
    // escudo (mão esquerda) e espada (mão direita)
    if (gear && gear.escudo) {
      const ex2 = costas ? X0 + u * 3 : X0 - u * 8.2, ey = base - u * 12.4, fl = jog.escudoFlash > 0;
      rect(ex2, ey, u * 5, u * 6.2, fl ? "#9fd0ff" : "#2f6fd6"); rect(ex2, ey, u * 5, u * .7, "#f2b544"); rect(ex2, ey + u * 5.5, u * 5, u * .7, "#f2b544");
      rect(ex2 + u * 2.1, ey + u * 1, u * .9, u * 4.4, "#fff"); rect(ex2 + u * .9, ey + u * 2.3, u * 3.2, u * .9, "#fff");
      if (fl) { cx.strokeStyle = "#bfe3ffcc"; cx.lineWidth = u * 1.2; cx.beginPath(); cx.arc(X0, base - u * 10, u * 12, 0, Math.PI * 2); cx.stroke(); }
    }
    if (gear && gear.espada && !(jog.golpe > 0)) {
      const sx2 = X0 + u * 5, sy2 = base - u * 9;
      if (gear.luz) { cx.fillStyle = "#fff6a855"; cx.beginPath(); cx.arc(sx2 + u * .6, sy2 - u * 5, u * 4, 0, Math.PI * 2); cx.fill(); }
      rect(sx2, sy2 - u * 9, u * 1.3, u * 9, gear.luz ? "#fffbe0" : "#e8f4ff"); rect(sx2 - u * 1.2, sy2, u * 3.7, u * .9, "#f2b544"); rect(sx2 + u * .2, sy2 + u * .9, u * .9, u * 2, "#8a5a2b");
    }
  }

  function desenharGolpe() {
    if (!(jog.golpe > 0)) return;
    const p = 1 - jog.golpe / .32, alc = (tem("luz") ? 1.9 : 1.35) * T;
    const base = { dir: 0, baixo: Math.PI / 2, esq: Math.PI, cima: -Math.PI / 2 }[jog.dir];
    const X0 = sx(jog.x), Y0 = sy(jog.y) - ALT[tile(Math.floor(jog.x), Math.floor(jog.y))] * K - T * .5;
    const a0 = base - 1.2, a1 = base - 1.2 + 2.4 * p;
    cx.save(); cx.globalCompositeOperation = "lighter";
    cx.strokeStyle = tem("luz") ? "rgba(255,240,150,.9)" : "rgba(200,230,255,.9)"; cx.lineCap = "round";
    cx.lineWidth = T * .22 * (1 - p * .5); cx.beginPath(); cx.arc(X0, Y0, alc * .8, a0, a1); cx.stroke();
    cx.lineWidth = T * .08; cx.strokeStyle = "#fff"; cx.beginPath(); cx.arc(X0, Y0, alc * .8, Math.max(a0, a1 - .5), a1); cx.stroke();
    // lâmina
    cx.translate(X0, Y0); cx.rotate(a1); rect(T * .2, -T * .05, alc * .75, T * .1, "#fffbe0"); cx.restore();
  }

  function desenharNuvem(n) {
    if (n.renasce > 0) return;
    const X0 = sx(n.x), Y0 = sy(n.y) - T * .9 + (pref.movimento ? Math.sin(n.f * 2) * T * .08 : 0);
    cx.fillStyle = "#00000022"; cx.beginPath(); cx.ellipse(X0, sy(n.y) - ALT[G] * K, T * .4, T * .15, 0, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = "#9aa4b2";
    [[-.22, .05, .25], [.05, -.1, .3], [.27, .06, .22], [0, .12, .26]].forEach(([dx, dy, r]) => { cx.beginPath(); cx.arc(X0 + dx * T, Y0 + dy * T, r * T, 0, Math.PI * 2); cx.fill(); });
    cx.strokeStyle = "#4d5866"; cx.lineWidth = T * .04;
    cx.beginPath(); cx.arc(X0 - T * .1, Y0 + T * .05, T * .06, 0, Math.PI); cx.stroke();
    cx.beginPath(); cx.arc(X0 + T * .12, Y0 + T * .05, T * .06, 0, Math.PI); cx.stroke();
    if (pref.movimento) { cx.fillStyle = "#4d5866"; cx.font = `900 ${Math.round(T * .22)}px Trebuchet MS,sans-serif`; cx.fillText("z", X0 + T * .38, Y0 - T * .3 - (n.f * 10 % 10)); }
  }

  function desenharParticula(p) {
    const X0 = sx(p.x), Y0 = sy(p.y) - p.z * T * .4 - K * .5, s = T * (p.tipo === "gema" ? .14 : p.tipo === "flor" ? .16 : .09) * Math.min(1, p.vida * 2);
    cx.fillStyle = p.cor;
    if (p.tipo === "gema") { cx.beginPath(); cx.moveTo(X0, Y0 - s); cx.lineTo(X0 + s, Y0); cx.lineTo(X0, Y0 + s); cx.lineTo(X0 - s, Y0); cx.fill(); }
    else if (p.tipo === "flor") { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; cx.beginPath(); cx.arc(X0 + Math.cos(a) * s * .6, Y0 + Math.sin(a) * s * .6, s * .45, 0, Math.PI * 2); cx.fill(); } cx.fillStyle = "#ffd54a"; cx.beginPath(); cx.arc(X0, Y0, s * .35, 0, Math.PI * 2); cx.fill(); }
    else rect(X0 - s / 2, Y0 - s / 2, s, s, p.cor);
  }

  function desenharSeta() {
    if (estado.fase >= FASE_POS.length || cena) return;
    const [fx, fy] = FASE_POS[estado.fase], dx = fx - jog.x, dy = fy - jog.y, d = Math.hypot(dx, dy);
    if (d < 2.2) return;
    const a = Math.atan2(dy, dx), b = pref.movimento ? Math.sin(tempo * 6) * T * .1 : 0;
    const X0 = sx(jog.x) + Math.cos(a) * (T * 1.15 + b), Y0 = sy(jog.y) - T * .6 + Math.sin(a) * (T * 1.15 + b);
    cx.save(); cx.translate(X0, Y0); cx.rotate(a);
    cx.fillStyle = "#ffd54a"; cx.strokeStyle = "#8a5a0d"; cx.lineWidth = T * .05;
    cx.beginPath(); cx.moveTo(T * .32, 0); cx.lineTo(-T * .12, -T * .26); cx.lineTo(-T * .12, -T * .1); cx.lineTo(-T * .32, -T * .1); cx.lineTo(-T * .32, T * .1); cx.lineTo(-T * .12, T * .1); cx.lineTo(-T * .12, T * .26); cx.closePath(); cx.fill(); cx.stroke();
    cx.restore();
  }

  function desenharGaivota(g) {
    const X0 = sx(g.x), Y0 = sy(g.y) - T * 2.5, w = T * .35, f = Math.sin(g.f) * T * .12;
    cx.strokeStyle = "#fff"; cx.lineWidth = T * .06; cx.lineCap = "round";
    cx.beginPath(); cx.moveTo(X0 - w, Y0 - f); cx.quadraticCurveTo(X0 - w * .4, Y0 - T * .12, X0, Y0); cx.quadraticCurveTo(X0 + w * .4, Y0 - T * .12, X0 + w, Y0 - f); cx.stroke();
  }

  function desenhar() {
    if (r3) { r3.desenhar(); desenharMinimapa(); return; }
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const ceu = cx.createLinearGradient(0, 0, 0, Math.max(1, sy(0))); ceu.addColorStop(0, "#7cc6f2"); ceu.addColorStop(1, "#cdeefc"); cx.fillStyle = ceu; cx.fillRect(0, 0, VW, VH);
    const x0 = Math.max(0, Math.floor(cam.x - VW / T / 2) - 1), x1 = Math.min(W - 1, Math.ceil(cam.x + VW / T / 2) + 1);
    const y0 = Math.max(0, Math.floor(cam.y - VH / T / 2) - 1), y1 = Math.min(H - 1, Math.ceil(cam.y + VH / T / 2) + 6);
    // entidades por linha
    const porLinha = {};
    const pôr = (y, f) => { const k = Math.floor(y); (porLinha[k] = porLinha[k] || []).push(f); };
    conchas.forEach((c) => { if (!estado.conchas.includes(c.id)) pôr(c.y, () => desenharConcha(c)); });
    BAUS.forEach((b, i) => pôr(b[1] + .5, () => desenharBau(i)));
    LAMP_POS.forEach((l, i) => pôr(l[1], () => desenharLampada(i)));
    FASE_POS.forEach((f, i) => pôr(f[1], () => desenharParagem(i)));
    nuvens.forEach((n) => pôr(n.y, () => desenharNuvem(n)));
    familia.slice().reverse().forEach((f) => pôr(f.y, () => desenharPessoa(f, f.x, f.y, f.dir || "baixo", f.passo || 0, null)));
    const gear = { botas: tem("botas"), escudo: tem("escudo"), espada: tem("espada"), luz: tem("luz"), capacete: tem("capacete"), cinto: tem("cinto") };
    pôr(jog.y, () => { const z = jog.salto > 0 ? Math.sin((1 - jog.salto / .45) * Math.PI) * T * .5 : 0; desenharPessoa(GUST, jog.x, jog.y, jog.dir, jog.passo, gear, z); desenharGolpe(); });

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) desenharTile(x, y);
      for (let x = x0; x <= x1; x++) {
        const t = tile(x, y);
        if (t === A) desenharArvore(x, y); else if (t === F) desenharFlor(x, y); else if (t === X) desenharSilva(x, y);
        else if (t === C && x === 1 && y === 30) desenharCasa(x, y - 1);
        else if (t === L && x === 57 && y === 8) desenharFarol(x, y - 1);
      }
      (porLinha[y] || []).forEach((f) => f());
    }
    particulas.forEach(desenharParticula);
    gaivotas.forEach(desenharGaivota);
    desenharSeta();

    // escuridão da floresta, com luzes
    if (escuroA > .02) {
      ex.setTransform(DPR, 0, 0, DPR, 0, 0);
      ex.globalCompositeOperation = "source-over"; ex.clearRect(0, 0, VW, VH);
      ex.fillStyle = `rgba(8,14,40,${escuroA})`; ex.fillRect(0, 0, VW, VH);
      ex.globalCompositeOperation = "destination-out";
      const luzR = (tem("luz") ? 4.6 : tem("lanterna") ? 3.6 : 1.7) * T;
      const furo = (x, y, r) => { const g = ex.createRadialGradient(x, y, r * .2, x, y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); ex.fillStyle = g; ex.beginPath(); ex.arc(x, y, r, 0, Math.PI * 2); ex.fill(); };
      furo(sx(jog.x), sy(jog.y) - T * .5, luzR);
      if (estado.fase >= 5) LAMP_POS.forEach(([x, y]) => furo(sx(x), sy(y) - T * 1.3, T * 3));
      FASE_POS.forEach(([x, y], i) => { if (i === estado.fase) furo(sx(x), sy(y) - T, T * 1.6); });
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(escuro, 0, 0);
      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (tem("lanterna")) { const g = cx.createRadialGradient(sx(jog.x), sy(jog.y) - T * .5, 0, sx(jog.x), sy(jog.y) - T * .5, luzR); g.addColorStop(0, "rgba(255,230,140,.18)"); g.addColorStop(1, "rgba(255,230,140,0)"); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH); }
    }
    desenharMinimapa();
  }

  /* ================= Minimapa ================= */
  const mm = $("#minimapa"), mmx = mm.getContext("2d");
  let mmBase = null;
  function desenharMinimapaBase() {
    mmBase = document.createElement("canvas"); mmBase.width = W * 2; mmBase.height = H * 2;
    const c = mmBase.getContext("2d");
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { c.fillStyle = COR[tile(x, y)][tile(x, y) === A || tile(x, y) === R || tile(x, y) === X ? 1 : 0]; if (tile(x, y) === L) c.fillStyle = "#d8483b"; c.fillRect(x * 2, y * 2, 2, 2); }
  }
  function desenharMinimapa() {
    if (!mmBase) return;
    mmx.drawImage(mmBase, 0, 0);
    FASE_POS.forEach(([x, y], i) => { if (i === estado.fase && (Math.floor(tempo * 3) % 2 || !pref.movimento)) { mmx.fillStyle = "#ffd54a"; mmx.fillRect(x * 2 - 3, y * 2 - 3, 6, 6); } });
    mmx.fillStyle = "#fff"; mmx.fillRect(jog.x * 2 - 3, jog.y * 2 - 3, 6, 6); mmx.fillStyle = "#2f6fd6"; mmx.fillRect(jog.x * 2 - 2, jog.y * 2 - 2, 4, 4);
  }

  /* ================= HUD ================= */
  const CORES_FASE = ["#f4b942", "#f4b942", "#176b87", "#176b87", "#f27c38", "#1ea6a8", "#1ea6a8", "#7d63a8"];
  const totalConchas = () => conchas.length;
  function atualizarHud() {
    $("#h-pontos").innerHTML = ic("estrela") + estado.pontos;
    $("#h-tesouros").innerHTML = ic("gema") + estado.baus.length + "/" + BAUS.length;
    $("#h-conchas").innerHTML = ic("concha") + estado.conchas.length + "/" + totalConchas();
    const f = D.fases[Math.min(estado.fase, D.fases.length - 1)];
    $("#h-fase").textContent = estado.fase >= D.fases.length ? "Gustavo Aventureiro · explora à vontade!" : `Fase ${estado.fase + 1} de ${D.fases.length} · ${f.nome}`;
    document.documentElement.style.setProperty("--momento", CORES_FASE[Math.min(estado.fase, 7)]);
    $("#h-forcas").innerHTML = estado.forcas.map((k) => ic(D.forcas[k].icone)).join("");
    $("#b-som").innerHTML = ic(pref.som ? "som" : "mudo");
  }
  function pulo(sel) { const e = $(sel); e.classList.remove("pulo"); void e.offsetWidth; e.classList.add("pulo"); }
  $("#b-pausa").innerHTML = ic("pausa"); $("#b-ecra").innerHTML = ic("ecra");
  $("#b-pausa").addEventListener("click", () => abrirPausa());
  $("#b-som").addEventListener("click", () => { pref.som = !pref.som; guardar("pref", pref); atualizarHud(); });
  $("#b-ecra").addEventListener("click", ecraInteiro);
  function ecraInteiro() { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) {} }

  /* ================= Ecrãs ================= */
  const ECRAS = ["ecra-inicio", "ecra-pagina", "ecra-missao", "ecra-forca", "ecra-pausa", "ecra-fim"];
  function ecraAtivo() { for (const id of ECRAS) { const e = document.getElementById(id); if (e.classList.contains("ativo")) return e; } return null; }
  function mostrar(id) { ECRAS.forEach((e) => document.getElementById(e).classList.toggle("ativo", e === id)); cena = !!id; teclas.clear(); if (id) setTimeout(() => focarPrimeiro(document.getElementById(id)), 60); }
  function focarPrimeiro(el) { const b = el.querySelector("[data-foco]") || el.querySelector("button:not([disabled])"); if (b) b.focus({ preventScroll: true }); }
  function navEspacial(dir) {
    const ov = ecraAtivo(); if (!ov) return;
    const els = [...ov.querySelectorAll("button:not([disabled])")].filter((e) => e.offsetParent !== null);
    if (!els.length) return;
    const cur = document.activeElement; if (!els.includes(cur)) { els[0].focus(); return; }
    const r = cur.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    let melhor = null, md = 1e9;
    els.forEach((e) => {
      if (e === cur) return; const q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - x0, dy = q.top + q.height / 2 - y0;
      const ok = dir === "left" ? dx < -5 : dir === "right" ? dx > 5 : dir === "up" ? dy < -5 : dy > 5; if (!ok) return;
      const h = dir === "left" || dir === "right", d = (h ? Math.abs(dx) : Math.abs(dy)) + (h ? Math.abs(dy) : Math.abs(dx)) * 2;
      if (d < md) { md = d; melhor = e; }
    });
    if (melhor) melhor.focus();
  }
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const baralhar = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  function mostrarPagina(chave, etiqueta) {
    return new Promise((res) => {
      const p = D.paginas[chave];
      $("#pag-img").src = p.img; $("#pag-img").alt = p.titulo + ". " + p.texto;
      $("#pag-titulo").textContent = p.titulo; $("#pag-etq").textContent = etiqueta || "História";
      $("#pag-ouvir").innerHTML = ic("ouvir") + "Ouvir"; $("#pag-seguir").innerHTML = "Continuar" + ic("seguir");
      $("#pag-ouvir").onclick = () => falar(p.titulo + ". " + p.texto);
      $("#pag-seguir").onclick = () => { calar(); res(); };
      $("#pag-seguir").setAttribute("data-foco", "");
      mostrar("ecra-pagina");
      falar(p.titulo + ". " + p.texto);
    });
  }

  function pontosDe(max, erros) { return Math.max(max / 2, max - erros * max / 4); }

  function missao(f) {
    const m = f.missao, el = $("#missao");
    let erros = 0;
    return new Promise((res) => {
      const fim = async () => { const pts = pontosDe(f.pontos, erros); SFX.certo(); await espera(1300); res(pts); };
      const cab = `<span class="etiqueta">Missão · Fase ${D.fases.indexOf(f) + 1}</span><h2>${f.nome}</h2><p>${m.fala}</p>`;
      const ouvir = `<div class="botoes"><button class="bt voz" id="m-ouvir">${ic("ouvir")}Ouvir</button></div>`;
      if (m.tipo === "escolha") {
        el.innerHTML = cab + `<div class="opcoes">${baralhar(m.opcoes).map((o) => `<button class="opcao" data-certa="${o.certa ? 1 : 0}" aria-label="${o.rotulo}">${ic(o.icone)}<span>${o.rotulo}</span></button>`).join("")}</div>` + ouvir;
        el.querySelectorAll(".opcao").forEach((b) => b.onclick = () => {
          if (b.dataset.certa === "1") { b.classList.add("certa"); el.querySelectorAll(".opcao").forEach((o) => o.disabled = true); falar("Muito bem! " + b.textContent + "!"); fim(); }
          else { erros++; b.classList.add("errada"); b.disabled = true; SFX.erro(); falar("Quase! Tenta outra vez."); }
        });
      } else if (m.tipo === "lampadas") {
        const pos = [[12, 78], [30, 58], [50, 66], [68, 42], [87, 24]];
        el.innerHTML = cab + `<div class="noite" id="noite"><svg class="trilho" viewBox="0 0 100 56" preserveAspectRatio="none"><path d="M0 50 Q20 40 30 33 T50 37 T70 23 T100 10" stroke="#3d3a5c" stroke-width="7" fill="none" id="trilho-noite"/></svg>${pos.map((p, i) => `<button class="lampada" style="left:${p[0]}%;top:${p[1]}%" aria-label="Lâmpada ${i + 1}">${ic("lanterna")}</button>`).join("")}</div>` + ouvir;
        let acesas = 0;
        el.querySelectorAll(".lampada").forEach((b, i) => b.onclick = () => {
          if (b.classList.contains("acesa")) return;
          b.classList.add("acesa"); SFX.lampada(acesas); acesas++;
          const n = $("#noite"); n.style.background = `hsl(${230 - acesas * 6},${40 + acesas * 6}%,${10 + acesas * 9}%)`;
          $("#trilho-noite").setAttribute("stroke", acesas === 5 ? "#e6c88e" : "#3d3a5c");
          if (acesas === 5) { falar("Que luz linda! A Palavra de Deus é a luz para o nosso caminho!"); fim(); }
          else { const prox = [...el.querySelectorAll(".lampada:not(.acesa)")][0]; if (prox) prox.focus(); }
        });
      } else if (m.tipo === "ordenar") {
        let prox = 0; const cenas = m.cenas.map((c, i) => Object.assign({ i }, c));
        let ordem; do { ordem = baralhar(cenas); } while (ordem.every((c, k) => c.i === k));
        el.innerHTML = cab + `<div class="opcoes">${ordem.map((c) => `<button class="cena" data-i="${c.i}" aria-label="${c.rotulo}"><img src="${c.img}" alt=""><span>${c.rotulo}</span></button>`).join("")}</div>` + ouvir;
        el.querySelectorAll(".cena").forEach((b) => b.onclick = () => {
          if (b.querySelector(".num")) return;
          if (+b.dataset.i === prox) {
            prox++; b.insertAdjacentHTML("beforeend", `<span class="num">${prox}</span>`); SFX.moeda();
            if (prox === cenas.length) { falar("Isso mesmo! Primeiro o farol, depois a Bíblia, e depois a luz para o caminho!"); fim(); }
            else falar(prox === 1 ? "Boa! E depois?" : "Boa! E no fim?");
          } else { erros++; b.classList.remove("errada"); void b.offsetWidth; b.classList.add("errada"); setTimeout(() => b.classList.remove("errada"), 450); SFX.erro(); falar("Hum, ainda não. O que aconteceu antes?"); }
        });
      } else if (m.tipo === "versiculo") {
        const v = D.versiculos[m.vers], lac = m.partes.filter((p) => typeof p === "object");
        let atual = 0;
        const desenha = () => {
          let k = -1;
          return m.partes.map((p) => { if (typeof p === "string") return p; k++; return `<span class="lacuna ${k < atual ? "feita" : k === atual ? "atual" : ""}">${k < atual ? p.palavra : "?"}</span>`; }).join("");
        };
        el.innerHTML = cab + `<p class="versiculo-txt" id="v-txt">${desenha()}</p><p class="ref">${v.ref} (NVT)</p><div class="opcoes">${baralhar(lac).map((p) => `<button class="opcao" data-p="${p.palavra}" aria-label="${p.palavra}">${ic(p.icone)}<span>${p.palavra}</span></button>`).join("")}</div>` + ouvir;
        el.querySelectorAll(".opcao").forEach((b) => b.onclick = () => {
          if (b.dataset.p === lac[atual].palavra) {
            atual++; b.classList.add("certa"); b.disabled = true; SFX.moeda(); $("#v-txt").innerHTML = desenha();
            if (atual === lac.length) { falar(v.texto + " " + v.ref + "."); fim(); }
            else falar(b.dataset.p + "!");
          } else { erros++; b.classList.remove("errada"); void b.offsetWidth; b.classList.add("errada"); setTimeout(() => b.classList.remove("errada"), 450); SFX.erro(); falar("Quase! Olha bem para o desenho."); }
        });
      }
      mostrar("ecra-missao");
      const o = $("#m-ouvir"); if (o) o.onclick = () => falar(m.fala);
      setTimeout(() => falar(m.fala), 250);
    });
  }

  function mostrarForca(chave, pts) {
    return new Promise((res) => {
      const f = D.forcas[chave], v = D.versiculos[f.vers];
      $("#forca").innerHTML = `<span class="etiqueta">Força nova!</span><div class="forca-icone">${ic(f.icone).replace('class="svg"', 'class="svg" style="width:100%;height:100%"')}</div><h2>${f.nome}</h2>` +
        (pts ? `<p class="pontos-ganhos">+${pts} pontos</p>` : "") +
        `<div class="versiculo-cartao"><b>${v.ref} (NVT)</b>${v.texto}</div><div class="botoes"><button class="bt ouro" id="f-seguir" data-foco>Vamos!${ic("seguir")}</button></div>`;
      mostrar("ecra-forca"); SFX.forca();
      falar(f.fala);
      $("#f-seguir").onclick = () => { calar(); res(); };
    });
  }

  let emFase = false;
  async function correrFase(i) {
    if (emFase) return; emFase = true;
    const f = D.fases[i];
    teclas.clear(); joy.ativo = false; joyEl.classList.remove("ativo");
    if (!f.perguntaAntes) for (const p of f.paginas) await mostrarPagina(p);
    const pts = await missao(f);
    estado.pontos += pts; estado.porFase[f.id] = pts; atualizarHud(); pulo("#h-pontos");
    if (f.perguntaAntes) for (const p of f.paginas) await mostrarPagina(p, "Fim da história");
    if (f.forca) { estado.forcas.push(f.forca); await mostrarForca(f.forca, pts); }
    estado.fase = i + 1; revisitada[i] = true; salvar(); atualizarHud();
    if (f.forca === "espada") criarNuvens();
    mostrar(null);
    if (estado.fase >= D.fases.length) await finalFarol();
    else {
      const dicas = { botas: "Corre até à próxima placa! Segue a seta amarela.", escudo: "Com o Escudo da Fé estás protegido. Segue a seta!", espada: "Experimenta a espada! Corta as silvas que fecham o caminho.", lanterna: "A floresta está escura, mas a lanterna mostra o caminho!", luz: "As lâmpadas acenderam-se! Continua até à próxima placa.", capacete: "Está quase! Procura a placa do versículo." , cinto: "Agora sobe ao farol!" };
      setTimeout(() => dizer(dicas[f.forca] || "Segue a seta amarela!"), 400);
    }
    emFase = false;
  }

  async function reverPaginas(i) {
    const f = D.fases[i]; if (!f.paginas.length || emFase) return;
    emFase = true; for (const p of f.paginas) await mostrarPagina(p, "Ler outra vez"); mostrar(null); emFase = false;
  }

  async function finalFarol() {
    cena = true; focoCam = { x: 57.5, y: 7 };
    await espera(900); farolAceso = true; festa = 6; SFX.forca();
    dizer("O farol ilumina o mar, mas a Palavra de Deus ilumina a vida!");
    await espera(5200); focoCam = null; estado.terminado = true; salvar(); atualizarHud();
    mostrarFim();
  }

  function mostrarFim(jaGuardado) {
    const v = D.versiculos["Jo 8.12"];
    const rk = ler("ranking", []);
    const el = $("#fim");
    el.innerHTML = `<span class="etiqueta">Missão cumprida!</span><h2>Gustavo Aventureiro</h2>
      <p class="pontos-ganhos">${estado.pontos} de 1000 pontos</p>
      <p>${ic("gema")} ${estado.baus.length} de ${BAUS.length} tesouros · ${ic("concha")} ${estado.conchas.length} conchas · ${ic("flor")} ${estado.nuvens} nuvens transformadas</p>
      <div class="versiculo-cartao"><b>Jesus é a nossa luz · ${v.ref} (NVT)</b>${v.texto}</div>
      <div id="fim-rk"></div>
      <div class="botoes"><button class="bt" id="fim-explorar">Explorar mais${ic("seguir")}</button><button class="bt sec" id="fim-novo">Jogar outra vez</button></div>
      <p class="editorial">Perguntas, falas e forças do jogo: texto editorial CPIMW. História e ilustrações: “O Segredo do Farol”, autor Gustavo. Versículos: NVT.</p>`;
    const rkEl = $("#fim-rk");
    const lista = (destaque) => `<ol class="ranking">${rk.slice(0, 5).map((r, i) => `<li class="${i === destaque ? "eu" : ""}">${ic(r.apelido)}<span class="n">${(D.apelidos.find((a) => a.id === r.apelido) || {}).rotulo || r.apelido}</span><b>${r.pontos}</b></li>`).join("")}</ol>`;
    if (!jaGuardado && !estado.rankingFeito) {
      rkEl.innerHTML = `<p>Escolhe o teu nome de aventureiro para o quadro de honra:</p><div class="apelidos">${D.apelidos.map((a) => `<button class="opcao" data-a="${a.id}">${ic(a.id)}<span>${a.rotulo}</span></button>`).join("")}</div>`;
      rkEl.querySelectorAll("[data-a]").forEach((b) => b.onclick = () => {
        rk.push({ apelido: b.dataset.a, pontos: estado.pontos, tesouros: estado.baus.length, data: new Date().toISOString().slice(0, 10) });
        rk.sort((a, c) => c.pontos - a.pontos || c.tesouros - a.tesouros);
        const pos = rk.findIndex((r) => r.apelido === b.dataset.a && r.pontos === estado.pontos);
        rk.splice(20); guardar("ranking", rk); estado.rankingFeito = true; salvar();
        rkEl.innerHTML = `<p>Quadro de honra (só neste aparelho):</p>` + lista(pos); SFX.certo();
        $("#fim-explorar").focus();
      });
    } else if (rk.length) rkEl.innerHTML = `<p>Quadro de honra (só neste aparelho):</p>` + lista(-1);
    $("#fim-explorar").onclick = () => { mostrar(null); dizer("Explora à vontade! Ainda há tesouros e conchas escondidos?"); };
    $("#fim-novo").onclick = () => novoJogo();
    mostrar("ecra-fim");
    falar(`Parabéns, Gustavo Aventureiro! Fizeste ${estado.pontos} pontos. Jesus disse: Eu sou a luz do mundo.`);
  }

  /* ================= Pausa ================= */
  function abrirPausa() {
    if (cena) return;
    const el = $("#pausa");
    const lig = (b) => b ? "ligado" : "desligado";
    const vistas = D.fases.slice(0, estado.fase).flatMap((f) => f.paginas);
    el.innerHTML = `<span class="etiqueta">Pausa</span><h2>Descansa um bocadinho</h2>
      <div class="botoes"><button class="bt" id="p-cont" data-foco>Continuar${ic("seguir")}</button></div>
      <div class="botoes"><button class="bt sec" id="p-som">Som: ${lig(pref.som)}</button><button class="bt sec" id="p-voz">Voz: ${lig(pref.voz)}</button><button class="bt sec" id="p-mov">Movimento: ${pref.movimento ? "normal" : "reduzido"}</button><button class="bt sec" id="p-3d">Mundo: ${r3 ? "3D" : "2D"}</button></div>
      <p>A história até aqui:</p>
      <div class="galeria">${["capa", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].map((k) => `<button data-pg="${k}" ${k === "capa" || vistas.includes(k) ? "" : "disabled"} aria-label="${D.paginas[k].titulo}"><img src="${D.paginas[k].img}" alt=""></button>`).join("")}</div>
      <div class="botoes"><button class="bt sec" id="p-ecra">Ecrã inteiro</button><button class="bt sec" id="p-novo">Recomeçar do início</button></div>
      <p class="editorial">Setas para andar · OK/Enter para a espada · Voltar para a pausa.<br>O progresso e o quadro de honra ficam só neste aparelho.</p>`;
    mostrar("ecra-pausa");
    $("#p-cont").onclick = fecharPausa;
    $("#p-som").onclick = () => { pref.som = !pref.som; guardar("pref", pref); cena = false; abrirPausa(); atualizarHud(); $("#p-som").focus(); };
    $("#p-voz").onclick = () => { pref.voz = !pref.voz; if (!pref.voz) calar(); guardar("pref", pref); cena = false; abrirPausa(); $("#p-voz").focus(); };
    $("#p-mov").onclick = () => { pref.movimento = !pref.movimento; aplicarMovimento(); guardar("pref", pref); cena = false; abrirPausa(); $("#p-mov").focus(); };
    $("#p-3d").onclick = () => { if (r3) { pref.tresD = false; parar3D(); } else { pref.tresD = true; iniciar3D(); if (!r3) dizer("Este aparelho não consegue mostrar o mundo em 3D.", false); } guardar("pref", pref); cena = false; abrirPausa(); $("#p-3d").focus(); };
    $("#p-ecra").onclick = ecraInteiro;
    $("#p-novo").onclick = () => novoJogo();
    el.querySelectorAll("[data-pg]").forEach((b) => b.onclick = async () => { await mostrarPagina(b.dataset.pg, "Ler outra vez"); cena = false; abrirPausa(); });
  }
  function fecharPausa() { calar(); mostrar(null); }

  /* ================= Início ================= */
  function novoJogo() {
    calar(); const rk = ler("ranking", []);
    estado = NOVO(); salvar(); guardar("ranking", rk);
    gerarMundo(); desenharMinimapaBase(); gerarConchas(); nuvens = []; farolAceso = false; if (r3) r3.reconstruir();
    jog.x = estado.px; jog.y = estado.py; jog.dir = "baixo"; rasto.length = 0;
    familia.forEach((f, i) => { f.x = jog.x - (i + 1) * .7; f.y = jog.y; });
    comecar(true);
  }
  function comecar(novo) {
    $("#hud").hidden = false; $("#toque").hidden = !usaToque;
    atualizarHud(); mostrar(null);
    if (estado.terminado) { farolAceso = true; }
    const comandos = usaToque ? "Arrasta o dedo no ecrã para andar." : "Usa as setas para andar.";
    setTimeout(() => dizer(novo || estado.fase === 0 ? `Olá, Gustavo Aventureiro! Vamos ao farol? ${comandos} Segue a seta amarela até à placa que brilha.` : "Bem-vindo de volta, aventureiro! Segue a seta amarela."), 300);
  }
  function montarInicio() {
    const b = $("#botoes-inicio"), temJogo = estado.fase > 0 || estado.baus.length > 0;
    b.innerHTML = temJogo
      ? `<button class="bt ouro" id="i-cont" data-foco>Continuar${ic("seguir")}</button><button class="bt sec" id="i-novo">Novo jogo</button>`
      : `<button class="bt ouro" id="i-jogar" data-foco>Jogar${ic("seguir")}</button>`;
    b.insertAdjacentHTML("beforeend", `<button class="bt voz" id="i-ouvir">${ic("ouvir")}</button>`);
    const ouvir = $("#i-ouvir"); ouvir.setAttribute("aria-label", "Ouvir");
    ouvir.onclick = () => falar("O Segredo do Farol. Autor: Gustavo. Explora o trilho, abre tesouros, ganha forças novas e descobre a luz que mostra o caminho.");
    if (temJogo) { $("#i-cont").onclick = () => { audio(); comecar(false); }; $("#i-novo").onclick = () => { audio(); novoJogo(); }; }
    else $("#i-jogar").onclick = () => { audio(); novoJogo(); };
    focarPrimeiro($("#ecra-inicio"));
  }


  /* ================= Mundo 3D (three.js, render3d.js) com recurso ao 2D ================= */
  let r3 = null;
  function iniciar3D() {
    if (r3 || pref.tresD === false || !window.Render3D) return;
    r3 = window.Render3D.criar({
      W, H, tile, ALT, hash, zonaEscura, tipos: { G, P, S, M, R, A, F, X, C, L, Hh },
      BAUS, LAMP_POS, FASE_POS, CORES_FASE, GUST, familia, jog, gaivotas, pref, tem,
      estado: () => estado, nuvens: () => nuvens, particulas: () => particulas, conchas: () => conchas,
      tempo: () => tempo, escuro: () => escuroA, farolAceso: () => farolAceso, focoCam: () => focoCam,
      emCena: () => cena, alcance: () => (tem("luz") ? 1.9 : 1.35)
    });
    cv.style.opacity = r3 ? "0" : "1";
  }
  function parar3D() { if (r3) { r3.destruir(); r3 = null; } cv.style.opacity = "1"; }

  /* ================= Arranque ================= */
  redimensionar();
  gerarMundo(); desenharMinimapaBase(); gerarConchas(); criarNuvens();
  jog.x = estado.px; jog.y = estado.py;
  if (!livre(jog.x, jog.y, .28)) { jog.x = 6; jog.y = 33; }
  familia.forEach((f, i) => { f.x = jog.x - (i + 1) * .7; f.y = jog.y; });
  cam.x = jog.x; cam.y = jog.y;
  if (estado.terminado) farolAceso = true;
  iniciar3D();
  cena = true; montarInicio(); atualizarHud();
  setInterval(() => { if (!cena) { estado.px = +jog.x.toFixed(2); estado.py = +jog.y.toFixed(2); salvar(); } }, 4000);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { calar(); if (!cena) abrirPausa(); } });

  let ant = performance.now();
  function ciclo(t) {
    const dt = Math.min(.05, (t - ant) / 1000); ant = t;
    atualizar(dt); desenhar();
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // exposto só para verificação automática (sem dados pessoais)
  window.__farol = { modo3D: () => !!r3, estado: () => estado, verificar: verificarEncontros, passo: (dt) => { atualizar(dt); desenhar(); }, cena: () => cena, tile, W, H, FASE_POS, BAUS, livre, jog, correrFase, conchas: () => conchas, acao, tem };
})();
