/* ================= 道まわりの設備 ================= */

/* --- 電柱（ローカル：+X が道の外側、腕金は -X＝車道側へ） --- */
function buildOnePole(parent, rng, pr, x, y0, z, ry, withLamp){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; parent.add(g);
  const H = 10;
  C(g, 0.14, 0.2, H, 12, MAT.pole, 0, 0, 0);
  Bb(g, 0.44, 0.35, 0.44, MAT.poleBase, 0, -0.05, 0);
  // 腕金（車道側へ 2 段）と碍子
  B(g, 1.9, 0.1, 0.12, MAT.steel, -0.75, H-0.7, 0);
  B(g, 1.5, 0.1, 0.12, MAT.steel, -0.6, H-1.5, 0);
  rod(g, 0, H-1.1, 0, -1.2, H-0.72, 0, 0.025, MAT.steel);
  for (const o of [-1.45,-0.75,-0.1]){
    C(g, 0.06, 0.08, 0.24, 8, M(0x8e98a0,{r:0.3}), o, H-0.65, 0);
    C(g, 0.05, 0.07, 0.2, 8, M(0x8e98a0,{r:0.3}), o + 0.15, H-1.45, 0);
  }
  // 足場ボルト
  for (let y=2.4; y<H-2; y+=0.45){ const a = (y*7)%2 < 1 ? 1 : -1; B(g, 0.24, 0.03, 0.03, MAT.steelDk, 0, y, a*0.1, Math.PI/2); }
  // 変圧器（たまに）
  if (rng() < 0.35){
    for (const dz of [-0.28, 0.28]){
      C(g, 0.3, 0.3, 1.0, 12, M(0x8a8d92,{r:0.5,m:0.3}), 0.35, H-3.1, dz);
      C(g, 0.33, 0.33, 0.08, 12, M(0x6e7176,{r:0.5,m:0.3}), 0.35, H-2.1, dz);
    }
    B(g, 0.1, 0.1, 0.9, MAT.steel, 0.2, H-2.9, 0);
  }
  // 巻き付け広告（たまに）
  if (pr() < state.props*0.5){
    B(g, 0.04, 1.2, 0.34, pick(pr,[MAT.yellow, MAT.signW, SIGNS[1]]), -0.22, 2.6, 0);
  }
  // 防犯灯
  if (withLamp){
    rod(g, 0, 4.6, 0, -1.1, 4.95, 0, 0.03, MAT.frame);
    Bb(g, 0.42, 0.1, 0.18, MAT.frame, -1.2, 4.85, 0);
    Bb(g, 0.36, 0.03, 0.14, MAT.lampCool, -1.2, 4.83, 0);
  }
  return g;
}

/* --- 信号機（ローカル：灯器は +Z を向き、腕は +X へ） --- */
function trafficSignal(parent, x, y0, z, ry, armLen, phase){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; parent.add(g);
  C(g, 0.11, 0.13, 5.4, 10, MAT.pole, 0, 0, 0);
  rod(g, 0, 5.15, 0, armLen, 5.25, 0, 0.06, MAT.pole);
  const hx = Math.max(1.6, armLen - 0.8);
  const head = new THREE.Group(); head.position.set(hx, 5.0, 0.05); g.add(head);
  B(head, 1.25, 0.42, 0.24, MAT.steelDk, 0, 0, 0);
  const cols = [0x2a9d6a, 0xe0b020, 0xd02020];
  for (let i=0; i<3; i++){
    const on = i === phase;
    const lm = on ? M(cols[i], {r:0.3, glow:2.4, always:true}) : M(0x3a3c40, {r:0.4});
    const d = disc(0.15, 0.04, 16, lm); d.position.set(-0.4 + i*0.4, 0, 0.13); head.add(d);
    const v = disc(0.18, 0.12, 16, MAT.steelDk); v.position.set(-0.4 + i*0.4, 0.02, 0.2); v.scale.y = 0.18*0.6; head.add(v);
  }
  // 歩行者用（ポールの途中）
  const ph = new THREE.Group(); ph.position.set(0.2, 2.6, 0); ph.rotation.y = Math.PI/2; g.add(ph);
  B(ph, 0.34, 0.7, 0.2, MAT.steelDk, 0, 0, 0);
  B(ph, 0.26, 0.26, 0.02, phase === 2 ? M(0x2a9d6a,{r:0.3,glow:2,always:true}) : M(0x3a3c40,{r:0.4}), 0, -0.16, 0.11);
  B(ph, 0.26, 0.26, 0.02, phase !== 2 ? M(0xd02020,{r:0.3,glow:2,always:true}) : M(0x3a3c40,{r:0.4}), 0, 0.16, 0.11);
  return g;
}

/* --- 踏切の警報機＋遮断機（ローカル：表は -Z、遮断かんは -X へ伸びる） --- */
function crossingSignal(parent, x, y0, z, ry, armLen, down){
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; parent.add(g);
  for (let i=0; i<5; i++) C(g, 0.085, 0.085, 0.24, 10, i%2 ? MAT.black : MAT.yellow, 0, i*0.24, 0);
  C(g, 0.07, 0.07, 2.4, 10, MAT.black, 0, 1.2, 0);
  // ×印（クロスバック）
  for (const a of [Math.PI/4, -Math.PI/4]){
    const b = box(1.15, 0.2, 0.04, MAT.yellow); b.position.set(0, 3.2, -0.1); b.rotation.z = a; g.add(b);
    const e = box(1.2, 0.26, 0.03, MAT.black); e.position.set(0, 3.2, -0.08); e.rotation.z = a; g.add(e);
  }
  // 赤色灯（左右）
  B(g, 1.0, 0.08, 0.08, MAT.black, 0, 2.45, -0.05);
  for (const sx of [-0.42, 0.42]){
    const back = disc(0.22, 0.04, 18, MAT.black); back.position.set(sx, 2.45, -0.1); g.add(back);
    const l = disc(0.13, 0.05, 16, down ? M(0xd01a10,{r:0.3, glow:2.6, always:true}) : M(0x5a1c18,{r:0.4})); l.position.set(sx, 2.45, -0.14); g.add(l);
    const hood = disc(0.16, 0.18, 16, MAT.black); hood.position.set(sx, 2.5, -0.24); hood.scale.y = 0.16*0.5; g.add(hood);
  }
  C(g, 0.12, 0.08, 0.2, 10, MAT.black, 0, 3.6, 0);   // 警報音のスピーカー
  // 遮断機
  Bb(g, 0.4, 1.0, 0.36, MAT.yellow, 0.05, 0, 0.45);
  const arm = new THREE.Group(); arm.position.set(0, 0.95, 0.45); g.add(arm);
  if (!down) arm.rotation.z = -Math.PI/2 + 0.05;
  for (let x=0, i=0; x<armLen; x+=0.5, i++){
    const l = Math.min(0.5, armLen - x);
    B(arm, l, 0.09, 0.07, i%2 ? MAT.black : MAT.yellow, -x - l/2, 0, 0);
  }
  return g;
}

/* --- 電車（ローカル：長さ X） --- */
function trainCar(rng, len, livery){
  const g = new THREE.Group();
  const W = 2.9, h0 = 1.15, h1 = 3.9;
  const prof = [[-W/2,h0],[W/2,h0],[W/2,h1-0.35],[W/2-0.25,h1],[-W/2+0.25,h1],[-W/2,h1-0.35]];
  const body = new THREE.Mesh(cachedGeo('trainBody', ()=>{ const e = extrudeGeo(prof, 1); e.rotateY(Math.PI/2); return e; }), M(0xd9dcde,{r:0.3,m:0.5}));
  body.scale.x = len; g.add(body);
  for (const sz of [-1,1]){
    B(g, len-0.4, 0.22, 0.02, livery, 0, 1.75, sz*(W/2+0.005));
    B(g, len-1.2, 0.85, 0.02, MAT.glassCool, 0, 2.65, sz*(W/2+0.008));
    for (let i=0; i<4; i++) B(g, 1.3, 1.95, 0.025, M(0xb9bdc0,{r:0.3,m:0.5}), -len/2 + len*(i+0.5)/4, 2.15, sz*(W/2+0.012));
  }
  for (const sx of [-1,1]){
    Bb(g, 2.6, 0.7, 2.2, MAT.steelDk, sx*(len/2-3.2), 0.3, 0);
    for (const dx of [-0.95,0.95]) for (const sz of [-0.55,0.55]){
      const w = disc(0.42, 0.12, 12, MAT.steelDk); w.position.set(sx*(len/2-3.2)+dx, 0.5, sz*1.0); g.add(w);
    }
  }
  Bb(g, len*0.3, 0.35, 1.6, MAT.steelDk, 0, h1, 0);   // 屋根上の機器
  return g;
}

/* ================= 街の生成 ================= */
let town = null, world = null;
const W = {};   // 現在の街の情報（地面の高さ計算・カメラ用）
function groundH(x, z){ return W.main ? W.main.project(x, z).y : 0; }

function buildTown(){
  if (world){
    scene.remove(world);
    world.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  town = new THREE.Group();
  const s = state;
  const rng  = mulberry32(s.seed);
  const prng = mulberry32(s.seed ^ 0x5bd1e995);   // 小物（スライダーを動かしても建物が変わらないよう別系統）
  const hrng = mulberry32(s.seed ^ 0x27d4eb2f);   // 人
  const srng = mulberry32(s.seed ^ 0x165667b1);   // 道の付帯設備

  const street = s.street, alley = street === 'alley', river = street === 'river', arcade = street === 'arcade';
  const J = s.junction, hasCross = J === 'cross' || J === 'tright' || J === 'tleft', hasRail = J === 'rail';
  const hw = s.roadW/2;
  const sw = arcade ? 0 : s.sidewalk;

  // 川の配置
  const rs = srng() < 0.5 ? -1 : 1;
  const RW = range(srng, 12, 22);
  const swR = Math.max(sw, 1.8);
  const swSide = side => (river && side === rs) ? swR : sw;
  const hasWalk = side => swSide(side) > 0.05;
  const edgeSide = side => hw + (hasWalk(side) ? swSide(side) : arcade ? 0 : 0.4);
  const e0 = hw + swR, far = e0 + RW, farWalk = 4;
  const edge = hw + (sw > 0.05 ? sw : arcade ? 0 : 0.4);   // 交差道路の端

  const rb = 3.6;      // 線路の帯の半幅
  const plateau = hasCross ? edge + 8 : hasRail ? 12 : 0;
  const main = makeMainPath(plateau);
  W.main = main;
  const S0 = -HALF_LEN, S1 = HALF_LEN;

  // 交差道路
  const cross = hasCross ? makeStraightPath(Math.PI/2, -HALF_LEN, HALF_LEN, 0) : null;
  const arms = !hasCross ? [] : J === 'cross' ? [[-HALF_LEN, -hw], [hw, HALF_LEN]]
    : J === 'tright' ? [[hw, HALF_LEN]] : [[-HALF_LEN, -hw]];
  const armSides = arms.map(a => a[0] > 0 ? 1 : -1);
  const rail = hasRail ? makeStraightPath(Math.PI/2, -HALF_LEN, HALF_LEN, 0) : null;

  // 交差点で本線の歩道などを切る区間（side 側）
  function holesFor(side){
    const h = [];
    if (hasCross && armSides.includes(side)) h.push([-edge, edge]);
    if (hasRail) h.push([-rb, rb]);
    return h;
  }
  const holesBoth = [...new Set([...holesFor(-1), ...holesFor(1)].map(h => h.join(',')))].map(k => k.split(',').map(Number));
  // 川の上の橋の区間（交差道路・線路の u 座標）
  const bridgeU = river ? [Math.min(rs*e0, rs*far) - 0.3, Math.max(rs*e0, rs*far) + 0.3] : null;

  /* ---------- 立入禁止（建物を置けない場所） ---------- */
  function blocked(x, z){
    const p = main.project(x, z);
    if (Math.abs(p.along) < 1.5){
      const sd = p.lat >= 0 ? 1 : -1;
      if (Math.abs(p.lat) < edgeSide(sd) + 0.1) return true;
      if (river && sd === rs && Math.abs(p.lat) < far + farWalk + 0.2) return true;
    }
    if (cross){
      const q = cross.project(x, z);
      if (Math.abs(q.lat) < edge + 0.1 && arms.some(([a,b]) => q.s > a - 0.5 && q.s < b + 0.5)) return true;
    }
    if (rail){
      const q = rail.project(x, z);
      if (Math.abs(q.lat) < 5.6) return true;
    }
    return false;
  }

  /* ================= 道路 ================= */
  const roadMat = arcade ? MAT.paving : alley ? MAT.asphaltA : MAT.asphalt;
  prism(town, main, S0, S1, -hw, hw, -1.2, 0, roadMat, MAT.retain);

  for (const side of [-1, 1]){
    const ranges = subtractRanges([S0, S1], holesFor(side));
    const deep = (river && side === rs) ? -3.2 : -1.2;
    for (const [a,b] of ranges){
      if (hasWalk(side)){
        prism(town, main, a, b, side*hw, side*(hw+0.18), -1.2, 0.17, MAT.curb);
        prism(town, main, a, b, side*(hw+0.18), side*(hw+swSide(side)), deep, 0.15, MAT.sidewalk, MAT.retain);
      } else if (!arcade){
        prism(town, main, a, b, side*hw, side*(hw+0.4), -1.2, 0.012, MAT.gutter, MAT.retain);
      }
    }
  }
  // 区画線
  const lineRib = (path, a, b, o0, o1, mat) => { const m = ribbon(path, a, b, o0, o1, 0.012, 0.012, mat || MAT.white); if (m) town.add(m); };
  const marked = !alley && !arcade && s.roadW >= 4.5;
  if (marked){
    for (const side of [-1, 1])
      for (const [a,b] of subtractRanges([S0,S1], holesFor(side).map(h => [h[0]-1, h[1]+1])))
        lineRib(main, a, b, side*(hw-0.32), side*(hw-0.17));
    const centerHoles = holesBoth.map(h => [h[0]-6, h[1]+6]);
    if (s.roadW >= 11){
      for (const [a,b] of subtractRanges([S0,S1], centerHoles)) lineRib(main, a, b, -0.08, 0.08, MAT.yellow);
      for (let z=S0; z<S1; z+=10){
        if (centerHoles.some(h => z+5 > h[0] && z < h[1])) continue;
        for (const o of [-hw/2, hw/2]) lineRib(main, z, z+5, o-0.07, o+0.07);
      }
    } else if (s.roadW >= 7){
      for (let z=S0; z<S1; z+=10){
        if (centerHoles.some(h => z+5 > h[0] && z < h[1])) continue;
        lineRib(main, z, z+5, -0.07, 0.07);
      }
    }
  }
  // マンホール
  for (let z=S0+10; z<S1; z+=range(srng,22,40)){
    if (holesBoth.some(h => z > h[0]-2 && z < h[1]+2)) continue;
    const p = main.pt(z, range(srng,-0.5,0.5)*hw);
    C(town, 0.32, 0.32, 0.03, 16, M(0x4a4b4d,{r:0.5,m:0.5,wet:1}), p[0], p[1]-0.01, p[2]);
  }

  /* ================= 交差点 ================= */
  if (cross){
    const bridgeSplit = (a, b) => {
      if (!bridgeU || bridgeU[1] <= a || bridgeU[0] >= b) return [[a, b, false]];
      const out = [];
      if (bridgeU[0] > a) out.push([a, bridgeU[0], false]);
      out.push([Math.max(a, bridgeU[0]), Math.min(b, bridgeU[1]), true]);
      if (bridgeU[1] < b) out.push([bridgeU[1], b, false]);
      return out;
    };
    for (const [a0, b0] of arms){
      for (const [a, b, br] of bridgeSplit(a0, b0)){
        const d0 = br ? -0.7 : -1.2;
        prism(town, cross, a, b, -hw, hw, d0, 0, roadMat, MAT.retain);
        if (br){
          prism(town, cross, a, b, -hw+0.5, hw-0.5, -1.5, -0.7, MAT.steelDk);
          for (const zs of [-1, 1]) prism(town, cross, a, b, zs*(edge-0.25), zs*edge, 0.1, 1.1, MAT.concrete);
        }
      }
      // 歩道（本線の歩道の外側から）
      for (const zs of [-1, 1]){
        for (const [a, b] of subtractRanges([a0, b0], [[-hw, hw]])){
          for (const [c, d, br] of bridgeSplit(a, b)){
            const d0 = br ? -0.7 : -1.2;
            if (sw > 0.05){
              prism(town, cross, c, d, zs*hw, zs*(hw+0.18), d0, 0.17, MAT.curb);
              prism(town, cross, c, d, zs*(hw+0.18), zs*edge, d0, 0.15, MAT.sidewalk, MAT.retain);
            } else if (!arcade){
              prism(town, cross, c, d, zs*hw, zs*(hw+0.4), d0, 0.012, MAT.gutter, MAT.retain);
            }
          }
        }
        if (marked) for (const [a, b] of subtractRanges([a0, b0], [[-edge-1, edge+1]])) lineRib(cross, a, b, zs*(hw-0.32), zs*(hw-0.17));
      }
      if (marked && s.roadW >= 7){
        for (let u = a0; u < b0; u += 10){
          if (Math.abs(u) < edge + 8 || Math.abs(u+5) < edge + 8) continue;
          lineRib(cross, u, Math.min(u+5, b0), -0.07, 0.07);
        }
      }
    }
    // 横断歩道・停止線
    const zebra = (path, sc, from, to) => { for (let o = from; o + 0.45 <= to; o += 0.9) lineRib(path, sc-1.2, sc+1.2, o, o+0.45); };
    if (!alley){
      for (const zs of [-1, 1]){
        const sc = zs*(edge + 1.6);
        zebra(main, sc, -hw+0.4, hw-0.4);
        if (marked) lineRib(main, sc + zs*1.8 - 0.2, sc + zs*1.8 + 0.2, zs > 0 ? -hw+0.3 : 0, zs > 0 ? 0 : hw-0.3);
      }
      for (const as of armSides){
        const uc = as*(edgeSide(as) + 1.6);
        zebra(cross, uc, -hw+0.4, hw-0.4);
        if (marked) lineRib(cross, uc + as*1.8 - 0.2, uc + as*1.8 + 0.2, as > 0 ? -hw+0.3 : 0, as > 0 ? 0 : hw-0.3);
      }
    }
    // 信号機（広い道）／カーブミラーと止まれ（狭い道）
    const signals = !alley && !arcade && s.roadW >= 5.5;
    const ca = edge + 0.35;
    if (signals){
      const approaches = [[0,-1],[0,1]];          // 本線（進行方向）
      for (const as of armSides) approaches.push([-as, 0]);
      const mainGreen = srng() < 0.5;
      for (const [dx, dz] of approaches){
        const lx = dz, lz = -dx;                   // 進行方向の左
        const px = dx*ca + lx*ca, pz = dz*ca + lz*ca;
        const ry = Math.atan2(-dx, -dz);
        const phase = (dx === 0) === mainGreen ? 0 : 2;
        trafficSignal(town, px, 0.15, pz, ry, hw*0.9 + 0.6, phase);
      }
    } else {
      // T 字は突き当たりにミラー、十字路は対角に 2 本
      const spots = J === 'cross' ? [[-1,-1],[1,1]] : [[-armSides[0], 0]];
      for (const [mx, mz] of spots){
        const px = mx*(edgeSide(mx)+0.3), pz = mz*(edge+0.3);
        curveMirror(town, px, sw > 0.05 ? 0.15 : 0, pz, Math.atan2(mx, mz));
      }
      for (const as of armSides){
        const u = as*(edgeSide(as) + 3.2);
        const p = cross.pt(u, (as > 0 ? -1 : 1)*(edge - 0.15));
        roadSign(srng, 'stop', town, p[0], 0.1, p[2], as > 0 ? -Math.PI/2 : Math.PI/2);
      }
    }
  }

  /* ================= 踏切・線路 ================= */
  if (rail){
    const bandL = -edgeSide(-1) - 0.4, bandR = edgeSide(1) + 0.4;
    const railSeg = (a, b) => {
      const segs = [];
      for (const [c, d] of subtractRanges([a, b], bridgeU ? [bridgeU] : [])) segs.push([c, d, false]);
      if (bridgeU && bridgeU[1] > a && bridgeU[0] < b) segs.push([Math.max(a,bridgeU[0]), Math.min(b,bridgeU[1]), true]);
      return segs;
    };
    for (const [a0, b0] of [[S0, bandL], [bandR, S1]]){
      for (const [a, b, br] of railSeg(a0, b0)){
        if (br){
          prism(town, rail, a, b, -rb, rb, -1.4, 0.12, MAT.steelDk);
          for (const zs of [-1,1]) prism(town, rail, a, b, zs*(rb-0.2), zs*rb, 0.12, 1.3, MAT.steel);
        } else {
          prism(town, rail, a, b, -rb, rb, -1.2, 0.1, MAT.ballast, MAT.ballast);
          for (const zs of [-1,1]){ const m = ribbon(rail, a, b, zs*rb, zs*(rb+0.9), 0.1, -0.05, MAT.ballast); if (m) town.add(m); }
        }
        for (let u = a + 0.3; u < b - 0.2; u += 0.62){
          for (const c of [-2, 2]){ const p = rail.pt(u, c, 0); B(town, 0.2, 0.14, 2.1, MAT.sleeper, p[0], p[1] + 0.17, p[2]); }
        }
      }
    }
    // 踏切の舗装（本線の上）
    prism(town, rail, bandL, bandR, -rb, rb, -1.2, 0.06, MAT.concrete);
    for (const c of [-2, 2]){
      prism(town, rail, bandL, bandR, c-0.62, c+0.62, 0.06, 0.075, MAT.black);
      for (const r of [-0.535, 0.535]){
        prism(town, rail, S0, bandL, c+r-0.035, c+r+0.035, 0.24, 0.38, MAT.rail);
        prism(town, rail, bandR, S1, c+r-0.035, c+r+0.035, 0.24, 0.38, MAT.rail);
        prism(town, rail, bandL, bandR, c+r-0.035, c+r+0.035, 0.06, 0.1, MAT.rail);
      }
    }
    // 柵
    const fenceMat = M(0x5d6b62, {r:0.6, m:0.3});
    for (const zs of [-1, 1]){
      for (const [a0, b0] of [[S0, bandL - 1.5], [bandR + 1.5, S1]]){
        for (const [a, b, br] of railSeg(a0, b0)){
          if (br) continue;
          for (let u = a; u <= b; u += 2.5){ const p = rail.pt(u, zs*4.5); Bb(town, 0.06, 1.5, 0.06, fenceMat, p[0], p[1], p[2]); }
          for (const h of [0.5, 1.0, 1.45]) prism(town, rail, a, b, zs*4.5 - 0.015, zs*4.5 + 0.015, h, h+0.03, fenceMat);
        }
      }
    }
    // 架線柱
    for (let u = S0 + 8; u < S1; u += 45){
      if (u > bandL - 6 && u < bandR + 6) continue;
      if (bridgeU && u > bridgeU[0] - 1 && u < bridgeU[1] + 1) continue;
      for (const zs of [-1, 1]){ const p = rail.pt(u, zs*4.0); Bb(town, 0.3, 7.2, 0.3, MAT.steel, p[0], p[1], p[2]); }
      const p = rail.pt(u, 0); B(town, 0.3, 0.4, 8.6, MAT.steel, p[0], p[1] + 6.9, p[2]);
      for (const c of [-2, 2]){ const q = rail.pt(u, c); B(town, 0.08, 0.6, 0.08, MAT.steel, q[0], q[1] + 6.4, q[2]); }
    }
    // 警報機＋遮断機（各方向の左側）
    const down = srng() < 0.55;
    {
      const p1 = main.pt(rb + 1.1, -(hw + 0.45));
      crossingSignal(town, p1[0], p1[1] + 0.15*(hasWalk(-1)?1:0), p1[2], Math.PI, hw + 0.2, down);
      const p2 = main.pt(-(rb + 1.1), hw + 0.45);
      crossingSignal(town, p2[0], p2[1] + 0.15*(hasWalk(1)?1:0), p2[2], 0, hw + 0.2, down);
    }
    for (const zs of [-1,1]){
      const sc = zs*(rb + 3.2);
      lineRib(main, sc - 0.2, sc + 0.2, zs > 0 ? -hw+0.3 : 0, zs > 0 ? 0 : hw-0.3);
    }
    // 電車
    if (down ? srng() < 0.8 : srng() < 0.2){
      const dir = srng() < 0.5 ? -1 : 1, c = srng() < 0.5 ? -2 : 2;
      const livery = pick(srng, [M(0x1f7a4d,{r:0.4}), M(0xe0702a,{r:0.4}), M(0x2255aa,{r:0.4}), M(0xc8262b,{r:0.4})]);
      const n = 3 + (srng()*3|0), len = 19.5;
      let u = dir*(edgeSide(dir) + range(srng, 14, 40));
      for (let i=0; i<n; i++){
        const car = trainCar(srng, len, livery);
        const p = rail.pt(u + dir*len/2, c, 0.24);
        car.position.set(p[0], p[1], p[2]);
        town.add(car);
        u += dir*(len + 0.6);
      }
    }
  }

  /* ================= 川 ================= */
  if (river){
    const holes = holesFor(rs);
    const parapet = srng() < 0.25;
    const railMat = pick(srng, [M(0x5d6b62,{r:0.5,m:0.4}), M(0xd8d6cf,{r:0.5,m:0.3}), M(0x6a5a4a,{r:0.6,m:0.3})]);
    const leaf = srng() < 0.4 ? MAT.leafCherry : null;
    // 水面と護岸
    town.add(ribbon(main, S0, S1, rs*e0, rs*far, -1.5, -1.5, MAT.water));
    const segsAll = subtractRanges([S0, S1], holes);
    const tops = [...segsAll.map(([a,b]) => [a,b,0.15])];
    for (const h of holes) tops.push([h[0], h[1], -0.7]);
    for (const [a, b, top] of tops){
      town.add(wallRibbon(main, a, b, rs*(e0+0.02), -2.4, top, rs, MAT.revet));
      town.add(wallRibbon(main, a, b, rs*(far-0.02), -2.4, top < 0 ? top : 0.35, -rs, MAT.revet));
    }
    for (const [a, b] of segsAll){
      // 手前（道路側）の柵
      if (parapet) prism(town, main, a, b, rs*(e0-0.25), rs*e0, 0.15, 1.05, MAT.concrete);
      else {
        for (let z = a + 0.5; z < b; z += 2){ const p = main.pt(z, rs*(e0-0.12), 0.15); Bb(town, 0.07, 1.0, 0.07, railMat, p[0], p[1], p[2]); }
        prism(town, main, a, b, rs*(e0-0.17), rs*(e0-0.07), 1.1, 1.17, railMat);
        prism(town, main, a, b, rs*(e0-0.14), rs*(e0-0.1), 0.6, 0.64, railMat);
      }
      // 対岸の遊歩道・柵・並木
      prism(town, main, a, b, rs*far, rs*(far+farWalk), -1.2, 0.35, M(0xb3aa98,{map:'asphalt', r:1, wet:1}), MAT.retain);
      for (let z = a + 0.5; z < b; z += 2){ const p = main.pt(z, rs*(far+0.15), 0.35); Bb(town, 0.07, 1.0, 0.07, railMat, p[0], p[1], p[2]); }
      prism(town, main, a, b, rs*(far+0.1), rs*(far+0.2), 1.3, 1.37, railMat);
      for (let z = a + range(srng,2,6); z < b - 2; z += range(srng,7,10)){
        if (srng() > Math.max(0.35, s.green)) continue;
        const p = main.pt(z, rs*(far + farWalk*0.6), 0.35);
        const t = tree(srng, range(srng,1.3,1.9), leaf); t.position.set(p[0], p[1], p[2]); town.add(t);
      }
    }
  }

  /* ================= アーケード ================= */
  const arcA = -110, arcB = 80;
  if (arcade){
    const H = 6.6, rise = 1.9, R = hw + 0.7, N = 8;
    const roofMat = M(0xeef0ee, {r:0.4, op:0.55, side2:true});
    const segs = subtractRanges([arcA, arcB], holesBoth.map(h => [h[0]-1, h[1]+1]));
    const arcPt = i => { const a = -R + 2*R*i/N; return [a, H + rise*Math.sin(Math.PI*i/N)]; };
    for (const [a, b] of segs){
      for (let i=0; i<N; i++){
        const [o0, h0] = arcPt(i), [o1, h1] = arcPt(i+1);
        town.add(ribbon(main, a, b, o0, o1, h0, h1, roofMat));
      }
      for (const sd of [-1,1]) prism(town, main, a, b, sd*(hw-0.32), sd*(hw-0.08), H-0.45, H, MAT.steel);
      prism(town, main, a, b, -0.12, 0.12, H + rise - 0.1, H + rise + 0.05, MAT.steel);
      // 骨組み・柱・照明・吊り旗
      for (let z = a + 1; z < b - 0.5; z += 7.5){
        const f = main.at(z);
        const g = new THREE.Group(); g.position.set(f.x, f.y, f.z); g.rotation.y = f.th; town.add(g);
        for (let i=0; i<N; i++){ const [o0,h0] = arcPt(i), [o1,h1] = arcPt(i+1); rod(g, o0, h0, 0, o1, h1, 0, 0.07, MAT.steel); }
        for (const sd of [-1,1]) Bb(g, 0.24, H, 0.24, MAT.steel, sd*(hw-0.2), 0, 0);
        Bb(g, 0.5, 0.08, 0.3, MAT.lamp, 0, H + rise - 0.45, 0);
        lightPool(g, 0, 0, 0, 4.5);
        if (srng() < 0.6){
          const col = pick(srng, SIGNS);
          for (const sd of [-1,1]) B(g, 0.02, 1.2, 0.7, col, sd*hw*0.45, H - 0.9, 0.0);
        }
      }
    }
    // 入口のゲート看板
    for (const z of [arcB, arcA]){
      if (holesBoth.some(h => z > h[0]-2 && z < h[1]+2)) continue;
      const f = main.at(z);
      const g = new THREE.Group(); g.position.set(f.x, f.y, f.z); g.rotation.y = f.th; town.add(g);
      for (const sd of [-1,1]) Bb(g, 0.5, H + 2.4, 0.5, MAT.steelDk, sd*(hw-0.1), 0, 0);
      const sg = pick(srng, SIGNS);
      B(g, 2*R - 1.2, 1.5, 0.35, sg, 0, H + rise + 0.6, 0);
      B(g, 2*R - 1.0, 1.7, 0.25, MAT.steelDk, 0, H + rise + 0.6, 0);
      B(g, (2*R - 1.2)*0.6, 0.6, 0.02, MAT.signW, 0, H + rise + 0.6, z > 0 ? 0.19 : -0.19);
    }
  }

  /* ================= 建物 ================= */
  const placed = [];
  const ctxBase = {prng, alley, arcade, yokocho: alley && s.mode === 'sho', lowrise: arcade};
  const lotWfn = arcade || ctxBase.yokocho ? r => range(r,4.5,8) : s.mode === 'sho' ? r => range(r,6,11) : alley ? r => range(r,7,11) : r => range(r,8,13);
  const gapFn  = arcade || ctxBase.yokocho ? r => range(r,0.02,0.2) : s.mode === 'sho' ? r => range(r,0.05,0.6) : r => range(r,0.3,1.2);

  function tryPlaceLot(path, sc, side, off, lotW, ctx){
    const f = path.at(sc);
    const rot = f.th + side*Math.PI/2;
    let g;
    if (arcade || s.mode === 'sho') g = shoppingLot(rng, lotW, ctx);
    else g = rng() < s.apartments*(alley ? 0.35 : 1) ? apartmentLot(rng, lotW, ctx) : residentialLot(rng, lotW, ctx);
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    const zmin = Math.max(bb.min.z, 0.05);
    const lcx = (bb.min.x + bb.max.x)/2, lcz = (zmin + bb.max.z)/2;
    const u = [Math.cos(rot), -Math.sin(rot)], v = [Math.sin(rot), Math.cos(rot)];
    const ox = f.x + f.nx*side*off, oz = f.z + f.nz*side*off;
    const fp = {cx: ox + u[0]*lcx + v[0]*lcz, cz: oz + u[1]*lcx + v[1]*lcz, u, v,
      hu: (bb.max.x - bb.min.x)/2, hv: (bb.max.z - zmin)/2};
    for (const q of placed) if (obbOverlap(fp, q)) return false;
    const pts = [];
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1])
      pts.push([fp.cx + u[0]*a*fp.hu*0.98 + v[0]*b*fp.hv*0.98, fp.cz + u[1]*a*fp.hu*0.98 + v[1]*b*fp.hv*0.98]);
    for (const [x, z] of pts) if (blocked(x, z)) return false;
    let y = -Infinity;
    for (const i of [0, 3, 6, 4]) y = Math.max(y, groundH(pts[i][0], pts[i][1]));   // 前面の両端・中央・敷地中央
    // 前面（道路側）の標高も考慮
    y = Math.max(y, path.at(sc - lotW/2).y, path.at(sc + lotW/2).y);
    g.position.set(ox, y, oz); g.rotation.y = rot;
    town.add(g); placed.push(fp);
    return true;
  }
  function placeRow(path, side, sFrom, sTo, holes, off, ctx){
    let z = sFrom;
    while (z < sTo){
      const lotW = lotWfn(rng);
      const sc = z + lotW/2;
      const hit = holes.some(h => sc > h[0] - lotW*0.5 && sc < h[1] + lotW*0.5);
      if (!hit){
        if (rng() < s.density) tryPlaceLot(path, sc, side, off, lotW, ctx);
        else if (rng() < s.green){
          const p = path.pt(sc, side*(off + range(rng,1.5,3.5)));
          if (!blocked(p[0], p[2])){
            const t = tree(rng, range(rng,1,1.8)); t.position.set(p[0], groundH(p[0], p[2]), p[2]); town.add(t);
          }
        }
      }
      z += lotW + gapFn(rng);
    }
  }
  const lotHoles = side => holesFor(side).map(h => [h[0] - 0.8, h[1] + 0.8]);
  for (const side of [-1, 1]){
    if (river && side === rs) placeRow(main, side, -LOT_HALF, LOT_HALF, lotHoles(side), far + farWalk + 0.4, {...ctxBase, arcade:false, lowrise:false});
    else placeRow(main, side, -LOT_HALF, LOT_HALF, lotHoles(side), edgeSide(side) + 0.3, ctxBase);
  }
  if (cross){
    for (const [a, b] of arms)
      for (const zs of [-1, 1]) placeRow(cross, zs, a, b, [[-edgeSide(-1)-0.5, edgeSide(1)+0.5]], edge + 0.3, {...ctxBase, arcade:false, lowrise:false});
  }
  if (rail){
    for (const zs of [-1, 1]) placeRow(rail, zs, S0 + 20, S1 - 20, [[-edgeSide(-1)-2, edgeSide(1)+2]], 5.9, {...ctxBase, arcade:false, lowrise:false});
  }

  /* ================= 電柱・街灯 ================= */
  const arcHoles = arcade ? [[arcA - 1, arcB + 1]] : [];
  if (s.poles !== 'off'){
    let sides = s.poles === 'both' ? [-1, 1] : [rng() < 0.5 ? -1 : 1];
    if (river) sides = [-rs];
    for (const side of sides){
      const px = hasWalk(side) ? hw + 0.5 : hw + 0.22;
      const start = S0 + 6 + (side > 0 && sides.length > 1 ? s.poleGap*0.5 : 0);
      for (let z = start; z < S1 - 4; z += s.poleGap){
        const zz = z + range(rng, -1.2, 1.2);
        if (holesFor(side).concat(arcHoles).some(h => zz > h[0] - 2 && zz < h[1] + 2)) continue;
        if (hasCross && Math.abs(zz) < edge + 3) continue;
        const f = main.at(zz);
        const p = main.pt(zz, side*px, hasWalk(side) ? 0.15 : 0);
        const lamp = rng() < 0.45;
        buildOnePole(town, rng, prng, p[0], p[1], p[2], f.th + (side < 0 ? Math.PI : 0), lamp);
        if (lamp){ const q = main.pt(zz, side*(px - 1.6)); lightPool(town, q[0], q[1], q[2], 4.0); }
      }
    }
  }
  // 繁華街の街路灯（広めの道）
  if (!arcade && !alley && (s.mode === 'sho' || s.poles === 'off') && s.roadW >= 5.5){
    for (const side of [-1, 1]){
      if (river && side === rs) continue;
      for (let z = S0 + 10 + (side > 0 ? 11 : 0); z < S1; z += 22){
        if (holesFor(side).some(h => z > h[0] - 3 && z < h[1] + 3)) continue;
        const f = main.at(z);
        const p = main.pt(z, side*(hw + (hasWalk(side) ? 0.45 : 0.2)), hasWalk(side) ? 0.15 : 0);
        streetLamp(town, p[0], p[1], p[2], f.th + (side < 0 ? Math.PI : 0));
      }
    }
  }
  // 対岸の街灯
  if (river){
    for (let z = S0 + 12; z < S1; z += 26){
      if (holesFor(rs).some(h => z > h[0] - 3 && z < h[1] + 3)) continue;
      const f = main.at(z), p = main.pt(z, rs*(far + farWalk - 0.4), 0.35);
      streetLamp(town, p[0], p[1], p[2], f.th + (rs > 0 ? 0 : Math.PI));
    }
  }

  /* ================= 小物（標識・ミラー・ガードレール・車） ================= */
  const P = s.props;
  const signFace = (side, th) => th + (side < 0 ? Math.PI : 0);
  for (let z = S0 + 15; z < S1 - 5; z += range(srng, 35, 60)){
    const side = srng() < 0.5 ? -1 : 1;
    if (srng() > P || (river && side === rs)) continue;
    if (holesBoth.some(h => z > h[0] - 6 && z < h[1] + 6)) continue;
    const f = main.at(z), p = main.pt(z, side*(hw + (hasWalk(side) ? 0.4 : 0.15)), hasWalk(side) ? 0.15 : 0);
    roadSign(srng, pick(srng, alley ? ['speed','noparking'] : ['speed','noparking','ped','speed']), town, p[0], p[1], p[2], signFace(side, f.th));
  }
  // カーブの外側／路地のミラー
  if (Math.abs(s.curve) > 0.25 || alley){
    const outer = s.curve > 0 ? -1 : 1;
    for (let z = S0 + 20; z < S1 - 10; z += range(srng, 40, 70)){
      if (srng() > P + 0.2) continue;
      if (holesBoth.some(h => z > h[0] - 5 && z < h[1] + 5)) continue;
      const side = alley ? (srng() < 0.5 ? -1 : 1) : outer;
      if (river && side === rs) continue;
      const f = main.at(z), p = main.pt(z, side*(hw + (hasWalk(side) ? 0.45 : 0.2)), hasWalk(side) ? 0.15 : 0);
      curveMirror(town, p[0], p[1], p[2], f.th + (srng() < 0.5 ? 0 : Math.PI) + side*0.5);
    }
  }
  // ガードレール（歩道なし）／ガードパイプ（歩道あり）
  if (!alley && !arcade && s.roadW >= 5){
    for (const side of [-1, 1]){
      if (river && side === rs) continue;
      for (let z = S0; z < S1; z += 30){
        if (srng() > 0.2 + P*0.5) continue;
        for (const [a, b] of subtractRanges([z, z + range(srng, 12, 28)], holesFor(side).map(h => [h[0] - 4, h[1] + 4]))){
          if (hasWalk(side)){
            const o = side*(hw + 0.32);
            for (let q = a; q <= b; q += 2){ const p = main.pt(q, o, 0.15); Bb(town, 0.06, 0.8, 0.06, MAT.white, p[0], p[1], p[2]); }
            for (const h of [0.55, 0.9]) prism(town, main, a, b, o - 0.03, o + 0.03, h, h + 0.06, MAT.white);
          } else {
            const o = side*(hw + 0.2);
            for (let q = a; q <= b; q += 2){ const p = main.pt(q, o + side*0.08, 0); Bb(town, 0.1, 0.75, 0.1, MAT.white, p[0], p[1], p[2]); }
            prism(town, main, a, b, o - 0.03, o + 0.03, 0.4, 0.72, MAT.white);
          }
        }
      }
    }
  }
  // 道を走る／停まる車
  if (!alley && !arcade && s.roadW >= 5.5){
    for (let z = S0 + 10; z < S1 - 10; z += range(srng, 18, 40)){
      if (srng() > P*0.55) continue;
      if (holesBoth.some(h => z > h[0] - 8 && z < h[1] + 8)) continue;
      if (z > 65 && z < 105) continue;   // 初期の視点の目の前は空けておく
      const side = srng() < 0.5 ? -1 : 1;
      const lane = s.roadW >= 11 ? (srng() < 0.5 ? hw*0.25 : hw*0.75) : hw*0.5;
      const f = main.at(z), p = main.pt(z, side*lane);
      const grade = (main.at(z + 1).y - main.at(z - 1).y)/2;
      const c = car(srng);
      c.position.set(p[0], p[1], p[2]);
      c.rotation.set(0, f.th + (side < 0 ? Math.PI/2 : -Math.PI/2), Math.atan(side < 0 ? -grade : grade));
      town.add(c);
    }
  }

  /* ================= 人 ================= */
  if (s.people > 0.01){
    const per100 = s.people * (arcade || alley ? 26 : 16);
    const n = Math.round(per100 * (2*LOT_HALF)/100);
    for (let i=0; i<n; i++){
      const z = range(hrng, -LOT_HALF, LOT_HALF);
      if (z > 90 && z < 100) { hrng(); hrng(); hrng(); continue; }
      let side = hrng() < 0.5 ? -1 : 1, lat, h;
      if (arcade || alley || !hasWalk(side)){
        lat = (arcade || alley) ? range(hrng, -hw + 0.5, hw - 0.5) : side*(hw - 0.4);
        h = 0;
      } else {
        lat = side*(hw + 0.4 + (swSide(side) - 0.6)*hrng());
        h = 0.15;
        if (holesFor(side).some(hh => z > hh[0] && z < hh[1])) continue;
      }
      if (hasRail && Math.abs(z) < rb + 1) continue;
      const f = main.at(z), p = main.pt(z, lat, h);
      const pp = person(hrng);
      pp.position.set(p[0], p[1], p[2]);
      pp.rotation.y = f.th + (hrng() < 0.5 ? 0 : Math.PI) + range(hrng, -0.25, 0.25);
      town.add(pp);
    }
    // 交差道路の歩道にも
    if (cross && sw > 0.6){
      for (const [a, b] of arms){
        const m = Math.round(s.people * 10 * Math.abs(b - a)/100);
        for (let i=0; i<m; i++){
          const u = range(hrng, a, b), zs = hrng() < 0.5 ? -1 : 1;
          if (Math.abs(u) < edge + 0.5) continue;
          const p = cross.pt(u, zs*(hw + 0.4 + (sw - 0.6)*hrng()), 0.15);
          const pp = person(hrng); pp.position.set(p[0], p[1], p[2]);
          pp.rotation.y = Math.PI/2 + (hrng() < 0.5 ? 0 : Math.PI) + range(hrng, -0.25, 0.25);
          town.add(pp);
        }
      }
    }
  }

  /* ================= 地面 ================= */
  town.add(buildGround(main, river ? {rs, e0, far} : null));

  world = mergeByMaterial(town);
  town = null;
  scene.add(world);
  Object.assign(W, {cross, rail, rs, river, arcade});
  document.getElementById('seedInput').value = state.seed;
}

/* 地面：中心線からの標高をそのまま広げた起伏メッシュ（川の部分は抜く） */
function buildGround(main, rv){
  let x0 = -HALF_LEN - 20, x1 = HALF_LEN + 20, z0 = -HALF_LEN - 20, z1 = HALF_LEN + 20;
  for (const p of main.p){ x0 = Math.min(x0, p.x - 120); x1 = Math.max(x1, p.x + 120); z0 = Math.min(z0, p.z - 120); z1 = Math.max(z1, p.z + 120); }
  const step = 2.5;
  const nx = Math.ceil((x1 - x0)/step) + 1, nz = Math.ceil((z1 - z0)/step) + 1;
  const pos = new Float32Array(nx*nz*3), uv = new Float32Array(nx*nz*2), wet = new Uint8Array(nx*nz);
  for (let j=0; j<nz; j++){
    for (let i=0; i<nx; i++){
      const x = x0 + i*step, z = z0 + j*step, k = j*nx + i;
      const p = main.project(x, z);
      pos[k*3] = x; pos[k*3+1] = p.y - 0.04; pos[k*3+2] = z;
      uv[k*2] = x; uv[k*2+1] = z;
      if (rv && Math.abs(p.along) < 2 && rv.rs*p.lat > rv.e0 + 0.05 && rv.rs*p.lat < rv.far - 0.05) wet[k] = 1;
    }
  }
  const idx = [];
  for (let j=0; j<nz-1; j++){
    for (let i=0; i<nx-1; i++){
      const a = j*nx + i, b = a + 1, c = a + nx, d = c + 1;
      if (wet[a] || wet[b] || wet[c] || wet[d]) continue;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, MAT.ground);
}
