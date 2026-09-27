import * as THREE from 'three';
import { VegetationManager, PlantEntity } from './models/Vegetation.ts';
import { TreeManager, HolographicTree } from './models/Tree.ts';
import { WaterPond } from './models/WaterPond.ts';
import { FaunaManager, HolographicButterfly } from './models/Fauna.ts';
import { ParticleSystem } from './models/ParticleSystem.ts';
import { HoloReticle } from './HoloReticle.ts';
import { GrowthManager, EcosystemStage } from './GrowthManager.ts';
import { sound } from '../audio/soundEngine.ts';

export class EcosystemScene {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Subsystems
  public vegetation: VegetationManager;
  public trees: TreeManager;
  public water: WaterPond;
  public fauna: FaunaManager;
  public particles: ParticleSystem;
  public reticle: HoloReticle;
  public growth: GrowthManager;

  // Ground plane for raycasting and anchoring
  public groundPlane: THREE.Mesh;

  // Camera & Device motion
  private clock: THREE.Clock;
  private isRunning: boolean = true;
  private animFrameId: number | null = null;

  // Device orientation / gyro smoothing
  public targetCamRotX: number = -0.45; // slight downward tilt towards floor
  public targetCamRotY: number = 0;
  public currentCamRotX: number = -0.45;
  public currentCamRotY: number = 0;

  // Raycaster for interactions
  private raycaster: THREE.Raycaster;
  private mouseVec: THREE.Vector2;

  // Proto Luma display mode
  public isProtoLumaMode: boolean = false;
  private protoLumaFrame: THREE.LineSegments | null = null;

  constructor(private container: HTMLElement) {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    // Camera setup (placed at ~1.3m standing eye height looking down at ground at -1.6m)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.05, 50);
    this.camera.position.set(0, 1.25, 0.4);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = this.currentCamRotX;

    // Renderer with high dynamic range and transparent background for camera passthrough
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // Subtle atmospheric lighting
    this.setupLighting();

    // Ground plane (for raycasting and spatial anchoring)
    const groundGeom = new THREE.PlaneGeometry(25, 25);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshBasicMaterial({
      visible: false, // invisible physics/raycast plane
    });
    this.groundPlane = new THREE.Mesh(groundGeom, groundMat);
    this.groundPlane.position.y = 0;
    this.scene.add(this.groundPlane);

    // Systems
    this.vegetation = new VegetationManager();
    this.scene.add(this.vegetation.group);

    this.trees = new TreeManager();
    this.scene.add(this.trees.group);

    this.water = new WaterPond(0, 0);
    this.scene.add(this.water.group);

    this.fauna = new FaunaManager();
    this.scene.add(this.fauna.group);

    this.particles = new ParticleSystem();
    this.scene.add(this.particles.group);

    this.reticle = new HoloReticle();
    this.scene.add(this.reticle.group);

    this.growth = new GrowthManager(
      this.vegetation,
      this.trees,
      this.water,
      this.fauna,
      this.particles
    );

    // Setup Proto Luma 3D spatial holographic boundary (223.5cm x 127.6cm x 60.3cm)
    this.setupProtoLumaFrame();

    this.raycaster = new THREE.Raycaster();
    this.mouseVec = new THREE.Vector2();

    // Event listeners
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('deviceorientation', this.onDeviceOrientation, false);

    // Start loop
    this.animate();
  }

  private setupLighting() {
    // Holographic ambient fill
    const ambientLight = new THREE.AmbientLight(0x0a241e, 1.8);
    this.scene.add(ambientLight);

    // Soft celestial moonlight
    const dirLight = new THREE.DirectionalLight(0xa7f3d0, 1.4);
    dirLight.position.set(2, 6, 3);
    this.scene.add(dirLight);

    // Central bioluminescent point light for ground glow
    const pointLight = new THREE.PointLight(0x34d399, 2.0, 5);
    pointLight.position.set(0, 0.8, -1.5);
    this.scene.add(pointLight);

    // Secondary cyan accent
    const cyanLight = new THREE.PointLight(0x38bdf8, 1.5, 4);
    cyanLight.position.set(-0.6, 0.4, -1.2);
    this.scene.add(cyanLight);
  }

  private setupProtoLumaFrame() {
    // Proto Luma real dimensions: H: 2.235m, W: 1.276m, D: 0.603m
    const w = 1.276;
    const h = 2.235;
    const d = 0.603;

    const frameGeom = new THREE.BoxGeometry(w, h, d);
    frameGeom.translate(0, h / 2, 0); // floor base at 0

    const edges = new THREE.EdgesGeometry(frameGeom);
    const frameMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.35,
    });

    this.protoLumaFrame = new THREE.LineSegments(edges, frameMat);
    this.protoLumaFrame.position.set(0, 0, -1.5);
    this.protoLumaFrame.visible = false;
    this.scene.add(this.protoLumaFrame);
  }

  public setProtoLumaMode(active: boolean) {
    this.isProtoLumaMode = active;
    if (this.protoLumaFrame) {
      this.protoLumaFrame.visible = active;
    }
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta !== null && event.gamma !== null) {
      // Beta: front-to-back tilt [-180, 180]
      // Gamma: left-to-right tilt [-90, 90]
      const radBeta = (event.beta - 50) * (Math.PI / 180);
      const radGamma = event.gamma * (Math.PI / 180);

      this.targetCamRotX = THREE.MathUtils.clamp(-radBeta * 0.4, -0.9, -0.1);
      this.targetCamRotY = THREE.MathUtils.clamp(-radGamma * 0.4, -0.6, 0.6);
    }
  };

  /**
   * Primary touch/click raycast interaction handler
   */
  public handleInteraction(clientX: number, clientY: number): {
    hitType: 'plant' | 'tree' | 'water' | 'butterfly' | 'ground' | 'none';
    position?: THREE.Vector3;
  } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVec, this.camera);

    // If scanning, clicking selects/confirms the floor surface anchor!
    if (this.growth.currentStage === 'scanning') {
      const groundHits = this.raycaster.intersectObject(this.groundPlane);
      if (groundHits.length > 0) {
        const pt = groundHits[0].point;
        this.reticle.setPositionAndNormal(pt);
        this.reticle.group.visible = true;
        this.reticle.triggerLock();
        this.growth.triggerSurfaceDetected(pt);
        return { hitType: 'ground', position: pt };
      }
    }

    // 1. Check Butterflies
    for (const b of this.fauna.butterflies) {
      const bHits = this.raycaster.intersectObjects([b.leftWing, b.rightWing, b.bodyMesh]);
      if (bHits.length > 0) {
        b.triggerEscape();
        sound.playButterflyTouch();
        this.particles.burst(b.group.position, 16, 0x38bdf8);
        return { hitType: 'butterfly', position: b.group.position };
      }
    }

    // 2. Check Trees
    for (const t of this.trees.trees) {
      const tHits = this.raycaster.intersectObjects(t.interactiveMeshes);
      if (tHits.length > 0) {
        t.triggerShake();
        sound.playChime(660);
        this.particles.dropLeaves(t.group.position, 18);
        return { hitType: 'tree', position: t.group.position };
      }
    }

    // 3. Check Water Pond & Lilies
    const pondHits = this.raycaster.intersectObjects([this.water.pondMesh, ...this.water.lilyGroup.children], true);
    if (pondHits.length > 0) {
      const hitPt = pondHits[0].point;
      this.water.addRipple(hitPt);
      this.particles.splash(hitPt, 15);
      sound.playWaterRipple(580 + Math.random() * 200);
      return { hitType: 'water', position: hitPt };
    }

    // 4. Check Plants (Sprouts, Ferns, Flowers)
    for (const p of this.vegetation.plants) {
      const pHits = this.raycaster.intersectObjects(p.meshForRaycast);
      if (pHits.length > 0) {
        this.vegetation.touchPlant(p);
        const burstCol = p.type === 'flower' ? 0xf472b6 : 0x34d399;
        this.particles.burst(p.group.position, 14, burstCol);
        sound.playSproutSound(1.3);
        return { hitType: 'plant', position: p.group.position };
      }
    }

    // 5. Touch on empty ground -> Bloom an extra plant right there!
    const groundHits = this.raycaster.intersectObject(this.groundPlane);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;
      const localPt = this.vegetation.group.worldToLocal(pt.clone());
      const types = ['sprout', 'flower', 'fern'] as const;
      const chosen = types[Math.floor(Math.random() * types.length)];

      if (chosen === 'flower') {
        this.vegetation.addFlower(localPt.x, localPt.z, 0.9 + Math.random() * 0.3);
      } else if (chosen === 'fern') {
        this.vegetation.addFern(localPt.x, localPt.z, 0.8 + Math.random() * 0.4);
      } else {
        this.vegetation.addSprout(localPt.x, localPt.z, 0.9 + Math.random() * 0.4);
      }

      this.particles.burst(pt, 16, 0x34d399);
      sound.playSproutSound(1.0 + Math.random() * 0.5);
      return { hitType: 'ground', position: pt };
    }

    return { hitType: 'none' };
  }

  /**
   * Surface scanner loop during initial searching
   */
  public updateScanningRaycast(screenX: number, screenY: number) {
    if (this.growth.currentStage !== 'scanning') return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseVec.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVec, this.camera);
    const groundHits = this.raycaster.intersectObject(this.groundPlane);

    if (groundHits.length > 0) {
      const hit = groundHits[0];
      this.reticle.setPositionAndNormal(hit.point);
      this.reticle.group.visible = true;
    }
  }

  private animate = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Smooth gyro camera interpolation
    this.currentCamRotX = THREE.MathUtils.lerp(this.currentCamRotX, this.targetCamRotX, 0.08);
    this.currentCamRotY = THREE.MathUtils.lerp(this.currentCamRotY, this.targetCamRotY, 0.08);
    this.camera.rotation.x = this.currentCamRotX;
    this.camera.rotation.y = this.currentCamRotY;

    // Update subsystems
    this.growth.update(delta);
    this.vegetation.update(time, delta);
    this.trees.update(time, delta);
    this.water.update(time, delta);
    this.fauna.update(time, delta);
    this.particles.update(delta);
    this.reticle.update(time, delta);

    // Render frame
    this.renderer.render(this.scene, this.camera);
  };

  public resetAll() {
    this.growth.reset();
    this.reticle.reset();
    this.reticle.setPositionAndNormal(new THREE.Vector3(0, 0, -1.5));
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('deviceorientation', this.onDeviceOrientation);
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
