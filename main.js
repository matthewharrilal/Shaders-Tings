// main.js
import * as THREE from 'three';
import { createShadertoyMesh } from './shadertoyShader.js';

let renderer, scene, camera, mesh, start;

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const container = document.getElementById('container');
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  mesh = createShadertoyMesh();
  scene.add(mesh);

  onResize();
  window.addEventListener('resize', onResize);

  start = performance.now();
}

function onResize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  
  // Update shader resolution
  if (mesh && mesh.material && mesh.material.uniforms && mesh.material.uniforms.iResolution) {
    mesh.material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, dpr);
  }
}

function animate() {
  const t = (performance.now() - start) * 0.001;
  
  // Update shader time
  if (mesh && mesh.material && mesh.material.uniforms && mesh.material.uniforms.iTime) {
    mesh.material.uniforms.iTime.value = t;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
