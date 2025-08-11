// shadertoyShader.js
import * as THREE from 'three';

export function createShadertoyMesh() {
  const geometry = new THREE.PlaneGeometry(2, 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      
      uniform float iTime;
      uniform vec3 iResolution;
      uniform vec4 iMouse;

      void main() {
        vec2 u = gl_FragCoord.xy;
        vec2 v = iResolution.xy;
        
        // Convert to Nguyen2007 coordinate system
        u = 0.2 * (u + u - v) / v.y;
        
        vec4 z = vec4(1.0, 2.0, 3.0, 0.0);
        vec4 o = z;
        
        for (float a = 0.5, t = iTime, i = 0.0; 
             i < 19.0; 
             i++) {
            
            o += (1.0 + cos(z + t)) 
               / length((1.0 + i * dot(v, v)) 
                      * sin(1.5 * u / (0.5 - dot(u, u)) - 9.0 * u.yx + t));
            
            v = cos(++t - 7.0 * u * pow(a += 0.03, i)) - 5.0 * u;
            
            // Matrix transformation
            u *= mat2(cos(i + 0.02 * t - vec4(0.0, 11.0, 33.0, 0.0)));
            
            u += tanh(40.0 * dot(u, u)) 
                 * cos(100.0 * u.yx + t) / 200.0
                 + 0.2 * a * u
                 + cos(4.0 / exp(dot(o, o) / 100.0) + t) / 300.0;
        }
        
        // Final color calculation
        o = 25.6 / (min(o, 13.0) + 164.0 / o) 
          - dot(u, u) / 250.0;
        
        // Ensure output is in valid range
        o = clamp(o, 0.0, 1.0);
        
        gl_FragColor = o;
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}
