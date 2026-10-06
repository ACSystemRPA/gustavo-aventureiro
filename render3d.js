/* O Segredo do Farol · Gustavo Aventureiro — mundo em 3D com three.js (vendor/three.min.js, offline).
   Melhoria progressiva: se não houver WebGL ou THREE, o jogo usa o desenho 2D de jogo.js.
   Este ficheiro só desenha; as regras, o estado e as missões ficam em jogo.js (api recebida em criar()). */
(function () {
  "use strict";
  function suportaWebGL() {
    try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
  }
  window.Render3D = {
    criar(api) {
      if (!window.THREE || !suportaWebGL()) return null;
      try { return criar(api); } catch (e) { console.warn("Mundo 3D indisponível, a usar 2D:", e); const c = document.getElementById("mundo3d"); if (c) c.remove(); return null; }
    }
  };

  function criar(api) {
    const T3 = window.THREE;
    const { W, H, tile, ALT, tipos, hash, zonaEscura } = api;
    const { G, P, S, M, R, A, F, X, C, L, Hh } = tipos;
    const altura = (t) => ALT[t] * 1.4;
    const ALTURA_AGUA = 0.12;

    /* ---------- Renderizador, cena, câmara e luzes ---------- */
    const cv = document.createElement("canvas");
    cv.id = "mundo3d"; cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:0";
    document.body.insertBefore(cv, document.body.firstChild);
    const dpr = window.devicePixelRatio || 1;
    const ren = new T3.WebGLRenderer({ canvas: cv, antialias: dpr < 2, powerPreference: "high-performance" });
    ren.setPixelRatio(Math.min(dpr, 1.5));
    const cena = new T3.Scene();
    const CEU = new T3.Color("#9ad8f7"), NOITE = new T3.Color("#101a3a"), corFundo = new T3.Color();
    cena.background = corFundo.copy(CEU);
    cena.fog = new T3.Fog(corFundo, 24, 46);
    const cam = new T3.PerspectiveCamera(42, 1, 0.1, 140);
    const hemi = new T3.HemisphereLight(0xffffff, 0x5d7d4c, 1.25); cena.add(hemi);
    const sol = new T3.DirectionalLight(0xfff0d0, 1.7); sol.position.set(-14, 22, 10); cena.add(sol); cena.add(sol.target);
    const lanterna = new T3.PointLight(0xffd98a, 0, 8, 1.2); cena.add(lanterna);

    function redimensionar() {
      const w = window.innerWidth, h = window.innerHeight;
      ren.setSize(w, h, false); cam.aspect = w / h; cam.fov = w >= h ? 42 : 55; cam.updateProjectionMatrix();
    }
    window.addEventListener("resize", redimensionar); redimensionar();

    /* ---------- Materiais e geometrias partilhados ---------- */
    /* Estilo anime: sombreado toon em 3 tons (cel-shading) e contorno escuro nas personagens */
    const tons = new T3.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, T3.RedFormat);
    tons.minFilter = tons.magFilter = T3.NearestFilter; tons.needsUpdate = true;
    const lamb = (cor, extra) => { const o = Object.assign({ color: cor, gradientMap: tons }, extra || {}); delete o.roughness; delete o.metalness; return new T3.MeshToonMaterial(o); };
    const matContorno = new T3.MeshBasicMaterial({ color: 0x1b1a2e, side: T3.BackSide });
    function contornar(grupo, esp) {
      const lista = []; grupo.traverse((o) => { if (o.isMesh && !o.userData.semContorno && !(o.material && o.material.transparent)) lista.push(o); });
      lista.forEach((o) => { const c = new T3.Mesh(o.geometry, matContorno); const r = (o.geometry.boundingSphere ? o.geometry.boundingSphere.radius : 0.2) * Math.max(o.scale.x, o.scale.y, o.scale.z); c.scale.setScalar(1 + esp / Math.max(0.03, r)); c.userData.semContorno = true; o.add(c); });
    }
    const caixa = (w, h, d) => new T3.BoxGeometry(w, h, d);
    function geoBloco() { // cubo com a base em 0 e cores por face (topo claro, lados mais escuros) → aspeto de blocos
      const g = new T3.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
      const n = g.attributes.position.count, cor = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const f = Math.floor(i / 4), v = f === 2 ? 1 : f === 3 ? 0.45 : (f === 4 ? 0.8 : 0.7); cor[i * 3] = cor[i * 3 + 1] = cor[i * 3 + 2] = v; }
      g.setAttribute("color", new T3.BufferAttribute(cor, 3)); return g;
    }
    const COR_TOPO = { [G]: "#7cc45a", [P]: "#d9a866", [S]: "#f3dfa2", [R]: "#a3abb5", [A]: "#6fb84f", [F]: "#7cc45a", [X]: "#6fb84f", [C]: "#7cc45a", [L]: "#9bd17a", [Hh]: "#8ccf62", [M]: "#e8d49a" };
    const mat4 = new T3.Matrix4(), q0 = new T3.Quaternion(), v3 = new T3.Vector3(), esc3 = new T3.Vector3(), cor = new T3.Color();

    /* ---------- Solo em blocos (um InstancedMesh para todo o mapa) ---------- */
    const solo = new T3.InstancedMesh(geoBloco(), lamb(0xffffff, { vertexColors: true }), W * H);
    cena.add(solo);
    function pôrBloco(x, y) {
      const t = tile(x, y), k = y * W + x;
      const h = t === M ? -0.35 : t === R ? altura(G) : altura(t);
      v3.set(x + 0.5, -1.2, y + 0.5); esc3.set(1, h + 1.2, 1);
      mat4.compose(v3, q0, esc3); solo.setMatrixAt(k, mat4);
      const r = hash(x, y);
      cor.set(t === R ? (x >= 39 && y <= 13 ? COR_TOPO[Hh] : COR_TOPO[G]) : COR_TOPO[t]); if (zonaEscura(x, y) && t !== P && t !== S) cor.multiplyScalar(0.82);
      cor.offsetHSL(0, 0, (r - 0.5) * 0.06); solo.setColorAt(k, cor);
    }
    /* ---------- Água animada ---------- */
    const SEG_X = 52, SEG_Z = 40;
    const geoAgua = new T3.PlaneGeometry(W + 40, H + 30, SEG_X, SEG_Z); geoAgua.rotateX(-Math.PI / 2);
    const agua = new T3.Mesh(geoAgua, lamb("#2f8fd6", { transparent: true, opacity: 0.86 }));
    agua.position.set(W / 2 + 10, ALTURA_AGUA, H / 2 + 8); cena.add(agua);
    const baseAgua = Float32Array.from(geoAgua.attributes.position.array);
    // terra para lá das bordas de cima e da esquerda (escondida pelo nevoeiro)
    const borda1 = new T3.Mesh(caixa(30, 1, H + 30), lamb("#4f9a3c")); borda1.position.set(-15, 0.2, H / 2); cena.add(borda1);
    const borda2 = new T3.Mesh(caixa(W + 30, 1, 30), lamb("#4f9a3c")); borda2.position.set(W / 2 - 15, 0.2, -15); cena.add(borda2);

    /* ---------- Árvores, flores, silvas ---------- */
    const MAX_ARV = W * H, MAX_FLOR = 1600;
    const tronco = new T3.InstancedMesh(new T3.CylinderGeometry(0.11, 0.15, 0.8, 8), lamb("#7a4d22"), MAX_ARV);
    const geoCopa = new T3.IcosahedronGeometry(0.62, 1); geoCopa.translate(0, 0.55, 0);
    const copa = new T3.InstancedMesh(geoCopa, lamb(0xffffff), MAX_ARV);
    const copa2 = new T3.InstancedMesh(geoCopa, lamb(0xffffff), MAX_ARV);
    const flores = new T3.InstancedMesh(new T3.SphereGeometry(0.075, 8, 6), lamb(0xffffff), MAX_FLOR);
    const geoSilva = new T3.IcosahedronGeometry(0.55, 1); geoSilva.translate(0, 0.45, 0);
    const silvas = new T3.InstancedMesh(geoSilva, lamb(0xffffff), W * H);
    const bagas = new T3.InstancedMesh(new T3.SphereGeometry(0.06, 8, 6), lamb("#c43a52"), W * H * 3);
    const rochas = new T3.InstancedMesh(new T3.DodecahedronGeometry(0.62, 1), lamb("#a3abb5"), W * H);
    [tronco, copa, copa2, flores, silvas, bagas, rochas].forEach((m) => { m.count = 0; cena.add(m); });
    const silvaId = new Map(); let arvores = []; const recortadas = new Set();
    function decorar() {
      let na = 0, nf = 0, ns = 0, nb = 0, nr = 0; silvaId.clear(); arvores = []; recortadas.clear();
      const CORF = ["#ffd54a", "#ffd54a", "#ffffff", "#ff8fb1"];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const t = tile(x, y), h = altura(t), r = hash(x, y), cx = x + 0.5, cz = y + 0.5;
        if (t === A) {
          const esc = zonaEscura(x, y), s = 0.85 + r * 0.3;
          mat4.compose(v3.set(cx, h + 0.4, cz), q0, esc3.set(1, 1, 1)); tronco.setMatrixAt(na, mat4);
          mat4.compose(v3.set(cx, h + 0.65, cz), q0, esc3.set(0.95 * s, 0.85 * s, 0.95 * s)); copa.setMatrixAt(na, mat4);
          cor.set(esc ? "#2f7a3e" : (r < 0.5 ? "#3fa34d" : "#4cae52")); copa.setColorAt(na, cor);
          mat4.compose(v3.set(cx, h + 0.65 + 0.8 * s, cz), q0, esc3.set(0.55 * s, 0.5 * s, 0.55 * s)); copa2.setMatrixAt(na, mat4);
          copa2.setColorAt(na, cor); arvores.push({ x: cx, z: cz, h, s }); na++;
        } else if (t === F && nf < MAX_FLOR - 3) {
          for (let i = 0; i < 3; i++) {
            const fx = x + 0.2 + ((r * (i + 3) * 7) % 1) * 0.6, fz = y + 0.2 + ((r * (i + 5) * 11) % 1) * 0.6;
            mat4.compose(v3.set(fx, h + 0.12, fz), q0, esc3.set(1, 1, 1)); flores.setMatrixAt(nf, mat4);
            cor.set(CORF[(i + Math.floor(r * 4)) % 4]); flores.setColorAt(nf, cor); nf++;
          }
        } else if (t === R) {
          mat4.compose(v3.set(cx, altura(G) + 0.35, cz), q0.setFromEuler(new T3.Euler(r * 3, r * 7, 0)), esc3.set(0.85 + r * 0.25, 0.75 + r * 0.3, 0.85 + ((r * 5) % 1) * 0.25)); rochas.setMatrixAt(nr, mat4);
          cor.set("#a3abb5").offsetHSL(0, 0, (r - 0.5) * 0.12); rochas.setColorAt(nr, cor); nr++; q0.identity();
        } else if (t === X) {
          mat4.compose(v3.set(cx, h, cz), q0, esc3.set(0.95, 0.8, 0.95)); silvas.setMatrixAt(ns, mat4);
          cor.set("#2f6b2c"); silvas.setColorAt(ns, cor); silvaId.set(y * W + x, { s: ns, b: nb }); ns++;
          for (let i = 0; i < 3; i++) { const a = hash(x + i, y); mat4.compose(v3.set(x + 0.15 + a * 0.7, h + 0.3 + ((a * 9) % 1) * 0.5, y + (i % 2 ? 0.04 : 0.96)), q0, esc3.set(1, 1, 1)); bagas.setMatrixAt(nb++, mat4); }
        }
      }
      tronco.count = copa.count = copa2.count = na; flores.count = nf; silvas.count = ns; bagas.count = nb; rochas.count = nr;
      [tronco, copa, copa2, flores, silvas, bagas, rochas].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    }
    function construirSolo() {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) pôrBloco(x, y);
      solo.instanceMatrix.needsUpdate = true; solo.instanceColor.needsUpdate = true;
      decorar();
    }

    /* ---------- Casa e farol ---------- */
    const casa = new T3.Group(); cena.add(casa);
    (function () {
      const hb = altura(C);
      const parede = new T3.Mesh(caixa(2.8, 1.6, 1.8), lamb("#f6efe0")); parede.position.set(0, hb + 0.8, 0); casa.add(parede);
      const telhado = new T3.Mesh(new T3.ConeGeometry(2.2, 1.2, 4), lamb("#d8483b")); telhado.rotation.y = Math.PI / 4; telhado.scale.set(1.0, 1, 0.66); telhado.position.set(0, hb + 2.2, 0); casa.add(telhado);
      const porta = new T3.Mesh(caixa(0.5, 1, 0.05), lamb("#8a5a2b")); porta.position.set(0, hb + 0.5, 0.93); casa.add(porta);
      [-0.9, 0.9].forEach((dx) => { const j = new T3.Mesh(caixa(0.5, 0.45, 0.05), lamb("#7fc8f8")); j.position.set(dx, hb + 1.05, 0.93); casa.add(j); });
      casa.position.set(2.5, 0, 30);
    })();
    const farol = new T3.Group(); cena.add(farol);
    const vidro = new T3.Mesh(new T3.CylinderGeometry(0.5, 0.5, 0.7, 12), lamb("#c9d6e0", { emissive: 0x000000 }));
    const feixe = new T3.Mesh(new T3.ConeGeometry(2.6, 18, 16, 1, true), new T3.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 0.22, blending: T3.AdditiveBlending, depthWrite: false, side: T3.DoubleSide, fog: false }));
    const luzFarol = new T3.PointLight(0xfff2a0, 0, 16, 1.2);
    (function () {
      const hb = altura(L);
      for (let i = 0; i < 5; i++) { const s = new T3.Mesh(new T3.CylinderGeometry(0.72 - i * 0.04, 0.76 - i * 0.04, 0.9, 14), lamb(i % 2 ? "#d8483b" : "#fbfbf6")); s.position.y = hb + 0.45 + i * 0.9; farol.add(s); }
      const galeria = new T3.Mesh(new T3.CylinderGeometry(0.75, 0.75, 0.12, 14), lamb("#123a5a")); galeria.position.y = hb + 4.55; farol.add(galeria);
      vidro.position.y = hb + 4.97; farol.add(vidro);
      const tecto = new T3.Mesh(new T3.ConeGeometry(0.66, 0.6, 14), lamb("#d8483b")); tecto.position.y = hb + 5.62; farol.add(tecto);
      const porta = new T3.Mesh(caixa(0.4, 0.75, 0.05), lamb("#8a5a2b")); porta.position.set(0, hb + 0.38, 0.75); farol.add(porta);
      feixe.geometry.translate(0, -9, 0); feixe.rotation.z = Math.PI / 2; const piv = new T3.Group(); piv.position.y = hb + 4.97; piv.add(feixe); farol.add(piv); feixe.visible = false; farol.userData.piv = piv;
      luzFarol.position.y = hb + 5; farol.add(luzFarol);
      farol.position.set(58, 0, 8);
    })();

    /* ---------- Paragens (placas numeradas) ---------- */
    const CORES = api.CORES_FASE;
    function texturaPlaca(txt, fundo) {
      const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
      x.fillStyle = fundo; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.fill();
      x.lineWidth = 8; x.strokeStyle = "#fff"; x.stroke();
      x.fillStyle = "#fff"; x.font = "900 72px Trebuchet MS, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, 64, 68);
      const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t;
    }
    const paragens = api.FASE_POS.map(([fx, fy], i) => {
      const g = new T3.Group(); const h = altura(tile(Math.floor(fx), Math.floor(fy)));
      g.position.set(fx, h, fy);
      if (i < 7) {
        const poste = new T3.Mesh(caixa(0.12, 1.3, 0.12), lamb("#7a4d22")); poste.position.y = 0.65; g.add(poste);
        const tabua = new T3.Mesh(caixa(0.95, 0.6, 0.1), lamb("#c98d4f")); tabua.position.y = 1.35; g.add(tabua);
      }
      const disco = new T3.Sprite(new T3.SpriteMaterial({ map: texturaPlaca(String(i + 1), CORES[i]), depthTest: true }));
      disco.scale.set(0.5, 0.5, 1); disco.position.set(0, i < 7 ? 1.38 : 6.6, 0.3); g.add(disco);
      const anel = new T3.Mesh(new T3.TorusGeometry(0.62, 0.06, 6, 28), new T3.MeshBasicMaterial({ color: 0xffd54a })); anel.rotation.x = Math.PI / 2; anel.position.y = 0.05; g.add(anel);
      const cadeado = new T3.Mesh(caixa(0.22, 0.18, 0.08), lamb("#6f7880")); cadeado.position.set(0.3, 1.1, 0.12); g.add(cadeado);
      cena.add(g);
      return { g, disco, anel, cadeado, estado: "" };
    });
    function atualizarParagens(fase, t) {
      paragens.forEach((p, i) => {
        const e = i < fase ? "feita" : i === fase ? "proxima" : "fechada";
        if (p.estado !== e) {
          p.estado = e; p.disco.material.map.dispose();
          p.disco.material.map = texturaPlaca(e === "feita" ? "✓" : String(i + 1), e === "feita" ? "#2f9e5b" : CORES[i]); p.disco.material.needsUpdate = true;
          p.cadeado.visible = e === "fechada" && i < 7;
        }
        p.anel.visible = e === "proxima";
        if (p.anel.visible) { const s = 1 + (api.pref.movimento ? Math.sin(t * 4) * 0.12 : 0); p.anel.scale.set(s, s, s); }
      });
    }

    /* ---------- Lâmpadas da floresta ---------- */
    const matLampOff = lamb("#5a6070"), matLampOn = new T3.MeshBasicMaterial({ color: 0xfff1a8 });
    const lampadas = api.LAMP_POS.map(([x, y]) => {
      const g = new T3.Group(), h = altura(tile(Math.floor(x), Math.floor(y))); g.position.set(x, h, y);
      const poste = new T3.Mesh(caixa(0.08, 1.4, 0.08), lamb("#3a3f4a")); poste.position.y = 0.7; g.add(poste);
      const cab = new T3.Mesh(caixa(0.28, 0.28, 0.28), matLampOff); cab.position.y = 1.5; g.add(cab);
      const luz = new T3.PointLight(0xffd98a, 0, 6, 1.4); luz.position.y = 1.5; g.add(luz);
      cena.add(g); return { cab, luz };
    });

    /* ---------- Baús ---------- */
    const baus = api.BAUS.map(([bx, by]) => {
      const g = new T3.Group(), h = altura(tile(bx, by)); g.position.set(bx + 0.5, h, by + 0.5);
      const base = new T3.Mesh(caixa(0.7, 0.4, 0.5), lamb("#9a5b26")); base.position.y = 0.2; g.add(base);
      const faixa = new T3.Mesh(caixa(0.72, 0.07, 0.52), lamb("#f2b544")); faixa.position.y = 0.3; g.add(faixa);
      const piv = new T3.Group(); piv.position.set(0, 0.4, -0.25); g.add(piv);
      const tampa = new T3.Mesh(caixa(0.72, 0.18, 0.52), lamb("#b06a2e")); tampa.position.set(0, 0.09, 0.25); piv.add(tampa);
      const fecho = new T3.Mesh(caixa(0.12, 0.14, 0.04), lamb("#ffd54a")); fecho.position.set(0, 0.0, 0.52); piv.add(fecho);
      const ouro = new T3.Mesh(caixa(0.6, 0.06, 0.4), new T3.MeshBasicMaterial({ color: 0xffd54a })); ouro.position.y = 0.38; ouro.visible = false; g.add(ouro);
      cena.add(g); return { g, piv, ouro, ang: 0 };
    });

    /* ---------- Conchas ---------- */
    let conchasMesh = null;
    function construirConchas() {
      if (conchasMesh) { cena.remove(conchasMesh); conchasMesh.geometry.dispose(); }
      const lista = api.conchas(); const geo = new T3.ConeGeometry(0.16, 0.12, 6); geo.rotateX(-Math.PI / 2.4);
      conchasMesh = new T3.InstancedMesh(geo, lamb("#f7b98b"), Math.max(1, lista.length)); conchasMesh.count = lista.length; cena.add(conchasMesh);
    }

    /* ---------- Bonecos arredondados com o rosto das ilustrações (família e Gustavo) ---------- */
    const PELE = "#f2c6a0";
    const std = (c, extra) => lamb(c, extra);
    function texturaRosto(id) {
      const src = window.ROSTOS && window.ROSTOS[id]; if (!src) return null;
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const tex = new T3.CanvasTexture(c); tex.colorSpace = T3.SRGBColorSpace;
      const img = new Image();
      img.onload = () => {
        const x = c.getContext("2d"); x.clearRect(0, 0, 256, 256); x.drawImage(img, 0, 0, 256, 256);
        const g = x.createRadialGradient(128, 128, 96, 128, 128, 128); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
        x.globalCompositeOperation = "destination-in"; x.fillStyle = g; x.fillRect(0, 0, 256, 256);
        tex.needsUpdate = true;
      };
      img.src = src; return tex;
    }
    const geoCaps = (r, l) => new T3.CapsuleGeometry(r, l, 6, 14);
    const geoEsf = new T3.SphereGeometry(1, 20, 14);
    function boneco(p, comEquipamento) {
      const g = new T3.Group(), corpo = new T3.Group(); g.add(corpo);
      const pôr = (geo, mat, x, y, z, pai, esc) => { const o = new T3.Mesh(geo, mat); o.position.set(x, y, z); if (esc) o.scale.set(esc[0], esc[1], esc[2]); (pai || corpo).add(o); return o; };
      const perna = (dx) => {
        const pv = new T3.Group(); pv.position.set(dx, 0.42, 0); corpo.add(pv);
        pôr(geoCaps(0.085, 0.18), std(p.calca), 0, -0.16, 0, pv);
        const sap = pôr(geoEsf, std("#2b3a55"), 0, -0.35, 0.04, pv, [0.11, 0.075, 0.15]);
        return { pv, sap };
      };
      const pe = perna(-0.1), pd = perna(0.1);
      pôr(geoCaps(0.2, 0.2), std(p.camisa), 0, 0.64, 0, null, [1, 1, 0.82]);
      if (p.logo === "barco") { pôr(new T3.ConeGeometry(0.07, 0.13, 3), std("#ffffff"), 0.02, 0.68, 0.17); pôr(caixa(0.16, 0.03, 0.02), std("#d8483b"), 0, 0.6, 0.168); }
      if (p.logo === "caranguejo") { pôr(geoEsf, std("#ff7a5c"), 0, 0.64, 0.165, null, [0.07, 0.05, 0.02]); }
      const braco = (dx) => {
        const pv = new T3.Group(); pv.position.set(dx, 0.8, 0); corpo.add(pv);
        pôr(geoCaps(0.062, 0.2), std(p.camisa), 0, -0.13, 0, pv);
        pôr(geoEsf, std(PELE), 0, -0.3, 0, pv, [0.07, 0.07, 0.07]);
        return pv;
      };
      const be = braco(-0.27), bd = braco(0.27);
      const cabeca = new T3.Group(); cabeca.position.y = 1.16; cabeca.rotation.x = -0.28; cabeca.scale.setScalar(1.12); corpo.add(cabeca);
      pôr(geoEsf, std(p.cabelo, { roughness: 0.8 }), 0, 0, -0.01, cabeca, [0.34, 0.34, 0.33]);
      const tex = texturaRosto(p.rosto);
      if (tex) {
        const geoRosto = new T3.SphereGeometry(0.343, 24, 16, Math.PI / 2 - 0.95, 1.9, 0.42, 1.75);
        pôr(geoRosto, new T3.MeshBasicMaterial({ map: tex, transparent: true }), 0, 0, 0, cabeca);
      } else pôr(geoEsf, std(PELE), 0, -0.02, 0.05, cabeca, [0.3, 0.3, 0.3]);
      const caracois = new T3.Group(); cabeca.add(caracois);
      if (p.caracois) for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; pôr(geoEsf, std(p.cabelo), Math.cos(a) * 0.2, 0.25 + Math.sin(k * 1.7) * 0.03, Math.sin(a) * 0.16 - 0.06, caracois, [0.11, 0.1, 0.11]); }
      if (p.chapeu) { pôr(new T3.CylinderGeometry(0.42, 0.44, 0.04, 28), std("#e8c27a"), 0, 0.27, -0.06, cabeca); pôr(new T3.CylinderGeometry(0.24, 0.28, 0.18, 24), std("#efcf8c"), 0, 0.37, -0.07, cabeca); pôr(new T3.CylinderGeometry(0.285, 0.285, 0.05, 24), std("#1d3a6b"), 0, 0.31, -0.07, cabeca); }
      const sombra = new T3.Mesh(new T3.CircleGeometry(0.34, 20), new T3.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
      sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.02; g.add(sombra);
      const eq = {};
      if (comEquipamento) {
        const ouro = () => std("#f2b544", { metalness: 0.5, roughness: 0.35 });
        eq.capacete = new T3.Group(); cabeca.add(eq.capacete);
        pôr(new T3.SphereGeometry(0.365, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), std("#d5dde6", { metalness: 0.6, roughness: 0.3 }), 0, 0.02, -0.02, eq.capacete);
        pôr(new T3.TorusGeometry(0.33, 0.025, 8, 32), ouro(), 0, 0.2, -0.02, eq.capacete).rotation.x = Math.PI / 2;
        pôr(geoCaps(0.04, 0.2), std("#d8483b"), 0, 0.42, -0.08, eq.capacete).rotation.x = -0.6;
        eq.cinto = new T3.Group(); corpo.add(eq.cinto);
        pôr(new T3.TorusGeometry(0.2, 0.03, 8, 28), std("#8a5a2b"), 0, 0.5, 0, eq.cinto, [1, 0.82, 1]).rotation.x = Math.PI / 2;
        pôr(caixa(0.08, 0.07, 0.03), ouro(), 0, 0.5, 0.17, eq.cinto);
        eq.escudo = new T3.Group(); eq.escudo.position.set(-0.08, -0.2, 0.06); be.add(eq.escudo);
        pôr(new T3.CylinderGeometry(0.2, 0.2, 0.04, 28), std("#2f6fd6", { metalness: 0.2 }), 0, 0, 0, eq.escudo).rotation.z = Math.PI / 2;
        pôr(new T3.TorusGeometry(0.2, 0.025, 8, 28), ouro(), 0, 0, 0, eq.escudo).rotation.y = Math.PI / 2;
        pôr(caixa(0.02, 0.24, 0.05), std("#ffffff"), -0.025, 0, 0, eq.escudo); pôr(caixa(0.02, 0.05, 0.17), std("#ffffff"), -0.025, 0.04, 0, eq.escudo);
        eq.espada = new T3.Group(); eq.espada.position.set(0.02, -0.3, 0.04); bd.add(eq.espada);
        eq.lamina = new T3.Mesh(caixa(0.05, 0.6, 0.02), std("#e8f4ff", { metalness: 0.7, roughness: 0.2, emissive: 0x000000 })); eq.lamina.position.set(0, 0, 0.36); eq.lamina.rotation.x = Math.PI / 2; eq.espada.add(eq.lamina);
        pôr(geoCaps(0.025, 0.18), ouro(), 0, 0, 0.05, eq.espada).rotation.z = Math.PI / 2;
        pôr(geoCaps(0.03, 0.08), std("#8a5a2b"), 0, 0, -0.04, eq.espada).rotation.x = Math.PI / 2;
        eq.botaE = pe.sap; eq.botaD = pd.sap; eq.caracois = caracois;
      }
      g.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); });
      sombra.userData.semContorno = true; contornar(corpo, 0.018);
      g.scale.setScalar(p.esc * 1.05);
      cena.add(g);
      return { g, corpo, pe: pe.pv, pd: pd.pv, be, bd, sombra, eq, rot: 0 };
    }
    const gust = boneco(api.GUST, true);
    const fam = api.familia.map((f) => boneco(f, false));
    const ANG = { baixo: 0, dir: Math.PI / 2, cima: Math.PI, esq: -Math.PI / 2 };
    function animar(b, x, y, dir, passo, salto, dt) {
      const h = altura(tile(Math.floor(x), Math.floor(y)));
      b.g.position.set(x, h + (salto || 0), y);
      let alvo = ANG[dir] || 0, d = alvo - b.rot; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      b.rot += d * Math.min(1, dt * 14); b.g.rotation.y = b.rot;
      const a = passo ? Math.sin(passo * 3) * 0.7 : 0;
      b.pe.rotation.x = a; b.pd.rotation.x = -a; b.be.rotation.x = -a * 0.8; b.bd.rotation.x = a * 0.8;
      b.sombra.position.y = 0.02 - (salto || 0) / b.g.scale.y;
    }

    /* ---------- Golpe da espada, bolha do escudo, seta, gaivotas, nuvens, partículas ---------- */
    const golpe = new T3.Group(); cena.add(golpe);
    const arco = new T3.Mesh(new T3.TorusGeometry(1, 0.07, 6, 24, 2.4), new T3.MeshBasicMaterial({ color: 0xdff0ff, transparent: true, opacity: 0.9, blending: T3.AdditiveBlending, depthWrite: false }));
    arco.rotation.x = -Math.PI / 2; golpe.add(arco); golpe.visible = false;
    const bolha = new T3.Mesh(new T3.SphereGeometry(0.85, 16, 10), new T3.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.3, depthWrite: false }));
    cena.add(bolha); bolha.visible = false;
    const seta = new T3.Group(); cena.add(seta);
    (function () { const c = new T3.Mesh(new T3.ConeGeometry(0.2, 0.42, 4), new T3.MeshBasicMaterial({ color: 0xffd54a })); c.rotation.z = -Math.PI / 2; c.position.x = 0.12; seta.add(c); const h = new T3.Mesh(caixa(0.3, 0.1, 0.1), new T3.MeshBasicMaterial({ color: 0xffd54a })); h.position.x = -0.14; seta.add(h); })();
    const gaivotas = api.gaivotas.map(() => { const g = new T3.Group(); const m = new T3.MeshBasicMaterial({ color: 0xffffff }); const e = new T3.Mesh(caixa(0.4, 0.03, 0.14), m); e.position.x = -0.2; const d = new T3.Mesh(caixa(0.4, 0.03, 0.14), m); d.position.x = 0.2; const ae = new T3.Group(), ad = new T3.Group(); ae.add(e); ad.add(d); g.add(ae, ad); g.userData = { ae, ad }; cena.add(g); return g; });
    const nuvensG = [];
    const matNuvem = lamb("#a7b1bf"), geoBola = new T3.SphereGeometry(1, 16, 12);
    function nuvem3d() {
      const g = new T3.Group();
      [[-0.22, 0.05, 0, 0.26], [0.05, 0.14, 0, 0.32], [0.28, 0.02, 0, 0.24], [0, -0.06, 0.08, 0.27]].forEach(([x, y, z, r]) => { const b = new T3.Mesh(geoBola, matNuvem); b.position.set(x, y, z); b.scale.setScalar(r); g.add(b); });
      const olho = (x) => { const o = new T3.Mesh(caixa(0.12, 0.03, 0.02), lamb("#4d5866")); o.position.set(x, 0.02, 0.33); g.add(o); };
      olho(-0.1); olho(0.12); cena.add(g); return g;
    }
    const MAX_P = 500;
    const parts = new T3.InstancedMesh(new T3.SphereGeometry(0.06, 8, 6), new T3.MeshBasicMaterial({ color: 0xffffff }), MAX_P); parts.count = 0; parts.frustumCulled = false; cena.add(parts);

    /* ---------- Atualização de tiles (silvas cortadas, flores novas) ---------- */
    function tileMudou(x, y) {
      pôrBloco(x, y); solo.instanceMatrix.needsUpdate = true; solo.instanceColor.needsUpdate = true;
      decorar();
    }


    /* Copas das árvores entre a câmara e o Gustavo ficam baixinhas (para ele nunca desaparecer) */
    function recortarArvores(px, pz) {
      let mudou = false;
      arvores.forEach((a, i) => {
        const dz = a.z - pz, dx = Math.abs(a.x - px);
        const tapa = dz > -0.6 && dz < 3.2 && dx < 1.7;
        if (tapa === recortadas.has(i)) return;
        mudou = true; if (tapa) recortadas.add(i); else recortadas.delete(i);
        const k = tapa ? 0.25 : 1;
        mat4.compose(v3.set(a.x, a.h + 0.65, a.z), q0, esc3.set(0.95 * a.s, 0.85 * a.s * k, 0.95 * a.s)); copa.setMatrixAt(i, mat4);
        mat4.compose(v3.set(a.x, a.h + 0.65 + 0.8 * a.s * k, a.z), q0, esc3.set(0.55 * a.s, 0.5 * a.s * (tapa ? 0 : 1), 0.55 * a.s)); copa2.setMatrixAt(i, mat4);
      });
      if (mudou) { copa.instanceMatrix.needsUpdate = true; copa2.instanceMatrix.needsUpdate = true; }
    }

    /* ---------- Desenho de cada fotograma ---------- */
    const alvoCam = new T3.Vector3(), posCam = new T3.Vector3(); let primeiro = true, ultimo = performance.now();
    function desenhar() {
      const agora = performance.now(), dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      const t = api.tempo(), est = api.estado(), jog = api.jog, mov = api.pref.movimento;
      // água
      const pos = geoAgua.attributes.position;
      if (mov) { for (let i = 0; i < pos.count; i++) { const x = baseAgua[i * 3], z = baseAgua[i * 3 + 2]; pos.array[i * 3 + 1] = Math.sin(t * 1.6 + x * 0.7 + z * 0.5) * 0.06; } pos.needsUpdate = true; }
      // personagens
      const salto = jog.salto > 0 ? Math.sin((1 - jog.salto / 0.45) * Math.PI) * 0.5 : 0;
      animar(gust, jog.x, jog.y, jog.dir, jog.passo, salto, dt);
      if (!api.focoCam()) recortarArvores(jog.x, jog.y);
      const eq = gust.eq, tem = api.tem;
      eq.capacete.visible = tem("capacete"); eq.caracois.visible = !tem("capacete"); eq.cinto.visible = tem("cinto"); eq.escudo.visible = tem("escudo"); eq.espada.visible = tem("espada");
      const corBota = tem("botas") ? 0x7a4a24 : 0x2b3a55; eq.botaE.material.color.setHex(corBota); eq.botaD.material.color.setHex(corBota);
      eq.lamina.material.emissive.setHex(tem("luz") ? 0xfff0a0 : 0x000000);
      api.familia.forEach((f, i) => animar(fam[i], f.x, f.y, f.dir || "baixo", f.passo || 0, 0, dt));
      // golpe
      golpe.visible = jog.golpe > 0;
      if (golpe.visible) {
        const p = 1 - jog.golpe / 0.32, alc = api.alcance() * 0.85, phi = { dir: 0, baixo: Math.PI / 2, esq: Math.PI, cima: -Math.PI / 2 }[jog.dir];
        golpe.position.set(jog.x, gust.g.position.y + 0.55, jog.y); golpe.scale.setScalar(alc);
        golpe.rotation.y = -phi - 1.2 + (0.7 - p * 1.4); arco.material.opacity = 0.9 * (1 - p * 0.7);
        arco.material.color.setHex(tem("luz") ? 0xfff09a : 0xdff0ff);
        gust.bd.rotation.x = -2.2 + p * 2.4;
      }
      bolha.visible = jog.escudoFlash > 0; if (bolha.visible) { bolha.position.set(jog.x, gust.g.position.y + 0.6, jog.y); bolha.material.opacity = jog.escudoFlash * 0.6; }
      // paragens, baús, conchas, lâmpadas
      atualizarParagens(est.fase, t);
      baus.forEach((b, i) => { const aberto = est.baus.includes(i); b.ang += ((aberto ? -1.9 : 0) - b.ang) * Math.min(1, dt * 6); b.piv.rotation.x = b.ang; b.ouro.visible = aberto; });
      const lista = api.conchas();
      if (conchasMesh) { lista.forEach((c, i) => { const ok = !est.conchas.includes(c.id); const b = mov ? Math.sin(t * 3 + c.id) * 0.04 : 0; mat4.compose(v3.set(c.x, altura(S) + 0.1 + b, c.y), q0, esc3.setScalar(ok ? 1 : 0)); conchasMesh.setMatrixAt(i, mat4); }); conchasMesh.instanceMatrix.needsUpdate = true; }
      const acesas = est.fase >= 5;
      lampadas.forEach((l) => { l.cab.material = acesas ? matLampOn : matLampOff; l.luz.intensity = acesas ? 2.2 : 0; });
      // nuvens cinzentas
      const ns = api.nuvens();
      while (nuvensG.length < ns.length) nuvensG.push(nuvem3d());
      nuvensG.forEach((g, i) => { const n = ns[i]; g.visible = !!n && !(n.renasce > 0); if (!g.visible) return; g.position.set(n.x, altura(tile(Math.floor(n.x), Math.floor(n.y))) + 0.95 + (mov ? Math.sin(n.f * 2) * 0.08 : 0), n.y); g.lookAt(cam.position.x, g.position.y, cam.position.z); });
      // partículas
      const ps = api.particulas(); let n = 0;
      for (const p of ps) { if (n >= MAX_P) break; const s = (p.tipo === "gema" ? 1.6 : p.tipo === "flor" ? 1.5 : 0.9) * Math.min(1, p.vida * 2); mat4.compose(v3.set(p.x, altura(tile(Math.floor(p.x), Math.floor(p.y))) + 0.2 + p.z * 0.5, p.y), q0, esc3.setScalar(s)); parts.setMatrixAt(n, mat4); cor.set(p.cor); parts.setColorAt(n, cor); n++; }
      parts.count = n; parts.instanceMatrix.needsUpdate = true; if (parts.instanceColor) parts.instanceColor.needsUpdate = true;
      // gaivotas
      api.gaivotas.forEach((gv, i) => { const g = gaivotas[i]; g.position.set(gv.x, 2.6 + Math.sin(gv.f * 0.2) * 0.3, gv.y); g.scale.setScalar(0.6); const a = Math.sin(gv.f) * 0.5; g.userData.ae.rotation.z = a; g.userData.ad.rotation.z = -a; });
      // seta para a próxima placa
      seta.visible = false;
      if (est.fase < api.FASE_POS.length && !api.emCena()) {
        const [fx, fy] = api.FASE_POS[est.fase], dx = fx - jog.x, dy = fy - jog.y, d = Math.hypot(dx, dy);
        if (d > 2.2) { const a = Math.atan2(dy, dx), b = mov ? Math.sin(t * 6) * 0.1 : 0; seta.visible = true; seta.position.set(jog.x + Math.cos(a) * (1.25 + b), gust.g.position.y + 0.35, jog.y + Math.sin(a) * (1.25 + b)); seta.rotation.y = -a; }
      }
      // farol
      const aceso = api.farolAceso();
      vidro.material.emissive.setHex(aceso ? 0xfff2a0 : 0x000000); feixe.visible = aceso; luzFarol.intensity = aceso ? 3 : 0;
      if (aceso) farol.userData.piv.rotation.y = mov ? t * 1.2 : 2.6;
      // escuridão da floresta e lanterna
      const esc = api.escuro();
      corFundo.copy(CEU).lerp(NOITE, esc); cena.fog.near = 24 - esc * 14; cena.fog.far = 46 - esc * 26;
      hemi.intensity = 1.25 * (1 - esc * 0.85); sol.intensity = 1.7 * (1 - esc * 0.9);
      const raio = tem("luz") ? 7 : tem("lanterna") ? 5.5 : 3;
      lanterna.distance = raio; lanterna.intensity = esc > 0.03 ? (tem("lanterna") ? 3.2 : 1.4) * Math.min(1, esc * 1.4) : 0;
      lanterna.position.set(jog.x, gust.g.position.y + 1.4, jog.y + 0.2);
      // câmara (segue o Gustavo; no fim, mostra o farol)
      const foco = api.focoCam(), deitado = window.innerWidth >= window.innerHeight;
      if (foco) alvoCam.set(foco.x, 2.2, foco.y); else alvoCam.set(jog.x, gust.g.position.y + 0.5, jog.y);
      const off = foco ? new T3.Vector3(0, 7, 13) : deitado ? new T3.Vector3(0, 6.4, 7.4) : new T3.Vector3(0, 9.2, 8.8);
      const desejo = v3.copy(alvoCam).add(off);
      if (primeiro) { posCam.copy(desejo); primeiro = false; } else posCam.lerp(desejo, Math.min(1, dt * 4));
      cam.position.copy(posCam); cam.lookAt(posCam.x, alvoCam.y, posCam.z - off.z);
      sol.position.set(posCam.x - 14, 22, posCam.z); sol.target.position.set(posCam.x, 0, posCam.z - off.z);
      ren.render(cena, cam);
    }

    function reconstruir() { construirSolo(); construirConchas(); primeiro = true; }
    function destruir() { window.removeEventListener("resize", redimensionar); ren.dispose(); cv.remove(); }
    reconstruir();
    return { desenhar, tileMudou, reconstruir, destruir, canvas: cv };
  }
})();
