/* ================= 線画表示 =================
   画面の「奥行き」と「面の向き」を別に描いて、その差から輪郭線を引く（ポストエフェクト）。
   重さは画面の大きさで決まり、ポリゴン数にはほとんど左右されない。
     view = 'normal' … ふつうの表示
            'line'   … 白地に線だけ
            'tone'   … 陰影をグレーの段階に落とし（トーン風）、その上に線
   線は手前ほど太く、遠いほど細く薄くする。                                */
const lineArt = (() => {
  const mkRT = (depth) => {
    const rt = new THREE.WebGLRenderTarget(1, 1, {minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter});
    if (depth){
      rt.depthTexture = new THREE.DepthTexture();
      rt.depthTexture.type = THREE.UnsignedIntType;
    }
    return rt;
  };
  const rtN = mkRT(true);    // 面の向き＋奥行き
  const rtC = mkRT(false);   // トーン用のふつうの絵
  rtC.texture.minFilter = rtC.texture.magFilter = THREE.LinearFilter;
  const normalMat = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});

  const quadMat = new THREE.ShaderMaterial({
    uniforms: {
      tN: {value: rtN.texture}, tD: {value: rtN.depthTexture}, tC: {value: rtC.texture},
      texel: {value: new THREE.Vector2()}, outTexel: {value: new THREE.Vector2()}, near: {value: 0.2}, far: {value: 900},
      thick: {value: 1.0}, tone: {value: 0}, pr: {value: 1},
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tN, tD, tC;
      uniform vec2 texel, outTexel;
      uniform float near, far, thick, tone, pr;
      varying vec2 vUv;
      // 奥行き（m）。逆数は平面の上で画面に対して一次式になるので、2階差分で「面の切れ目」だけを拾える
      float zLin(vec2 uv){ float d = texture2D(tD, uv).x; return near*far / (far - d*(far - near)); }
      vec3 nrm(vec2 uv){ return normalize(texture2D(tN, uv).xyz*2.0 - 1.0); }
      float edgeAt(vec2 uv, vec2 o, float ic, vec3 nc, bool sky){
        float ia = 1.0/zLin(uv + o), ib = 1.0/zLin(uv - o);
        float lap = abs(ia + ib - 2.0*ic) / ic;                      // 奥行きの段差（輪郭）
        float e = smoothstep(0.022, 0.06, lap);
        if (!sky){
          float da = dot(nc, nrm(uv + o)), db = dot(nc, nrm(uv - o));
          e = max(e, smoothstep(0.86, 0.6, min(da, db)));          // 面の折れ目
        }
        return e;
      }
      // 線の強さ（高解像度の 1 点で計算）
      float edge(vec2 uv){
        float zc = zLin(uv);
        bool sky = texture2D(tD, uv).x > 0.99999;
        float ic = 1.0/zc;
        vec3 nc = nrm(uv);
        // 手前ほど太く（〜1.6倍）、遠いほど細く（〜0.6倍）
        float k = thick * pr * mix(1.6, 0.6, clamp(zc/70.0, 0.0, 1.0));
        vec2 ox = vec2(texel.x*k, 0.0), oy = vec2(0.0, texel.y*k);
        float e = max(max(edgeAt(uv, ox, ic, nc, sky), edgeAt(uv, oy, ic, nc, sky)),
                      max(edgeAt(uv, ox+oy, ic, nc, sky), edgeAt(uv, ox-oy, ic, nc, sky)) * 0.85);
        return e * (1.0 - 0.8*smoothstep(110.0, 320.0, zc));      // 遠くの線は薄く
      }
      void main(){
        // 1 画素を 4 点で計算して平均（細い線が途切れないように）
        vec2 q = outTexel*0.25;
        float e = 0.25*(edge(vUv + vec2(-q.x,-q.y)) + edge(vUv + vec2(q.x,-q.y)) + edge(vUv + vec2(-q.x,q.y)) + edge(vUv + vec2(q.x,q.y)));
        e = clamp(e*1.15, 0.0, 1.0);
        vec3 paper = vec3(1.0), ink = vec3(0.07, 0.07, 0.08);
        vec3 col = paper;
        if (tone > 0.5){
          vec3 c = texture2D(tC, vUv).rgb;
          c = c / (c + 0.55);                                        // 明るさをならす
          float g = pow(dot(c, vec3(0.3, 0.55, 0.15)), 1.0/2.2);
          float q = floor(g*4.0 + 0.5)/4.0;                          // 4 段階のトーン
          g = mix(g, q, 0.75);
          col = vec3(mix(0.42, 1.0, g));
        }
        gl_FragColor = vec4(mix(col, ink, e), 1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2(), clearC = new THREE.Color();

  // 線を取り出す画像は画面の 2 倍の解像度で描く（大きすぎる画面では控えめに）
  function resize(){
    renderer.getDrawingBufferSize(size);
    const ss = clamp(Math.min(2, 4096/size.x, 4096/size.y), 1, 2);
    rtN.setSize(Math.round(size.x*ss), Math.round(size.y*ss));
    rtC.setSize(size.x, size.y);
    quadMat.uniforms.texel.value.set(1/(size.x*ss), 1/(size.y*ss));
    quadMat.uniforms.outTexel.value.set(1/size.x, 1/size.y);
    quadMat.uniforms.pr.value = renderer.getPixelRatio()*ss;
  }
  resize();

  // 線画のときに隠すもの（空・雨・夜の光だまり）
  function hidden(set){
    sky.visible = !set;
    if (set) rain.userData.wasVisible = rain.visible;
    rain.visible = set ? false : !!rain.userData.wasVisible;
    MAT.pool.visible = set ? false : TIMES[state.time].night > 0;
  }

  function render(){
    if (state.view === 'normal'){ renderer.render(scene, camera); return; }
    const u = quadMat.uniforms;
    u.near.value = camera.near; u.far.value = camera.far;
    u.thick.value = state.lineW; u.tone.value = state.view === 'tone' ? 1 : 0;
    if (state.view === 'tone'){
      renderer.setRenderTarget(rtC);
      renderer.render(scene, camera);
    }
    // 面の向きと奥行き：影の計算はいらないので止める
    hidden(true);
    const bg = scene.background, fog = scene.fog;
    scene.overrideMaterial = normalMat; scene.background = null; scene.fog = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rtN);
    renderer.getClearColor(clearC); const clearA = renderer.getClearAlpha();
    renderer.setClearColor(0x8080ff, 1);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = true;
    scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
    hidden(false);
    renderer.setClearColor(clearC, clearA);
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }
  return {render, resize};
})();
