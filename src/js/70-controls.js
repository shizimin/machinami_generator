/* ================= カメラ操作 ================= */
const move = {f:false,b:false,l:false,r:false};
let camGround = null;   // 足元の標高（坂道でなめらかに追従させる）
function updateCamera(dt){
  const speed = 12;
  const dir = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const strafe = new THREE.Vector3(-dir.z,0,dir.x);
  if (move.f) camera.position.addScaledVector(dir,  speed*dt);
  if (move.b) camera.position.addScaledVector(dir, -speed*dt);
  if (move.l) camera.position.addScaledVector(strafe, -speed*dt);
  if (move.r) camera.position.addScaledVector(strafe,  speed*dt);
  const gy = groundH(camera.position.x, camera.position.z);
  camGround = camGround === null ? gy : camGround + (gy - camGround)*Math.min(1, dt*10);
  camera.position.y = camGround + state.eyeH;
  camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
}
/* 道の手前（s=95）から街の奥を向く */
function resetCamera(){
  const f = W.main.at(95);
  camera.position.set(f.x, f.y + state.eyeH, f.z);
  camGround = f.y;
  yaw = f.th; pitch = 0;
}

/* ドラッグで見回す（Command/Ctrl 併用でカメラ位置を平行移動） */
let dragging=false, lastX=0, lastY=0, pinchDist=null;
const cv = renderer.domElement;
cv.style.touchAction = 'none';
cv.addEventListener('pointerdown', e=>{ dragging=true; lastX=e.clientX; lastY=e.clientY; });
addEventListener('pointerup',   ()=>{ dragging=false; pinchDist=null; });
addEventListener('pointermove', e=>{
  if(!dragging) return;
  const dx = e.clientX-lastX, dy = e.clientY-lastY;
  if (e.metaKey || e.ctrlKey){
    // 位置移動：左右＝トラック。上下は通常＝前後、Shift併用＝目線の高さ
    const fwd    = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const strafe = new THREE.Vector3(-fwd.z,0,fwd.x);
    const k = 0.03;
    camera.position.addScaledVector(strafe, dx*k);
    if (e.shiftKey){
      state.eyeH = clamp(state.eyeH - dy*0.02, 0.5, 12);
      syncInput('eyeH');
    } else {
      camera.position.addScaledVector(fwd, -dy*k);
    }
  } else {
    yaw   -= dx * 0.0042;
    pitch -= dy * 0.0042;
    pitch = clamp(pitch, -1.2, 1.2);
  }
  lastX=e.clientX; lastY=e.clientY;
});
cv.addEventListener('wheel', e=>{
  e.preventDefault();
  const dir = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  camera.position.addScaledVector(dir, -e.deltaY*0.02);
},{passive:false});
/* ピンチで前後 */
cv.addEventListener('touchmove', e=>{
  if (e.touches.length===2){
    dragging=false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const d = Math.hypot(dx,dy);
    if (pinchDist!==null){
      const dir = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
      camera.position.addScaledVector(dir, (d-pinchDist)*0.05);
    }
    pinchDist = d;
  }
},{passive:true});
cv.addEventListener('touchend', ()=>{ pinchDist=null; });

/* キーボード */
const KEYMAP = {KeyW:'f',ArrowUp:'f',KeyS:'b',ArrowDown:'b',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r'};
addEventListener('keydown', e=>{
  if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  const k=KEYMAP[e.code]; if(k){move[k]=true; e.preventDefault();}
});
addEventListener('keyup',   e=>{ const k=KEYMAP[e.code]; if(k) move[k]=false; });

/* 十字ボタン */
document.querySelectorAll('#dpad button').forEach(b=>{
  const k = b.dataset.dir;
  const on  = e=>{ e.preventDefault(); move[k]=true; };
  const off = e=>{ e.preventDefault(); move[k]=false; };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointerleave', off);
  b.addEventListener('pointercancel', off);
});
