import * as THREE from 'three';

export interface PlantEntity {
  group: THREE.Group;
  type: 'sprout' | 'fern' | 'flower' | 'grass';
  baseScale: THREE.Vector3;
  targetScale: number;
  currentScale: number;
  bouncePhase: number;
  isBouncing: boolean;
  swayOffset: number;
  meshForRaycast: THREE.Object3D[];
}

export class VegetationManager {
  public group: THREE.Group;
  public plants: PlantEntity[] = [];

  // Shared holographic materials for optimal mobile performance
  private sproutStemMaterial: THREE.MeshStandardMaterial;
  private sproutLeafMaterial: THREE.MeshStandardMaterial;
  private flowerPetalMaterial: THREE.MeshStandardMaterial;
  private flowerCenterMaterial: THREE.MeshStandardMaterial;
  private fernMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();

    // Luminous emerald stem
    this.sproutStemMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.1,
    });

    // Vibrant jade leaf
    this.sproutLeafMaterial = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });

    // Bioluminescent ethereal flower petal
    this.flowerPetalMaterial = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    // Glowing stamen
    this.flowerCenterMaterial = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });

    // Ethereal cyan-tinted fern frond
    this.fernMaterial = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x065f46,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Spawn a young sprout (Stage 1)
   */
  public addSprout(x: number, z: number, scaleMultiplier: number = 1.0): PlantEntity {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0, z);

    // Stem: a curved small cylinder
    const stemGeom = new THREE.CylinderGeometry(0.008, 0.012, 0.15, 6);
    stemGeom.translate(0, 0.075, 0);
    const stem = new THREE.Mesh(stemGeom, this.sproutStemMaterial);
    stem.rotation.z = (Math.random() - 0.5) * 0.2;
    plantGroup.add(stem);

    // Two small cotyledon leaves
    const leafGeom = new THREE.ConeGeometry(0.035, 0.09, 5);
    leafGeom.scale(1, 0.2, 1);
    leafGeom.translate(0, 0.045, 0);

    const leaf1 = new THREE.Mesh(leafGeom, this.sproutLeafMaterial);
    leaf1.position.set(0, 0.14, 0);
    leaf1.rotation.set(0.6, 0, 0.7);
    plantGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeom, this.sproutLeafMaterial);
    leaf2.position.set(0, 0.14, 0);
    leaf2.rotation.set(-0.6, Math.PI, -0.7);
    plantGroup.add(leaf2);

    // Initial scale is 0 for pop up
    plantGroup.scale.set(0.001, 0.001, 0.001);
    this.group.add(plantGroup);

    const plant: PlantEntity = {
      group: plantGroup,
      type: 'sprout',
      baseScale: new THREE.Vector3(scaleMultiplier, scaleMultiplier, scaleMultiplier),
      targetScale: 1.0,
      currentScale: 0.001,
      bouncePhase: 0,
      isBouncing: true,
      swayOffset: Math.random() * Math.PI * 2,
      meshForRaycast: [stem, leaf1, leaf2],
    };

    // Tag userData for raycast identification
    stem.userData = { plant };
    leaf1.userData = { plant };
    leaf2.userData = { plant };

    this.plants.push(plant);
    return plant;
  }

  /**
   * Spawn a bioluminescent flower (Stage 2)
   */
  public addFlower(x: number, z: number, scaleMultiplier: number = 1.0): PlantEntity {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0, z);

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.009, 0.014, 0.22, 6);
    stemGeom.translate(0, 0.11, 0);
    const stem = new THREE.Mesh(stemGeom, this.sproutStemMaterial);
    plantGroup.add(stem);

    // Central glowing stamen
    const centerGeom = new THREE.SphereGeometry(0.025, 8, 8);
    centerGeom.translate(0, 0.22, 0);
    const center = new THREE.Mesh(centerGeom, this.flowerCenterMaterial);
    plantGroup.add(center);

    // 5 petals arranged in circle
    const petalGeom = new THREE.ConeGeometry(0.03, 0.08, 4);
    petalGeom.scale(1, 0.2, 1);
    petalGeom.translate(0, 0.04, 0);

    const petals: THREE.Mesh[] = [];
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeom, this.flowerPetalMaterial);
      petal.position.set(0, 0.22, 0);
      petal.rotation.y = angle;
      petal.rotation.x = 0.9;
      plantGroup.add(petal);
      petals.push(petal);
    }

    plantGroup.scale.set(0.001, 0.001, 0.001);
    this.group.add(plantGroup);

    const plant: PlantEntity = {
      group: plantGroup,
      type: 'flower',
      baseScale: new THREE.Vector3(scaleMultiplier, scaleMultiplier, scaleMultiplier),
      targetScale: 1.0,
      currentScale: 0.001,
      bouncePhase: 0,
      isBouncing: true,
      swayOffset: Math.random() * Math.PI * 2,
      meshForRaycast: [stem, center, ...petals],
    };

    [stem, center, ...petals].forEach((m) => {
      m.userData = { plant };
    });

    this.plants.push(plant);
    return plant;
  }

  /**
   * Spawn a fern frond cluster (Stage 2)
   */
  public addFern(x: number, z: number, scaleMultiplier: number = 1.0): PlantEntity {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0, z);

    const frondGeom = new THREE.ConeGeometry(0.045, 0.28, 5);
    frondGeom.scale(1, 0.15, 1);
    frondGeom.translate(0, 0.14, 0);

    const meshes: THREE.Mesh[] = [];
    const frondCount = 6;
    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const frond = new THREE.Mesh(frondGeom, this.fernMaterial);
      frond.rotation.y = angle;
      frond.rotation.x = 0.7 + Math.random() * 0.2;
      frond.scale.set(1, 0.8 + Math.random() * 0.4, 1);
      plantGroup.add(frond);
      meshes.push(frond);
    }

    plantGroup.scale.set(0.001, 0.001, 0.001);
    this.group.add(plantGroup);

    const plant: PlantEntity = {
      group: plantGroup,
      type: 'fern',
      baseScale: new THREE.Vector3(scaleMultiplier, scaleMultiplier, scaleMultiplier),
      targetScale: 1.0,
      currentScale: 0.001,
      bouncePhase: 0,
      isBouncing: true,
      swayOffset: Math.random() * Math.PI * 2,
      meshForRaycast: meshes,
    };

    meshes.forEach((m) => {
      m.userData = { plant };
    });

    this.plants.push(plant);
    return plant;
  }

  /**
   * Trigger interactive tap bounce & pulse
   */
  public touchPlant(plant: PlantEntity) {
    plant.isBouncing = true;
    plant.bouncePhase = 0;
  }

  public update(time: number, delta: number) {
    for (let i = 0; i < this.plants.length; i++) {
      const plant = this.plants[i];

      // Growth transition from 0 to 1 with spring bounce
      if (plant.currentScale < plant.targetScale) {
        plant.currentScale += delta * 2.8;
        if (plant.currentScale > plant.targetScale) {
          plant.currentScale = plant.targetScale;
        }
      }

      let extraScale = 1.0;
      if (plant.isBouncing) {
        plant.bouncePhase += delta * 12;
        extraScale += Math.sin(plant.bouncePhase) * 0.25 * Math.exp(-plant.bouncePhase * 0.2);
        if (plant.bouncePhase > Math.PI * 3) {
          plant.isBouncing = false;
          plant.bouncePhase = 0;
        }
      }

      const finalScale = plant.currentScale * extraScale;
      plant.group.scale.set(
        plant.baseScale.x * finalScale,
        plant.baseScale.y * finalScale,
        plant.baseScale.z * finalScale
      );

      // Subtle ambient wind sway
      const sway = Math.sin(time * 2.0 + plant.swayOffset) * 0.04;
      plant.group.rotation.z = sway;
      plant.group.rotation.x = Math.cos(time * 1.5 + plant.swayOffset) * 0.03;
    }
  }

  public clear() {
    for (const plant of this.plants) {
      this.group.remove(plant.group);
    }
    this.plants = [];
  }
}
