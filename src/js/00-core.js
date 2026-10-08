'use strict';
/* ================= 状態 ================= */
const state = {
  mode:'res',            // res=住宅街 / sho=繁華街
  street:'normal',       // normal / alley(路地) / river(川沿い) / arcade(アーケード)
  junction:'none',       // none / cross / tright / tleft / rail(踏切)
  poles:'one',
  seed:(Math.random()*1e9)>>>0,
  curve:0, slope:0,
  roadW:6, sidewalk:1.25, density:0.85, height:1, green:0.55, poleGap:24, apartments:0.12,
  props:0.6, people:0.25,
  time:'day', weather:'clear', sunAz:215, shadows:'on',
  eyeH:1.5, fov:55
};
const HALF_LEN = 150;          // 道路の片側の長さ（m）
const LOT_HALF = 135;          // 区画を並べる範囲
const IS_COARSE = matchMedia('(pointer:coarse)').matches;

const app = document.getElementById('app');

// WebGL / ライブラリの読み込み失敗時に、真っ暗ではなく理由を表示する
function showError(msg){
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;'
    + 'padding:32px;text-align:center;color:#f7f6f2;font-size:15px;line-height:1.9;z-index:100;background:#2a2c30;';
  d.innerHTML = msg;
  document.body.appendChild(d);
}
if (typeof THREE === 'undefined'){
  showError('3Dライブラリを読み込めませんでした。<br>このHTMLファイルを（zipのプレビューではなく）ブラウザで直接開いてください。');
  throw new Error('THREE not loaded');
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
} catch(e){
  showError('この環境ではWebGL（3D描画）が使えないようです。<br>Safari／Chrome などのブラウザで直接開くとご利用いただけます。');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(state.fov, innerWidth/innerHeight, 0.2, 900);
camera.position.set(0, state.eyeH, 95);
let yaw = Math.PI, pitch = 0;   // 初期はマイナスZ方向（街の奥）を向く

/* ================= 乱数（シード再現可能） ================= */
function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function pick(rng, arr){ return arr[(rng()*arr.length)|0]; }
function range(rng, a, b){ return a + rng()*(b-a); }
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

/* ================= 形状ヘルパ =================
   ジオメトリは使い回し（単位形状を scale で伸ばす）。最後に素材ごとに 1 つへ結合するので、
   ここで作るメッシュの数はいくら多くても描画は軽い。 */
const UNIT_BOX = new THREE.BoxGeometry(1,1,1);
function box(w,h,d,mat){ const m = new THREE.Mesh(UNIT_BOX, mat); m.scale.set(w,h,d); return m; }
/* parent に箱を置く（x,y,z は箱の中心） */
function B(parent, w,h,d, mat, x,y,z, ry){
  const m = box(w,h,d,mat); m.position.set(x,y,z);
  if (ry) m.rotation.y = ry;
  parent.add(m); return m;
}
/* 底面を y0 に合わせて箱を置く */
function Bb(parent, w,h,d, mat, x,y0,z, ry){ return B(parent, w,h,d, mat, x, y0+h/2, z, ry); }

const GEO_CACHE = new Map();
function cachedGeo(key, make){
  let g = GEO_CACHE.get(key);
  if (!g){ g = make(); GEO_CACHE.set(key, g); }
  return g;
}
/* 円柱（高さ 1 の形状を縦に伸ばす） */
function cyl(rt, rb, h, seg, mat){
  const g = cachedGeo(`cyl${rt},${rb},${seg}`, ()=> new THREE.CylinderGeometry(rt, rb, 1, seg));
  const m = new THREE.Mesh(g, mat); m.scale.y = h; return m;
}
function C(parent, rt, rb, h, seg, mat, x, y0, z){
  const m = cyl(rt, rb, h, seg, mat); m.position.set(x, y0 + h/2, z); parent.add(m); return m;
}
/* 2 点間の棒 */
const _up = new THREE.Vector3(0,1,0), _va = new THREE.Vector3(), _vb = new THREE.Vector3();
function rod(parent, ax,ay,az, bx,by,bz, r, mat, seg){
  _va.set(ax,ay,az); _vb.set(bx,by,bz);
  const len = _va.distanceTo(_vb);
  const m = cyl(r, r, len, seg||6, mat);
  m.position.copy(_va).add(_vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_up, _vb.sub(_va).normalize());
  parent.add(m); return m;
}
function sphere(r, detail, mat){
  const g = cachedGeo(`ico${detail}`, ()=> new THREE.IcosahedronGeometry(1, detail));
  const m = new THREE.Mesh(g, mat); m.scale.setScalar(r); return m;
}
/* 円盤（向きは +Z を向く） */
function disc(r, depth, seg, mat){
  const g = cachedGeo(`disc${seg}`, ()=> { const c = new THREE.CylinderGeometry(1,1,1,seg); c.rotateX(Math.PI/2); return c; });
  const m = new THREE.Mesh(g, mat); m.scale.set(r, r, depth); return m;
}
/* 三角形のリストから多面体を作る。法線は内側の点 inside から外向きになるよう自動で揃える */
function polyGeo(tris, inside){
  const pos = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
  for (const t of tris){
    a.fromArray(t[0]); b.fromArray(t[1]); c.fromArray(t[2]);
    n.subVectors(b,a).cross(_vb.subVectors(c,a));
    m.copy(a).add(b).add(c).multiplyScalar(1/3).sub(inside);
    if (n.dot(m) < 0) pos.push(...t[0], ...t[2], ...t[1]);
    else pos.push(...t[0], ...t[1], ...t[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/* XY 平面の多角形を Z 方向に押し出す（Z は -d/2..d/2） */
function extrudeGeo(pts, depth){
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:false});
  g.translate(0, 0, -depth/2);
  return g;
}
