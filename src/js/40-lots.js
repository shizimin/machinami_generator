/* ================= 区画（建物） =================
   ローカル座標：原点＝道路側の縁の中央、+Z が奥行き方向、y=0 が敷地の地盤面。
   敷地の下には擁壁（深さ 4m）を付けておくので、坂道でも宙に浮かない。
   ctx: { prng（小物用の乱数）, alley, arcade, yokocho, lowrise }                    */

function podium(g, w, d, top, mat){
  const h = top + 4;
  Bb(g, w, h, d, mat || MAT.lotBase, 0, -4, d/2);
}

/* 前面の境界：ブロック塀／アルミフェンス／生垣（門の切れ目と門柱つき） */
function frontBoundary(g, rng, lotW, ctx){
  const kind = rng();
  const gateW = range(rng,1.3,2.4);
  const gateX = range(rng,-1,1)*(lotW/2 - gateW);
  const segs = [[-lotW/2+0.2, gateX-gateW/2], [gateX+gateW/2, lotW/2-0.2]];
  const tall = ctx.alley ? 0.4 : 0;
  if (kind < 0.5){
    // ブロック塀（笠木つき）
    const h = range(rng,0.9,1.4) + tall;
    const mat = pick(rng, [M(0xc9c5ba,{r:0.95}), M(0xb7b3a8,{r:0.95}), M(0xd6d0c2,{r:0.95})]);
    for (const [a,b] of segs){
      if (b-a < 0.3) continue;
      Bb(g, b-a, h, 0.15, mat, (a+b)/2, 0.12, 0.2);
      Bb(g, b-a+0.02, 0.05, 0.2, MAT.concrete, (a+b)/2, 0.12+h, 0.2);
    }
  } else if (kind < 0.8){
    // アルミフェンス（低い腰壁＋横格子）
    const h = range(rng,0.9,1.2) + tall;
    const fm = pick(rng, [MAT.frameDk, M(0x7a6a58,{r:0.5,m:0.3}), M(0xd8d5cc,{r:0.5,m:0.3})]);
    for (const [a,b] of segs){
      if (b-a < 0.3) continue;
      Bb(g, b-a, 0.35, 0.18, MAT.concrete, (a+b)/2, 0.12, 0.2);
      for (let x=a+0.05; x<=b; x+=1.8) Bb(g, 0.06, h, 0.06, fm, Math.min(x,b-0.03), 0.12, 0.2);
      for (let i=0; i<4; i++) Bb(g, b-a, 0.05, 0.03, fm, (a+b)/2, 0.12+0.45+i*(h-0.5)/3.5, 0.2);
    }
  } else if (rng() < state.green + 0.2){
    const hd = hedge(rng, lotW-1.2); hd.position.set(0, 0.12, 0.35); g.add(hd);
    return gateX;
  } else return gateX;
  // 門柱（表札・ポスト）
  for (const s of [-1,1]){
    const px = gateX + s*(gateW/2 + 0.18);
    if (Math.abs(px) > lotW/2 - 0.2) continue;
    Bb(g, 0.36, 1.35+tall, 0.36, MAT.concrete, px, 0.12, 0.2);
    Bb(g, 0.42, 0.06, 0.42, MAT.foundation, px, 1.47+tall, 0.2);
    if (s < 0){
      B(g, 0.22, 0.12, 0.02, MAT.signW, px, 1.1, 0.01);             // 表札
      Bb(g, 0.3, 0.36, 0.14, MAT.frameDk, px, 0.6, 0.0);            // ポスト
    }
  }
  return gateX;
}

/* --- 戸建て --- */
function residentialLot(rng, lotW, ctx){
  const s = state, g = new THREE.Group(), pr = ctx.prng;
  const depth = range(rng,9,13);
  podium(g, lotW-0.3, depth, 0.12);

  const floors = (rng() < 0.68 ? 2 : 1);
  const fh = 2.85 * s.height;
  const bw = lotW * range(rng,0.55,0.8);
  const bd = depth * range(rng,0.45,0.6);
  const bh = floors * fh;
  const wall = pick(rng, WALLS_RES);
  const setback = ctx.alley ? range(rng,0.7,1.5) : range(rng,1.4,3.0);
  const hx = range(rng,-1,1)*(lotW-bw)/2*0.6, hz = setback + bd/2;
  const front = hz - bd/2;
  Bb(g, bw, bh, bd, wall, hx, 0.12, hz);
  Bb(g, bw+0.04, 0.4, bd+0.04, MAT.foundation, hx, 0.08, hz);         // 基礎
  if (floors === 2) B(g, bw+0.08, 0.09, bd+0.08, MAT.trim, hx, 0.12 + fh, hz);  // 胴差しの帯

  // 下屋（L字の平屋部分）
  if (rng() < 0.4){
    const aw = bw * range(rng,0.35,0.5), ad = bd * range(rng,0.5,0.8);
    const sx = rng()<0.5 ? -1 : 1;
    const ax = hx + sx*(bw/2 - aw/2), az = hz + bd/2 + ad/2;
    if (az + ad/2 < depth - 0.3){
      Bb(g, aw, fh, ad, wall, ax, 0.12, az);
      hipRoof(g, aw, ad, range(rng,0.6,1.0), pick(rng,ROOFS), ax, 0.12 + fh, az);
    }
  }

  // 窓とドア（道路側の面）
  const facade = new THREE.Group();
  facade.position.set(hx, 0.12, hz); g.add(facade);
  const cols = Math.max(2, Math.round(bw/1.8));
  const dc = (cols/2)|0;
  const amado = pick(rng, [MAT.frameDk, MAT.trim, M(0x8b8f93,{r:0.5,m:0.3})]);
  addWindows(facade, rng, bw*0.9, bh, -bd/2, -1, cols, floors, {
    ww:0.9, wh:1.15, y0:0.25, litRatio:0.25, sill:true, amado,
    skip:(c,r)=> r===0 && c===dc,
  });
  const doorX = hx + ((dc+0.5)/cols - 0.5)*bw*0.9;
  B(g, 1.0, 2.0, 0.08, pick(rng,[MAT.door, MAT.woodDk, MAT.frameDk]), doorX, 0.12+0.4+1.0, front - 0.04);
  B(g, 1.16, 0.08, 0.1, MAT.frame, doorX, 0.12+2.44, front - 0.05);
  B(g, 1.7, 0.1, 1.0, pick(rng,ROOFS), doorX, 0.12+2.7, front - 0.48);          // 玄関の庇
  Bb(g, 1.6, 0.2, 0.7, MAT.concrete, doorX, 0.12, front - 0.35);                 // ポーチの段
  // 側面の窓
  if (bd > 4){
    for (const sx of [-1,1]){
      const sf = new THREE.Group();
      sf.position.set(hx + sx*bw/2, 0.12, hz); sf.rotation.y = -sx*Math.PI/2; g.add(sf);
      addWindows(sf, rng, bd*0.8, bh, 0, -1, Math.max(1,Math.round(bd/2.6)), floors,
        {ww:0.7, wh:0.95, y0:0.3, litRatio:0.15});
    }
  }

  // 屋根
  const roofMat = pick(rng, ROOFS);
  const rt = rng();
  const top = bh + 0.12;
  if (rt < 0.45){
    const along = rng() < 0.5;      // true: 棟が道路と平行
    const len = along ? bw : bd, span = along ? bd : bw;
    gableRoof(g, len, span, span/2*range(rng,0.45,0.65)*Math.min(1.2,s.height), roofMat, wall, hx, top, hz, along ? 0 : Math.PI/2);
  } else if (rt < 0.82){
    hipRoof(g, bw, bd, Math.min(bw,bd)/2*range(rng,0.45,0.6), roofMat, hx, top, hz);
  } else {
    Bb(g, bw+0.2, 0.55, bd+0.2, MAT.trim, hx, top - 0.05, hz);                   // パラペット
    Bb(g, bw-0.2, 0.06, bd-0.2, roofMat, hx, top + 0.3, hz);
  }
  // 雨樋（縦樋）
  for (const sx of [-1,1]) C(g, 0.05, 0.05, bh, 6, MAT.frame, hx + sx*(bw/2+0.06), 0.12, front - 0.06);

  // 室外機
  if (rng() < 0.65){
    const ax = hx + range(rng,-1,1)*bw*0.35;
    Bb(g, 0.8, 0.58, 0.3, MAT.ac, ax, 0.12, front - 0.2);
    const fan = disc(0.2, 0.02, 12, MAT.acFan); fan.position.set(ax - 0.12, 0.12+0.29, front - 0.36); g.add(fan);
  }
  // 2階ベランダ
  if (floors === 2 && rng() < 0.6){
    const vw = bw*range(rng,0.5,0.8);
    Bb(g, vw, 0.12, 0.9, wall, hx, 0.12 + fh - 0.05, front - 0.45);
    Bb(g, vw, 0.85, 0.06, pick(rng,[MAT.frame, MAT.frameDk, wall]), hx, 0.12 + fh + 0.07, front - 0.88);
    for (const sx of [-1,1]) Bb(g, 0.06, 0.85, 0.9, MAT.frame, hx + sx*vw/2, 0.12 + fh + 0.07, front - 0.45);
  }

  // 前面の境界
  const gateX = frontBoundary(g, rng, lotW, ctx);

  // 庭木
  const nTree = (rng() < s.green) ? 1 + (rng() < s.green ? 1 : 0) : 0;
  for (let i=0; i<nTree; i++){
    const t = rng() < 0.3 ? conifer(rng, range(rng,1,1.6)) : tree(rng, range(rng,0.85,1.4));
    let tx = range(rng,-1,1)*lotW*0.4;
    if (Math.abs(tx - gateX) < 1.2) tx = gateX + (tx < gateX ? -1.5 : 1.5);
    t.position.set(clamp(tx, -lotW/2+0.8, lotW/2-0.8), 0.12, range(rng,0.9,Math.max(1, setback-0.3)));
    g.add(t);
  }
  // 駐車スペースの車（建物の横が空いていれば頭から、前庭が広ければ横向きに）
  if (rng() < 0.5){
    const freeL = (hx - bw/2) + lotW/2, freeR = lotW/2 - (hx + bw/2);
    const c = car(rng);
    if (Math.max(freeL, freeR) > 2.3){
      const cx = freeR > freeL ? hx + bw/2 + freeR/2 : hx - bw/2 - freeL/2;
      c.rotation.y = -Math.PI/2; c.position.set(cx, 0.12, 2.8);
      Bb(g, Math.max(freeL, freeR) - 0.3, 0.02, 5.4, MAT.concrete, cx, 0.12, 2.9);
      g.add(c);
    } else if (setback > 2.3){
      c.position.set(clamp(gateX, -lotW/2+2.4, lotW/2-2.4), 0.12, setback/2 + 0.1);
      g.add(c);
    }
  }
  // 小物：自転車・鉢植え・ゴミ置き場
  if (pr() < s.props*0.35){
    const b = bicycle(pr); b.rotation.y = Math.PI/2 + range(pr,-0.2,0.2);
    b.position.set(clamp(doorX + 1.3, -lotW/2+0.5, lotW/2-0.5), 0.12, Math.max(0.6, front - 0.9)); g.add(b);
  }
  if (pr() < s.props*0.6){
    const n = 2 + (pr()*4|0);
    for (let i=0; i<n; i++){ const p = planter(pr); p.position.set(doorX - 1.1 - i*0.45, 0.12, front - 0.35 - (i%2)*0.3); g.add(p); }
  }
  if (pr() < s.props*0.08){
    const gx = -lotW/2 + 1.0;
    Bb(g, 1.6, 0.9, 0.9, M(0x2e6b4a,{r:0.7}), gx + 0.3, 0.12, 0.75);   // ゴミ集積所の箱
  }
  return g;
}

/* --- マンション／アパート（3〜7階建て） --- */
function apartmentLot(rng, lotW, ctx){
  const s = state, g = new THREE.Group(), pr = ctx.prng;
  const depth = range(rng,10,14);
  podium(g, lotW-0.3, depth, 0.12);

  const floors = 3 + Math.round(range(rng,0,3) * Math.min(1.6, s.height));
  const fh = 2.85, bh = floors*fh;
  const bw = lotW * range(rng,0.74,0.92), bd = depth * range(rng,0.5,0.66);
  const wall = pick(rng, WALLS_RES);
  const setback = range(rng,1.2,2.6);
  const bx = range(rng,-1,1)*(lotW-bw)/2*0.5, bz = setback + bd/2, front = bz - bd/2;
  Bb(g, bw, bh, bd, wall, bx, 0.12, bz);

  // 窓（掃き出し窓）とベランダ
  const units = Math.max(2, Math.round(bw/3.4)), uw = bw/units;
  const wg = new THREE.Group(); wg.position.set(bx, 0.12, bz); g.add(wg);
  addWindows(wg, rng, bw*0.94, bh, -bd/2, -1, units, floors,
    {ww:uw*0.62, wh:2.0, y0:-0.05, litRatio:0.35, frameMat:MAT.frameDk});
  const railMat = pick(rng, [wall, M(0xcac6bc,{r:0.8}), M(0x8a9198,{r:0.4,m:0.3}), M(0xb8c4cc,{r:0.2, op:0.6})]);
  for (let f=0; f<floors; f++){
    const y = 0.12 + f*fh;
    Bb(g, bw, 0.16, 1.2, wall, bx, y + fh - 0.12, front - 0.6);              // 上階の床スラブ＝庇
    if (f === 0) continue;
    Bb(g, bw, 1.0, 0.08, railMat, bx, y + 0.0, front - 1.16);                // 手すり壁
    Bb(g, bw, 0.05, 0.14, MAT.frame, bx, y + 1.0, front - 1.16);
    for (let u=1; u<units; u++){                                              // 隔て板
      Bb(g, 0.04, 1.9, 1.1, M(0xe7e3d8,{r:0.6}), bx - bw/2 + u*uw, y, front - 0.58);
    }
    for (let u=0; u<units; u++){
      if (pr() < 0.55){                                                       // 室外機
        Bb(g, 0.75, 0.55, 0.28, MAT.ac, bx - bw/2 + (u+0.78)*uw - 0.4, y, front - 0.2);
      }
    }
  }
  // 階段室／エレベーター棟
  const sx = (rng()<0.5?-1:1) * (bw/2 + 1.0);
  Bb(g, 2.0, bh + 1.2, 2.6, M(0xc4c0b6,{r:0.9}), bx + sx, 0.12, front + 1.6);
  addWindows((()=>{ const q = new THREE.Group(); q.position.set(bx+sx, 0.12, front+0.3); g.add(q); return q; })(),
    rng, 1.4, bh, 0, -1, 1, floors, {ww:0.5, wh:1.6, litRatio:0.8, cool:true});
  // パラペット＋屋上設備
  Bb(g, bw+0.3, 0.7, bd+0.3, wall, bx, bh + 0.12 - 0.1, bz);
  Bb(g, bw+0.36, 0.08, bd+0.36, MAT.concrete, bx, bh + 0.72, bz);
  if (rng() < 0.7) Bb(g, bw*0.3, 1.3, bd*0.3, M(0x8d9096,{r:0.6,m:0.3}), bx + range(rng,-1,1)*bw*0.2, bh+0.12, bz);
  // エントランス
  const ex = bx + range(rng,-1,1)*bw*0.25;
  B(g, 1.8, 2.4, 0.08, MAT.glassCool, ex, 0.12 + 1.2, front - 0.04);
  B(g, 2.6, 0.18, 1.6, MAT.concrete, ex, 0.12 + 2.75, front - 0.8);
  Bb(g, 2.4, 0.15, 1.2, MAT.concrete, ex, 0.12, front - 0.6);
  // 塀と植栽
  if (rng() < 0.6){ Bb(g, lotW-0.8, 0.9, 0.15, M(0xcbc8be,{r:0.95}), 0, 0.12, 0.2); }
  if (rng() < s.green){
    const t = tree(rng, range(rng,0.9,1.4));
    t.position.set(range(rng,-1,1)*lotW*0.35, 0.12, range(rng,0.6,Math.max(0.7,setback-0.5)));
    g.add(t);
  }
  // 駐輪場
  if (pr() < s.props*0.5){
    const n = 3 + (pr()*5|0), x0 = -lotW/2 + 1.0;
    for (let i=0; i<n; i++){
      const b = bicycle(pr); b.rotation.y = Math.PI/2; b.position.set(x0 + i*0.55, 0.12, 1.0); g.add(b);
    }
  }
  return g;
}

/* --- 店舗ビル（繁華街・アーケード・横丁） --- */
function shoppingLot(rng, lotW, ctx){
  const s = state, g = new THREE.Group(), pr = ctx.prng;
  const low = ctx.lowrise || ctx.yokocho;
  const bw = lotW - range(rng,0.2,0.8);
  const floors = ctx.yokocho ? 2 : low ? 2 + (rng()*2.2|0)
    : Math.max(2, Math.round(range(rng,2,7) * s.height));
  const fh = ctx.yokocho ? 2.7 : 3.1, bh = floors*fh;
  const bd = range(rng,8,14);
  const wall = ctx.yokocho ? pick(rng,[MAT.wood, MAT.woodDk, M(0x7d6e5e,{r:0.9}), WALLS_SHO[3]]) : pick(rng, WALLS_SHO);
  podium(g, bw, bd + 0.4, 0.05);
  Bb(g, bw, bh, bd, wall, 0, 0.05, bd/2 + 0.2);
  const front = 0.2;
  for (let f=1; f<floors; f++) B(g, bw+0.06, 0.12, 0.08, MAT.trim, 0, 0.05 + f*fh, front - 0.04);   // 階の帯

  // 屋上
  Bb(g, bw+0.1, 0.6, bd+0.1, wall, 0, bh - 0.1, bd/2 + 0.2);
  if (!low && rng() < 0.5) Bb(g, bw*0.4, 1.8, bd*0.35, M(0x8d9096,{r:0.6,m:0.3}), range(rng,-1,1)*bw*0.2, bh+0.5, bd/2+0.2);
  if (!low && floors >= 4 && rng() < 0.3){   // 屋上看板
    const sw = bw*0.8, sh = range(rng,2,3.5);
    for (const sx of [-0.35,0.35]) Bb(g, 0.15, sh+1, 0.15, MAT.steelDk, sx*sw, bh+0.5, front + 1.5);
    Bb(g, sw, sh, 0.2, pick(rng,SIGNS), 0, bh + 1.3, front + 1.3);
  }

  // 各階のファサード看板
  for (let f=1; f<floors; f++){
    if (rng() < 0.7){
      const sw = bw * range(rng,0.5,0.92), sh = range(rng,0.6,1.1);
      const sx = range(rng,-1,1)*(bw-sw)/2*0.7, sy = 0.05 + f*fh + fh*0.78;
      B(g, sw, sh, 0.12, pick(rng,SIGNS), sx, sy, front - 0.08);
      B(g, sw+0.08, sh+0.08, 0.06, MAT.frameDk, sx, sy, front - 0.02);
    }
  }
  // 上階の窓
  const wg = new THREE.Group(); wg.position.set(0, 0.05, front); g.add(wg);
  const wcols = Math.max(2, Math.round(bw/1.5));
  if (floors > 1) addWindows(wg, rng, bw*0.9, (floors-1)*fh, 0, -1, wcols, floors-1,
    {ww:0.9, wh:1.35, y0:fh, litRatio:0.45, cool:!ctx.yokocho, frameMat:MAT.frameDk});

  // 1階：店先
  const shutter = !ctx.yokocho && rng() < 0.15;
  if (shutter){
    for (let i=0; i<10; i++) B(g, bw*0.9, fh*0.075, 0.05 + (i%2)*0.02, M(0xa9adb2,{r:0.4,m:0.5}), 0, 0.05 + fh*0.04 + i*fh*0.075, front - 0.03);
    Bb(g, bw*0.92, 0.35, 0.3, M(0xa9adb2,{r:0.4,m:0.5}), 0, fh*0.76, front - 0.1);
  } else {
    B(g, bw*0.9, fh*0.7, 0.06, MAT.glassLit, 0, fh*0.42, front - 0.03);
    for (let x=-bw*0.45; x<=bw*0.45+0.01; x+=bw*0.9/Math.max(2,Math.round(bw/2.4)))
      B(g, 0.07, fh*0.7, 0.1, MAT.frameDk, x, fh*0.42, front - 0.05);
    B(g, 1.2, fh*0.72, 0.1, MAT.door, range(rng,-1,1)*bw*0.25, fh*0.41, front - 0.08);
  }

  if (ctx.yokocho){
    // 横丁：のれん・赤提灯・木の看板
    const dx = range(rng,-1,1)*bw*0.2;
    const noren = pick(rng, [M(0x1c2a4a,{r:0.9}), M(0x7a1a1a,{r:0.9}), M(0xe8e2d0,{r:0.9})]);
    for (let i=0; i<4; i++) B(g, 0.3, 0.55, 0.02, noren, dx - 0.48 + i*0.32, 2.0, front - 0.18);
    B(g, 1.5, 0.05, 0.05, MAT.woodDk, dx, 2.3, front - 0.18);
    const lan = M(0xc8281e, {r:0.6, glow:1.5, glowHex:0xff5a2a});
    for (const sx of [-1,1]){
      if (rng() < 0.75){
        const l = sphere(0.22, 1, lan); l.scale.y *= 1.35; l.position.set(dx + sx*1.05, 2.15, front - 0.32); g.add(l);
        C(g, 0.12, 0.12, 0.05, 8, MAT.black, dx + sx*1.05, 2.43, front - 0.32);
        C(g, 0.12, 0.12, 0.05, 8, MAT.black, dx + sx*1.05, 1.83, front - 0.32);
      }
    }
    B(g, bw*0.7, 0.45, 0.08, pick(rng,[MAT.woodDk, MAT.signW, SIGNS[3]]), 0, 2.75, front - 0.1);
    if (pr() < s.props*0.6){   // ビールケース
      for (let i=0; i<2+(pr()*3|0); i++) Bb(g, 0.45, 0.3, 0.35, pick(pr,[MAT.red, M(0xe8c22a,{r:0.6}), MAT.blue]), -bw/2 + 0.4 + (i%2)*0.5, 0.05 + (i>1?0.3:0), front - 0.35);
    }
  } else {
    // 袖看板（縦に突き出す看板）
    const nSode = (low ? 0 : 1) + ((rng()<0.6) ? 1 : 0);
    for (let i=0; i<nSode; i++){
      const sh = low ? range(rng,1.4,2.2) : range(rng,2.2,5)*Math.min(1.5,s.height);
      const sy = range(rng, fh, Math.max(fh+0.3, bh - sh));
      const sx = (rng()<0.5?-1:1)*(bw/2-0.25);
      B(g, 0.65, sh, 0.26, pick(rng,SIGNS), sx, sy + sh/2, front - 0.55);
      B(g, 0.7, sh+0.06, 0.18, MAT.frameDk, sx, sy + sh/2, front - 0.55);
      B(g, 0.08, 0.08, 0.5, MAT.steelDk, sx, sy + 0.3, front - 0.2);
      B(g, 0.08, 0.08, 0.5, MAT.steelDk, sx, sy + sh - 0.3, front - 0.2);
    }
    // ひさし・テント（少し傾ける）
    if (!shutter && rng() < 0.7){
      const awn = box(bw*0.9, 0.06, 1.2, pick(rng,SIGNS));
      awn.position.set(0, fh*0.92, front - 0.55); awn.rotation.x = -0.28; g.add(awn);
      B(g, bw*0.9, 0.22, 0.04, awn.material, 0, fh*0.92 - 0.27, front - 1.12);
    }
    // 自販機・立て看板・のぼり
    if (rng() < 0.45){
      const vm = vendingMachine(rng); vm.position.set(range(rng,-1,1)*bw*0.35, 0.05, front - 0.45); g.add(vm);
    }
    if (pr() < s.props*0.5){
      const ax = range(pr,-1,1)*bw*0.3;
      const a = box(0.55, 0.9, 0.05, pick(pr,SIGNS)); a.position.set(ax, 0.5, front - 1.2); a.rotation.x = 0.18; g.add(a);
      const b2 = box(0.55, 0.9, 0.05, MAT.frameDk); b2.position.set(ax, 0.5, front - 1.38); b2.rotation.x = -0.18; g.add(b2);
    }
    if (pr() < s.props*0.4){
      const n = 1 + (pr()*3|0), col = pick(pr,SIGNS);
      for (let i=0; i<n; i++){
        const nx = -bw/2 + 0.5 + i*0.9;
        C(g, 0.02, 0.02, 2.6, 5, MAT.frame, nx, 0.05, front - 1.0);
        B(g, 0.02, 1.7, 0.5, col, nx, 1.7, front - 1.25);
      }
    }
    if (pr() < s.props*0.45){   // 店先の自転車
      const n = 1 + (pr()*4|0), x0 = range(pr,-1,1)*bw*0.25;
      for (let i=0; i<n; i++){ const b = bicycle(pr); b.rotation.y = Math.PI/2 + range(pr,-0.15,0.15); b.position.set(x0 + i*0.6, 0.05, front - 1.1); g.add(b); }
    }
  }
  // 壁の室外機・配管
  if (floors >= 2 && rng() < 0.5){
    const sx = (rng()<0.5?-1:1)*(bw/2 - 0.5);
    C(g, 0.06, 0.06, bh - 0.3, 6, MAT.frame, sx, 0.05, front - 0.08);
    for (let f=1; f<floors; f++) if (rng()<0.5) Bb(g, 0.75, 0.55, 0.3, MAT.ac, sx - 0.6*Math.sign(sx), 0.05 + f*fh + 0.15, front - 0.16);
  }
  return g;
}

/* --- オフィスビル（オフィス街） ---
   外観は 3 種類：ガラスのカーテンウォール／石張りに窓が並ぶ／横連窓。
   窓は 1 枚ずつ枠を作らず、階ごとのガラス帯＋方立て・梁型でまとめて軽くする。 */
const OFFICE_TINTS = [0x34495a, 0x2f4a4c, 0x4a5560, 0x56697a, 0x3a3f46];
function officeGlass(tint, lit){
  return M(tint, lit ? {r:0.06, m:0.7, glow:0.22, glowHex:0xdfe8f0} : {r:0.06, m:0.7});
}
const OFFICE_STONE = [0xd9d4ca, 0xbfb9ae, 0x9aa0a6, 0xe6e2da, 0x70757b, 0xcfc6b6];
MAT.mullion = M(0x8c9399, {r:0.35, m:0.6});

/* 1 つの面のファサード。face のローカル：幅 W（x）、y=0 から上、外向きは -Z */
function officeFacade(face, rng, style, W, floors, fh, wallMat, tint, litR){
  const H = floors*fh;
  if (style === 'curtain'){
    const segs = Math.max(1, Math.round(W/4.5)), sw = W/segs;
    for (let f=0; f<floors; f++)
      for (let k=0; k<segs; k++)
        B(face, sw - 0.02, fh - 0.04, 0.06, officeGlass(tint, rng() < litR), -W/2 + (k+0.5)*sw, f*fh + fh/2, -0.03);
    for (let x = -W/2; x <= W/2 + 0.01; x += W/Math.max(2, Math.round(W/1.6)))
      B(face, 0.07, H, 0.16, MAT.mullion, x, H/2, -0.08);
    for (let f=0; f<=floors; f++) B(face, W + 0.04, 0.12, 0.14, MAT.mullion, 0, f*fh, -0.07);
  } else if (style === 'bands'){
    const segs = Math.max(1, Math.round(W/4.5)), sw = W/segs;
    for (let f=0; f<floors; f++){
      for (let k=0; k<segs; k++)
        B(face, sw - 0.02, fh*0.5, 0.06, officeGlass(tint, rng() < litR), -W/2 + (k+0.5)*sw, f*fh + fh*0.58, -0.03);
      B(face, W + 0.1, 0.1, 0.35, wallMat, 0, f*fh + fh*0.3, -0.17);       // 庇状の水平ルーバー
    }
    for (let x = -W/2 + 0.05; x <= W/2; x += 3) B(face, 0.06, H, 0.1, MAT.mullion, x, H/2, -0.06);
  } else {
    const cols = Math.max(2, Math.round(W/2.3)), cw = W/cols;
    for (let f=0; f<floors; f++)
      for (let c=0; c<cols; c++)
        B(face, cw*0.62, fh*0.58, 0.05, officeGlass(tint, rng() < litR), -W/2 + (c+0.5)*cw, f*fh + fh*0.55, -0.02);
    for (let c=0; c<=cols; c++) B(face, 0.3, H, 0.3, wallMat, -W/2 + c*cw, H/2, -0.15);   // 柱型
    for (let f=0; f<=floors; f++) B(face, W + 0.3, 0.24, 0.26, wallMat, 0, f*fh + 0.12, -0.13); // 梁型
  }
}

/* 直方体のボリューム 1 段分（前面と両側面にファサード、背面は壁のまま） */
function officeMass(g, rng, o, cx, cz, w, d, y0, floors, skipFrontBelow){
  const H = floors*o.fh;
  Bb(g, w, H, d, o.wall, cx, y0, cz);
  const faces = [[cx, cz - d/2, 0, w], [cx - w/2, cz, Math.PI/2, d], [cx + w/2, cz, -Math.PI/2, d]];
  for (const [x, z, ry, W] of faces){
    const f = new THREE.Group(); f.position.set(x, y0, z); f.rotation.y = ry; g.add(f);
    officeFacade(f, rng, o.style, W - 0.4, floors, o.fh, o.wall, o.tint, o.litR);
  }
  return y0 + H;
}

function officeLot(rng, lotW, ctx){
  const s = state, g = new THREE.Group(), pr = ctx.prng;
  const depth = range(rng, 20, 30);
  const plazaMat = pick(rng, [M(0xcfcac0, {r:0.8}), M(0xb9b4ab, {r:0.8}), M(0xd8d0c2, {r:0.8})]);
  podium(g, lotW - 0.2, depth, 0.15, plazaMat);
  const o = {
    style: pick(rng, ['curtain', 'curtain', 'punched', 'bands']),
    wall: M(pick(rng, OFFICE_STONE), {r:0.7}),
    tint: pick(rng, OFFICE_TINTS),
    fh: range(rng, 3.7, 4.2),
    litR: range(rng, 0.45, 0.8),
  };
  const plaza = rng() < 0.6 ? range(rng, 3, 7) : range(rng, 1, 2);    // 公開空地
  const bw = lotW - range(rng, 1, 3.5);
  const bd = Math.min(depth - plaza - 0.8, range(rng, 14, 22));
  const front = 0.15 + plaza, cz = front + bd/2;
  const floors = Math.max(4, Math.round(range(rng, 7, 26) * s.height));
  const lobbyH = o.fh*1.5;

  // 低層部（ロビー）：ガラス張り＋列柱＋庇
  Bb(g, bw, lobbyH, bd, o.wall, 0, 0.15, cz);
  B(g, bw*0.92, lobbyH - 0.4, 0.06, MAT.glassCool, 0, 0.15 + (lobbyH - 0.4)/2, front - 0.03);
  const nCol = Math.max(2, Math.round(bw/4.5));
  for (let i=0; i<=nCol; i++) Bb(g, 0.6, lobbyH, 0.6, o.wall, -bw/2 + 0.3 + i*(bw - 0.6)/nCol, 0.15, front - 0.6);
  const ex = range(rng, -1, 1)*bw*0.2, cw = Math.min(bw*0.6, range(rng, 6, 10));
  Bb(g, cw, 0.3, 3.2, pick(rng, [o.wall, MAT.mullion]), ex, 0.15 + lobbyH - 0.5, front - 1.6);
  for (const sx of [-1, 1]) C(g, 0.09, 0.09, lobbyH - 0.5, 8, MAT.mullion, ex + sx*(cw/2 - 0.3), 0.15, front - 3.0);

  // 高層部（たまにセットバックして 2 段）
  let top;
  if (floors > 14 && rng() < 0.45){
    const f1 = Math.round(floors*0.6);
    top = officeMass(g, rng, o, 0, cz, bw, bd, 0.15 + lobbyH, f1);
    const w2 = bw*range(rng, 0.65, 0.8), d2 = bd*range(rng, 0.7, 0.85);
    Bb(g, bw + 0.2, 0.9, bd + 0.2, o.wall, 0, top, cz);
    top = officeMass(g, rng, o, range(rng, -1, 1)*(bw - w2)*0.3, cz + (bd - d2)*0.3, w2, d2, top, floors - f1);
    Bb(g, w2 + 0.2, 1.0, d2 + 0.2, o.wall, 0, top, cz + (bd - d2)*0.3);
    o.topW = w2; o.topD = d2; o.topZ = cz + (bd - d2)*0.3;
  } else {
    top = officeMass(g, rng, o, 0, cz, bw, bd, 0.15 + lobbyH, floors);
    Bb(g, bw + 0.2, 1.0, bd + 0.2, o.wall, 0, top, cz);
    o.topW = bw; o.topD = bd; o.topZ = cz;
  }
  // 屋上：設備・冷却塔・ヘリポート・航空障害灯・社名看板
  const rw = o.topW, rd = o.topD, rz = o.topZ;
  Bb(g, rw*0.35, 2.2, rd*0.3, M(0x8d9096, {r:0.6, m:0.3}), range(rng, -1, 1)*rw*0.2, top, rz + rd*0.15);
  if (rng() < 0.6) for (let i=0; i<2; i++) C(g, 1.1, 1.3, 2.4, 12, M(0x9aa2a8, {r:0.5, m:0.3}), -rw*0.3 + i*2.6, top, rz - rd*0.25);
  if (top > 70 && rng() < 0.6){
    Bb(g, Math.min(rw, rd)*0.75, 0.25, Math.min(rw, rd)*0.75, MAT.steelDk, 0, top + 2.4, rz);
    const hp = disc(Math.min(rw, rd)*0.3, 0.02, 24, MAT.white); hp.rotation.x = -Math.PI/2; hp.position.set(0, top + 2.67, rz); hp.scale.z = 0.02; g.add(hp);
    for (const x of [-0.8, 0.8]) B(g, 0.35, 0.03, 2.4, MAT.yellow, x, top + 2.7, rz);
    B(g, 1.3, 0.03, 0.35, MAT.yellow, 0, top + 2.7, rz);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]){
    const l = sphere(0.18, 1, MAT.redLit); l.position.set(sx*(rw/2), top + 1.2, rz + sz*rd/2); g.add(l);
  }
  if (rng() < 0.5){
    const sw = Math.min(rw*0.6, 14);
    B(g, sw, 1.8, 0.25, pick(rng, [SIGNS[3], SIGNS[7], SIGNS[1], SIGNS[6]]), 0, top + 2.0, rz - rd/2 + 0.3);
  }
  if (top > 50 && rng() < 0.5) rod(g, rw*0.25, top, rz, rw*0.25, top + 9, rz, 0.08, MAT.steel);

  // 公開空地：植栽・ベンチ・社名の石・旗竿・車止め
  if (plaza > 2.5){
    const nT = 1 + (rng()*3|0);
    for (let i=0; i<nT; i++){
      const tx = -bw/2 + (i + 0.5)*bw/nT + range(rng, -1, 1);
      if (Math.abs(tx - ex) < cw/2 + 1.2) continue;
      Bb(g, 1.8, 0.5, 1.8, MAT.concrete, tx, 0.15, 0.15 + plaza*0.5);
      const t = tree(rng, range(rng, 1.1, 1.6)); t.position.set(tx, 0.65, 0.15 + plaza*0.5); g.add(t);
      if (pr() < s.props) Bb(g, 1.6, 0.42, 0.45, MAT.wood, tx + 1.9, 0.15, 0.15 + plaza*0.5);
    }
    Bb(g, 2.6, 0.9, 0.5, o.wall, ex + cw/2 + 2.2, 0.15, 0.8);
    B(g, 1.8, 0.35, 0.02, MAT.frameDk, ex + cw/2 + 2.2, 0.75, 0.54);
    if (rng() < 0.3) for (let i=0; i<3; i++){
      const fx = -bw/2 + 1 + i*1.2;
      C(g, 0.04, 0.05, 8, 6, MAT.steel, fx, 0.15, 0.8);
      B(g, 0.02, 0.9, 1.4, pick(rng, SIGNS), fx, 7.4, 0.8 + 0.7);
    }
  }
  if (pr() < s.props*0.7) for (let x = -lotW/2 + 0.8; x < lotW/2 - 0.5; x += 1.6) C(g, 0.09, 0.09, 0.8, 8, MAT.steelDk, x, 0.15, 0.35);
  return g;
}
