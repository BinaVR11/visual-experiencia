import * as THREE from 'three';

export interface TreeGrowthStage {
  seedProgress: number;   // 0 -> 1: Seed drops/sparks on ground
  trunkProgress: number;  // 0 -> 1: Trunk extrudes upward
  branchProgress: number; // 0 -> 1: Branches expand
  canopyProgress: number; // 0 -> 1: Holographic leaves blossom
}

export class HolographicTree {
  public group: THREE.Group;
  public trunkMesh: THREE.Mesh;
  public branchesGroup: THREE.Group;
  public canopyGroup: THREE.Group;
  public seedMesh: THREE.Mesh;

  public growth: TreeGrowthStage = {
    seedProgress: 0,
    trunkProgress: 0,
    branchProgress: 0,
    canopyProgress: 0,
  };

  public isGrowing: boolean = false;
  public growthDuration: number = 4.5; // seconds for cinematic progression
  public growthTimer: number = 0;

  // Interaction shake
  public isShaking: boolean = false;
  public shakeTime: number = 0;

  public interactiveMeshes: THREE.Object3D[] = [];

  constructor(public x: number, public z: number, public heightScale: number = 1.0) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    // 1. Glowing Seed
    const seedGeom = new THREE.SphereGeometry(0.04, 12, 12);
    const seedMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });
    this.seedMesh = new THREE.Mesh(seedGeom, seedMat);
    this.seedMesh.position.set(0, 0.04, 0);
    this.group.add(this.seedMesh);

    // 2. Trunk (Cylinder with organic taper)
    // Proto Luma height is 223cm, so a tree height of ~1.2m - 1.6m is magnificent
    const trunkHeight = 1.1 * heightScale;
    const trunkGeom = new THREE.CylinderGeometry(0.04 * heightScale, 0.08 * heightScale, trunkHeight, 10);
    trunkGeom.translate(0, trunkHeight / 2, 0);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a2b, // Bioluminescent deep bark
      emissive: 0x064e3b,
      emissiveIntensity: 0.3,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    this.trunkMesh.scale.set(1, 0.001, 1);
    this.trunkMesh.visible = false;
    this.group.add(this.trunkMesh);

    // 3. Branches
    this.branchesGroup = new THREE.Group();
    this.branchesGroup.position.set(0, trunkHeight * 0.7, 0);
    this.branchesGroup.scale.set(0.001, 0.001, 0.001);
    this.group.add(this.branchesGroup);

    const branchCount = 4;
    const branchGeom = new THREE.CylinderGeometry(0.02 * heightScale, 0.035 * heightScale, 0.45 * heightScale, 6);
    branchGeom.translate(0, (0.45 * heightScale) / 2, 0);

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const branch = new THREE.Mesh(branchGeom, trunkMat);
      branch.rotation.y = angle;
      branch.rotation.z = 0.75 + Math.random() * 0.2;
      this.branchesGroup.add(branch);
    }

    // 4. Holographic Leaf Canopy Clusters (Emerald & Cyan Bioluminescence)
    this.canopyGroup = new THREE.Group();
    this.canopyGroup.position.set(0, trunkHeight * 0.95, 0);
    this.canopyGroup.scale.set(0.001, 0.001, 0.001);
    this.group.add(this.canopyGroup);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
      wireframe: false,
    });

    // Central crown & branch sub-crowns
    const crownClusters = [
      { x: 0, y: 0.2, z: 0, r: 0.42 },
      { x: 0.28, y: 0.08, z: 0.15, r: 0.32 },
      { x: -0.25, y: 0.12, z: -0.2, r: 0.34 },
      { x: 0.18, y: -0.05, z: -0.25, r: 0.3 },
      { x: -0.22, y: -0.02, z: 0.22, r: 0.3 },
      { x: 0, y: 0.45, z: 0, r: 0.26 },
    ];

    crownClusters.forEach((c) => {
      const clusterGeom = new THREE.DodecahedronGeometry(c.r * heightScale, 1);
      const clusterMesh = new THREE.Mesh(clusterGeom, canopyMat);
      clusterMesh.position.set(c.x * heightScale, c.y * heightScale, c.z * heightScale);
      this.canopyGroup.add(clusterMesh);
      this.interactiveMeshes.push(clusterMesh);
    });

    this.interactiveMeshes.push(this.trunkMesh);

    // Tag for raycasting
    this.interactiveMeshes.forEach((m) => {
      m.userData = { tree: this };
    });
  }

  public startGrowth() {
    this.isGrowing = true;
    this.growthTimer = 0;
  }

  public triggerShake() {
    this.isShaking = true;
    this.shakeTime = 0;
  }

  public update(time: number, delta: number) {
    if (this.isGrowing) {
      this.growthTimer += delta;
      const progress = Math.min(this.growthTimer / this.growthDuration, 1.0);

      // Phase 1: Seed drops and glows (0.0 -> 0.2)
      if (progress < 0.25) {
        const p1 = progress / 0.25;
        this.seedMesh.visible = true;
        const seedScale = Math.sin(p1 * Math.PI) * 1.5 + 0.5;
        this.seedMesh.scale.set(seedScale, seedScale, seedScale);
      } else {
        // Seed dissolves into ground
        const seedFade = 1.0 - (progress - 0.25) / 0.15;
        if (seedFade <= 0) {
          this.seedMesh.visible = false;
        } else {
          this.seedMesh.scale.set(seedFade, seedFade, seedFade);
        }
      }

      // Phase 2: Trunk rises from ground (0.2 -> 0.6)
      if (progress >= 0.2) {
        this.trunkMesh.visible = true;
        const trunkProg = Math.min((progress - 0.2) / 0.4, 1.0);
        // Smooth ease out cubic
        const easedTrunk = 1 - Math.pow(1 - trunkProg, 3);
        this.trunkMesh.scale.set(1, easedTrunk, 1);
      }

      // Phase 3: Branches emerge (0.45 -> 0.8)
      if (progress >= 0.45) {
        const branchProg = Math.min((progress - 0.45) / 0.35, 1.0);
        const easedBranch = 1 - Math.pow(1 - branchProg, 3);
        this.branchesGroup.scale.set(easedBranch, easedBranch, easedBranch);
      }

      // Phase 4: Canopy blooms with spring overshoot (0.65 -> 1.0)
      if (progress >= 0.65) {
        const canopyProg = Math.min((progress - 0.65) / 0.35, 1.0);
        // Elastic/spring bounce
        const spring = Math.sin(canopyProg * Math.PI * 0.5) * (1 + 0.15 * Math.sin(canopyProg * Math.PI * 2) * (1 - canopyProg));
        this.canopyGroup.scale.set(spring, spring, spring);
      }

      if (progress >= 1.0) {
        this.isGrowing = false;
        this.trunkMesh.scale.set(1, 1, 1);
        this.branchesGroup.scale.set(1, 1, 1);
        this.canopyGroup.scale.set(1, 1, 1);
      }
    }

    // Interactive shake
    let shakeOffset = 0;
    if (this.isShaking) {
      this.shakeTime += delta;
      shakeOffset = Math.sin(this.shakeTime * 25) * 0.12 * Math.exp(-this.shakeTime * 3.5);
      if (this.shakeTime > 1.2) {
        this.isShaking = false;
        this.shakeTime = 0;
      }
    }

    // Ambient gentle breeze sway
    const ambientSway = Math.sin(time * 1.5 + this.x * 2) * 0.025;
    this.group.rotation.z = ambientSway + shakeOffset;
    this.group.rotation.x = Math.cos(time * 1.2 + this.z * 2) * 0.02;
  }
}

export class TreeManager {
  public group: THREE.Group;
  public trees: HolographicTree[] = [];

  constructor() {
    this.group = new THREE.Group();
  }

  public addTree(x: number, z: number, heightScale: number = 1.0): HolographicTree {
    const tree = new HolographicTree(x, z, heightScale);
    this.group.add(tree.group);
    this.trees.push(tree);
    return tree;
  }

  public update(time: number, delta: number) {
    for (const tree of this.trees) {
      tree.update(time, delta);
    }
  }

  public clear() {
    for (const tree of this.trees) {
      this.group.remove(tree.group);
    }
    this.trees = [];
  }
}
