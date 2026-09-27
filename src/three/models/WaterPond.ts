import * as THREE from 'three';

export interface RipplePoint {
  center: THREE.Vector2; // UV space or local coordinates
  time: number;
  maxRadius: number;
  strength: number;
}

export class WaterPond {
  public group: THREE.Group;
  public pondMesh: THREE.Mesh;
  public lilyGroup: THREE.Group;
  public dropMesh: THREE.Mesh;

  private ripples: RipplePoint[] = [];
  public isExpanding: boolean = false;
  private expandProgress: number = 0;
  public maxRadius: number = 0.65;
  private customMaterial: THREE.ShaderMaterial;

  constructor(public posX: number = 0, public posZ: number = 0) {
    this.group = new THREE.Group();
    this.group.position.set(posX, 0.005, posZ);

    // Initial Droplet that triggers the pond
    const dropGeom = new THREE.SphereGeometry(0.04, 12, 12);
    dropGeom.scale(0.8, 1.4, 0.8);
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.95,
    });
    this.dropMesh = new THREE.Mesh(dropGeom, dropMat);
    this.dropMesh.position.set(0, 0.5, 0);
    this.dropMesh.visible = false;
    this.group.add(this.dropMesh);

    // Pond geometry: high-tessellation circle for smooth wave vertex displacement
    const segments = 48;
    const geometry = new THREE.CircleGeometry(this.maxRadius, segments);
    geometry.rotateX(-Math.PI / 2);

    // Custom Holographic Water Shader with ripples & caustics
    this.customMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 }, // 0 to 1 expansion
        uRipples: { value: new Float32Array(16) }, // up to 4 ripples (x, z, radius, strength)
        uRippleCount: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x0369a1) },
        uShallowColor: { value: new THREE.Color(0x38bdf8) },
        uRimColor: { value: new THREE.Color(0x67e8f9) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uRipples[16];
        uniform int uRippleCount;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vDisplacement;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Scale with progress
          pos.xz *= uProgress;

          // Ambient gentle wave motion
          float dist = length(pos.xz);
          float ambientWave = sin(dist * 12.0 - uTime * 2.5) * 0.008;

          // Interactive ripples
          float rippleWave = 0.0;
          for (int i = 0; i < 4; i++) {
            if (i >= uRippleCount) break;
            vec2 center = vec2(uRipples[i * 4], uRipples[i * 4 + 1]);
            float rCurrent = uRipples[i * 4 + 2];
            float strength = uRipples[i * 4 + 3];

            float d = length(pos.xz - center);
            float diff = d - rCurrent;
            if (abs(diff) < 0.15 && rCurrent > 0.0) {
              rippleWave += sin(diff * 35.0) * strength * (1.0 - abs(diff) / 0.15);
            }
          }

          float totalHeight = (ambientWave + rippleWave) * uProgress;
          pos.y += totalHeight;
          vDisplacement = totalHeight;

          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uRimColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vDisplacement;

        void main() {
          if (uProgress <= 0.001) discard;

          vec2 centered = vUv - 0.5;
          float distFromCenter = length(centered) * 2.0;

          if (distFromCenter > 1.0) discard;

          // Organic edge falloff
          float edgeAlpha = smoothstep(1.0, 0.85, distFromCenter);

          // Caustic simulation
          float caustic1 = sin(vUv.x * 24.0 + uTime * 2.0) * sin(vUv.y * 24.0 + uTime * 2.5);
          float caustic2 = cos(vUv.x * 32.0 - uTime * 1.8) * cos(vUv.y * 32.0 - uTime * 2.2);
          float caustic = clamp((caustic1 + caustic2) * 0.5, 0.0, 1.0);

          // Color blend: deep at center, glowing turquoise at rim
          vec3 waterCol = mix(uDeepColor, uShallowColor, distFromCenter * 0.8);
          waterCol += uRimColor * caustic * 0.35;
          waterCol += uRimColor * (vDisplacement * 25.0); // wave crests highlight

          // Holographic rim glow
          float rimGlow = pow(distFromCenter, 4.0) * 0.6;
          waterCol += uRimColor * rimGlow;

          float finalAlpha = edgeAlpha * 0.82;
          gl_FragColor = vec4(waterCol, finalAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.pondMesh = new THREE.Mesh(geometry, this.customMaterial);
    this.pondMesh.userData = { pond: this };
    this.group.add(this.pondMesh);

    // Floating Holographic Lotus Lily Pads
    this.lilyGroup = new THREE.Group();
    this.group.add(this.lilyGroup);

    const padGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.004, 16);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });

    const lotusFlowerGeom = new THREE.ConeGeometry(0.035, 0.05, 5);
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });

    const padPositions = [
      { x: 0.18, z: 0.12, s: 0.9 },
      { x: -0.22, z: -0.15, s: 1.1 },
      { x: -0.12, z: 0.22, s: 0.8 },
      { x: 0.25, z: -0.18, s: 0.75 },
    ];

    padPositions.forEach((pos) => {
      const pad = new THREE.Mesh(padGeom, padMat);
      pad.position.set(pos.x, 0.008, pos.z);
      pad.scale.set(pos.s, 1, pos.s);

      const flower = new THREE.Mesh(lotusFlowerGeom, lotusMat);
      flower.position.set(0, 0.025, 0);
      pad.add(flower);

      pad.userData = { pond: this };
      flower.userData = { pond: this };

      this.lilyGroup.add(pad);
    });

    this.lilyGroup.scale.set(0.001, 0.001, 0.001);
  }

  public startEmergence() {
    this.isExpanding = true;
    this.expandProgress = 0;
    this.dropMesh.visible = true;
    this.dropMesh.position.set(0, 0.6, 0);
  }

  /**
   * Add a circular ripple when user touches water
   */
  public addRipple(worldPos: THREE.Vector3) {
    const local = this.group.worldToLocal(worldPos.clone());
    this.ripples.push({
      center: new THREE.Vector2(local.x, local.z),
      time: 0,
      maxRadius: 0.7,
      strength: 0.022,
    });

    // Limit active ripples to 4
    if (this.ripples.length > 4) {
      this.ripples.shift();
    }
  }

  public update(time: number, delta: number) {
    this.customMaterial.uniforms.uTime.value = time;

    // Expansion sequence: Droplet falls then pond expands
    if (this.isExpanding) {
      this.expandProgress += delta * 0.7;

      if (this.expandProgress < 0.4) {
        // Droplet falling
        const dropT = this.expandProgress / 0.4;
        this.dropMesh.position.y = 0.6 * (1 - dropT * dropT);
      } else {
        this.dropMesh.visible = false;
        // Pond expanding with smooth elastic ease
        const pondT = Math.min((this.expandProgress - 0.4) / 0.6, 1.0);
        const smoothPond = 1 - Math.pow(1 - pondT, 3);
        this.customMaterial.uniforms.uProgress.value = smoothPond;

        const lilyScale = Math.max(0.001, (pondT - 0.3) / 0.7);
        this.lilyGroup.scale.set(lilyScale, lilyScale, lilyScale);

        if (pondT >= 1.0) {
          this.isExpanding = false;
          this.customMaterial.uniforms.uProgress.value = 1.0;
          this.lilyGroup.scale.set(1, 1, 1);
        }
      }
    }

    // Update ripples
    const rippleUniform = new Float32Array(16);
    let activeCount = 0;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rip = this.ripples[i];
      rip.time += delta;
      const currentRadius = rip.time * 0.6;
      const currentStrength = rip.strength * (1.0 - currentRadius / rip.maxRadius);

      if (currentRadius > rip.maxRadius || currentStrength <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }

      if (activeCount < 4) {
        rippleUniform[activeCount * 4] = rip.center.x;
        rippleUniform[activeCount * 4 + 1] = rip.center.y;
        rippleUniform[activeCount * 4 + 2] = currentRadius;
        rippleUniform[activeCount * 4 + 3] = currentStrength;
        activeCount++;
      }
    }

    this.customMaterial.uniforms.uRipples.value = rippleUniform;
    this.customMaterial.uniforms.uRippleCount.value = activeCount;

    // Floating bobbing motion for lilies
    for (let i = 0; i < this.lilyGroup.children.length; i++) {
      const child = this.lilyGroup.children[i];
      child.position.y = 0.008 + Math.sin(time * 2.5 + i * 1.5) * 0.003;
      child.rotation.y += 0.001;
    }
  }

  public reset() {
    this.isExpanding = false;
    this.expandProgress = 0;
    this.customMaterial.uniforms.uProgress.value = 0;
    this.dropMesh.visible = false;
    this.lilyGroup.scale.set(0.001, 0.001, 0.001);
    this.ripples = [];
  }
}
