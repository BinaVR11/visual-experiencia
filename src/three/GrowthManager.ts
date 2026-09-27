import * as THREE from 'three';
import { VegetationManager } from './models/Vegetation.ts';
import { TreeManager } from './models/Tree.ts';
import { WaterPond } from './models/WaterPond.ts';
import { FaunaManager } from './models/Fauna.ts';
import { ParticleSystem } from './models/ParticleSystem.ts';
import { sound } from '../audio/soundEngine.ts';

export type EcosystemStage = 
  | 'scanning'        // 0: Initial camera search
  | 'surface_detected'// Detected floor, locking reticle
  | 'stage1_life'     // First sprouts
  | 'stage2_vegetation'// Expanding flowers, ferns, grass
  | 'stage3_trees'    // Trees growing seed->trunk->branch->leaves
  | 'stage4_water'    // Pond expanding with ripples
  | 'stage5_fauna'    // Butterflies and fireflies
  | 'complete';       // Fully awakened ecosystem

export class GrowthManager {
  public currentStage: EcosystemStage = 'scanning';
  public stageTimer: number = 0;
  public autoAdvance: boolean = true;
  public onStageChange?: (stage: EcosystemStage, label: string, hint: string) => void;

  public anchorPosition: THREE.Vector3 = new THREE.Vector3(0, 0, -1.5);

  constructor(
    private vegManager: VegetationManager,
    private treeManager: TreeManager,
    private waterPond: WaterPond,
    private faunaManager: FaunaManager,
    private particleSystem: ParticleSystem
  ) {}

  public setAnchor(pos: THREE.Vector3) {
    this.anchorPosition.copy(pos);
    this.vegManager.group.position.copy(pos);
    this.treeManager.group.position.copy(pos);
    this.waterPond.group.position.set(pos.x - 0.25, pos.y, pos.z + 0.1);
    this.faunaManager.group.position.copy(pos);
  }

  /**
   * Surface detected trigger
   */
  public triggerSurfaceDetected(anchor: THREE.Vector3) {
    this.setAnchor(anchor);
    this.setStage('surface_detected');
    sound.playSurfaceLocked();

    // After ~1.2s start transformation
    this.stageTimer = 0;
  }

  public setStage(stage: EcosystemStage) {
    this.currentStage = stage;
    this.stageTimer = 0;

    let label = '';
    let hint = '';

    switch (stage) {
      case 'scanning':
        label = 'Busca una superficie…';
        hint = 'Apunta la cámara hacia el suelo';
        break;
      case 'surface_detected':
        label = 'Superficie detectada';
        hint = 'Anclando holograma en el espacio físico…';
        break;
      case 'stage1_life':
        label = 'Etapa 1 — El primer brote';
        hint = 'La vida surge desde las profundidades del suelo';
        this.executeStage1();
        break;
      case 'stage2_vegetation':
        label = 'Etapa 2 — Vegetación expansiva';
        hint = 'Flores bioluminiscentes y helechos pueblan el plano';
        this.executeStage2();
        break;
      case 'stage3_trees':
        label = 'Etapa 3 — Crecimiento de árboles';
        hint = 'Semilla → tronco → ramas → follaje holográfico';
        this.executeStage3();
        break;
      case 'stage4_water':
        label = 'Etapa 4 — Nacimiento del agua';
        hint = 'Un estanque cristalino con ondas luminosas';
        this.executeStage4();
        break;
      case 'stage5_fauna':
        label = 'Etapa 5 — Fauna y criaturas';
        hint = 'Mariposas y luciérnagas danzan en el aire';
        this.executeStage5();
        break;
      case 'complete':
        label = 'La naturaleza ha despertado.';
        hint = 'Toca cualquier planta, árbol, mariposa o estanque para interactuar';
        break;
    }

    if (this.onStageChange) {
      this.onStageChange(stage, label, hint);
    }
  }

  // --- STAGE EXECUTIONS ---

  private executeStage1() {
    sound.startAmbient();
    // 3 central sprouts
    const s1 = this.vegManager.addSprout(0, 0, 1.2);
    this.particleSystem.burst(new THREE.Vector3(this.anchorPosition.x, this.anchorPosition.y + 0.1, this.anchorPosition.z), 18);
    sound.playSproutSound(1.0);

    setTimeout(() => {
      this.vegManager.addSprout(0.35, -0.2, 0.9);
      sound.playSproutSound(1.2);
    }, 400);

    setTimeout(() => {
      this.vegManager.addSprout(-0.3, 0.25, 1.0);
      sound.playSproutSound(0.85);
    }, 850);
  }

  private executeStage2() {
    // Expand procedural vegetation outwards
    // Clusters of ferns & flowers
    const floraCoords = [
      { x: 0.55, z: 0.35, type: 'flower', scale: 1.1 },
      { x: -0.65, z: -0.3, type: 'fern', scale: 1.2 },
      { x: -0.45, z: 0.55, type: 'flower', scale: 0.95 },
      { x: 0.7, z: -0.4, type: 'fern', scale: 1.0 },
      { x: 0.15, z: 0.65, type: 'flower', scale: 1.05 },
      { x: -0.75, z: 0.2, type: 'fern', scale: 0.9 },
      { x: 0.4, z: -0.65, type: 'sprout', scale: 1.15 },
      { x: -0.2, z: -0.6, type: 'sprout', scale: 0.85 },
    ];

    floraCoords.forEach((item, index) => {
      setTimeout(() => {
        if (item.type === 'flower') {
          this.vegManager.addFlower(item.x, item.z, item.scale);
        } else if (item.type === 'fern') {
          this.vegManager.addFern(item.x, item.z, item.scale);
        } else {
          this.vegManager.addSprout(item.x, item.z, item.scale);
        }
        const burstPos = new THREE.Vector3(
          this.anchorPosition.x + item.x,
          this.anchorPosition.y + 0.05,
          this.anchorPosition.z + item.z
        );
        this.particleSystem.burst(burstPos, 14, item.type === 'flower' ? 0xf472b6 : 0x34d399);
        sound.playSproutSound(0.9 + Math.random() * 0.4);
      }, index * 220);
    });
  }

  private executeStage3() {
    // 2 Majestic trees sized to fill Proto Luma's 223cm height and 127cm width
    sound.playTreeGrowSound();

    const t1 = this.treeManager.addTree(0.65, -0.25, 1.25);
    t1.startGrowth();

    setTimeout(() => {
      const t2 = this.treeManager.addTree(-0.7, -0.35, 1.15);
      t2.startGrowth();
    }, 700);

    // Particle rain of magical seeds
    this.particleSystem.burst(
      new THREE.Vector3(this.anchorPosition.x + 0.65, this.anchorPosition.y + 0.1, this.anchorPosition.z - 0.25),
      25,
      0xfacc15
    );
  }

  private executeStage4() {
    // Luminous pond emergence
    sound.playWaterRipple(520);
    this.waterPond.startEmergence();

    setTimeout(() => {
      sound.playWaterRipple(720);
    }, 600);
  }

  private executeStage5() {
    // Spawn butterflies and fireflies
    this.faunaManager.spawnCreatures(this.anchorPosition);
    sound.playButterflyTouch();
  }

  public update(delta: number) {
    this.stageTimer += delta;

    // Automatic progressive flow
    if (this.autoAdvance) {
      if (this.currentStage === 'surface_detected' && this.stageTimer > 1.1) {
        this.setStage('stage1_life');
      } else if (this.currentStage === 'stage1_life' && this.stageTimer > 3.0) {
        this.setStage('stage2_vegetation');
      } else if (this.currentStage === 'stage2_vegetation' && this.stageTimer > 3.5) {
        this.setStage('stage3_trees');
      } else if (this.currentStage === 'stage3_trees' && this.stageTimer > 4.6) {
        this.setStage('stage4_water');
      } else if (this.currentStage === 'stage4_water' && this.stageTimer > 3.2) {
        this.setStage('stage5_fauna');
      } else if (this.currentStage === 'stage5_fauna' && this.stageTimer > 3.0) {
        this.setStage('complete');
      }
    }

    // Ambient spore emissions in later stages
    if (this.currentStage !== 'scanning' && this.currentStage !== 'surface_detected') {
      if (Math.random() < 0.2) {
        this.particleSystem.spawnAmbientSpore(this.anchorPosition, 1.4);
      }
    }
  }

  public reset() {
    this.vegManager.clear();
    this.treeManager.clear();
    this.waterPond.reset();
    this.faunaManager.clear();
    this.particleSystem.reset();
    this.setStage('scanning');
  }
}
