/* ================= 道の中心線（パス） =================
   道路・歩道・川・アーケードなどは、すべて中心線からの「横オフセット」と「高さ」で作る。
   カーブや坂はこの中心線を曲げるだけで、上に載る物がすべて追従する。
   向き th: 進行方向 t=(sin th, 0, cos th)、横方向 n=(cos th, 0, -sin th)（side=+1 側）     */
class Path {
  constructor(pts){
    this.p = pts; this.s0 = pts[0].s; this.s1 = pts[pts.length-1].s; this.ds = pts[1].s - pts[0].s;
  }
  at(s){
    const p = this.p, n = p.length;
    let f = (s - this.s0)/this.ds, i = Math.floor(f);
    if (i < 0) i = 0; if (i > n-2) i = n-2;
    const t = f - i, a = p[i], b = p[i+1];
    const th = a.th + (b.th - a.th)*t, c = Math.cos(th), sn = Math.sin(th);
    return {s, x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:a.z+(b.z-a.z)*t, th, tx:sn, tz:c, nx:c, nz:-sn};
  }
  /* 中心線上 s、横 off、高さ h（中心線の標高からの相対）の点 */
  pt(s, off, h){
    const f = this.at(s);
    return [f.x + f.nx*off, f.y + (h||0), f.z + f.nz*off];
  }
  /* 平面上の点 (x,z) を中心線に投影：s、横オフセット lat、はみ出し along、標高 y */
  project(x, z){
    const p = this.p;
    let bi = 0, bd = Infinity;
    for (let i=0; i<p.length; i+=3){
      const dx = x-p[i].x, dz = z-p[i].z, d = dx*dx+dz*dz;
      if (d < bd){ bd = d; bi = i; }
    }
    let bs = p[bi].s; bd = Infinity;
    for (let i=Math.max(0,bi-4); i<=Math.min(p.length-2,bi+3); i++){
      const a = p[i], b = p[i+1], ex = b.x-a.x, ez = b.z-a.z;
      const t = clamp(((x-a.x)*ex + (z-a.z)*ez)/(ex*ex+ez*ez), 0, 1);
      const qx = a.x+ex*t - x, qz = a.z+ez*t - z, d = qx*qx+qz*qz;
      if (d < bd){ bd = d; bs = a.s + (b.s-a.s)*t; }
    }
    const f = this.at(bs);
    return {s:bs, lat:(x-f.x)*f.nx + (z-f.z)*f.nz, along:(x-f.x)*f.tx + (z-f.z)*f.tz, y:f.y};
  }
  /* [a,b] の間のサンプル位置（端を含む） */
  stations(a, b){
    const out = [a];
    const k0 = Math.ceil((a - this.s0)/this.ds + 1e-6), k1 = Math.floor((b - this.s0)/this.ds - 1e-6);
    for (let k=k0; k<=k1; k++) out.push(this.s0 + k*this.ds);
    out.push(b);
    return out;
  }
}

/* 曲がり・坂のある本線。交差点（s=0）の周り p[m] は平らでまっすぐにする */
function makeMainPath(plateau){
  const k = state.curve / 120;                 // 曲率 [1/m]（最大で半径 120m）
  const g = state.slope / 100;
  const p = plateau;
  const F = p > 0 ? (s => s - p*Math.tanh(s/p)) : (s => s);
  const N = HALF_LEN + 30, ds = 1;
  const fw = [{s:0, x:0, y:0, z:0, th:0}], bw = [];
  let x = 0, z = 0;
  for (let s=0; s<N; s+=ds){
    const th = k*F(s+ds/2);
    x += Math.sin(th)*ds; z += Math.cos(th)*ds;
    fw.push({s:s+ds, x, y:-g*F(s+ds), z, th:k*F(s+ds)});
  }
  x = 0; z = 0;
  for (let s=0; s>-N; s-=ds){
    const th = k*F(s-ds/2);
    x -= Math.sin(th)*ds; z -= Math.cos(th)*ds;
    bw.push({s:s-ds, x, y:-g*F(s-ds), z, th:k*F(s-ds)});
  }
  return new Path(bw.reverse().concat(fw));
}
/* 直線のパス（交差道路・線路）。原点を通り、向き th */
function makeStraightPath(th, u0, u1, y){
  const pts = [], sn = Math.sin(th), c = Math.cos(th);
  for (let u=u0; u<=u1+1e-6; u+=2) pts.push({s:u, x:sn*u, y:y||0, z:c*u, th});
  return new Path(pts);
}

/* ================= 帯状メッシュ =================
   高さ h は数値か、関数 (s, f) => 高さ（f はその位置の中心線の情報）。 */
const hv = (h, s, f) => typeof h === 'function' ? h(s, f) : h;
/* 水平の帯：横 offA..offB、高さ hA/hB（左右で変えると斜面になる）。上向き */
function ribbon(path, sA, sB, offA, offB, hA, hB, mat){
  if (sB - sA < 0.05) return null;
  if (offA > offB){ [offA, offB] = [offB, offA]; [hA, hB] = [hB, hA]; }
  const st = path.stations(sA, sB);
  const pos = [], uv = [], idx = [];
  for (let i=0; i<st.length; i++){
    const s = st[i], f = path.at(s);
    pos.push(f.x+f.nx*offA, f.y+hv(hA,s,f), f.z+f.nz*offA,  f.x+f.nx*offB, f.y+hv(hB,s,f), f.z+f.nz*offB);
    uv.push(offA, s, offB, s);
    if (i){ const a = 2*i-2; idx.push(a, a+2, a+1,  a+1, a+2, a+3); }
  }
  return stripMesh(pos, uv, idx, mat);
}
/* 垂直の帯：横 off、高さ h0..h1。face=+1 で n 方向を向く */
function wallRibbon(path, sA, sB, off, h0, h1, face, mat){
  if (sB - sA < 0.05) return null;
  const st = path.stations(sA, sB);
  const pos = [], uv = [], idx = [];
  for (let i=0; i<st.length; i++){
    const s = st[i], f = path.at(s), x = f.x+f.nx*off, z = f.z+f.nz*off;
    const a0 = hv(h0,s,f), a1 = hv(h1,s,f);
    pos.push(x, f.y+a0, z,  x, f.y+a1, z);
    uv.push(s, f.y+a0, s, f.y+a1);
    if (i){
      const a = 2*i-2;   // a=下, a+1=上, a+2=次の下, a+3=次の上
      if (face > 0) idx.push(a, a+1, a+2,  a+1, a+3, a+2);
      else          idx.push(a, a+2, a+1,  a+1, a+2, a+3);
    }
  }
  return stripMesh(pos, uv, idx, mat);
}
function stripMesh(pos, uv, idx, mat){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
/* 角柱の帯（歩道・縁石・高欄など）：上面＋両側面＋両端のふた */
function prism(parent, path, sA, sB, offA, offB, h0, h1, mat, sideMat){
  if (sB - sA < 0.05) return;
  if (offA > offB) [offA, offB] = [offB, offA];
  const sm = sideMat || mat;
  for (const m of [
    ribbon(path, sA, sB, offA, offB, h1, h1, mat),
    wallRibbon(path, sA, sB, offA, h0, h1, -1, sm),
    wallRibbon(path, sA, sB, offB, h0, h1, +1, sm),
  ]) if (m) parent.add(m);
  // 両端のふた
  for (const [s, dir] of [[sA,-1],[sB,1]]){
    const f = path.at(s), b0 = hv(h0,s,f), b1 = hv(h1,s,f);
    const a = path.pt(s, offA, b0), b = path.pt(s, offB, b0), c = path.pt(s, offB, b1), d = path.pt(s, offA, b1);
    const inside = new THREE.Vector3(f.x - f.tx*dir, f.y + (b0+b1)/2, f.z - f.tz*dir);
    parent.add(new THREE.Mesh(polyGeo([[a,b,c],[a,c,d]], inside), sm));
  }
}

/* 区間 [a,b] から穴 holes を引いた残り区間リストを返す */
function subtractRanges(full, holes){
  let segs = [full.slice()];
  for (const h of holes){
    const next = [];
    for (const [a,b] of segs){
      if (h[1] <= a || h[0] >= b){ next.push([a,b]); continue; }
      if (h[0] > a) next.push([a, h[0]]);
      if (h[1] < b) next.push([h[1], b]);
    }
    segs = next;
  }
  return segs.filter(([a,b]) => b-a > 0.3);
}

/* ================= 結合 =================
   何千もの小さなメッシュを「素材 × 64m 区画」ごとに 1 つのジオメトリへまとめる。
   区画に分けておくと、画面外（影の計算範囲外）の区画は描画が省かれる。 */
function mergeByMaterial(root){
  root.updateMatrixWorld(true);
  const CELL = 64;
  const buckets = new Map();
  const wp = new THREE.Vector3();
  root.traverse(o => {
    if (!o.isMesh) return;
    o.getWorldPosition(wp);
    const key = o.material.uuid + '|' + Math.floor(wp.x/CELL) + ',' + Math.floor(wp.z/CELL);
    let b = buckets.get(key);
    if (!b){ b = {mat:o.material, list:[]}; buckets.set(key, b); }
    b.list.push(o);
  });
  const out = new THREE.Group();
  const nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const {mat, list} of buckets.values()){
    let nv = 0, ni = 0;
    for (const o of list){
      const g = o.geometry, c = g.attributes.position.count;
      nv += c; ni += g.index ? g.index.count : c;
    }
    const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), uv = new Float32Array(nv*2);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const o of list){
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      const m = o.matrixWorld;
      nm.getNormalMatrix(m);
      const flip = m.determinant() < 0;
      for (let i=0; i<P.count; i++){
        v.fromBufferAttribute(P, i).applyMatrix4(m);
        pos[(vo+i)*3] = v.x; pos[(vo+i)*3+1] = v.y; pos[(vo+i)*3+2] = v.z;
        if (N){ v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); }
        else v.set(0,1,0);
        nor[(vo+i)*3] = v.x; nor[(vo+i)*3+1] = v.y; nor[(vo+i)*3+2] = v.z;
        if (U){ uv[(vo+i)*2] = U.getX(i); uv[(vo+i)*2+1] = U.getY(i); }
      }
      if (g.index){
        const I = g.index.array;
        for (let i=0; i<I.length; i+=3){
          idx[io++] = I[i] + vo;
          idx[io++] = (flip ? I[i+2] : I[i+1]) + vo;
          idx[io++] = (flip ? I[i+1] : I[i+2]) + vo;
        }
      } else {
        for (let i=0; i<P.count; i+=3){
          idx[io++] = vo + i;
          idx[io++] = vo + (flip ? i+2 : i+1);
          idx[io++] = vo + (flip ? i+1 : i+2);
        }
      }
      vo += P.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !mat.userData.noCast;
    mesh.receiveShadow = !mat.userData.noReceive;
    out.add(mesh);
  }
  return out;
}

/* ================= 敷地の重なり判定（2D の回転した長方形） ================= */
function obbOverlap(a, b){
  for (const ax of [a.u, a.v, b.u, b.v]){
    const ra = a.hu*Math.abs(a.u[0]*ax[0]+a.u[1]*ax[1]) + a.hv*Math.abs(a.v[0]*ax[0]+a.v[1]*ax[1]);
    const rb = b.hu*Math.abs(b.u[0]*ax[0]+b.u[1]*ax[1]) + b.hv*Math.abs(b.v[0]*ax[0]+b.v[1]*ax[1]);
    const d = Math.abs((b.cx-a.cx)*ax[0] + (b.cz-a.cz)*ax[1]);
    if (d > ra + rb - 0.05) return false;
  }
  return true;
}
