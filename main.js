// Cosmic Shader Visualizer - Main Application
// THREE.js is loaded globally from CDN

class CosmicShaderApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            preserveDrawingBuffer: true 
        });
        
        this.uniforms = {
            iTime: { value: 0.0 },
            iResolution: { value: new THREE.Vector2() },
            iterations: { value: 19.0 },
            coordScale: { value: 0.2 },
            rotationSpeed: { value: 1.0 },
            stabilization: { value: 40.0 },
            waveFreq: { value: 1.0 },
            brightness: { value: 1.0 },
            saturation: { value: 1.0 },
            colorChannels: { value: new THREE.Vector3(1.0, 1.0, 1.0) }
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

        // Create shader material
        console.log('Creating shader material...');
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                void main() {
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;

                uniform float iTime;
                uniform vec2 iResolution;
                uniform float iterations;
                uniform float coordScale;
                uniform float rotationSpeed;
                uniform float stabilization;
                uniform float waveFreq;
                uniform float brightness;
                uniform float saturation;
                uniform vec3 colorChannels;

                vec3 adjustSaturation(vec3 color, float saturation) {
                    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
                    return mix(vec3(luminance), color, saturation);
                }

                void mainImage(out vec4 o, vec2 u) {
                    vec2 v = iResolution.xy;
                    u = coordScale * (u + u - v) / v.y;    
                          
                    vec4 z = o = vec4(1.0, 2.0, 3.0, 0.0);
                     
                    for (float a = 0.5, t = iTime * rotationSpeed, i = 0.0; 
                         i < iterations; 
                         i += 1.0
                         ) {
                        o += (1.0 + cos(z + t)) 
                           / length((1.0 + i * dot(v, v)) 
                                  * sin(1.5 * waveFreq * u / (0.5 - dot(u, u)) - 9.0 * u.yx + t));
                        
                        v = cos(t + 1.0 - 7.0 * u * pow(a, i)) - 5.0 * u;
                        
                        // Matrix transformation
                        vec4 m = cos(i + 0.02 * t - vec4(0.0, 11.0, 33.0, 0.0));
                        mat2 rotMatrix = mat2(m.x, m.y, m.z, m.w);
                        u *= rotMatrix;
                        
                        // Stabilization with tanh
                        u += tanh(stabilization * dot(u, u) * cos(1e2 * u.yx + t)) / 2e2
                           + 0.2 * a * u
                           + cos(4.0 / exp(dot(o, o) / 1e2) + t) / 3e2;
                        
                        a += 0.03;
                        t += 0.5;
                    }
                          
                    o = 25.6 / (min(o, 13.0) + 164.0 / o) - dot(u, u) / 250.0;
                    
                    // Apply visual modifications
                    o.rgb *= brightness;
                    o.rgb *= colorChannels;
                    o.rgb = adjustSaturation(o.rgb, saturation);
                }

                void main() {
                    mainImage(gl_FragColor, gl_FragCoord.xy);
                }
            `
        });

        // Create fullscreen quad
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(mesh);
        console.log('Mesh created and added to scene');

        this.updateResolution();
        this.updateMathOverlay();
        console.log('Initialization complete');
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

        // FPS graph setup
        this.setupFPSGraph();
    }

    setupFPSGraph() {
        const graph = document.getElementById('fps-graph');
        for (let i = 0; i < 80; i++) {
            const bar = document.createElement('div');
            bar.className = 'fps-bar';
            bar.style.left = i + 'px';
            bar.style.height = '0px';
            graph.appendChild(bar);
        }
    }

    updateFPSGraph() {
        const bars = document.querySelectorAll('.fps-bar');
        this.fpsHistory.push(this.fps);
        if (this.fpsHistory.length > 80) {
            this.fpsHistory.shift();
        }

        bars.forEach((bar, i) => {
            const fps = this.fpsHistory[i] || 0;
            const height = (fps / 120) * 30; // Max 120 FPS
            bar.style.height = Math.max(1, height) + 'px';
            
            // Color coding
            if (fps > 55) bar.style.background = '#00ff88';
            else if (fps > 30) bar.style.background = '#ffeb3b';
            else bar.style.background = '#ff5722';
        });
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.renderer.setSize(width, height);
        this.updateResolution();
        document.getElementById('resolution-display').textContent = 
            `${Math.round(width * this.resolutionScale)}x${Math.round(height * this.resolutionScale)}`;
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
        const iteration = Math.floor((time * 10) % this.uniforms.iterations.value);
        const rotation = (iteration + 0.02 * time) * 180 / Math.PI;
        const distance = Math.sqrt(coords.x * coords.x + coords.y * coords.y);

        document.getElementById('math-time').textContent = time.toFixed(3) + 's';
        document.getElementById('math-coords').textContent = 
            `(${coords.x.toFixed(3)}, ${coords.y.toFixed(3)})`;
        document.getElementById('math-iteration').textContent = 
            `${iteration}/${Math.floor(this.uniforms.iterations.value)}`;
        document.getElementById('math-rotation').textContent = 
            rotation.toFixed(2) + '°';
        document.getElementById('math-distance').textContent = distance.toFixed(3);
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
  // Matrix rotation (speed: ${this.uniforms.rotationSpeed.value.toFixed(2)}x)
  u *= mat2(cos(i + .02*t - vec4(0,11,33,0)))
  
  // Stabilization (strength: ${this.uniforms.stabilization.value})
  u += tanh(${this.uniforms.stabilization.value}. * dot(u,u) * cos(1e2*u.yx + t)) / 2e2
  
  // Wave frequency: ${this.uniforms.waveFreq.value.toFixed(2)}x
  // Color accumulation
  o += (1. + cos(z+t)) / length(sin(...))
}`;
        document.getElementById('current-formula').textContent = formula;
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
            
            document.getElementById('fps-display').textContent = this.fps;
            document.getElementById('frame-time-display').textContent = 
                this.frameTime.toFixed(1) + 'ms';
            
            this.updateFPSGraph();
        }
    }

    // Control methods
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        document.getElementById('play-pause-btn').textContent = 
            this.isPlaying ? '⏸️ Pause' : '▶️ Play';
        if (this.isPlaying) {
            this.clock.start();
            this.useManualTime = false;
        }
    }

    resetTime() {
        this.clock = new THREE.Clock();
        this.uniforms.iTime.value = 0;
        this.manualTime = 0;
        document.getElementById('manual-time').value = '0';
        document.getElementById('manual-time-value').textContent = '0.0s';
    }

    updateTimeSpeed(value) {
        this.timeSpeed = parseFloat(value);
        document.getElementById('time-speed-value').textContent = value + 'x';
    }

    updateManualTime(value) {
        this.manualTime = parseFloat(value);
        this.useManualTime = true;
        this.isPlaying = false;
        document.getElementById('play-pause-btn').textContent = '▶️ Play';
        document.getElementById('manual-time-value').textContent = value + 's';
    }

    updateIterations(value) {
        this.uniforms.iterations.value = parseFloat(value);
        document.getElementById('iterations-value').textContent = value;
        this.updateMathOverlay();
    }

    updateCoordScale(value) {
        this.uniforms.coordScale.value = parseFloat(value);
        document.getElementById('coord-scale-value').textContent = parseFloat(value).toFixed(2);
        this.updateMathOverlay();
    }

    updateRotationSpeed(value) {
        this.uniforms.rotationSpeed.value = parseFloat(value);
        document.getElementById('rotation-speed-value').textContent = parseFloat(value).toFixed(2);
        this.updateMathOverlay();
    }

    updateStabilization(value) {
        this.uniforms.stabilization.value = parseFloat(value);
        document.getElementById('stabilization-value').textContent = value;
        this.updateMathOverlay();
    }

    updateWaveFreq(value) {
        this.uniforms.waveFreq.value = parseFloat(value);
        document.getElementById('wave-freq-value').textContent = parseFloat(value).toFixed(2);
        this.updateMathOverlay();
    }

    updateBrightness(value) {
        this.uniforms.brightness.value = parseFloat(value);
        document.getElementById('brightness-value').textContent = parseFloat(value).toFixed(2);
    }

    updateSaturation(value) {
        this.uniforms.saturation.value = parseFloat(value);
        document.getElementById('saturation-value').textContent = parseFloat(value).toFixed(2);
    }

    updateColorChannels() {
        const r = parseFloat(document.getElementById('color-r').value);
        const g = parseFloat(document.getElementById('color-g').value);
        const b = parseFloat(document.getElementById('color-b').value);
        this.uniforms.colorChannels.value.set(r, g, b);
    }

    updateResolutionScale(value) {
        this.resolutionScale = parseFloat(value);
        document.getElementById('resolution-scale-value').textContent = parseFloat(value).toFixed(2) + 'x';
        this.updateResolution();
        this.onResize();
    }

    setQuality(quality) {
        document.querySelectorAll('.preset-quality').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-quality="${quality}"]`).classList.add('active');

        const settings = {
            low: { iterations: 8, resolution: 0.5, stabilization: 20 },
            medium: { iterations: 19, resolution: 1.0, stabilization: 40 },
            high: { iterations: 30, resolution: 1.5, stabilization: 60 },
            ultra: { iterations: 50, resolution: 2.0, stabilization: 80 }
        };

        const s = settings[quality];
        this.updateIterations(s.iterations);
        this.updateResolutionScale(s.resolution);
        this.updateStabilization(s.stabilization);
        
        document.getElementById('iterations').value = s.iterations;
        document.getElementById('resolution-scale').value = s.resolution;
        document.getElementById('stabilization').value = s.stabilization;
    }

    loadPreset(preset) {
        const presets = {
            default: {
                iterations: 19, coordScale: 0.2, rotationSpeed: 1.0,
                stabilization: 40, waveFreq: 1.0, brightness: 1.0,
                saturation: 1.0, colorR: 1.0, colorG: 1.0, colorB: 1.0
            },
            slow: {
                iterations: 19, coordScale: 0.2, rotationSpeed: 0.3,
                stabilization: 40, waveFreq: 1.0, brightness: 1.0,
                saturation: 1.0, colorR: 1.0, colorG: 1.0, colorB: 1.0
            },
            'high-detail': {
                iterations: 35, coordScale: 0.15, rotationSpeed: 1.0,
                stabilization: 60, waveFreq: 1.5, brightness: 1.2,
                saturation: 1.2, colorR: 1.0, colorG: 1.0, colorB: 1.0
            },
            chaotic: {
                iterations: 25, coordScale: 0.3, rotationSpeed: 2.0,
                stabilization: 20, waveFreq: 2.0, brightness: 0.8,
                saturation: 1.5, colorR: 1.2, colorG: 0.8, colorB: 1.1
            },
            minimal: {
                iterations: 10, coordScale: 0.25, rotationSpeed: 0.8,
                stabilization: 30, waveFreq: 0.8, brightness: 1.0,
                saturation: 0.8, colorR: 1.0, colorG: 1.0, colorB: 1.0
            }
        };

        const p = presets[preset];
        if (!p) return;

        // Update all controls
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
        document.getElementById('control-panel').classList.remove('open');
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    toggleMathOverlay() {
        const overlay = document.getElementById('math-overlay');
        overlay.classList.toggle('open');
    }
}

// Global app instance
let app;

// UI Control Functions
function toggleControlPanel() {
    const panel = document.getElementById('control-panel');
    panel.classList.toggle('open');
}

function closeControlPanel() {
    document.getElementById('control-panel').classList.remove('open');
}

function toggleMathOverlay() {
    const overlay = document.getElementById('math-overlay');
    overlay.classList.toggle('open');
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
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
        document.getElementById('math-overlay').classList.add('open');
    }, 1000);
});

// Keyboard shortcuts help
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
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
    }
});

// Make functions globally available
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
