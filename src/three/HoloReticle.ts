import * as THREE from 'three';

export class HoloReticle {
  public group: THREE.Group;
  private outerRing: THREE.LineSegments;
  private innerRing: THREE.LineLoop;
  private centerCore: THREE.Mesh;
  private gridCircle: THREE.LineSegments;
  private pulseWave: THREE.Mesh;

  public isLocked: boolean = false;
  private lockProgress: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;

    // 1. Inner Ring (Smooth Cyan Circle)
    const innerPoints: THREE.Vector3[] = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      innerPoints.push(new THREE.Vector3(Math.cos(theta) * 0.22, 0, Math.sin(theta) * 0.22));
    }
    const innerGeom = new THREE.BufferGeometry().setFromPoints(innerPoints);
    const innerMat = new THREE.LineBasicMaterial({
      color: 0x34d399, // Emerald
      transparent: true,
      opacity: 0.85,
      linewidth: 2,
    });
    this.innerRing = new THREE.LineLoop(innerGeom, innerMat);
    this.group.add(this.innerRing);

    // 2. Outer Ring with holographic tick marks
    const outerPoints: THREE.Vector3[] = [];
    const ticks = 24;
    for (let i = 0; i < ticks; i++) {
      const angle = (i / ticks) * Math.PI * 2;
      const r1 = 0.38;
      const r2 = i % 4 === 0 ? 0.44 : 0.41;
      outerPoints.push(new THREE.Vector3(Math.cos(angle) * r1, 0, Math.sin(angle) * r1));
      outerPoints.push(new THREE.Vector3(Math.cos(angle) * r2, 0, Math.sin(angle) * r2));
    }
    const outerGeom = new THREE.BufferGeometry().setFromPoints(outerPoints);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8, // Cyan
      transparent: true,
      opacity: 0.7,
    });
    this.outerRing = new THREE.LineSegments(outerGeom, outerMat);
    this.group.add(this.outerRing);

    // 3. Polar Grid Lines
    const gridPoints: THREE.Vector3[] = [];
    // Cross lines
    gridPoints.push(new THREE.Vector3(-0.35, 0, 0), new THREE.Vector3(0.35, 0, 0));
    gridPoints.push(new THREE.Vector3(0, 0, -0.35), new THREE.Vector3(0, 0, 0.35));
    const gridGeom = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
    });
    this.gridCircle = new THREE.LineSegments(gridGeom, gridMat);
    this.group.add(this.gridCircle);

    // 4. Center Glowing Core Point
    const coreGeom = new THREE.SphereGeometry(0.02, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.9,
    });
    this.centerCore = new THREE.Mesh(coreGeom, coreMat);
    this.group.add(this.centerCore);

    // 5. Expandable confirmation pulse wave
    const waveGeom = new THREE.RingGeometry(0.1, 0.15, 32);
    waveGeom.rotateX(-Math.PI / 2);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.pulseWave = new THREE.Mesh(waveGeom, waveMat);
    this.group.add(this.pulseWave);
  }

  public setPositionAndNormal(pos: THREE.Vector3, normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0)) {
    this.group.position.copy(pos);
    // Align reticle's Y axis with the surface normal
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(up)) < 0.999) {
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
      this.group.setRotationFromQuaternion(quat);
    } else {
      this.group.rotation.set(0, 0, 0);
    }
  }

  public triggerLock() {
    this.isLocked = true;
    this.lockProgress = 0;
  }

  public update(time: number, delta: number) {
    if (!this.group.visible) return;

    // Counter-rotating rings
    this.outerRing.rotation.y = time * 0.45;
    this.innerRing.rotation.y = -time * 0.7;

    // Center pulse
    const pulse = 1.0 + Math.sin(time * 6) * 0.25;
    this.centerCore.scale.set(pulse, pulse, pulse);

    if (this.isLocked) {
      this.lockProgress += delta * 1.5;
      const p = Math.min(this.lockProgress, 1.0);

      // Expansion pulse wave
      const waveScale = 1.0 + p * 8.0;
      this.pulseWave.scale.set(waveScale, 1, waveScale);
      (this.pulseWave.material as THREE.MeshBasicMaterial).opacity = (1.0 - p) * 0.85;

      // Color flash to bright white-emerald
      (this.innerRing.material as THREE.LineBasicMaterial).color.setHex(0xa7f3d0);
      (this.outerRing.material as THREE.LineBasicMaterial).color.setHex(0xa7f3d0);

      if (p >= 1.0) {
        // Fade out reticle as ecosystem takes over
        this.group.visible = false;
      }
    } else {
      (this.pulseWave.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  public reset() {
    this.isLocked = false;
    this.lockProgress = 0;
    this.group.visible = false;
    (this.innerRing.material as THREE.LineBasicMaterial).color.setHex(0x34d399);
    (this.outerRing.material as THREE.LineBasicMaterial).color.setHex(0x38bdf8);
  }
}
