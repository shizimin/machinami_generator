/* ================= 素材 =================
   すべて MeshStandardMaterial。色は sRGB で書いて線形に変換する。
   同じ指定の素材はキャッシュして共有する（結合時に素材ごとにまとまるので描画が軽くなる）。
   userData:
     glow    … 夜（夕方）に光る強さ。glowHex で光の色
     always  … 昼も光る（信号の灯火など）
     wet     … 雨で濡れる（暗く・つややかに）
     noCast  … 影を落とさない                                                  */
function lin(hex){ return new THREE.Color(hex).convertSRGBToLinear(); }

const MATS = new Map();
function M(hex, o){
  o = o || {};
  const key = hex + '|' + JSON.stringify(o);
  let m = MATS.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    color: lin(hex), roughness: o.r ?? 0.88, metalness: o.m ?? 0, flatShading: !!o.flat,
  });
  if (o.map){ m.map = TEX[o.map](); }
  if (o.op !== undefined){ m.transparent = true; m.opacity = o.op; m.depthWrite = false; }
  if (o.side2) m.side = THREE.DoubleSide;
  m.userData = {
    base: hex, r0: m.roughness, glow: o.glow || 0, glowHex: o.glowHex ?? hex, always: !!o.always,
    wet: o.wet || 0, noCast: !!(o.noCast || o.op !== undefined), noReceive: !!o.noReceive,
  };
  MATS.set(key, m);
  return m;
}

/* ---------- 手続きテクスチャ（Canvas で描く。UV はメートル単位） ---------- */
function canvasTex(size, draw, metersPerTile){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.repeat.set(1/metersPerTile, 1/metersPerTile);
  return t;
}
function noiseFill(g, n, lo, hi, seed){
  const r = mulberry32(seed);
  const img = g.createImageData(n, n);
  for (let i=0;i<n*n;i++){
    const v = lo + (hi-lo)*r();
    img.data[i*4] = img.data[i*4+1] = img.data[i*4+2] = v; img.data[i*4+3] = 255;
  }
  g.putImageData(img, 0, 0);
}
const TEX_CACHE = {};
function lazyTex(name, make){ return ()=> TEX_CACHE[name] || (TEX_CACHE[name] = make()); }
const TEX = {
  asphalt: lazyTex('asphalt', ()=> canvasTex(256, (g,n)=>{
    noiseFill(g, n, 205, 255, 7);
    const r = mulberry32(11);
    g.globalAlpha = 0.35;
    for (let i=0;i<140;i++){ g.fillStyle = r()<0.5 ? '#9a9a9a' : '#ffffff'; g.fillRect(r()*n, r()*n, 1+r()*2, 1+r()*2); }
  }, 4)),
  tiles: lazyTex('tiles', ()=> canvasTex(256, (g,n)=>{
    // インターロッキングブロック（20×10cm 相当）
    const r = mulberry32(5), bw = n/5, bh = n/10;
    for (let y=0; y<10; y++){
      for (let x=-1; x<6; x++){
        const v = 200 + r()*40;
        g.fillStyle = `rgb(${v},${v-4},${v-10})`;
        g.fillRect(x*bw + (y%2)*bw/2 + 1, y*bh + 1, bw-2, bh-2);
      }
    }
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = '#8a8680'; g.fillRect(0,0,n,n);
  }, 1)),
  concrete: lazyTex('concrete', ()=> canvasTex(256, (g,n)=>{
    noiseFill(g, n, 215, 250, 3);
    g.fillStyle = 'rgba(70,70,70,.35)';
    for (let y=0; y<4; y++) g.fillRect(0, y*n/4, n, 2);      // 型枠の継ぎ目（横）
    g.fillRect(n*0.5, 0, 2, n);                                // 目地（縦）
  }, 2.4)),
  gutter: lazyTex('gutter', ()=> canvasTex(128, (g,n)=>{
    g.fillStyle = '#e0ddd6'; g.fillRect(0,0,n,n);
    g.fillStyle = '#4b4a47';
    for (let i=0;i<2;i++) g.fillRect(0, i*n/2 + n/4 - 3, n, 6);  // 蓋のスリット
    g.fillStyle = '#b9b5ad';
    for (let i=0;i<2;i++) g.fillRect(0, i*n/2, n, 2);
  }, 1)),
  pool: lazyTex('pool', ()=>{
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
  }),
};

/* ---------- よく使う素材 ---------- */
const MAT = {
  asphalt:  M(0x85878a, {map:'asphalt', r:0.95, wet:1}),
  asphaltA: M(0x7b7d80, {map:'asphalt', r:0.95, wet:1}),   // 路地（少し古い舗装）
  paving:   M(0xd2cbbd, {map:'tiles', r:0.9, wet:1}),
  sidewalk: M(0xbdb8ae, {map:'tiles', r:0.9, wet:1}),
  curb:     M(0xc9c8c2, {r:0.85, wet:1}),
  gutter:   M(0xffffff, {map:'gutter', r:0.9, wet:1}),
  white:    M(0xf0efe9, {r:0.6, wet:1}),
  yellow:   M(0xe8b52e, {r:0.6, wet:1}),
  ground:   M(0x9b9a8e, {map:'asphalt', r:1}),
  lotBase:  M(0xbdb9ae, {map:'concrete', r:0.95}),
  retain:   M(0xb4b0a6, {map:'concrete', r:0.95}),
  concrete: M(0xc3c0b8, {map:'concrete', r:0.92}),
  revet:    M(0xa9a69c, {map:'concrete', r:0.95}),
  water:    M(0x34505a, {r:0.06, m:0.1, noCast:true}),
  ballast:  M(0x8b847a, {map:'asphalt', r:1}),
  sleeper:  M(0x8e8a82, {r:0.9}),
  rail:     M(0x8a8278, {r:0.35, m:0.75}),
  steel:    M(0x6f7a72, {r:0.6, m:0.4}),
  steelDk:  M(0x3c3f43, {r:0.6, m:0.4}),
  pole:     M(0xb9b7b0, {r:0.8}),
  poleBase: M(0x9a978f),
  trunk:    M(0x6e5642, {r:1, flat:true}),
  glass:    M(0x29323b, {r:0.08, m:0.2}),
  glassLit: M(0x6c7884, {r:0.2, m:0.1, glow:1.1, glowHex:0xffc98a}),
  glassCool:M(0x707c88, {r:0.2, m:0.1, glow:1.0, glowHex:0xe4eeff}),
  frame:    M(0xe9e6de, {r:0.6}),
  frameDk:  M(0x55585c, {r:0.45, m:0.4}),
  door:     M(0x5a4a3a, {r:0.7}),
  foundation:M(0x9e9b93, {r:0.95}),
  trim:     M(0xe4e0d6),
  ac:       M(0xe1ded6, {r:0.6}),
  acFan:    M(0x55575a, {r:0.7}),
  tire:     M(0x1f2023, {r:0.9}),
  carGlass: M(0x1d2329, {r:0.05, m:0.3}),
  headlight:M(0xe8e8e2, {r:0.2, glow:2.2, glowHex:0xfff2d0}),
  taillight:M(0xa01818, {r:0.3, glow:1.4, glowHex:0xff2020}),
  lamp:     M(0xf2f0e8, {r:0.3, glow:2.4, glowHex:0xfff0d0, noCast:true}),
  lampCool: M(0xeef2f4, {r:0.3, glow:2.4, glowHex:0xe8f2ff, noCast:true}),
  person:   M(0xa7afb8, {r:0.75}),
  personDk: M(0x6d747c, {r:0.75}),
  mirror:   M(0xe8ecef, {r:0.04, m:1}),
  orange:   M(0xe2742c, {r:0.6}),
  red:      M(0xc8262b, {r:0.55}),
  redLit:   M(0x9a1d1d, {r:0.3, glow:2.0, glowHex:0xff2a1a}),
  blue:     M(0x1f4fa0, {r:0.55}),
  black:    M(0x232427, {r:0.6}),
  signW:    M(0xf3f2ec, {r:0.5}),
  wood:     M(0x8a6a4c, {r:0.85}),
  woodDk:   M(0x5c4634, {r:0.85}),
  leafCherry:M(0xf0c3cf, {r:0.9, flat:true}),
};
/* 夜の光だまり（街灯の下の地面）。加算合成の平面 */
MAT.pool = new THREE.MeshBasicMaterial({map:TEX.pool(), color:lin(0xffd9a0), transparent:true, opacity:0.55,
  depthWrite:false, blending:THREE.AdditiveBlending, polygonOffset:true, polygonOffsetFactor:-2});
MAT.pool.userData = {noCast:true, noReceive:true, nightOnly:true};
MATS.set('pool', MAT.pool);

const WALLS_RES = [0xf1efe8,0xe6e2d6,0xd9d5ca,0xcfd3d6,0xe9dfc9,0xdad0be,0xc9cdd2,0xbfb7a8,0x9da3a6].map(h=>M(h,{r:0.9}));
const ROOFS     = [0x4a4f57,0x37404d,0x5a4a41,0x6b6f76,0x3d4a42,0x7a4d3a].map(h=>M(h,{r:0.8}));
const WALLS_SHO = [0xd8d6d0,0xc4c6c9,0xb9bcc2,0xdedbd2,0xa7abb2,0xcfc9bd,0x9aa0a8,0xe2d9c8].map(h=>M(h,{r:0.85}));
const SIGNS     = [0xe25822,0x2255aa,0xcc2233,0xf4f1e8,0xe8b830,0x1f7a4d,0x14203a,0xffffff,0x7a2e8e].map(h=>M(h,{r:0.5, glow:0.9}));
const GREENS    = [0x5d7a4a,0x6d8a52,0x4e6b3f,0x7a9156].map(h=>M(h,{r:0.95, flat:true}));
const CAR_COLORS= [0xf2f2ef,0xf2f2ef,0xc9ccd0,0xc9ccd0,0x23262b,0x2d3e5c,0x8c1f24,0xcbbd9e,0x5f6a5a].map(h=>M(h,{r:0.3, m:0.35}));
