/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CameraFeed } from './components/CameraFeed.tsx';
import { HoloHUD } from './components/HoloHUD.tsx';
import { EcosystemScene } from './three/EcosystemScene.ts';
import { EcosystemStage } from './three/GrowthManager.ts';
import * as THREE from 'three';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<EcosystemScene | null>(null);

  const [currentStage, setCurrentStage] = useState<EcosystemStage>('scanning');
  const [stageLabel, setStageLabel] = useState<string>('Busca una superficie…');
  const [stageHint, setStageHint] = useState<string>('Apunta la cámara hacia el suelo');
  const [isProtoLumaMode, setIsProtoLumaMode] = useState<boolean>(false);
  const [interactionFeedback, setInteractionFeedback] = useState<string | null>(null);
  const feedbackTimeout = useRef<number | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new EcosystemScene(containerRef.current);
    sceneRef.current = scene;

    // Hook stage changes from GrowthManager
    scene.growth.onStageChange = (newStage, label, hint) => {
      setCurrentStage(newStage);
      setStageLabel(label);
      setStageHint(hint);
    };

    // Auto-detect floor after 2.8s of scanning if user hasn't tapped yet
    const autoScanTimer = setTimeout(() => {
      if (scene.growth.currentStage === 'scanning') {
        const defaultFloorPos = new THREE.Vector3(0, 0, -1.5);
        scene.reticle.setPositionAndNormal(defaultFloorPos);
        scene.reticle.group.visible = true;
        scene.reticle.triggerLock();
        scene.growth.triggerSurfaceDetected(defaultFloorPos);
      }
    }, 3200);

    return () => {
      clearTimeout(autoScanTimer);
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  const triggerFeedback = useCallback((text: string) => {
    setInteractionFeedback(text);
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = window.setTimeout(() => {
      setInteractionFeedback(null);
    }, 2400);
  }, []);

  // Handle pointer interactions on the 3D scene
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!sceneRef.current) return;

    const res = sceneRef.current.handleInteraction(e.clientX, e.clientY);

    switch (res.hitType) {
      case 'plant':
        triggerFeedback('🌱 Planta energizada • Pulso vital emitido');
        break;
      case 'water':
        triggerFeedback('💧 Onda concéntrica generada en el estanque');
        break;
      case 'tree':
        triggerFeedback('🌳 Árbol agitado • Hojas holográficas cayendo');
        break;
      case 'butterfly':
        triggerFeedback('🦋 Mariposa evasiva • Alzando vuelo');
        break;
      case 'ground':
        if (sceneRef.current.growth.currentStage !== 'scanning') {
          triggerFeedback('✨ Nuevo brote germinado en el suelo');
        }
        break;
      default:
        break;
    }
  }, [triggerFeedback]);

  // Pointer move updates scanning reticle
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!sceneRef.current) return;
    sceneRef.current.updateScanningRaycast(e.clientX, e.clientY);
  }, []);

  const handleToggleProtoLuma = useCallback(() => {
    setIsProtoLumaMode((prev) => {
      const next = !prev;
      sceneRef.current?.setProtoLumaMode(next);
      return next;
    });
  }, []);

  const handleRestart = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.resetAll();
    triggerFeedback('Ecosistema reiniciado • Buscando superficie');
  }, [triggerFeedback]);

  const handleSelectStage = useCallback((stage: EcosystemStage) => {
    if (!sceneRef.current) return;
    if (stage === 'scanning') {
      handleRestart();
      return;
    }

    // Ensure reticle is locked at floor
    if (sceneRef.current.growth.currentStage === 'scanning') {
      const defaultFloorPos = new THREE.Vector3(0, 0, -1.5);
      sceneRef.current.growth.setAnchor(defaultFloorPos);
      sceneRef.current.reticle.triggerLock();
    }

    sceneRef.current.growth.setStage(stage);
  }, [handleRestart]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      {/* 1. Live Camera Feed (or Holographic Space Fallback) */}
      <CameraFeed isProtoLumaMode={isProtoLumaMode} />

      {/* 2. WebGL 3D Canvas Layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full pointer-events-auto z-10"
      />

      {/* 3. Proto Luma Boundary Grid Lines (When Active) */}
      {isProtoLumaMode && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="w-[88vw] max-w-[480px] h-[92vh] border-2 border-emerald-400/40 rounded-3xl relative shadow-[0_0_50px_rgba(52,211,153,0.15)] flex flex-col justify-between p-4">
            <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400/70 uppercase">
              <span>H: 223.5 CM</span>
              <span>PROTO LUMA MARGIN</span>
              <span>W: 127.6 CM</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400/70 uppercase">
              <span>D: 60.3 CM</span>
              <span>ESCALA HOLOGRÁFICA 1:1</span>
              <span>ANCLAJE SUELO 0 CM</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Museum Installation HUD Overlay */}
      <HoloHUD
        stage={currentStage}
        stageLabel={stageLabel}
        stageHint={stageHint}
        isProtoLumaMode={isProtoLumaMode}
        onToggleProtoLuma={handleToggleProtoLuma}
        onRestart={handleRestart}
        onSelectStage={handleSelectStage}
        interactionFeedback={interactionFeedback}
      />
    </div>
  );
}
