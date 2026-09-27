import * as THREE from 'three';

export class HolographicButterfly {
  public group: THREE.Group;
  public leftWing: THREE.Mesh;
  public rightWing: THREE.Mesh;
  public bodyMesh: THREE.Mesh;

  public orbitCenter: THREE.Vector3;
  public orbitRadius: number;
  public orbitSpeed: number;
  public orbitAngle: number;
  public flightHeight: number;
  public heightWaveSpeed: number;
  public isEvasive: boolean = false;
  private evasiveTimer: number = 0;

  constructor(orbitCenter: THREE.Vector3, radius: number = 0.8, colorHex: number = 0x38bdf8) {
    this.group = new THREE.Group();
    this.orbitCenter = orbitCenter.clone();
    this.orbitRadius = radius;
    this.orbitSpeed = 0.8 + Math.random() * 0.4;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.flightHeight = 0.4 + Math.random() * 0.6;
    this.heightWaveSpeed = 2.0 + Math.random() * 1.5;

    // Wings geometry & material
    const wingGeom = new THREE.PlaneGeometry(0.08, 0.09);
    wingGeom.translate(0.04, 0, 0); // pivot at root

    const wingMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    this.rightWing = new THREE.Mesh(wingGeom, wingMat);
    this.group.add(this.rightWing);

    const leftWingGeom = wingGeom.clone();
    leftWingGeom.scale(-1, 1, 1);
    this.leftWing = new THREE.Mesh(leftWingGeom, wingMat);
    this.group.add(this.leftWing);

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.006, 0.008, 0.07, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    this.bodyMesh.rotation.x = Math.PI / 2;
    this.group.add(this.bodyMesh);

    // Glow halo
    const haloGeom = new THREE.SphereGeometry(0.02, 6, 6);
    const haloMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.6,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    this.group.add(halo);

    // Tag for raycasting
    this.leftWing.userData = { butterfly: this };
    this.rightWing.userData = { butterfly: this };
    this.bodyMesh.userData = { butterfly: this };
  }

  public triggerEscape() {
    this.isEvasive = true;
    this.evasiveTimer = 0;
    this.orbitSpeed = 2.8;
  }

  public update(time: number, delta: number) {
    if (this.isEvasive) {
      this.evasiveTimer += delta;
      this.flightHeight += delta * 0.4;
      if (this.evasiveTimer > 2.2) {
        this.isEvasive = false;
        this.orbitSpeed = 0.8 + Math.random() * 0.4;
        this.flightHeight = 0.5 + Math.random() * 0.4;
      }
    }

    // Orbit path around trees/plants
    this.orbitAngle += this.orbitSpeed * delta;
    const currentR = this.orbitRadius + Math.sin(time * 0.8 + this.orbitAngle) * 0.15;
    const targetX = this.orbitCenter.x + Math.cos(this.orbitAngle) * currentR;
    const targetZ = this.orbitCenter.z + Math.sin(this.orbitAngle) * currentR;
    const targetY = this.flightHeight + Math.sin(time * this.heightWaveSpeed) * 0.08;

    // Calculate heading direction
    const prevPos = this.group.position.clone();
    this.group.position.set(targetX, targetY, targetZ);
    const moveDir = this.group.position.clone().sub(prevPos);

    if (moveDir.lengthSq() > 0.00001) {
      moveDir.normalize();
      const targetRotation = Math.atan2(-moveDir.z, moveDir.x);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRotation, 0.15);
      // Gentle banking
      this.group.rotation.z = Math.sin(time * 3) * 0.15;
    }

    // Wing flapping: 14Hz normal, 28Hz when evasive
    const flapFreq = this.isEvasive ? 32 : 14;
    const flapAngle = Math.sin(time * flapFreq) * 0.85;
    this.rightWing.rotation.z = flapAngle;
    this.leftWing.rotation.z = -flapAngle;
  }
}

export class FireflySwarm {
  public group: THREE.Group;
  private count: number = 24;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private data: {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    baseY: number;
    phase: number;
  }[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Circular soft glowing particle
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(254, 240, 138, 1)');
    g.addColorStop(0.3, 'rgba(250, 204, 21, 0.8)');
    g.addColorStop(0.7, 'rgba(52, 211, 153, 0.3)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);

    const tex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geom, mat);
    this.group.add(this.points);

    for (let i = 0; i < this.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 1.2;
      const y = 0.2 + Math.random() * 1.2;
      this.data.push({
        pos: new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.08),
        baseY: y,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public update(time: number, delta: number) {
    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.points.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      const d = this.data[i];

      // Smooth wandering
      d.pos.x += Math.sin(time * 0.7 + d.phase) * delta * 0.12;
      d.pos.z += Math.cos(time * 0.6 + d.phase) * delta * 0.12;
      d.pos.y = d.baseY + Math.sin(time * 1.5 + d.phase) * 0.15;

      this.positions[i * 3] = d.pos.x;
      this.positions[i * 3 + 1] = d.pos.y;
      this.positions[i * 3 + 2] = d.pos.z;

      // Pulsing bioluminescent glow
      const glow = 0.4 + 0.6 * Math.pow(Math.sin(time * 3.0 + d.phase), 4);
      this.colors[i * 3] = 0.95 * glow;
      this.colors[i * 3 + 1] = 0.85 * glow;
      this.colors[i * 3 + 2] = 0.25 * glow;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }
}

export class FaunaManager {
  public group: THREE.Group;
  public butterflies: HolographicButterfly[] = [];
  public fireflies: FireflySwarm | null = null;

  constructor() {
    this.group = new THREE.Group();
  }

  public spawnCreatures(center: THREE.Vector3) {
    this.clear();

    // Spawn 3 ethereal butterflies
    const colors = [0x38bdf8, 0xa855f7, 0xf472b6];
    for (let i = 0; i < 3; i++) {
      const b = new HolographicButterfly(center, 0.65 + i * 0.25, colors[i % colors.length]);
      this.group.add(b.group);
      this.butterflies.push(b);
    }

    // Spawn firefly swarm
    this.fireflies = new FireflySwarm();
    this.group.add(this.fireflies.group);
  }

  public update(time: number, delta: number) {
    for (const b of this.butterflies) {
      b.update(time, delta);
    }
    if (this.fireflies) {
      this.fireflies.update(time, delta);
    }
  }

  public clear() {
    for (const b of this.butterflies) {
      this.group.remove(b.group);
    }
    this.butterflies = [];
    if (this.fireflies) {
      this.group.remove(this.fireflies.group);
      this.fireflies = null;
    }
  }
}
