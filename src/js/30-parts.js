/* ================= 部品 ================= */

/* 面に窓のグリッドを貼る。faceZ はローカルの面のZ座標、normal は外向き(+1/-1)
   窓枠（4辺）・ガラス・方立て・水切りまで作る */
function addWindows(parent, rng, faceW, faceH, faceZ, normal, cols, rows, opt){
  opt = opt || {};
  const ww = opt.ww || 0.7, wh = opt.wh || 0.9;
  const gapx = faceW/cols, gapy = faceH/rows;
  const y0 = opt.y0 || 0;
  const fm = opt.frameMat || MAT.frame;
  for (let r=0; r<rows; r++){
    for (let c=0; c<cols; c++){
      if (opt.skip && opt.skip(c,r)) continue;
      const gw = Math.min(ww, gapx*0.72), gh = Math.min(wh, gapy*0.7);
      const cx = -faceW/2 + gapx*(c+0.5) + (opt.x0 || 0);
      const cy = y0 + gapy*(r+0.5);
      const lit = rng() < (opt.litRatio ?? 0.25);
      const gm = lit ? (opt.cool ? MAT.glassCool : MAT.glassLit) : MAT.glass;
      B(parent, gw, gh, 0.04, gm, cx, cy, faceZ + normal*0.01);
      const t = 0.07, zf = faceZ + normal*0.05;
      B(parent, gw+2*t, t, 0.1, fm, cx, cy + gh/2 + t/2, zf);
      B(parent, gw+2*t, t, 0.1, fm, cx, cy - gh/2 - t/2, zf);
      B(parent, t, gh, 0.1, fm, cx - gw/2 - t/2, cy, zf);
      B(parent, t, gh, 0.1, fm, cx + gw/2 + t/2, cy, zf);
      if (gw > 0.75) B(parent, 0.045, gh, 0.06, fm, cx, cy, faceZ + normal*0.04);
      if (opt.sill) B(parent, gw+0.3, 0.06, 0.2, fm, cx, cy - gh/2 - t - 0.03, faceZ + normal*0.11);
      if (opt.amado && rng() < 0.35){   // 雨戸の戸袋
        const side = rng()<0.5 ? -1 : 1;
        B(parent, gw*0.5, gh+0.16, 0.16, opt.amado, cx + side*(gw*0.75 + t), cy, faceZ + normal*0.08);
      }
    }
  }
}

/* 切妻屋根：棟はローカル X 方向（長さ len）、勾配は ±Z（スパン span）。厚みと軒の出つき */
function gableRoof(parent, len, span, h, mat, wallMat, x, y, z, ry){
  const g = new THREE.Group(); g.position.set(x,y,z); g.rotation.y = ry || 0; parent.add(g);
  const oh = 0.5, half = span/2 + oh, ang = Math.atan2(h, span/2);
  const sl = half/Math.cos(ang), th = 0.16, L = len + 0.7;
  for (const s of [-1,1]){
    const p = box(L, th, sl, mat);
    p.rotation.x = s*ang;
    p.position.set(0, h - Math.tan(ang)*half/2 + th/2, s*half/2);
    g.add(p);
    // 鼻隠し（軒先の板）
    B(g, L, 0.2, 0.08, MAT.trim, 0, h - Math.tan(ang)*half + 0.02, s*(half - 0.02));
  }
  B(g, L+0.04, 0.14, 0.26, mat, 0, h + 0.1, 0);    // 棟
  // 妻壁（三角形の外壁）
  const tri = new THREE.Mesh(cachedGeo(`gtri${span.toFixed(2)},${h.toFixed(2)}`, ()=>{
    const e = extrudeGeo([[-span/2,0],[span/2,0],[0,h]], 1); e.rotateY(Math.PI/2); return e;
  }), wallMat);
  tri.scale.x = len; g.add(tri);
  return g;
}
/* 寄棟屋根：ローカルで幅 w(X)・奥行 d(Z)、軒の出つき */
function hipRoof(parent, w, d, h, mat, x, y, z){
  const oh = 0.5, W = w/2 + oh, D = d/2 + oh;
  const r = Math.max(0, W - D);           // 棟の半分の長さ
  const hh = h * (D / (d/2));             // 軒の出のぶん高さを延長
  const y0 = h - hh;
  const P = (a,b,c) => [a, b, c];
  const tris = [
    [P(-W,y0,-D), P(W,y0,-D), P(r,h,0)], [P(-W,y0,-D), P(r,h,0), P(-r,h,0)],
    [P(W,y0,D), P(-W,y0,D), P(-r,h,0)],  [P(W,y0,D), P(-r,h,0), P(r,h,0)],
    [P(-W,y0,D), P(-W,y0,-D), P(-r,h,0)],
    [P(W,y0,-D), P(W,y0,D), P(r,h,0)],
    // 軒裏
    [P(-W,y0,-D), P(W,y0,D), P(W,y0,-D)], [P(-W,y0,-D), P(-W,y0,D), P(W,y0,D)],
  ];
  const m = new THREE.Mesh(polyGeo(tris, new THREE.Vector3(0, y0 + 0.02, 0)), mat);
  m.position.set(x, y, z); parent.add(m);
  // 鼻隠し
  for (const s of [-1,1]){
    B(parent, 2*W, 0.2, 0.08, MAT.trim, x, y + y0 - 0.06, z + s*D);
    B(parent, 0.08, 0.2, 2*D, MAT.trim, x + s*W, y + y0 - 0.06, z);
  }
  return m;
}

/* ---------- 木 ---------- */
function tree(rng, scale, leafMat){
  const g = new THREE.Group();
  const th = range(rng,1.2,2.0)*scale;
  C(g, 0.08*scale, 0.14*scale, th + 0.6*scale, 6, MAT.trunk, 0, 0, 0);
  const base = range(rng,0.85,1.3)*scale;
  const mat = leafMat || pick(rng, GREENS);
  const n = 3 + (rng()*3|0);
  for (let i=0; i<n; i++){
    const a = i/n*Math.PI*2 + rng(), rr = i ? base*range(rng,0.55,0.8) : base;
    const leaf = sphere(rr, 1, mat);
    leaf.position.set(i ? Math.cos(a)*base*0.55 : 0, th + base*0.6 + (i ? range(rng,-0.3,0.5)*base : 0.2*base), i ? Math.sin(a)*base*0.55 : 0);
    leaf.scale.y *= 0.85;
    leaf.rotation.set(rng()*3, rng()*3, 0);
    g.add(leaf);
  }
  return g;
}
/* 槙などの細長い庭木 */
function conifer(rng, scale){
  const g = new THREE.Group();
  C(g, 0.06*scale, 0.1*scale, 0.8*scale, 5, MAT.trunk, 0, 0, 0);
  const mat = pick(rng, GREENS);
  const tiers = 3 + (rng()*2|0);
  for (let i=0; i<tiers; i++){
    const r = (0.75 - i*0.13)*scale, h = 0.9*scale;
    const m = new THREE.Mesh(cachedGeo('cone7', ()=> new THREE.ConeGeometry(1,1,7)), mat);
    m.scale.set(r, h, r); m.position.y = 0.8*scale + i*0.55*scale + h/2;
    g.add(m);
  }
  return g;
}
function hedge(rng, len){
  const g = new THREE.Group(), h = range(rng,0.8,1.2), mat = pick(rng,GREENS);
  Bb(g, len, h, 0.6, mat, 0, 0, 0);
  // 上部を少し丸く見せる
  for (let x=-len/2+0.4; x<len/2-0.2; x+=0.8){
    const s = sphere(0.42, 0, mat); s.position.set(x + range(rng,-0.1,0.1), h - 0.05, 0); s.scale.y *= 0.45; g.add(s);
  }
  return g;
}
function planter(rng){
  const g = new THREE.Group();
  const r = range(rng,0.16,0.26);
  C(g, r, r*0.8, r*1.4, 8, pick(rng,[MAT.terracotta, MAT.potGray]), 0, 0, 0);
  const leaf = sphere(r*1.35, 0, pick(rng,GREENS)); leaf.position.y = r*1.4 + r*0.7; g.add(leaf);
  return g;
}
MAT.terracotta = M(0xa65c3c, {r:0.9});
MAT.potGray = M(0x8e8f8c, {r:0.9});

/* ---------- 車（ローカル：長さ X、幅 Z、前が +X） ---------- */
const CAR_TYPES = {
  kei:   {W:1.47, body:[[-1.7,0.3],[1.7,0.3],[1.72,0.9],[-1.72,0.98]],
          cabin:[[1.66,0.88],[1.12,1.58],[-1.54,1.62],[-1.7,0.96]], roof:[-0.2,1.63,2.66], wb:1.15},
  sedan: {W:1.75, body:[[-2.25,0.3],[2.25,0.3],[2.28,0.68],[2.05,0.88],[-2.25,0.94],[-2.28,0.68]],
          cabin:[[0.98,0.86],[0.36,1.36],[-0.86,1.38],[-1.7,0.92]], roof:[-0.25,1.38,1.25], wb:1.4},
  van:   {W:1.8,  body:[[-2.35,0.3],[2.35,0.3],[2.38,0.9],[2.02,1.02],[-2.36,1.02],[-2.38,0.88]],
          cabin:[[2.0,0.98],[1.3,1.72],[-2.28,1.76],[-2.34,1.0]], roof:[-0.5,1.77,3.55], wb:1.5},
};
function car(rng){
  const type = pick(rng, ['kei','kei','sedan','van']);
  const T = CAR_TYPES[type], g = new THREE.Group();
  const paint = pick(rng, CAR_COLORS);
  g.add(new THREE.Mesh(cachedGeo('carB'+type, ()=> extrudeGeo(T.body, T.W)), paint));
  g.add(new THREE.Mesh(cachedGeo('carC'+type, ()=> extrudeGeo(T.cabin, T.W-0.12)), MAT.carGlass));
  B(g, T.roof[2], 0.07, T.W-0.08, paint, T.roof[0], T.roof[1], 0);
  // ピラー
  const cx = T.cabin.map(p=>p[0]);
  B(g, 0.12, (T.roof[1]-0.95), T.W-0.1, paint, (Math.max(...cx)+Math.min(...cx))/2 - 0.1, (T.roof[1]+0.95)/2, 0);
  const L = Math.max(...T.body.map(p=>p[0]));
  for (const sx of [-1,1]) for (const sz of [-1,1]){
    const w = disc(0.31, 0.2, 14, MAT.tire); w.position.set(sx*T.wb, 0.31, sz*(T.W/2 - 0.06)); g.add(w);
    const hub = disc(0.16, 0.22, 10, MAT.rail); hub.position.copy(w.position); g.add(hub);
  }
  for (const sz of [-1,1]){
    B(g, 0.06, 0.13, 0.32, MAT.headlight, L+0.02, 0.75, sz*(T.W/2-0.3));
    B(g, 0.06, 0.13, 0.26, MAT.taillight, -L-0.02, 0.8, sz*(T.W/2-0.25));
  }
  B(g, 0.12, 0.18, T.W, MAT.black, L+0.01, 0.42, 0);      // バンパー
  B(g, 0.12, 0.18, T.W, MAT.black, -L-0.01, 0.42, 0);
  return g;
}

/* ---------- 自転車（ママチャリ。ローカル：長さ X） ---------- */
function bicycle(rng){
  const g = new THREE.Group();
  const fm = pick(rng, [MAT.frameDk, MAT.signW, MAT.red, MAT.blue, M(0x5a7a5a,{r:0.5})]);
  const wheelGeo = cachedGeo('bikeW', ()=> new THREE.TorusGeometry(0.31, 0.022, 5, 18));
  for (const x of [-0.52, 0.52]){
    const w = new THREE.Mesh(wheelGeo, MAT.tire); w.position.set(x, 0.33, 0); g.add(w);
  }
  rod(g, -0.52,0.33,0, -0.1,0.33,0, 0.018, fm);       // チェーンステー
  rod(g, -0.1,0.33,0, -0.18,0.82,0, 0.022, fm);       // シートチューブ
  rod(g, -0.1,0.33,0, 0.42,0.72,0, 0.024, fm);        // ダウンチューブ（低床）
  rod(g, 0.42,0.72,0, 0.52,0.33,0, 0.02, fm);         // フォーク
  rod(g, 0.42,0.72,0, 0.36,1.0,0, 0.02, fm);          // ハンドルポスト
  rod(g, 0.36,1.0,-0.28, 0.36,1.0,0.28, 0.015, MAT.frameDk);
  Bb(g, 0.26, 0.06, 0.14, MAT.black, -0.2, 0.82, 0);   // サドル
  if (rng() < 0.7) Bb(g, 0.3, 0.24, 0.36, MAT.frameDk, 0.62, 0.78, 0);  // 前かご
  B(g, 0.5, 0.025, 0.22, MAT.frameDk, -0.52, 0.66, 0);  // 泥よけ・荷台
  return g;
}

/* ---------- 人（縮尺の目安になるマネキン。ローカル：前が +Z） ---------- */
function person(rng){
  const g = new THREE.Group();
  const H = rng() < 0.12 ? range(rng,1.1,1.35) : range(rng,1.55,1.82);
  const k = H/1.7;
  const mat = rng() < 0.5 ? MAT.person : MAT.personDk;
  const walk = rng() < 0.6, sw = walk ? range(rng,0.25,0.45) : 0.04;
  const legL = 0.82*k, hip = legL + 0.04*k;
  for (const s of [-1,1]){
    const leg = new THREE.Group(); leg.position.set(s*0.09*k, hip, 0); leg.rotation.x = s*sw;
    const m = cyl(0.065*k, 0.05*k, legL, 6, mat); m.position.y = -legL/2; leg.add(m);
    const foot = box(0.1*k, 0.07*k, 0.24*k, MAT.personDk); foot.position.set(0, -legL + 0.035*k, 0.05*k); leg.add(foot);
    g.add(leg);
  }
  const torso = cyl(0.17*k, 0.14*k, 0.58*k, 8, mat); torso.position.y = hip + 0.29*k; torso.scale.z = 0.62; g.add(torso);
  const neck = cyl(0.045*k, 0.05*k, 0.08*k, 6, mat); neck.position.y = hip + 0.62*k; g.add(neck);
  const head = sphere(0.105*k, 1, mat); head.position.y = hip + 0.76*k; head.scale.multiply(new THREE.Vector3(0.9, 1.08, 1)); g.add(head);
  for (const s of [-1,1]){
    const arm = new THREE.Group(); arm.position.set(s*0.21*k, hip + 0.54*k, 0); arm.rotation.x = -s*sw*0.8; arm.rotation.z = s*0.06;
    const m = cyl(0.045*k, 0.038*k, 0.6*k, 6, mat); m.position.y = -0.3*k; arm.add(m);
    g.add(arm);
  }
  if (rng() < 0.25){   // 鞄
    const s = rng()<0.5?-1:1;
    Bb(g, 0.08*k, 0.28*k, 0.34*k, MAT.personDk, s*0.27*k, hip - 0.1*k, 0);
  }
  return g;
}

/* ---------- 自販機 ---------- */
function vendingMachine(rng){
  const g = new THREE.Group();
  const body = pick(rng, [M(0xd42b2b,{r:0.4}), M(0x2255aa,{r:0.4}), M(0xeeeeee,{r:0.4}), M(0x2b6b3a,{r:0.4})]);
  Bb(g, 1.0, 1.83, 0.75, body, 0, 0, 0);
  B(g, 0.86, 0.72, 0.04, M(0xf5f3ea,{r:0.3, glow:1.6, glowHex:0xf4f8ff}), 0, 1.32, -0.385);   // 商品見本（光る）
  B(g, 0.5, 0.22, 0.05, MAT.black, -0.12, 0.3, -0.39);   // 取り出し口
  B(g, 0.18, 0.4, 0.05, M(0x9aa0a6,{r:0.4,m:0.5}), 0.3, 0.8, -0.39);
  return g;
}

/* ---------- 標識（ローカル：表が -Z） ---------- */
function roadSign(rng, type, parent, x, y0, z, ry){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry || 0; parent.add(g);
  C(g, 0.035, 0.035, 2.75, 8, MAT.pole, 0, 0, 0);
  const face = (mat, r, dz) => { const d = disc(r, 0.025, 20, mat); d.position.set(0, 2.45, -0.06 - dz); g.add(d); };
  if (type === 'speed'){ face(MAT.red, 0.3, 0); face(MAT.signW, 0.23, 0.005); B(g, 0.22, 0.1, 0.01, MAT.blue, 0, 2.45, -0.075); }
  else if (type === 'noparking'){ face(MAT.red, 0.3, 0); face(MAT.blue, 0.24, 0.005); const s = box(0.06, 0.48, 0.01, MAT.red); s.position.set(0,2.45,-0.075); s.rotation.z = Math.PI/4; g.add(s); }
  else if (type === 'stop'){
    const tri = new THREE.Mesh(cachedGeo('stopTri', ()=> extrudeGeo([[-0.42,0.36],[0.42,0.36],[0,-0.36]], 0.03)), MAT.red);
    tri.position.set(0, 2.4, -0.07); g.add(tri);
    B(g, 0.36, 0.08, 0.01, MAT.signW, 0, 2.55, -0.09);
  } else if (type === 'ped'){
    B(g, 0.6, 0.6, 0.03, MAT.blue, 0, 2.45, -0.07);
    const tri = new THREE.Mesh(cachedGeo('pedTri', ()=> extrudeGeo([[-0.25,-0.2],[0.25,-0.2],[0,0.24]], 0.02)), MAT.signW);
    tri.position.set(0, 2.45, -0.09); g.add(tri);
  }
  return g;
}

/* ---------- カーブミラー（ローカル：鏡が -Z を向く） ---------- */
function curveMirror(parent, x, y0, z, ry){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; parent.add(g);
  C(g, 0.045, 0.045, 3.0, 8, MAT.orange, 0, 0, 0);
  const rim = disc(0.42, 0.08, 20, MAT.orange); rim.position.set(0, 3.0, -0.12); rim.rotation.x = 0.12; g.add(rim);
  const m = disc(0.37, 0.04, 20, MAT.mirror); m.position.set(0, 3.0, -0.17); m.rotation.x = 0.12; g.add(m);
  B(g, 0.06, 0.06, 0.16, MAT.orange, 0, 3.0, -0.05);
  return g;
}

/* ---------- 街灯（ローカル：腕が -X 方向へ伸びる） ---------- */
function streetLamp(parent, x, y0, z, ry){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; parent.add(g);
  C(g, 0.08, 0.1, 6.6, 10, MAT.steelDk, 0, 0, 0);
  rod(g, 0, 6.5, 0, -1.2, 6.9, 0, 0.05, MAT.steelDk);
  Bb(g, 0.62, 0.14, 0.3, MAT.steelDk, -1.35, 6.82, 0);
  Bb(g, 0.52, 0.04, 0.24, MAT.lamp, -1.35, 6.79, 0);
  lightPool(g, -1.6, 0, 0, 4.2);
  return g;
}

/* ---------- 光だまり（夜の地面） ---------- */
function lightPool(parent, x, y, z, r){
  const m = new THREE.Mesh(cachedGeo('poolPlane', ()=>{ const p = new THREE.PlaneGeometry(1,1); p.rotateX(-Math.PI/2); return p; }), MAT.pool);
  m.position.set(x, y + 0.04, z); m.scale.set(r*2, 1, r*2);
  parent.add(m); return m;
}
