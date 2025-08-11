# Three.js Shader Project

A stunning Three.js project featuring two advanced shaders with real-time blending capabilities, inspired by Shadertoy and modern particle systems.

## ✨ Features

### 🎨 Dual Shader System
- **Particle System Shader**: Interactive 3D particle formations with mouse interaction
- **Shadertoy-inspired Shader**: Ray-marching based procedural geometry with noise and fractals
- **Real-time Blending**: Seamlessly blend between both shaders using interactive controls

### 🌟 Particle System Features
- **5 Dynamic Patterns**: Cosmic Sphere, Spiral Nebula, Quantum Helix, Stardust Grid, Celestial Torus
- **Interactive Particles**: Mouse movement affects particle behavior with repulsion effects
- **Smooth Transitions**: Elegant morphing between different particle formations
- **Advanced Rendering**: Multiple particle types with different visual effects
- **Color Palettes**: Unique color schemes for each pattern

### 🚀 Shadertoy Shader Features
- **Ray Marching**: Advanced distance field rendering
- **Procedural Geometry**: Dynamic spheres with noise-based positioning
- **Real-time Animation**: Continuous rotation and movement
- **Starfield Background**: Procedural star generation with twinkling effects
- **Post-processing**: Bloom effects and gamma correction

### 🎮 Interactive Controls
- **Pattern Switching**: Click/tap to cycle through particle patterns
- **Shader Blending**: Use sliders to blend between shaders
- **Quick Toggle**: Button to instantly switch between shader modes
- **Mouse Interaction**: Particles respond to cursor movement
- **Touch Support**: Full mobile and tablet compatibility

### 🎬 Visual Effects
- **Unreal Bloom**: Professional-grade bloom post-processing
- **Starfield Background**: 6000 animated stars with twinkling
- **Smooth Camera**: Orbiting camera with subtle movement
- **Responsive Design**: Adapts to any screen size
- **High Performance**: Optimized for smooth 60fps rendering

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Node.js (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd threejs-shader-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

### Build for Production
```bash
npm run build
npm run preview
```

## 🎯 Usage

### Basic Controls
- **Mouse Movement**: Particles react to cursor position
- **Click/Tap**: Change particle patterns
- **Shader Sliders**: Blend between particle system and Shadertoy shader
- **Toggle Button**: Quick switch between shader modes

### Advanced Features
- **Pattern Transitions**: Watch particles smoothly morph between formations
- **Interactive Particles**: Observe how particles repel from mouse cursor
- **Real-time Blending**: Create unique visual combinations of both shaders
- **Camera Animation**: Enjoy the subtle orbiting camera movement

## 🏗️ Project Structure

```
threejs-shader-project/
├── index.html          # Main HTML file with UI controls
├── main.js            # Core Three.js application and shaders
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## 🔧 Technical Details

### Shader Architecture
- **Vertex Shaders**: Handle particle positioning and animation
- **Fragment Shaders**: Control particle appearance and effects
- **Uniforms**: Real-time parameters for animation and interaction
- **Attributes**: Particle-specific data (position, color, size, type)

### Performance Optimizations
- **Buffer Geometry**: Efficient GPU memory usage
- **Instanced Rendering**: Single draw call for thousands of particles
- **Frustum Culling**: Only render visible particles
- **Level of Detail**: Adaptive particle sizing based on distance

### Browser Compatibility
- **WebGL 2.0**: Modern graphics capabilities
- **ES6 Modules**: Modern JavaScript features
- **Touch Events**: Mobile and tablet support
- **Responsive Design**: Adapts to any screen size

## 🎨 Customization

### Adding New Patterns
1. Create a new pattern function in `main.js`
2. Add it to the `patterns` array
3. Create a corresponding color palette
4. Add the pattern name to `patternNames`

### Modifying Shaders
1. Edit the GLSL code in the shader materials
2. Adjust uniforms for different effects
3. Modify fragment shaders for new visual styles
4. Experiment with different blending modes

### Performance Tuning
- Adjust `particleCount` for different performance levels
- Modify `starCount` for background complexity
- Tune `transitionSpeed` for animation timing
- Optimize shader complexity based on target devices

## 🌟 Inspiration

This project draws inspiration from:
- **Shadertoy**: Procedural graphics and ray marching techniques
- **Three.js Examples**: Advanced particle systems and post-processing
- **Modern WebGL**: Real-time graphics and interactive experiences
- **Creative Coding**: Experimental visual effects and animations

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add new particle patterns
- Improve shader effects
- Optimize performance
- Enhance the UI/UX
- Fix bugs and issues

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Three.js Team**: For the amazing 3D graphics library
- **Shadertoy Community**: For inspiration and shader techniques
- **WebGL Community**: For graphics programming knowledge
- **Creative Coders**: For pushing the boundaries of web graphics

---

**Enjoy exploring the infinite possibilities of real-time graphics!** 🚀✨
