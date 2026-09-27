import * as THREE from 'three';

export interface FloatingParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
}

export class ParticleSystem {
  public group: THREE.Group;
  private maxParticles: number = 350;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private particlesData: FloatingParticle[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Create a circular soft particle texture procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(110, 231, 183, 0.8)');
    gradient.addColorStop(0.7, 'rgba(52, 211, 153, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(this.geometry, this.material);
    this.group.add(points);

    // Initialize inactive particles
    for (let i = 0; i < this.maxParticles; i++) {
      this.particlesData.push({
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(0.2, 0.9, 0.6),
        size: 0,
        alpha: 0,
        maxLife: 1,
        life: 0,
      });
      this.sizes[i] = 0;
    }
  }

  /** Spawn an ambient floating spore / energy ember */
  public spawnAmbientSpore(center: THREE.Vector3, radius: number = 1.2) {
    const p = this.getFreeParticle();
    if (!p) return;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    p.pos.set(
      center.x + Math.cos(angle) * r,
      center.y + Math.random() * 0.1,
      center.z + Math.sin(angle) * r
    );
    p.vel.set(
      (Math.random() - 0.5) * 0.006,
      0.008 + Math.random() * 0.012,
      (Math.random() - 0.5) * 0.006
    );
    p.maxLife = 3 + Math.random() * 4;
    p.life = p.maxLife;
    p.size = 0.04 + Math.random() * 0.05;

    // Emerald / Cyan / Golden pollen
    const hueChoice = Math.random();
    if (hueChoice < 0.6) {
      p.color.setHSL(0.42 + Math.random() * 0.1, 0.9, 0.7); // Emerald/Teal
    } else if (hueChoice < 0.85) {
      p.color.setHSL(0.12 + Math.random() * 0.05, 0.9, 0.65); // Warm Gold
    } else {
      p.color.setHSL(0.55 + Math.random() * 0.08, 0.9, 0.75); // Ethereal Cyan
    }
  }

  /** Burst of particles when a plant sprouts or is tapped */
  public burst(origin: THREE.Vector3, count: number = 20, colorHex: number = 0x34d399) {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.pos.copy(origin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 0.02 + Math.random() * 0.045;

      p.vel.set(
        Math.cos(theta) * Math.sin(phi) * speed,
        Math.cos(phi) * speed + 0.01,
        Math.sin(theta) * Math.sin(phi) * speed
      );

      p.maxLife = 0.8 + Math.random() * 0.8;
      p.life = p.maxLife;
      p.size = 0.06 + Math.random() * 0.06;
      p.color.setHex(colorHex);
    }
  }

  /** Splash drops for water interaction */
  public splash(origin: THREE.Vector3, count: number = 18) {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.pos.set(origin.x + (Math.random() - 0.5) * 0.05, origin.y + 0.02, origin.z + (Math.random() - 0.5) * 0.05);
      const angle = Math.random() * Math.PI * 2;
      const hSpeed = 0.015 + Math.random() * 0.035;

      p.vel.set(
        Math.cos(angle) * hSpeed,
        0.04 + Math.random() * 0.05,
        Math.sin(angle) * hSpeed
      );

      p.maxLife = 0.6 + Math.random() * 0.5;
      p.life = p.maxLife;
      p.size = 0.05 + Math.random() * 0.04;
      p.color.setHex(0x38bdf8); // Cyan water splash
    }
  }

  /** Falling leaves when a tree is tapped */
  public dropLeaves(origin: THREE.Vector3, count: number = 14) {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.pos.set(
        origin.x + (Math.random() - 0.5) * 0.5,
        origin.y + 0.6 + Math.random() * 0.4,
        origin.z + (Math.random() - 0.5) * 0.5
      );

      p.vel.set(
        (Math.random() - 0.5) * 0.01,
        -0.012 - Math.random() * 0.015,
        (Math.random() - 0.5) * 0.01
      );

      p.maxLife = 2.0 + Math.random() * 1.5;
      p.life = p.maxLife;
      p.size = 0.07 + Math.random() * 0.05;
      p.color.setHex(0xa7f3d0); // Light mint leaf
    }
  }

  private getFreeParticle(): FloatingParticle | null {
    for (const p of this.particlesData) {
      if (p.life <= 0) return p;
    }
    return null;
  }

  public update(delta: number) {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < this.particlesData.length; i++) {
      const p = this.particlesData[i];
      if (p.life > 0) {
        p.life -= delta;
        p.pos.addScaledVector(p.vel, delta * 60);

        // Gentle drag & wind sway
        p.vel.x += Math.sin(p.pos.y * 5 + p.life * 4) * 0.0003;
        p.vel.z += Math.cos(p.pos.y * 5 + p.life * 4) * 0.0003;

        const lifeRatio = p.life / p.maxLife;
        const currentSize = p.size * Math.sin(lifeRatio * Math.PI);

        this.positions[i * 3] = p.pos.x;
        this.positions[i * 3 + 1] = p.pos.y;
        this.positions[i * 3 + 2] = p.pos.z;

        this.colors[i * 3] = p.color.r * lifeRatio;
        this.colors[i * 3 + 1] = p.color.g * lifeRatio;
        this.colors[i * 3 + 2] = p.color.b * lifeRatio;

        this.sizes[i] = currentSize;
      } else {
        this.positions[i * 3 + 1] = -999;
        this.sizes[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  public reset() {
    for (let i = 0; i < this.particlesData.length; i++) {
      this.particlesData[i].life = 0;
      this.positions[i * 3 + 1] = -999;
      this.sizes[i] = 0;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }
}
