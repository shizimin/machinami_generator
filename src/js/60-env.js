/* ================= 空・光・天気 ================= */

/* 空のドーム（頂点カラーのグラデーション＋太陽まわりの明るみ） */
const skyGeo = new THREE.SphereGeometry(700, 48, 24);
skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyGeo.attributes.position.count*3), 3));
const skyMat = new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false});
const sky = new THREE.Mesh(skyGeo, skyMat);
sky.renderOrder = -1;
sky.frustumCulled = false;
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_COARSE ? 2048 : 4096, IS_COARSE ? 2048 : 4096);
{
  const c = sun.shadow.camera, e = 70;
  c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = 1; c.far = 600;
}
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const sunDir = new THREE.Vector3();

/* 環境マップ（反射・間接光）。空のドームと地面だけのシーンから作る */
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(skyGeo, skyMat));
const envGroundMat = new THREE.MeshBasicMaterial({color:0x777777});
{
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), envGroundMat);
  gnd.rotation.x = -Math.PI/2; gnd.position.y = -2; envScene.add(gnd);
}
let envRT = null;

const TIMES = {
  morning:{el:13, sun:0xffe0bc, sunI:2.0, top:0x84acd8, hor:0xf0e0cc, gnd:0x8a867c, glow:0xffcc90, glowI:0.9,
           hemiS:0xdfe8f2, hemiG:0x857f74, hemiI:0.2, env:0.6, exp:1.0, night:0},
  day:    {el:52, sun:0xfff4e6, sunI:2.1, top:0x5f95d4, hor:0xdbe5ec, gnd:0x8f8b82, glow:0xffffff, glowI:0.35,
           hemiS:0xe8f0ff, hemiG:0x8a857c, hemiI:0.2, env:0.65, exp:1.0, night:0},
  evening:{el:5,  sun:0xff9448, sunI:2.2, top:0x34477e, hor:0xf09a5c, gnd:0x5e5048, glow:0xff9a48, glowI:1.6,
           hemiS:0xb0a0c4, hemiG:0x4e4038, hemiI:0.3, env:0.65, exp:1.05, night:0.6},
  night:  {el:40, sun:0x9fb6ff, sunI:0.32, top:0x04070f, hor:0x1a2438, gnd:0x0b0c10, glow:0x405080, glowI:0.2,
           hemiS:0x3a4a70, hemiG:0x1a1a20, hemiI:0.45, env:0.55, exp:1.45, night:1},
};
const WEATHER = {
  clear: {sunMul:1,    gray:0,    dark:1,    fog:[80, 340], wet:false},
  cloudy:{sunMul:0.16, gray:0.78, dark:0.92, fog:[45, 230], wet:false},
  rain:  {sunMul:0.05, gray:0.88, dark:0.68, fog:[22, 150], wet:true},
};
const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
function weatherize(hex, Wt){
  const c = lin(hex);
  if (Wt.gray){
    const l = c.r*0.3 + c.g*0.55 + c.b*0.15;
    c.lerp(tmpC2.setRGB(l, l, l*1.03), Wt.gray);
  }
  return c.multiplyScalar(Wt.dark);
}

function paintSky(T, Wt){
  const top = weatherize(T.top, Wt), hor = weatherize(T.hor, Wt), gnd = weatherize(T.gnd, Wt);
  const glow = lin(T.glow).multiplyScalar(T.glowI * (Wt.gray ? 0.25 : 1));
  const P = skyGeo.attributes.position, Cc = skyGeo.attributes.color;
  const v = new THREE.Vector3();
  for (let i=0; i<P.count; i++){
    v.fromBufferAttribute(P, i).normalize();
    if (v.y >= 0) tmpC.copy(hor).lerp(top, Math.pow(v.y, 0.55));
    else tmpC.copy(hor).lerp(gnd, Math.min(1, -v.y*6));
    const d = Math.max(0, v.dot(sunDir));
    const k = Math.pow(d, 10)*0.8 + Math.pow(d, 300)*6;
    tmpC.r += glow.r*k; tmpC.g += glow.g*k; tmpC.b += glow.b*k;
    Cc.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
  }
  Cc.needsUpdate = true;
  envGroundMat.color.copy(gnd).multiplyScalar(0.8);
  return hor;
}

/* 雨（カメラの周りに降らせる線分。上下に 2 段重ねて周期的に流す） */
const RAIN_H = 40;
const rain = (()=>{
  const n = 5000, pos = new Float32Array(n*2*2*3), r = mulberry32(99);
  for (let k=0; k<2; k++){
    for (let i=0; i<n; i++){
      const x = range(r,-45,45), y = range(r,0,RAIN_H), z = range(r,-45,45), o = (k*n + i)*6;
      pos[o] = x; pos[o+1] = y + k*RAIN_H; pos[o+2] = z;
      pos[o+3] = x + 0.04; pos[o+4] = y + k*RAIN_H + 0.7; pos[o+5] = z + 0.02;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0xc4ccd4, transparent:true, opacity:0.32, depthWrite:false}));
  m.frustumCulled = false; m.visible = false;
  scene.add(m);
  return m;
})();

function applyEnv(){
  const T = TIMES[state.time], Wt = WEATHER[state.weather];
  const az = state.sunAz * Math.PI/180, el = T.el * Math.PI/180;
  sunDir.set(Math.sin(az)*Math.cos(el), Math.sin(el), Math.cos(az)*Math.cos(el));

  const hor = paintSky(T, Wt);
  // Fog の色は線形空間で合成されるので、線形の色をそのまま入れる（空の地平線と揃える）
  scene.fog = new THREE.Fog(hor.clone(), Wt.fog[0], Wt.fog[1]);

  sun.color.copy(lin(T.sun));
  sun.intensity = T.sunI * Wt.sunMul;
  sun.castShadow = state.shadows === 'on' && sun.intensity > 0.12;
  hemi.color.copy(weatherize(T.hemiS, Wt));
  hemi.groundColor.copy(lin(T.hemiG));
  hemi.intensity = T.hemiI * (Wt.gray ? 1.6 : 1);
  renderer.toneMappingExposure = T.exp * (Wt.gray ? 1.1 : 1);

  refreshMaterials();
  rain.visible = Wt.wet;
  rain.material.color.copy(lin(T.night ? 0x6a7484 : 0xc4ccd4));

  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0.03, 0.1, 2000);
  scene.environment = envRT.texture;
}

/* 夜の灯り・濡れた路面（街を作り直すたびに新しい素材にも反映する） */
function refreshMaterials(){
  const T = TIMES[state.time], Wt = WEATHER[state.weather];
  const night = T.night;
  const hor = weatherize(T.hor, Wt);
  for (const m of MATS.values()){
    const u = m.userData;
    if (u.nightOnly){ m.visible = night > 0; m.opacity = 0.55*night; continue; }
    if (u.glow){
      const k = u.always ? (night ? 1 : 0.55) : night;
      m.emissive.copy(lin(u.glowHex)).multiplyScalar(u.glow * k);
    }
    m.envMapIntensity = T.env;
    if (u.haze){
      // 遠景：日の当たり方は弱め、空の色の「もや」を自発光で重ねる
      m.color.copy(lin(u.base)).multiplyScalar((1 - u.haze)*0.7);
      m.emissive.copy(hor).multiplyScalar(u.haze*0.92);
      m.envMapIntensity = 0;
    }
    if (u.wet){
      m.color.copy(lin(u.base)).multiplyScalar(Wt.wet ? 0.55 : 1);
      m.roughness = Wt.wet ? 0.16 : u.r0;
    }
  }
}

/* 毎フレーム：影の範囲と空・雨をカメラに追従させる */
function updateSky(t){
  sky.position.copy(camera.position);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const tx = Math.round(camera.position.x + fx*45), tz = Math.round(camera.position.z + fz*45);
  const ty = groundH(tx, tz);
  sun.target.position.set(tx, ty, tz);
  sun.position.set(tx + sunDir.x*300, ty + sunDir.y*300, tz + sunDir.z*300);
  sun.target.updateMatrixWorld();
  if (rain.visible){
    rain.position.set(camera.position.x, camera.position.y - 30 - ((t*0.011) % RAIN_H), camera.position.z);
  }
}
