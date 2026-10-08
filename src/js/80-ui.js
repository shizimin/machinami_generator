/* ================= UI ================= */
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 1800);
}

const UNITS = {roadW:'m', sidewalk:'m', poleGap:'m', eyeH:'m', fov:'°', sunAz:'°', slope:'%'};
const PCT = ['density','green','apartments','props','people'];
function showVal(id){
  const el = document.querySelector(`.val[data-for="${id}"]`);
  if (!el) return;
  const v = state[id];
  if (PCT.includes(id)) el.textContent = Math.round(v*100)+'%';
  else if (id==='height') el.textContent = '×'+v.toFixed(2);
  else if (id==='curve') el.textContent = v === 0 ? 'まっすぐ' : (v < 0 ? '左 ' : '右 ') + Math.round(Math.abs(v)*100) + '%';
  else if (id==='slope') el.textContent = v === 0 ? '平ら' : (v > 0 ? '上り ' : '下り ') + Math.abs(v) + '%';
  else el.textContent = (id==='eyeH' ? v.toFixed(1) : v) + (UNITS[id]||'');
}
function syncInput(id){
  const el = document.querySelector(`input[data-key="${id}"]`);
  if (el) el.value = state[id];
  showVal(id);
}
function syncSeg(key){
  document.querySelectorAll(`.seg[data-key="${key}"] button`).forEach(b => b.classList.toggle('on', b.dataset.v === state[key]));
}

/* 再生成は少し待ってまとめる（スライダーを動かしている間に何度も作らない） */
const busy = document.getElementById('busy');
let rebuildTimer = null;
let pendingReset = false;
function queueRebuild(delay, resetCam){
  clearTimeout(rebuildTimer);
  pendingReset = pendingReset || !!resetCam;
  busy.classList.add('show');
  rebuildTimer = setTimeout(()=>{
    requestAnimationFrame(()=>{ rebuildNow(!pendingReset); pendingReset = false; busy.classList.remove('show'); });
  }, delay ?? 160);
}
function rebuildNow(keepCam){
  buildTown();
  refreshMaterials();
  if (!keepCam) resetCamera();
}

const CAMERA_KEYS = ['eyeH','fov'];
const ENV_KEYS = ['sunAz'];
document.querySelectorAll('input[type=range][data-key]').forEach(el=>{
  const id = el.dataset.key;
  el.value = state[id];
  el.addEventListener('input', ()=>{
    state[id] = parseFloat(el.value);
    showVal(id);
    if (id === 'fov'){ camera.fov = state.fov; camera.updateProjectionMatrix(); }
    else if (ENV_KEYS.includes(id)) applyEnv();
    else if (!CAMERA_KEYS.includes(id)) queueRebuild(160, id === 'curve' || id === 'slope');
  });
  showVal(id);
});

/* 道の種類を切り替えたら、それらしい道幅に合わせる */
function streetPreset(v){
  if (v === 'alley'){
    if (state.roadW > 4) state.roadW = 3.5;
    state.sidewalk = 0;
  } else if (v === 'arcade'){
    if (state.roadW < 5) state.roadW = 7;
  } else if (state.roadW < 4.5){
    state.roadW = 6; state.sidewalk = 1.25;
  }
  syncInput('roadW'); syncInput('sidewalk');
}

const REBUILD_SEGS = ['mode','street','junction','poles','sideL','sideR','backdrop'];
document.querySelectorAll('.seg[data-key]').forEach(seg=>{
  const key = seg.dataset.key;
  seg.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      if (state[key] === b.dataset.v) return;
      state[key] = b.dataset.v;
      syncSeg(key);
      if (key === 'street') streetPreset(b.dataset.v);
      if (REBUILD_SEGS.includes(key)) queueRebuild(0, key === 'street' || key === 'junction');
      else applyEnv();
    });
  });
});

document.getElementById('dice').addEventListener('click', ()=>{
  state.seed = (Math.random()*1e9)>>>0;
  rebuildNow(true);
  toast('新しい街を生成しました');
});
document.getElementById('applySeed').addEventListener('click', ()=>{
  const v = parseInt(document.getElementById('seedInput').value,10);
  if (!isNaN(v)){ state.seed = v>>>0; rebuildNow(true); toast('シード '+state.seed+' を再現'); }
});
document.getElementById('resetCam').addEventListener('click', ()=>{ resetCamera(); toast('視点を戻しました'); });

document.getElementById('shutter').addEventListener('click', ()=>{
  renderer.render(scene, camera);
  renderer.domElement.toBlob(blob=>{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const m = state.mode==='res'?'jutaku':'hankagai';
    a.download = `machinami_${m}_${state.street}_${state.junction}_${state.time}_seed${state.seed}.png`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  });
  toast('PNGを保存しました');
});

/* パネル開閉（右ドロワー：開くと UI を左へ寄せる） */
const panel = document.getElementById('panel');
const handle = document.getElementById('handle');
function syncPanel(){
  const open = panel.classList.contains('open');
  const w = open ? panel.offsetWidth : 0;
  document.documentElement.style.setProperty('--panelW', w+'px');
}
handle.addEventListener('click', ()=>{ panel.classList.toggle('open'); setTimeout(syncPanel, 260); });
syncPanel();

/* ================= ループ ================= */
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  syncPanel();
});

let prev = performance.now();
function loop(now){
  const dt = Math.min(0.05,(now-prev)/1000); prev = now;
  updateCamera(dt);
  updateSky(now);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

for (const k of ['mode','street','junction','poles','sideL','sideR','backdrop','time','weather','shadows']) syncSeg(k);
applyEnv();
rebuildNow();
requestAnimationFrame(loop);
