/* ================= 道の両側：山・海／遠くの山並み =================
   どちらも本線（中心線）に沿って作るので、カーブや坂にもそのまま追従する。
   side=+1 が進行方向（街の奥）を向いて右、-1 が左。                         */

/* 山の高さ：中心線からの横距離 lat における、中心線の標高からの相対高さ */
function makeMountainProfile(r, mT){
  const Hw0 = range(r, 3, 5.5), Hm = range(r, 18, 45);
  const p = [r()*6.28, r()*6.28, r()*6.28, r()*6.28];
  const Hw = s => Hw0 + 0.6*Math.sin(s*0.045 + p[0]) + 0.4*Math.sin(s*0.11 + p[1]);   // 擁壁の高さ
  const h = (s, lat) => {
    if (lat <= mT) return Hw(s);
    const d = lat - mT;
    const n = Math.sin(s*0.06 + p[2] + d*0.03)*0.6 + Math.sin(s*0.17 - d*0.09 + p[3])*0.4;
    return Hw(s) + Hm*(1 - Math.exp(-d/28)) + d*0.18 + n*(0.5 + d*0.06)*(d/(d+3));
  };
  return {Hw, h};
}

/* 斜面のメッシュ（中心線に沿った格子。D は擁壁の上からの横距離の列） */
function slopeMesh(parent, main, side, a, b, mT, D, hFn){
  if (b - a < 0.5 || D.length < 2) return;
  const st = [];
  for (let z=a; z<b-0.01; z+=2) st.push(z);
  st.push(b);
  const nc = D.length, pos = [], uv = [], idx = [];
  for (const z of st){
    const f = main.at(z);
    for (const d of D){
      const lat = mT + d;
      pos.push(f.x + f.nx*side*lat, f.y + hFn(z, lat), f.z + f.nz*side*lat);
      uv.push(lat, z);
    }
  }
  for (let i=0; i<st.length-1; i++){
    for (let j=0; j<nc-1; j++){
      const k = i*nc + j;
      if (side > 0) idx.push(k, k+nc, k+1,  k+1, k+nc, k+nc+1);
      else          idx.push(k, k+1, k+nc,  k+1, k+nc+1, k+nc);
    }
  }
  parent.add(stripMesh(pos, uv, idx, MAT.slope));
}

/* 山側：間知ブロックの擁壁・小段・落石防止柵・雑木林の斜面。交差する道や線路はトンネルへ */
function buildMountainSide(town, o){
  const {main, side, r} = o;
  const mw0 = o.edge + 0.02, mT = mw0 + 1.2, uP = mT + 6;
  const prof = makeMountainProfile(r, mT), Hw = s => prof.Hw(s);
  const sA = o.S0 - 28, sB = o.S1 + 28;
  const inner = side*Math.sign(o.curve) > 0;
  const latMax = inner ? Math.min(mT + 100, 0.85*120/Math.abs(o.curve)) : mT + 100;
  const holes = o.notches.map(n => [n.s0, n.s1]);
  const segs = subtractRanges([sA, sB], holes);

  for (const [a, b] of segs){
    town.add(wallRibbon(main, a, b, side*mw0, -1.2, Hw, -side, MAT.kenchi));
    town.add(ribbon(main, a, b, side*mw0, side*mT, Hw, Hw, MAT.concrete));
    for (let z = a + 1; z < b; z += 3){ const p = main.pt(z, side*(mT - 0.25), Hw(z)); Bb(town, 0.08, 1.8, 0.08, MAT.steel, p[0], p[1], p[2]); }
    for (const k of [0.45, 0.9, 1.35, 1.78])
      prism(town, main, a, b, side*(mT - 0.27), side*(mT - 0.23), s => Hw(s) + k, s => Hw(s) + k + 0.02, MAT.steel);
  }
  const D = [0,0.8,2,3.5,5.5,8,11,15,20,26,33,41,50,60,72,86,100].filter(d => mT + d <= latMax);
  for (const [a, b] of segs) slopeMesh(town, main, side, a, b, mT, D, prof.h);

  // トンネル（交差道路・線路が山へ入るところ）
  for (const nt of o.notches){
    const D2 = [uP - mT].concat(D.filter(d => mT + d > uP + 0.5));
    slopeMesh(town, main, side, nt.s0, nt.s1, mT, D2, prof.h);
    let topH = Math.max(prof.h(nt.s0, uP), prof.h(nt.s1, uP), prof.h(0, uP)) + 0.3;
    topH = Math.max(topH, nt.oh + 1.4);
    // 切り通しの側壁
    for (const z of [nt.s0, nt.s1]){
      const f = main.at(z);
      const g = new THREE.Group(); g.position.set(f.x, f.y, f.z); g.rotation.y = f.th; town.add(g);
      Bb(g, uP - mw0 + 0.6, topH + 1.2, 0.5, MAT.concrete, side*(mw0 + uP)/2, -1.2, (z < 0 ? -1 : 1)*0.25);
    }
    // 坑門
    const f = main.at((nt.s0 + nt.s1)/2);
    const g = new THREE.Group(); g.position.set(f.x, f.y, f.z); g.rotation.y = f.th; town.add(g);
    const cw = (nt.s1 - nt.s0)/2 + 0.5, ow = nt.ow;
    for (const zs of [-1, 1]) Bb(g, 1.0, topH + 1.2, cw - ow, MAT.concrete, side*(uP + 0.5), -1.2, zs*(ow + (cw - ow)/2));
    Bb(g, 1.0, topH - nt.oh, 2*cw, MAT.concrete, side*(uP + 0.5), nt.oh, 0);
    Bb(g, 1.3, 0.35, 2*cw + 0.3, MAT.concrete, side*(uP + 0.4), topH, 0);
    B(g, 0.06, 0.5, 1.6, MAT.signW, side*(uP - 0.03), nt.oh + 0.7, 0);              // 扁額（トンネル名）
    Bb(g, 40, nt.oh + 1, 2*ow, MAT.tunnel, side*(uP + 20.1), -0.5, 0);
    for (const zs of [-1, 1]) Bb(g, 0.08, 0.08, 0.3, MAT.lamp, side*(uP + 0.95), nt.oh - 0.6, zs*(ow - 0.4));
  }

  // 斜面の木
  const N = Math.round((sB - sA) * (1.4 + 4*o.green));
  for (let i=0; i<N; i++){
    const z = range(r, sA, sB), d = 0.8 + 80*Math.pow(r(), 1.7), kind = r();
    if (mT + d > latMax - 2) continue;
    if (holes.some(h => z > h[0] - 1 && z < h[1] + 1) && mT + d < uP + 3) continue;
    const f = main.at(z), lat = side*(mT + d);
    const t = kind < 0.55 ? conifer(r, range(r, 1.5, 2.8)) : tree(r, range(r, 1.3, 2.4), null, 0);
    t.position.set(f.x + f.nx*lat, f.y + prof.h(z, mT + d) - 0.2, f.z + f.nz*lat);
    town.add(t);
  }

  // 擁壁沿いの石段と鳥居（たまに）
  if (r() < 0.45){
    const s0 = range(r, -90, 55);
    if (!holes.some(h => s0 > h[0] - 20 && s0 < h[1] + 12)){
      const rise = 0.19, run = 0.3, n = Math.ceil(Hw(s0)/rise);
      for (let i=0; i<n; i++){
        const f = main.at(s0 - i*run);
        const g = new THREE.Group(); g.position.set(f.x, f.y, f.z); g.rotation.y = f.th; town.add(g);
        Bb(g, 1.1, (i+1)*rise, run + 0.02, MAT.concrete, side*(mw0 - 0.55), 0, 0);
      }
      const a = main.pt(s0, side*(mw0 - 1.05), 0.9), b = main.pt(s0 - n*run, side*(mw0 - 1.05), n*rise + 0.9);
      rod(town, ...a, ...b, 0.03, MAT.steel);
      for (const q of [a, b]) Bb(town, 0.05, 0.9, 0.05, MAT.steel, q[0], q[1] - 0.9, q[2]);
      // 鳥居
      const zt = s0 - n*run - 0.6, f = main.at(zt), y0 = Hw(zt);
      const g = new THREE.Group(); g.position.set(f.x, f.y + y0, f.z); g.rotation.y = f.th; town.add(g);
      const x0 = side*(mw0 + 0.1), x1 = side*(mw0 + 2.3), xm = (x0 + x1)/2;
      for (const x of [x0, x1]) C(g, 0.12, 0.14, 3.0, 10, MAT.vermilion, x, -0.3, 0);
      B(g, 3.2, 0.18, 0.3, MAT.black, xm, 3.0, 0);
      B(g, 2.9, 0.14, 0.22, MAT.vermilion, xm, 2.8, 0);
      B(g, 2.6, 0.12, 0.14, MAT.vermilion, xm, 2.35, 0);
    }
  }
}

/* 海側：護岸と柵、砂浜または消波ブロック、防波堤と灯台 */
function tetrapod(r){
  const g = new THREE.Group();
  const dirs = [[0,1,0],[0.943,-0.333,0],[-0.471,-0.333,0.816],[-0.471,-0.333,-0.816]];
  for (const [x,y,z] of dirs){
    const m = cyl(0.16, 0.42, 1.15, 6, MAT.tetra);
    m.position.set(x*0.55, y*0.55, z*0.55);
    m.quaternion.setFromUnitVectors(_up, new THREE.Vector3(x,y,z));
    g.add(m);
  }
  g.rotation.set(r()*6.28, r()*6.28, r()*6.28);
  return g;
}
MAT.tetra = M(0xb9b6ae, {r:0.95, wet:1});

function lighthouse(parent, r, x, y, z){
  const body = r() < 0.5 ? M(0xc8322a, {r:0.6}) : MAT.signW;
  C(parent, 0.7, 0.95, 8, 14, body, x, y, z);
  C(parent, 1.05, 1.05, 0.14, 14, MAT.steelDk, x, y + 8, z);
  C(parent, 0.5, 0.5, 1.1, 12, M(0xe8eef2, {r:0.1, glow:3, glowHex:0xfff0c0}), x, y + 8.14, z);
  C(parent, 0.05, 0.72, 0.8, 12, body, x, y + 9.24, z);
}

function buildSeaSide(town, o){
  const {main, side, r} = o;
  const e = o.edge + 0.02;
  const sA = o.S0 - 28, sB = o.S1 + 28;
  const segs = subtractRanges([sA, sB], o.holes);
  const beach = o.flat && r() < 0.5;
  const top = o.hasWalk ? 0.15 : 0.012;
  const seaRel = (s, f) => o.seaY - f.y;
  const bottom = beach ? -1.5 : (s, f) => seaRel(s, f) - 1.5;
  for (const [a, b] of segs) town.add(wallRibbon(main, a, b, side*e, bottom, top, side, MAT.revet));
  for (const h of o.holes) town.add(wallRibbon(main, h[0], h[1], side*e, (s, f) => seaRel(s, f) - 1.5, -1.6, side, MAT.revet));

  // 道路側の柵（コンクリートの防潮壁 か ガードレール）
  const parapet = r() < 0.45;
  for (const [a, b] of subtractRanges([o.S0, o.S1], o.holes)){
    if (parapet){
      prism(town, main, a, b, side*(e - 0.28), side*e, top, top + 0.85, MAT.concrete);
    } else {
      for (let z = a + 0.5; z < b; z += 2){ const p = main.pt(z, side*(e - 0.2), top); Bb(town, 0.1, 0.75, 0.1, MAT.white, p[0], p[1], p[2]); }
      prism(town, main, a, b, side*(e - 0.23), side*(e - 0.17), top + 0.4, top + 0.72, MAT.white);
    }
  }
  if (beach){
    for (const [a, b] of segs) town.add(ribbon(main, a, b, side*e, side*(e + 40), -1.5, (s, f) => seaRel(s, f) - 1.6, MAT.sand));
  } else {
    for (const [a, b] of segs){
      for (let z = a + 1; z < b; z += 1.3){
        for (let row = 0; row < 2; row++){
          if (r() < 0.2) continue;
          const p = main.pt(z + r()*0.6, side*(e + 1.3 + row*1.9 + r()*0.5));
          const t = tetrapod(r); t.position.set(p[0], o.seaY + range(r, -0.5, 0.5), p[2]); town.add(t);
        }
      }
    }
  }
  // 防波堤と灯台
  if (r() < 0.65){
    const L0 = e + range(r, 45, 70), sa = range(r, -100, -40), sb = sa + range(r, 60, 110);
    prism(town, main, sa, sb, side*L0, side*(L0 + 6), (s, f) => seaRel(s, f) - 3, (s, f) => seaRel(s, f) + 1.6, MAT.concrete);
    const p = main.pt(sa + 3, side*(L0 + 3));
    lighthouse(town, r, p[0], o.seaY + 1.6, p[2]);
  }
}

/* 遠くの山並み（街を囲むリング。霧の外にあるので、空の色を混ぜて遠さを出す） */
function buildBackdrop(town, kind, r, baseY, seaAngles){
  const [h0, h1] = kind === 'high' ? [110, 270] : [28, 85];
  const NA = 180;
  const rows = [[455, -0.12], [510, 0.45], [570, 1.0], [640, 0.78]];
  const ph = Array.from({length: 8}, () => r()*6.28);
  const ridge = (t, k) => {
    const v = 0.5 + 0.25*Math.sin(t*2 + ph[0] + k) + 0.15*Math.sin(t*5 + ph[1] + k*2) + 0.1*Math.sin(t*11 + ph[2] + k*3) + 0.06*Math.sin(t*23 + ph[3]);
    return h0 + (h1 - h0)*clamp(v, 0, 1.2);
  };
  const mask = t => {
    let m = 1;
    for (const sa of seaAngles){
      const d = Math.abs(Math.atan2(Math.sin(t - sa), Math.cos(t - sa)));
      const k = clamp((d - 0.75)/0.7, 0, 1);
      m *= k*k*(3 - 2*k);
    }
    return m;
  };
  const pos = [], idx = [];
  for (let j=0; j<rows.length; j++){
    for (let i=0; i<NA; i++){
      const t = i/NA*Math.PI*2, m = mask(t);
      const rad = rows[j][0] + 14*Math.sin(t*7 + ph[4] + j);
      const y = baseY + rows[j][1]*ridge(t, j)*m - 30*(1 - m) - (j === 0 ? 8 : 0);
      pos.push(Math.sin(t)*rad, y, Math.cos(t)*rad);
    }
  }
  for (let j=0; j<rows.length-1; j++){
    for (let i=0; i<NA; i++){
      const a = j*NA + i, b = j*NA + (i+1)%NA, c = a + NA, d = b + NA;
      idx.push(a, c, b,  b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  town.add(new THREE.Mesh(g, kind === 'high' ? MAT.farMountH : MAT.farMount));
}
