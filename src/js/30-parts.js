/* ================= 部品 =================
   線画にしたときに「描き込み」として効く形（窓のサッシ・瓦の段・雨樋・葉の塊など）を
   なるべく実物の構造どおりに入れている。丸い物は分割を細かくして角が出ないようにする。 */

/* 面に窓のグリッドを貼る。faceZ はローカルの面のZ座標、normal は外向き(+1/-1)
   窓枠（4辺）・ガラス・引き違いのサッシ・水切り・雨戸の戸袋・面格子まで作る */
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
      // 外枠
      const t = 0.07, zf = faceZ + normal*0.05;
      B(parent, gw+2*t, t, 0.1, fm, cx, cy + gh/2 + t/2, zf);
      B(parent, gw+2*t, t, 0.1, fm, cx, cy - gh/2 - t/2, zf);
      B(parent, t, gh, 0.1, fm, cx - gw/2 - t/2, cy, zf);
      B(parent, t, gh, 0.1, fm, cx + gw/2 + t/2, cy, zf);
      // 引き違いの障子（2 枚のサッシ枠。手前と奥で少しずらす）
      if (gw > 0.6){
        const pw = gw/2 + 0.02, st = 0.035;
        for (const k of [-1, 1]){
          const px = cx + k*(gw/4 - 0.01), pz = faceZ + normal*(k < 0 ? 0.035 : 0.025);
          B(parent, pw, st, 0.03, fm, px, cy + gh/2 - st/2, pz);
          B(parent, pw, st, 0.03, fm, px, cy - gh/2 + st/2, pz);
          B(parent, st, gh, 0.03, fm, px - pw/2 + st/2, cy, pz);
          B(parent, st, gh, 0.03, fm, px + pw/2 - st/2, cy, pz);
        }
        B(parent, 0.012, 0.05, 0.02, MAT.frameDk, cx - 0.04, cy, faceZ + normal*0.055);   // クレセント錠
      }
      if (gh > 1.7) B(parent, gw, 0.04, 0.05, fm, cx, cy + gh*0.18, faceZ + normal*0.04);   // 掃き出し窓の横桟
      if (opt.sill) B(parent, gw+0.3, 0.06, 0.2, fm, cx, cy - gh/2 - t - 0.03, faceZ + normal*0.11);
      if (opt.amado && rng() < 0.35){   // 雨戸の戸袋（縦の筋入り）
        const side = rng()<0.5 ? -1 : 1, bx = cx + side*(gw*0.75 + t), bw = gw*0.5;
        B(parent, bw, gh+0.16, 0.16, opt.amado, bx, cy, faceZ + normal*0.08);
        for (let i=1; i<4; i++) B(parent, 0.015, gh+0.1, 0.01, MAT.frameDk, bx - bw/2 + i*bw/4, cy, faceZ + normal*0.165);
        B(parent, gw + 0.05, 0.1, 0.12, opt.amado, cx, cy + gh/2 + t + 0.06, faceZ + normal*0.07);   // 雨戸のレール
      }
      if (opt.grille && rng() < opt.grille){   // 面格子
        const n = Math.max(4, Math.round(gw/0.11));
        for (let i=0; i<=n; i++) B(parent, 0.025, gh + 0.1, 0.025, MAT.frameDk, cx - gw/2 + i*gw/n, cy, faceZ + normal*0.14);
        for (const yy of [-gh/2 - 0.02, gh/2 + 0.02]) B(parent, gw + 0.06, 0.03, 0.04, MAT.frameDk, cx, cy + yy, faceZ + normal*0.14);
      }
    }
  }
}

/* 屋根面に瓦（スレート）の段を並べる。A,B＝軒先の両端、D,C＝その上の棟側の端（三角形なら C=D） */
const _ra = new THREE.Vector3(), _rb = new THREE.Vector3(), _rn = new THREE.Vector3(), _rt = new THREE.Vector3();
function roofRows(parent, A, B, C, D, mat, step){
  const a = new THREE.Vector3(...A), b = new THREE.Vector3(...B), c = new THREE.Vector3(...C), d = new THREE.Vector3(...D);
  _rn.subVectors(b, a).cross(_rt.subVectors(d, a)).normalize();
  if (_rn.y < 0) _rn.negate();
  const len = Math.max(a.distanceTo(d), b.distanceTo(c));
  for (let f = step/len; f < 0.985; f += step/len){
    _ra.lerpVectors(a, d, f).addScaledVector(_rn, 0.03);
    _rb.lerpVectors(b, c, f).addScaledVector(_rn, 0.03);
    if (_ra.distanceTo(_rb) < 0.25) continue;
    rod(parent, _ra.x, _ra.y, _ra.z, _rb.x, _rb.y, _rb.z, 0.024, mat, 4);
  }
}

/* 切妻屋根：棟はローカル X 方向（長さ len）、勾配は ±Z（スパン span）。厚み・軒の出・瓦の段・破風・雨樋つき */
function gableRoof(parent, len, span, h, mat, wallMat, x, y, z, ry){
  const g = new THREE.Group(); g.position.set(x,y,z); g.rotation.y = ry || 0; parent.add(g);
  const oh = 0.5, half = span/2 + oh, ang = Math.atan2(h, span/2), tn = Math.tan(ang);
  const sl = half/Math.cos(ang), th = 0.16, L = len + 0.7;
  const yTop = zz => h + th/Math.cos(ang) - tn*Math.abs(zz);
  for (const s of [-1,1]){
    const p = box(L, th, sl, mat);
    p.rotation.x = s*ang;
    p.position.set(0, h - tn*half/2 + th/2, s*half/2);
    g.add(p);
    // 瓦の段
    roofRows(g, [-L/2, yTop(half), s*half], [L/2, yTop(half), s*half], [L/2, yTop(0.12), s*0.12], [-L/2, yTop(0.12), s*0.12], mat, 0.3);
    // 鼻隠し・軒樋
    B(g, L, 0.2, 0.08, MAT.trim, 0, h - tn*half + 0.02, s*(half - 0.02));
    rod(g, -L/2, h - tn*half - 0.1, s*(half + 0.07), L/2, h - tn*half - 0.1, s*(half + 0.07), 0.065, MAT.frame, 8);
    // 破風板（妻側の斜めの板）
    for (const e of [-1, 1]) rod(g, e*(L/2 + 0.03), yTop(half) - 0.12, s*half, e*(L/2 + 0.03), yTop(0) - 0.06, 0, 0.07, MAT.trim, 4);
  }
  rod(g, -L/2 - 0.02, h + th + 0.08, 0, L/2 + 0.02, h + th + 0.08, 0, 0.13, mat, 10);   // 棟
  // 妻壁（三角形の外壁）と換気口
  const tri = new THREE.Mesh(cachedGeo(`gtri${span.toFixed(2)},${h.toFixed(2)}`, ()=>{
    const e = extrudeGeo([[-span/2,0],[span/2,0],[0,h]], 1); e.rotateY(Math.PI/2); return e;
  }), wallMat);
  tri.scale.x = len; g.add(tri);
  if (h > 0.9) for (const e of [-1, 1]) B(g, 0.06, 0.32, 0.42, MAT.frameDk, e*(len/2 + 0.03), h*0.45, 0);
  return g;
}
/* 寄棟屋根：ローカルで幅 w(X)・奥行 d(Z)、軒の出・瓦の段・隅棟・雨樋つき */
function hipRoof(parent, w, d, h, mat, x, y, z){
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
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
  g.add(new THREE.Mesh(polyGeo(tris, new THREE.Vector3(0, y0 + 0.02, 0)), mat));
  // 瓦の段（4 面）
  roofRows(g, P(-W,y0,-D), P(W,y0,-D), P(r,h,0), P(-r,h,0), mat, 0.3);
  roofRows(g, P(W,y0,D), P(-W,y0,D), P(-r,h,0), P(r,h,0), mat, 0.3);
  roofRows(g, P(-W,y0,D), P(-W,y0,-D), P(-r,h,0), P(-r,h,0), mat, 0.3);
  roofRows(g, P(W,y0,-D), P(W,y0,D), P(r,h,0), P(r,h,0), mat, 0.3);
  // 隅棟・棟
  for (const sx of [-1,1]) for (const sz of [-1,1]) rod(g, sx*W, y0 + 0.05, sz*D, sx*r, h + 0.06, 0, 0.08, mat, 6);
  if (r > 0.05) rod(g, -r, h + 0.06, 0, r, h + 0.06, 0, 0.1, mat, 8);
  // 鼻隠し・軒樋
  for (const s of [-1,1]){
    B(g, 2*W, 0.2, 0.08, MAT.trim, 0, y0 - 0.06, s*D);
    B(g, 0.08, 0.2, 2*D, MAT.trim, s*W, y0 - 0.06, 0);
    rod(g, -W, y0 - 0.14, s*(D + 0.07), W, y0 - 0.14, s*(D + 0.07), 0.065, MAT.frame, 8);
    rod(g, s*(W + 0.07), y0 - 0.14, -D, s*(W + 0.07), y0 - 0.14, D, 0.065, MAT.frame, 8);
  }
  return g;
}

/* ---------- 木 ----------
   幹と枝、なめらかな葉の塊を外側に重ねて「もこもこ」した輪郭にする（漫画の木の描き方に近い）。
   detail 0 は山の斜面など数の多い木向けの軽い版。 */
function tree(rng, scale, leafMat, detail){
  const g = new THREE.Group(), d = detail ?? 1;
  const th = range(rng,1.3,2.1)*scale;            // 枝分かれまでの高さ
  const R = range(rng,0.95,1.35)*scale, Ry = R*range(rng,0.8,1.05);
  const mat = leafMat || pick(rng, GREENS);
  C(g, 0.06*scale, 0.15*scale, th + Ry*0.8, 8, MAT.trunk, 0, 0, 0);
  const cy = th + Ry*0.95;
  if (d){
    for (let i=0; i<3; i++){
      const a = rng()*Math.PI*2;
      rod(g, 0, th*0.8, 0, Math.cos(a)*R*0.55, cy - Ry*0.1, Math.sin(a)*R*0.55, 0.035*scale, MAT.trunk, 6);
    }
  }
  const core = sphere(R*0.78, d ? 1 : 0, mat); core.position.set(0, cy, 0); core.scale.y *= Ry/R; g.add(core);
  const n = d ? 14 + (rng()*8|0) : 6;
  for (let i=0; i<n; i++){
    const phi = rng()*Math.PI*2, ct = range(rng, -0.4, 1), st = Math.sqrt(1 - ct*ct);
    const c = sphere(R*range(rng, 0.3, 0.48), 0, mat);
    c.position.set(Math.cos(phi)*st*R*0.72, cy + ct*Ry*0.68, Math.sin(phi)*st*R*0.72);
    c.scale.y *= range(rng, 0.8, 1);
    g.add(c);
  }
  return g;
}
/* 槙・杉などの細長い木（段になった円錐） */
function conifer(rng, scale){
  const g = new THREE.Group();
  C(g, 0.06*scale, 0.1*scale, 1.2*scale, 6, MAT.trunk, 0, 0, 0);
  const mat = pick(rng, GREENS);
  const tiers = 3 + (rng()*2|0);
  const coneGeo = cachedGeo('cone28', ()=> new THREE.ConeGeometry(1, 1, 28, 1, false));
  for (let i=0; i<tiers; i++){
    const r = (0.78 - i*0.13)*scale, h = 0.95*scale;
    const m = new THREE.Mesh(coneGeo, mat);
    m.scale.set(r, h, r); m.position.y = 0.8*scale + i*0.55*scale + h/2;
    m.rotation.y = rng()*3;
    g.add(m);
  }
  return g;
}
/* 生垣：刈り込んだ箱の上と前に、葉の塊を並べる */
function hedge(rng, len){
  const g = new THREE.Group(), h = range(rng,0.8,1.2), mat = pick(rng,GREENS);
  Bb(g, len, h*0.85, 0.55, mat, 0, 0, 0);
  for (let x=-len/2+0.3; x<len/2-0.15; x+=0.45){
    const s = sphere(0.3, 0, mat); s.position.set(x + range(rng,-0.06,0.06), h*0.85, range(rng,-0.05,0.05)); s.scale.y *= 0.55; g.add(s);
    if (rng() < 0.6){ const f = sphere(0.24, 0, mat); f.position.set(x + 0.2, h*range(rng,0.35,0.7), -0.25); f.scale.z *= 0.5; g.add(f); }
  }
  return g;
}
function planter(rng){
  const g = new THREE.Group();
  const r = range(rng,0.16,0.26), pm = pick(rng,[MAT.terracotta, MAT.potGray]);
  C(g, r, r*0.78, r*1.4, 10, pm, 0, 0, 0);
  C(g, r*1.08, r*1.08, r*0.18, 10, pm, 0, r*1.3, 0);                       // 鉢の縁
  const mat = pick(rng,GREENS);
  for (let i=0; i<3; i++){
    const a = i*2.1 + rng(), lf = sphere(r*range(rng,0.6,0.85), 0, mat);
    lf.position.set(Math.cos(a)*r*0.4, r*1.6 + r*0.5 + i*r*0.15, Math.sin(a)*r*0.4); g.add(lf);
  }
  return g;
}
MAT.terracotta = M(0xa65c3c, {r:0.9});
MAT.potGray = M(0x8e8f8c, {r:0.9});

/* ---------- 車（ローカル：長さ X、幅 Z、前が +X） ----------
   車体は面取り（ベベル）付きの押し出しで角を丸め、ドアの継ぎ目・ミラー・ホイールまで付ける */
const CAR_TYPES = {
  kei:   {W:1.47, body:[[-1.7,0.32],[1.6,0.32],[1.7,0.42],[1.72,0.8],[1.62,0.92],[-1.66,0.98],[-1.72,0.88],[-1.72,0.42]],
          cabin:[[1.6,0.9],[1.1,1.56],[-1.52,1.6],[-1.68,0.96]], roof:[-0.2,1.62,2.6], wb:1.15, doors:[0.55,-0.45]},
  sedan: {W:1.75, body:[[-2.22,0.32],[2.15,0.32],[2.26,0.45],[2.28,0.66],[2.08,0.86],[0.95,0.92],[-1.7,0.95],[-2.24,0.9],[-2.28,0.62]],
          cabin:[[0.98,0.88],[0.38,1.34],[-0.84,1.36],[-1.66,0.94]], roof:[-0.24,1.36,1.22], wb:1.4, doors:[0.85,-0.2,-1.15]},
  van:   {W:1.8,  body:[[-2.32,0.32],[2.25,0.32],[2.36,0.45],[2.38,0.86],[2.05,1.02],[-2.34,1.04],[-2.38,0.9],[-2.38,0.45]],
          cabin:[[1.98,1.0],[1.3,1.7],[-2.26,1.74],[-2.32,1.02]], roof:[-0.48,1.75,3.5], wb:1.5, doors:[1.15,0.05,-1.3]},
};
function bevelExtrude(pts, W, bevel){
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const e = new THREE.ExtrudeGeometry(shape, {depth: W - 2*bevel, bevelEnabled: true, bevelThickness: bevel,
    bevelSize: bevel*0.8, bevelSegments: 3, curveSegments: 6});
  e.translate(0, 0, -(W - 2*bevel)/2);
  e.computeVertexNormals();
  return e;
}
function car(rng){
  const type = pick(rng, ['kei','kei','sedan','van']);
  const T = CAR_TYPES[type], g = new THREE.Group();
  const paint = pick(rng, CAR_COLORS);
  g.add(new THREE.Mesh(cachedGeo('carB2'+type, ()=> bevelExtrude(T.body, T.W, 0.07)), paint));
  g.add(new THREE.Mesh(cachedGeo('carC2'+type, ()=> bevelExtrude(T.cabin, T.W - 0.14, 0.04)), MAT.carGlass));
  B(g, T.roof[2], 0.07, T.W-0.1, paint, T.roof[0], T.roof[1], 0);
  const cx = T.cabin.map(p=>p[0]), cMid = (Math.max(...cx)+Math.min(...cx))/2 - 0.1;
  B(g, 0.12, (T.roof[1]-0.95), T.W-0.12, paint, cMid, (T.roof[1]+0.95)/2, 0);          // B ピラー
  const L = Math.max(...T.body.map(p=>p[0])), Lb = -Math.min(...T.body.map(p=>p[0]));
  for (const sz of [-1,1]){
    const zs = sz*(T.W/2 + 0.002);
    for (const dx of T.doors) B(g, 0.015, 0.6, 0.012, MAT.black, dx, 0.66, zs);        // ドアの継ぎ目
    for (const dx of T.doors.slice(0, -1)) B(g, 0.14, 0.03, 0.03, MAT.frameDk, dx - 0.25, 0.86, sz*(T.W/2 + 0.01));   // 取っ手
    B(g, 0.14, 0.1, 0.12, paint, Math.max(...cx) - 0.1, 1.0, sz*(T.W/2 + 0.08));        // ドアミラー
    B(g, 0.06, 0.13, 0.32, MAT.headlight, L+0.01, 0.74, sz*(T.W/2-0.3));
    B(g, 0.06, 0.13, 0.26, MAT.taillight, -Lb-0.01, 0.8, sz*(T.W/2-0.25));
  }
  // ホイール（フェンダーの内側の影・タイヤ・リム・スポーク）
  for (const sx of [-1,1]) for (const sz of [-1,1]){
    const wx = sx*T.wb, wz = sz*(T.W/2 - 0.07);
    const arch = disc(0.37, 0.02, 24, MAT.black); arch.position.set(wx, 0.33, sz*(T.W/2 + 0.004)); g.add(arch);
    const w = disc(0.31, 0.2, 24, MAT.tire); w.position.set(wx, 0.31, wz); g.add(w);
    const rim = disc(0.19, 0.205, 20, MAT.rail); rim.position.set(wx, 0.31, wz); g.add(rim);
    for (let i=0; i<5; i++){
      const sp = box(0.04, 0.17, 0.02, MAT.frameDk); sp.position.set(wx, 0.31, wz + sz*0.105);
      sp.rotation.z = i*Math.PI*2/5; sp.translateY(0.08); g.add(sp);
    }
  }
  B(g, 0.12, 0.2, T.W - 0.04, MAT.black, L+0.02, 0.42, 0);        // バンパー
  B(g, 0.12, 0.2, T.W - 0.04, MAT.black, -Lb-0.02, 0.42, 0);
  B(g, 0.04, 0.2, 0.6, MAT.frameDk, L+0.05, 0.62, 0);             // グリル
  B(g, 0.03, 0.12, 0.34, MAT.signW, L+0.09, 0.44, 0);             // ナンバー
  B(g, 0.03, 0.12, 0.34, MAT.signW, -Lb-0.09, 0.62, 0);
  return g;
}

/* ---------- 自転車（ママチャリ。ローカル：長さ X） ---------- */
function bicycle(rng){
  const g = new THREE.Group();
  const fm = pick(rng, [MAT.frameDk, MAT.signW, MAT.red, MAT.blue, M(0x5a7a5a,{r:0.5})]);
  const wheelGeo = cachedGeo('bikeW2', ()=> new THREE.TorusGeometry(0.31, 0.022, 8, 40));
  for (const x of [-0.52, 0.52]){
    const w = new THREE.Mesh(wheelGeo, MAT.tire); w.position.set(x, 0.33, 0); g.add(w);
    for (let i=0; i<12; i++){                                           // スポーク
      const a = i*Math.PI/6;
      rod(g, x, 0.33, 0, x + Math.cos(a)*0.29, 0.33 + Math.sin(a)*0.29, 0, 0.004, MAT.rail, 3);
    }
    const hub = disc(0.03, 0.08, 8, MAT.rail); hub.position.set(x, 0.33, 0); g.add(hub);
    const fender = new THREE.Mesh(cachedGeo('fender', ()=> new THREE.TorusGeometry(0.34, 0.03, 4, 24, Math.PI*0.9)), fm);
    fender.position.set(x, 0.33, 0); fender.rotation.z = 0.15; g.add(fender);               // 泥よけ
  }
  rod(g, -0.52,0.33,0, -0.1,0.33,0, 0.018, fm);       // チェーンステー
  rod(g, -0.52,0.33,0, -0.18,0.78,0, 0.016, fm);      // シートステー
  rod(g, -0.1,0.33,0, -0.18,0.82,0, 0.022, fm);       // シートチューブ
  rod(g, -0.1,0.33,0, 0.42,0.72,0, 0.024, fm);        // ダウンチューブ（低床）
  rod(g, 0.42,0.72,0, 0.52,0.33,0, 0.02, fm);         // フォーク
  rod(g, 0.42,0.72,0, 0.36,1.0,0, 0.02, fm);          // ハンドルポスト
  rod(g, 0.36,1.0,-0.28, 0.36,1.0,0.28, 0.015, MAT.frameDk);
  for (const s of [-1,1]) rod(g, 0.36,1.0,s*0.28, 0.26,1.02,s*0.3, 0.02, MAT.black);   // グリップ
  const ring = disc(0.1, 0.01, 16, MAT.rail); ring.position.set(-0.1, 0.33, 0.05); g.add(ring);   // ギア
  for (const s of [-1,1]) rod(g, -0.1,0.33,s*0.06, -0.1 + s*0.12,0.33 - s*0.1,s*0.1, 0.012, MAT.frameDk);   // クランク
  const sad = sphere(0.1, 0, MAT.black); sad.scale.set(0.13, 0.04, 0.08); sad.position.set(-0.2, 0.86, 0); g.add(sad);  // サドル
  rod(g, -0.62,0.62,-0.1, -0.35,0.62,-0.1, 0.01, MAT.frameDk); rod(g, -0.62,0.62,0.1, -0.35,0.62,0.1, 0.01, MAT.frameDk);   // 荷台
  rod(g, -0.62,0.62,-0.1, -0.62,0.62,0.1, 0.01, MAT.frameDk);
  if (rng() < 0.7){                                                     // 前かご（細い枠で作る）
    const bx = 0.62, by = 0.78, bw = 0.3, bh = 0.24, bd = 0.36;
    for (const yy of [by, by + bh]) for (const s of [-1,1]){
      rod(g, bx - bw/2, yy, s*bd/2, bx + bw/2, yy, s*bd/2, 0.006, MAT.frameDk, 3);
      rod(g, bx + s*bw/2, yy, -bd/2, bx + s*bw/2, yy, bd/2, 0.006, MAT.frameDk, 3);
    }
    for (let i=0; i<=4; i++) for (const s of [-1,1]) rod(g, bx - bw/2 + i*bw/4, by, s*bd/2, bx - bw/2 + i*bw/4, by + bh, s*bd/2, 0.005, MAT.frameDk, 3);
  }
  rod(g, -0.3, 0.3, 0.06, -0.38, 0.02, 0.12, 0.012, MAT.rail);           // スタンド
  return g;
}

/* ---------- 人（縮尺の目安になるマネキン。ローカル：前が +Z） ----------
   胴は回転体（ろくろ形状）で、肩・胸・腰のくびれを付ける。歩きのときは膝と肘も曲げる */
const TORSO_PROFILE = [[0.0,0.0],[0.13,0.02],[0.15,0.1],[0.135,0.24],[0.15,0.36],[0.175,0.48],[0.17,0.55],[0.12,0.6],[0.05,0.62],[0,0.62]];
const SKIRT_PROFILE = [[0.0,0.0],[0.22,0.0],[0.2,0.1],[0.15,0.42],[0.14,0.46],[0,0.46]];
function person(rng){
  const g = new THREE.Group();
  const H = rng() < 0.12 ? range(rng,1.1,1.35) : range(rng,1.55,1.82);
  const k = H/1.7;
  const mat = rng() < 0.5 ? MAT.person : MAT.personDk;
  const walk = rng() < 0.6, sw = walk ? range(rng,0.25,0.42) : 0.03;
  const legL = 0.82*k, hip = legL + 0.06*k;
  const torsoGeo = cachedGeo('torso', ()=> new THREE.LatheGeometry(TORSO_PROFILE.map(p => new THREE.Vector2(p[0], p[1])), 20));
  // 脚（太もも＋すね＋靴）
  for (const s of [-1,1]){
    const thigh = new THREE.Group(); thigh.position.set(s*0.09*k, hip, 0); thigh.rotation.x = s*sw; g.add(thigh);
    const t = cyl(0.075*k, 0.055*k, legL*0.5, 8, mat); t.position.y = -legL*0.25; thigh.add(t);
    const knee = new THREE.Group(); knee.position.y = -legL*0.5; knee.rotation.x = walk && s > 0 ? 0.35 : 0.05; thigh.add(knee);
    const sh = cyl(0.052*k, 0.04*k, legL*0.48, 8, mat); sh.position.y = -legL*0.24; knee.add(sh);
    const shoe = sphere(0.1*k, 0, MAT.personDk); shoe.scale.set(0.055*k, 0.045*k, 0.13*k); shoe.position.set(0, -legL*0.48 - 0.01*k, 0.05*k); knee.add(shoe);
  }
  // 胴
  const torso = new THREE.Mesh(torsoGeo, mat); torso.scale.set(k, k, k*0.62); torso.position.y = hip - 0.04*k; g.add(torso);
  if (rng() < 0.3){   // スカート
    const sk = new THREE.Mesh(cachedGeo('skirt', ()=> new THREE.LatheGeometry(SKIRT_PROFILE.map(p => new THREE.Vector2(p[0], p[1])), 20)), mat);
    sk.scale.set(k, -k, k*0.8); sk.position.y = hip + 0.12*k; g.add(sk);
  }
  const neck = cyl(0.045*k, 0.05*k, 0.1*k, 8, mat); neck.position.y = hip + 0.6*k; g.add(neck);
  const head = sphere(0.105*k, 2, mat); head.position.y = hip + 0.76*k; head.scale.multiply(new THREE.Vector3(0.88, 1.1, 1)); g.add(head);
  if (rng() < 0.5){ const hair = sphere(0.11*k, 1, MAT.personDk); hair.position.set(0, hip + 0.79*k, -0.012*k); hair.scale.multiply(new THREE.Vector3(0.92, 0.95, 1.02)); g.add(hair); }
  // 腕（上腕＋前腕＋手）
  for (const s of [-1,1]){
    const arm = new THREE.Group(); arm.position.set(s*0.2*k, hip + 0.52*k, 0); arm.rotation.x = -s*sw*0.8; arm.rotation.z = s*0.08; g.add(arm);
    const up = cyl(0.048*k, 0.04*k, 0.3*k, 8, mat); up.position.y = -0.15*k; arm.add(up);
    const el = new THREE.Group(); el.position.y = -0.3*k; el.rotation.x = walk ? -0.35 : -0.08; arm.add(el);
    const fo = cyl(0.04*k, 0.032*k, 0.27*k, 8, mat); fo.position.y = -0.135*k; el.add(fo);
    const hand = sphere(0.045*k, 0, mat); hand.scale.y *= 1.3; hand.position.y = -0.3*k; el.add(hand);
  }
  if (rng() < 0.25){   // 鞄（肩掛け）
    const s = rng()<0.5?-1:1;
    Bb(g, 0.1*k, 0.26*k, 0.34*k, MAT.personDk, s*0.25*k, hip - 0.12*k, 0.02);
    rod(g, s*0.25*k, hip + 0.14*k, 0, -s*0.12*k, hip + 0.55*k, 0, 0.012*k, MAT.personDk, 4);
  }
  return g;
}

/* ---------- 自販機 ---------- */
function vendingMachine(rng){
  const g = new THREE.Group();
  const body = pick(rng, [M(0xd42b2b,{r:0.4}), M(0x2255aa,{r:0.4}), M(0xeeeeee,{r:0.4}), M(0x2b6b3a,{r:0.4})]);
  Bb(g, 1.0, 1.83, 0.75, body, 0, 0, 0);
  B(g, 0.86, 0.72, 0.04, M(0xf5f3ea,{r:0.3, glow:1.6, glowHex:0xf4f8ff}), 0, 1.32, -0.385);   // 商品見本（光る）
  const can = M(0xd8d4c8, {r:0.4});
  for (let r=0; r<3; r++) for (let c=0; c<6; c++){                                 // 見本の缶とボタン
    const cn = cyl(0.04, 0.04, 0.16, 8, can); cn.position.set(-0.35 + c*0.14, 1.05 + r*0.24 + 0.08, -0.41); g.add(cn);
    B(g, 0.06, 0.025, 0.02, MAT.frameDk, -0.35 + c*0.14, 1.02 + r*0.24, -0.41);
  }
  B(g, 0.92, 0.78, 0.03, MAT.frameDk, 0, 1.32, -0.37);                              // 窓枠
  B(g, 0.5, 0.22, 0.05, MAT.black, -0.12, 0.3, -0.39);                              // 取り出し口
  B(g, 0.18, 0.4, 0.05, M(0x9aa0a6,{r:0.4,m:0.5}), 0.3, 0.8, -0.39);                // 硬貨投入口のパネル
  B(g, 0.05, 0.08, 0.02, MAT.black, 0.3, 0.9, -0.42);
  Bb(g, 1.04, 0.08, 0.79, MAT.frameDk, 0, 1.83, 0);                                 // 天板
  return g;
}

/* ---------- 標識（ローカル：表が -Z） ---------- */
function roadSign(rng, type, parent, x, y0, z, ry){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry || 0; parent.add(g);
  C(g, 0.035, 0.035, 2.75, 8, MAT.pole, 0, 0, 0);
  for (const yy of [2.25, 2.62]) B(g, 0.12, 0.05, 0.1, MAT.steel, 0, yy, -0.03);   // 取付金具
  const face = (mat, r, dz) => { const d = disc(r, 0.025, 20, mat); d.position.set(0, 2.45, -0.06 - dz); g.add(d); };
  if (type === 'speed'){
    face(MAT.red, 0.3, 0); face(MAT.signW, 0.23, 0.005);
    for (const dx of [-0.06, 0.06]){ const o = new THREE.Mesh(cachedGeo('digit', ()=> new THREE.TorusGeometry(0.05, 0.014, 6, 16)), MAT.blue); o.scale.y = 1.4; o.position.set(dx, 2.45, -0.075); g.add(o); }
  }
  else if (type === 'noparking'){ face(MAT.red, 0.3, 0); face(MAT.blue, 0.24, 0.005); const s = box(0.06, 0.48, 0.01, MAT.red); s.position.set(0,2.45,-0.075); s.rotation.z = Math.PI/4; g.add(s); }
  else if (type === 'stop'){
    const tri = new THREE.Mesh(cachedGeo('stopTri', ()=> extrudeGeo([[-0.42,0.36],[0.42,0.36],[0,-0.36]], 0.03)), MAT.red);
    tri.position.set(0, 2.4, -0.07); g.add(tri);
    for (let i=0; i<3; i++) B(g, 0.08, 0.1, 0.01, MAT.signW, -0.12 + i*0.12, 2.56, -0.09);   // 「止まれ」の文字の代わり
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
  C(g, 0.07, 0.07, 0.25, 8, MAT.orange, 0, 0, 0);                       // 根元の巻き
  const rim = disc(0.42, 0.08, 20, MAT.orange); rim.position.set(0, 3.0, -0.12); rim.rotation.x = 0.12; g.add(rim);
  const back = sphere(0.42, 1, MAT.orange); back.scale.z = 0.12; back.position.set(0, 3.0, -0.06); g.add(back);
  const m = disc(0.37, 0.04, 20, MAT.mirror); m.position.set(0, 3.0, -0.17); m.rotation.x = 0.12; g.add(m);
  B(g, 0.06, 0.06, 0.16, MAT.orange, 0, 3.0, -0.05);
  B(g, 0.5, 0.14, 0.02, MAT.signW, 0, 2.35, -0.06);                     // 管理番号の札
  return g;
}

/* ---------- 街灯（ローカル：腕が -X 方向へ伸びる） ---------- */
function streetLamp(parent, x, y0, z, ry){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; parent.add(g);
  C(g, 0.12, 0.14, 0.6, 10, MAT.steelDk, 0, 0, 0);
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
