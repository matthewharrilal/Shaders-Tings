// Cosmic Shader Visualizer — Peel-Back Debug Build (drop-in main.js)
// THREE.js is loaded globally from CDN

class CosmicShaderApp {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });

    this.uniforms = {
      iTime:        { value: 0.0 },
      iResolution:  { value: new THREE.Vector2() },
      iterations:   { value: 19.0 },
      coordScale:   { value: 0.2 },
      rotationSpeed:{ value: 1.0 },
      stabilization:{ value: 40.0 },
      waveFreq:     { value: 1.0 },
      brightness:   { value: 1.0 },
      saturation:   { value: 1.0 },
      colorChannels:{ value: new THREE.Vector3(1.0, 1.0, 1.0) },

      // Peel-back toggles (ints for portability; 0=off, 1=on)
      USE_ACCUM:       { value: 1 },
      USE_VFIELD:      { value: 1 },
      USE_ROT:         { value: 1 },
      USE_TANH:        { value: 1 },
      USE_DRIFT:       { value: 1 },
      USE_ENERGYNUDGE: { value: 1 },
      USE_RADIALDEN:   { value: 1 },
      USE_SINFIELD:    { value: 1 },
      USE_TONEMAP:     { value: 1 },
      USE_GRADING:     { value: 1 },
      FREEZE_TIME:     { value: 0 }
    };

    this.clock = new THREE.Clock();
    this.isPlaying = true;
    this.timeSpeed = 1.0;
    this.manualTime = 0.0;
    this.useManualTime = false;
    this.resolutionScale = 1.0;

    // Performance tracking
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.fps = 60;
    this.frameTime = 16.7;
    this.fpsHistory = [];

    this.init();
    this.setupEventListeners();
    this.animate();
    this.initDebugPanel(); // <-- new
  }

  init() {
    console.log('Initializing Cosmic Shader App...');
    console.log('THREE.js version:', THREE.REVISION);

    const container = document.getElementById('canvas-container');
    if (!container) {
      console.error('Canvas container not found!');
      return;
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);
    console.log('Renderer initialized');

    // Create shader material (toggle-aware)
    console.log('Creating shader material...');
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        void main() { gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;

        uniform float iTime;
        uniform vec2  iResolution;
        uniform float iterations;
        uniform float coordScale;
        uniform float rotationSpeed;
        uniform float stabilization;
        uniform float waveFreq;
        uniform float brightness;
        uniform float saturation;
        uniform vec3  colorChannels;

        // Toggle uniforms (0/1)
        uniform int USE_ACCUM;
        uniform int USE_VFIELD;
        uniform int USE_ROT;
        uniform int USE_TANH;
        uniform int USE_DRIFT;
        uniform int USE_ENERGYNUDGE;
        uniform int USE_RADIALDEN;
        uniform int USE_SINFIELD;
        uniform int USE_TONEMAP;
        uniform int USE_GRADING;
        uniform int FREEZE_TIME;

        vec3 adjustSaturation(vec3 color, float sat) {
          float luminance = dot(color, vec3(0.299, 0.587, 0.114));
          return mix(vec3(luminance), color, sat);
        }

        void mainImage(out vec4 o, vec2 fragPx) {
          vec2 vRes = iResolution.xy;                  // reused as scratch 'v' (matches your original intent)
          vec2 u = coordScale * (fragPx + fragPx - vRes) / vRes.y;

          vec4 z = vec4(1.0, 2.0, 3.0, 0.0);
          o = z;

          float t = (FREEZE_TIME == 1) ? 0.0 : (iTime * rotationSpeed);

          for (float a = 0.5, i = 0.0; i < iterations; i += 1.0) {
            // --- denominator field ---
            float radialDen = (USE_RADIALDEN == 1)
              ? max(0.5 - dot(u,u), 1e-3)
              : 1.0;

            vec2 sfield = (USE_SINFIELD == 1)
              ? sin(1.5 * waveFreq * u / radialDen - 9.0 * u.yx + t)
              : vec2(1.0);

            float den = length((1.0 + i * dot(vRes, vRes)) * sfield);

            // --- accumulation ---
            if (USE_ACCUM == 1) {
              o += (1.0 + cos(z + t)) / max(den, 1e-4);
            }

            // --- v-field update ---
            if (USE_VFIELD == 1) {
              vRes = cos(t + 1.0 - 7.0 * u * pow(a, i)) - 5.0 * u;
            }

            // --- rotation matrix ---
            vec4 m = cos(i + 0.02 * t - vec4(0.0, 11.0, 33.0, 0.0));
            mat2 rotMatrix = mat2(m.x, m.y, m.z, m.w);
            if (USE_ROT == 1) {
              u *= rotMatrix;
            }

            // --- stabilization & nudges ---
            if (USE_TANH == 1) {
              u += tanh(stabilization * dot(u,u) * cos(1e2 * u.yx + t)) / 2e2;
            }
            if (USE_DRIFT == 1) {
              u += 0.2 * a * u;
            }
            if (USE_ENERGYNUDGE == 1) {
              u += cos(4.0 / exp(dot(o,o) / 1e2) + t) / 3e2;
            }

            a += 0.03;
            t += 0.5;
          }

          // --- tone map ---
          if (USE_TONEMAP == 1) {
            o = 25.6 / (min(o, 13.0) + 164.0 / o) - dot(u, u) / 250.0;
          }

          // --- grading ---
          if (USE_GRADING == 1) {
            o.rgb *= brightness;
            o.rgb *= colorChannels;
            o.rgb = adjustSaturation(o.rgb, saturation);
          }
        }

        void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
      `
    });

    // Fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(mesh);
    console.log('Mesh created and added to scene');

    this.updateResolution();
    this.updateMathOverlay();
    console.log('Initialization complete');

    // Ensure FPS graph exists
    this.setupFPSGraph();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    // Mouse tracking for mathematical analysis
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      this.updateMathAnalysis(x, y);
    });
  }

  setupFPSGraph() {
    const graph = document.getElementById('fps-graph');
    if (!graph) return;
    graph.innerHTML = '';
    for (let i = 0; i < 120; i++) {
      const bar = document.createElement('div');
      bar.className = 'fps-bar';
      bar.style.position = 'absolute';
      bar.style.bottom = '0';
      bar.style.width = '1px';
      bar.style.left = i + 'px';
      bar.style.height = '0px';
      bar.style.background = '#00ff88';
      bar.style.opacity = '.9';
      graph.appendChild(bar);
    }
  }

  updateFPSGraph() {
    const bars = document.querySelectorAll('.fps-bar');
    if (!bars.length) return;
    this.fpsHistory.push(this.fps);
    if (this.fpsHistory.length > bars.length) this.fpsHistory.shift();

    bars.forEach((bar, i) => {
      const fps = this.fpsHistory[i] || 0;
      const height = (fps / 120) * 30; // Max 120 FPS -> 30px
      bar.style.height = Math.max(1, height) + 'px';
      bar.style.background = fps > 55 ? '#00ff88' : (fps > 30 ? '#ffeb3b' : '#ff5722');
    });
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.updateResolution();

    const resEl = document.getElementById('resolution-display');
    if (resEl) {
      resEl.textContent = `${Math.round(width * this.resolutionScale)}x${Math.round(height * this.resolutionScale)}`;
    }
  }

  onKeyDown(event) {
    switch(event.code) {
      case 'Space':
        event.preventDefault();
        this.togglePlayPause();
        break;
      case 'KeyR':
        this.resetTime();
        break;
      case 'KeyF':
        this.toggleFullscreen();
        break;
      case 'KeyM':
        this.toggleMathOverlay();
        break;
      case 'Escape':
        this.closeControlPanel();
        break;
    }
  }

  updateResolution() {
    const width = this.renderer.domElement.width * this.resolutionScale;
    const height = this.renderer.domElement.height * this.resolutionScale;
    this.uniforms.iResolution.value.set(width, height);
  }

  updateMathAnalysis(mouseX, mouseY) {
    const time = this.uniforms.iTime.value;
    const coords = this.transformCoordinates(mouseX, mouseY);
    const iteration = Math.floor((time * 10) % Math.max(1, this.uniforms.iterations.value));
    const rotation = (iteration + 0.02 * time) * 180 / Math.PI;
    const distance = Math.hypot(coords.x, coords.y);

    const el = (id) => document.getElementById(id);
    if (el('math-time')) el('math-time').textContent = time.toFixed(3) + 's';
    if (el('math-coords')) el('math-coords').textContent = `(${coords.x.toFixed(3)}, ${coords.y.toFixed(3)})`;
    if (el('math-iteration')) el('math-iteration').textContent = `${iteration}/${Math.floor(this.uniforms.iterations.value)}`;
    if (el('math-rotation')) el('math-rotation').textContent = rotation.toFixed(2) + '°';
    if (el('math-distance')) el('math-distance').textContent = distance.toFixed(3);
  }

  transformCoordinates(x, y) {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    const u = x * width;
    const v = y * height;
    const coordScale = this.uniforms.coordScale.value;

    const transformedU = coordScale * (u + u - width) / height;
    const transformedV = coordScale * (v + v - height) / height;

    return { x: transformedU, y: transformedV };
  }

  updateMathOverlay() {
    const formula = `u = ${this.uniforms.coordScale.value.toFixed(2)}*(u+u-v)/v.y
for (i=0; i<${Math.floor(this.uniforms.iterations.value)}; i++) {
  // Rotation (speed: ${this.uniforms.rotationSpeed.value.toFixed(2)}x)
  // Stabilization: tanh(${this.uniforms.stabilization.value}) * cos(1e2*u.yx + t)
  // Wave frequency: ${this.uniforms.waveFreq.value.toFixed(2)}x
  // Accum: o += (1. + cos(z+t)) / length(sin(...))
}`;
    const el = document.getElementById('current-formula');
    if (el) el.textContent = formula;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const startTime = performance.now();

    if (this.isPlaying && !this.useManualTime) {
      this.uniforms.iTime.value = this.clock.getElapsedTime() * this.timeSpeed;
    } else if (this.useManualTime) {
      this.uniforms.iTime.value = this.manualTime;
    }

    this.renderer.render(this.scene, this.camera);

    // Performance tracking
    const endTime = performance.now();
    this.frameTime = endTime - startTime;
    this.frameCount++;

    if (endTime - this.lastFPSUpdate > 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (endTime - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = endTime;

      const fpsEl = document.getElementById('fps-display');
      const ftEl = document.getElementById('frame-time-display');
      if (fpsEl) fpsEl.textContent = this.fps;
      if (ftEl) ftEl.textContent = this.frameTime.toFixed(1) + 'ms';

      this.updateFPSGraph();
    }
  }

  // Control methods
  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('play-pause-btn');
    if (btn) btn.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Play';
    if (this.isPlaying) {
      this.clock.start();
      this.useManualTime = false;
    }
  }

  resetTime() {
    this.clock = new THREE.Clock();
    this.uniforms.iTime.value = 0;
    this.manualTime = 0;
    const tIn = document.getElementById('manual-time');
    const tVal = document.getElementById('manual-time-value');
    if (tIn) tIn.value = '0';
    if (tVal) tVal.textContent = '0.0s';
  }

  updateTimeSpeed(value) {
    this.timeSpeed = parseFloat(value);
    const el = document.getElementById('time-speed-value');
    if (el) el.textContent = value + 'x';
  }

  updateManualTime(value) {
    this.manualTime = parseFloat(value);
    this.useManualTime = true;
    this.isPlaying = false;
    const btn = document.getElementById('play-pause-btn');
    if (btn) btn.textContent = '▶️ Play';
    const el = document.getElementById('manual-time-value');
    if (el) el.textContent = value + 's';
  }

  updateIterations(value) {
    this.uniforms.iterations.value = parseFloat(value);
    const el = document.getElementById('iterations-value');
    if (el) el.textContent = value;
    this.updateMathOverlay();
  }

  updateCoordScale(value) {
    this.uniforms.coordScale.value = parseFloat(value);
    const el = document.getElementById('coord-scale-value');
    if (el) el.textContent = parseFloat(value).toFixed(2);
    this.updateMathOverlay();
  }

  updateRotationSpeed(value) {
    this.uniforms.rotationSpeed.value = parseFloat(value);
    const el = document.getElementById('rotation-speed-value');
    if (el) el.textContent = parseFloat(value).toFixed(2);
    this.updateMathOverlay();
  }

  updateStabilization(value) {
    this.uniforms.stabilization.value = parseFloat(value);
    const el = document.getElementById('stabilization-value');
    if (el) el.textContent = value;
    this.updateMathOverlay();
  }

  updateWaveFreq(value) {
    this.uniforms.waveFreq.value = parseFloat(value);
    const el = document.getElementById('wave-freq-value');
    if (el) el.textContent = parseFloat(value).toFixed(2);
    this.updateMathOverlay();
  }

  updateBrightness(value) {
    this.uniforms.brightness.value = parseFloat(value);
    const el = document.getElementById('brightness-value');
    if (el) el.textContent = parseFloat(value).toFixed(2);
  }

  updateSaturation(value) {
    this.uniforms.saturation.value = parseFloat(value);
    const el = document.getElementById('saturation-value');
    if (el) el.textContent = parseFloat(value).toFixed(2);
  }

  updateColorChannels() {
    const r = parseFloat(document.getElementById('color-r')?.value || 1);
    const g = parseFloat(document.getElementById('color-g')?.value || 1);
    const b = parseFloat(document.getElementById('color-b')?.value || 1);
    this.uniforms.colorChannels.value.set(r, g, b);
  }

  updateResolutionScale(value) {
    this.resolutionScale = parseFloat(value);
    const el = document.getElementById('resolution-scale-value');
    if (el) el.textContent = parseFloat(value).toFixed(2) + 'x';
    this.updateResolution();
    this.onResize();
  }

  setQuality(quality) {
    document.querySelectorAll('.preset-quality').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`[data-quality="${quality}"]`);
    if (btn) btn.classList.add('active');

    const settings = {
      low:    { iterations: 8,  resolution: 0.5, stabilization: 20 },
      medium: { iterations: 19, resolution: 1.0, stabilization: 40 },
      high:   { iterations: 30, resolution: 1.5, stabilization: 60 },
      ultra:  { iterations: 50, resolution: 2.0, stabilization: 80 }
    };

    const s = settings[quality];
    if (!s) return;

    this.updateIterations(s.iterations);
    this.updateResolutionScale(s.resolution);
    this.updateStabilization(s.stabilization);

    const it = document.getElementById('iterations');
    const rs = document.getElementById('resolution-scale');
    const st = document.getElementById('stabilization');
    if (it) it.value = s.iterations;
    if (rs) rs.value = s.resolution;
    if (st) st.value = s.stabilization;
  }

  loadPreset(preset) {
    const presets = {
      default:     { iterations: 19, coordScale: 0.2, rotationSpeed: 1.0, stabilization: 40, waveFreq: 1.0, brightness: 1.0, saturation: 1.0, colorR: 1.0, colorG: 1.0, colorB: 1.0 },
      slow:        { iterations: 19, coordScale: 0.2, rotationSpeed: 0.3, stabilization: 40, waveFreq: 1.0, brightness: 1.0, saturation: 1.0, colorR: 1.0, colorG: 1.0, colorB: 1.0 },
      'high-detail': { iterations: 35, coordScale: 0.15, rotationSpeed: 1.0, stabilization: 60, waveFreq: 1.5, brightness: 1.2, saturation: 1.2, colorR: 1.0, colorG: 1.0, colorB: 1.0 },
      chaotic:     { iterations: 25, coordScale: 0.3, rotationSpeed: 2.0, stabilization: 20, waveFreq: 2.0, brightness: 0.8, saturation: 1.5, colorR: 1.2, colorG: 0.8, colorB: 1.1 },
      minimal:     { iterations: 10, coordScale: 0.25, rotationSpeed: 0.8, stabilization: 30, waveFreq: 0.8, brightness: 1.0, saturation: 0.8, colorR: 1.0, colorG: 1.0, colorB: 1.0 }
    };

    const p = presets[preset];
    if (!p) return;

    Object.keys(p).forEach(key => {
      const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (element) {
        element.value = p[key];
        element.dispatchEvent(new Event('input'));
      }
    });
  }

  captureScreenshot() {
    const canvas = this.renderer.domElement;
    const link = document.createElement('a');
    link.download = `cosmic-shader-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  exportSettings() {
    const settings = {
      iterations: this.uniforms.iterations.value,
      coordScale: this.uniforms.coordScale.value,
      rotationSpeed: this.uniforms.rotationSpeed.value,
      stabilization: this.uniforms.stabilization.value,
      waveFreq: this.uniforms.waveFreq.value,
      brightness: this.uniforms.brightness.value,
      saturation: this.uniforms.saturation.value,
      colorChannels: this.uniforms.colorChannels.value.toArray(),
      resolutionScale: this.resolutionScale,
      timeSpeed: this.timeSpeed
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `cosmic-shader-settings-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  closeControlPanel() {
    const el = document.getElementById('control-panel');
    if (el) el.classList.remove('open');
  }

  toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen(); }
    else { document.documentElement.requestFullscreen(); }
  }

  toggleMathOverlay() {
    const overlay = document.getElementById('math-overlay');
    if (overlay) overlay.classList.toggle('open');
  }

  // ---------- Peel-Back Debug Panel ----------
  initDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed; right: 16px; top: 64px; z-index: 1000;
      width: 340px; max-height: 72vh; overflow: auto;
      background: rgba(10,12,16,0.8); color: #e5e7eb;
      font: 13px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      border: 1px solid #263040; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.35);
      backdrop-filter: blur(6px); padding: 10px 12px;
    `;
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <strong>Peel-Back Debug Panel</strong>
        <button id="dbg-collapse" style="background:#18202c;border:1px solid #2a3445;color:#cbd5e1;border-radius:6px;padding:4px 8px;cursor:pointer">&#9662;</button>
      </div>
      <div id="dbg-body"></div>
      <div id="dbg-hint" style="margin-top:10px;padding:8px;border:1px dashed #334155;border-radius:6px;color:#a5b4fc;background:rgba(30,41,59,.35)"></div>
    `;
    document.body.appendChild(panel);

    const toggles = [
      { id:'FREEZE_TIME',     label:'Freeze time (t = 0)',            def:0,
        where:'fragment: time seed → float t = (FREEZE_TIME==1)?0.0: iTime*rotationSpeed;',
        note:'Stop animation to inspect static structure.' },
      { id:'USE_ACCUM',       label:'Accumulate (o += ...)',          def:1,
        where:'fragment: loop → o += (1.0 + cos(z + t)) / ...;',
        note:'Adds glow/energy each iteration.' },
      { id:'USE_SINFIELD',    label:'Sin curl field',                 def:1,
        where:'fragment: loop → vec2 sfield = sin(1.5*waveFreq*u/(0.5-dot(u,u)) - 9.0*u.yx + t',
        note:'Creates tendrils/filaments; off = flat field.' },
      { id:'USE_RADIALDEN',   label:'Radial denominator (center bias)', def:1,
        where:'fragment: loop → float radialDen = 0.5 - dot(u,u)',
        note:'Pulls energy toward center.' },
      { id:'USE_VFIELD',      label:'v-field update',                 def:1,
        where:'fragment: loop → vRes = cos(t + 1.0 - 7.0*u*pow(a,i)) - 5.0*u',
        note:'Secondary flow term; affects scaling.' },
      { id:'USE_ROT',         label:'Rotation matrix (u *= rot)',     def:1,
        where:'fragment: loop → mat2 rotMatrix = ...; u *= rotMatrix',
        note:'Global swirl/shear.' },
      { id:'USE_TANH',        label:'tanh stabilization (HF wiggle)', def:1,
        where:'fragment: loop → += tanh(stabilization*dot(u,u)*cos(100*u.yx + t))/200',
        note:'Silky micro-ripples; clamps chaos.' },
      { id:'USE_DRIFT',       label:'Outward drift (+0.2*a*u)',       def:1,
        where:'fragment: loop → += 0.2 * a * u',
        note:'Slow breathing/expansion.' },
      { id:'USE_ENERGYNUDGE', label:'Energy nudge (cos(4/exp(...)))', def:1,
        where:'fragment: loop → += cos(4.0/exp(dot(o,o)/100)+t)/300',
        note:'Tiny sparkle near hot regions.' },
      { id:'USE_TONEMAP',     label:'Filmic tonemap',                 def:1,
        where:'fragment: after loop → o = 25.6 / (min(o,13.0) + 164.0 / o) - dot(u,u)/250.0',
        note:'Creamy highlights; off = raw linear accumulator.' },
      { id:'USE_GRADING',     label:'Color grading (brightness/sat/RGB)', def:1,
        where:`fragment: grading → 'o.rgb *= brightness; o.rgb *= colorChannels; adjustSaturation(...)'`,
        note:'Exposure/saturation/channel gains.' }
    ];

    const body = panel.querySelector('#dbg-body');
    const hint = panel.querySelector('#dbg-hint');

    toggles.forEach(t => {
      if (this.uniforms[t.id]) this.uniforms[t.id].value = t.def;
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer;';
      row.innerHTML = `
        <input type="checkbox" ${t.def ? 'checked' : ''} data-uniform="${t.id}" />
        <span>${t.label}</span>
        <button type="button" data-why="${t.id}" style="margin-left:auto;background:#0f172a;border:1px solid #1f2937;color:#93c5fd;border-radius:5px;padding:2px 6px;cursor:pointer">where?</button>
      `;
      body.appendChild(row);
    });

    body.addEventListener('change', (e) => {
      const el = e.target;
      if (el && el.matches('input[type="checkbox"][data-uniform]')) {
        const id = el.getAttribute('data-uniform');
        const on = el.checked ? 1 : 0;
        this.uniforms[id].value = on;
        const meta = toggles.find(x => x.id === id);
        hint.innerHTML = `<b>${meta.label}</b> → <i>${on ? 'ENABLED' : 'DISABLED'}</i><br/><code>${meta.where}</code><br/>${meta.note}`;
      }
    });

    body.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-why]');
      if (!btn) return;
      const id = btn.getAttribute('data-why');
      const meta = toggles.find(x => x.id === id);
      hint.innerHTML = `<b>${meta.label}</b><br/><code>${meta.where}</code><br/>${meta.note}`;
    });

    panel.querySelector('#dbg-collapse').addEventListener('click', () => {
      const b = panel.querySelector('#dbg-body');
      const h = panel.querySelector('#dbg-hint');
      const hidden = b.style.display === 'none';
      b.style.display = hidden ? '' : 'none';
      h.style.display = hidden ? '' : 'none';
    });
  }
}

// Global app instance
let app;

// UI Control Functions (kept for compatibility with your page)
function toggleControlPanel() {
  const panel = document.getElementById('control-panel');
  if (panel) panel.classList.toggle('open');
}
function closeControlPanel() {
  const panel = document.getElementById('control-panel');
  if (panel) panel.classList.remove('open');
}
function toggleMathOverlay() {
  const overlay = document.getElementById('math-overlay');
  if (overlay) overlay.classList.toggle('open');
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}

// Delegate control methods to app instance
function togglePlayPause() { app.togglePlayPause(); }
function resetTime() { app.resetTime(); }
function updateTimeSpeed(value) { app.updateTimeSpeed(value); }
function updateManualTime(value) { app.updateManualTime(value); }
function updateIterations(value) { app.updateIterations(value); }
function updateCoordScale(value) { app.updateCoordScale(value); }
function updateRotationSpeed(value) { app.updateRotationSpeed(value); }
function updateStabilization(value) { app.updateStabilization(value); }
function updateWaveFreq(value) { app.updateWaveFreq(value); }
function updateBrightness(value) { app.updateBrightness(value); }
function updateSaturation(value) { app.updateSaturation(value); }
function updateColorChannels() { app.updateColorChannels(); }
function updateResolutionScale(value) { app.updateResolutionScale(value); }
function setQuality(quality) { app.setQuality(quality); }
function loadPreset(preset) { app.loadPreset(preset); }
function captureScreenshot() { app.captureScreenshot(); }
function exportSettings() { app.exportSettings(); }

// Initialize app when page loads
window.addEventListener('load', () => {
  console.log('Page loaded, checking THREE.js...');
  if (typeof THREE === 'undefined') {
    console.error('THREE.js not loaded! Please check the CDN link.');
    document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;">ERROR: THREE.js failed to load. Please check your internet connection and refresh the page.</div>';
    return;
  }

  console.log('THREE.js loaded successfully, starting app...');
  app = new CosmicShaderApp();

  // Show math overlay by default
  setTimeout(() => {
    const ov = document.getElementById('math-overlay');
    if (ov) ov.classList.add('open');
  }, 800);
});

// Keyboard shortcuts help (screenshot/export)
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || !app) return;
  switch(e.key) {
    case 's':
      e.preventDefault();
      app.captureScreenshot();
      break;
    case 'e':
      e.preventDefault();
      app.exportSettings();
      break;
  }
});

// Make functions globally available (same API your page expects)
window.toggleControlPanel = toggleControlPanel;
window.toggleMathOverlay = toggleMathOverlay;
window.toggleFullscreen = toggleFullscreen;
window.togglePlayPause = togglePlayPause;
window.resetTime = resetTime;
window.updateTimeSpeed = updateTimeSpeed;
window.updateManualTime = updateManualTime;
window.updateIterations = updateIterations;
window.updateCoordScale = updateCoordScale;
window.updateRotationSpeed = updateRotationSpeed;
window.updateStabilization = updateStabilization;
window.updateWaveFreq = updateWaveFreq;
window.updateBrightness = updateBrightness;
window.updateSaturation = updateSaturation;
window.updateColorChannels = updateColorChannels;
window.updateResolutionScale = updateResolutionScale;
window.setQuality = setQuality;
window.loadPreset = loadPreset;
window.captureScreenshot = captureScreenshot;
window.exportSettings = exportSettings;
