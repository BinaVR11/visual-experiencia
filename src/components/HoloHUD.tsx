import React, { useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Sparkles, Layers, Box, Info } from 'lucide-react';
import { EcosystemStage } from '../three/GrowthManager.ts';
import { sound } from '../audio/soundEngine.ts';

interface HoloHUDProps {
  stage: EcosystemStage;
  stageLabel: string;
  stageHint: string;
  isProtoLumaMode: boolean;
  onToggleProtoLuma: () => void;
  onRestart: () => void;
  onSelectStage: (stage: EcosystemStage) => void;
  interactionFeedback: string | null;
}

const STAGES: { id: EcosystemStage; label: string; icon: string }[] = [
  { id: 'scanning', label: 'Escaneo', icon: '🔍' },
  { id: 'stage1_life', label: 'Vida', icon: '🌱' },
  { id: 'stage2_vegetation', label: 'Vegetación', icon: '🌿' },
  { id: 'stage3_trees', label: 'Árboles', icon: '🌳' },
  { id: 'stage4_water', label: 'Agua', icon: '💧' },
  { id: 'stage5_fauna', label: 'Fauna', icon: '🦋' },
  { id: 'complete', label: 'Completo', icon: '✨' },
];

export const HoloHUD: React.FC<HoloHUDProps> = ({
  stage,
  stageLabel,
  stageHint,
  isProtoLumaMode,
  onToggleProtoLuma,
  onRestart,
  onSelectStage,
  interactionFeedback,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [showInfo, setShowInfo] = useState<boolean>(false);

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const isScanning = stage === 'scanning';
  const isDetected = stage === 'surface_detected';
  const isComplete = stage === 'complete';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 select-none z-30">
      {/* Top Header Bar: Museum Exhibition Title & Tech Controls */}
      <header className="flex items-start justify-between w-full">
        {/* Title & Brand */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-space text-[10px] md:text-xs tracking-widest text-emerald-400/90 uppercase">
              WebAR Spatial Experience • Proto Luma
            </span>
          </div>
          <h1 className="font-cinzel text-xl md:text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-teal-200 to-emerald-400 drop-shadow-[0_2px_12px_rgba(52,211,153,0.3)]">
            EL SUELO COBRA VIDA
          </h1>
          <p className="text-[11px] md:text-xs font-sans text-emerald-300/70 max-w-sm hidden sm:block">
            Transformación orgánica del plano físico en un ecosistema holográfico vivo.
          </p>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Proto Luma Display Mode Toggle */}
          <button
            onClick={onToggleProtoLuma}
            title={isProtoLumaMode ? 'Desactivar Modo Proto Luma' : 'Modo Instalación Proto Luma (223.5 x 127.6 cm)'}
            className={`px-3 py-2 rounded-full text-xs font-space tracking-wider flex items-center gap-1.5 transition-all ${
              isProtoLumaMode
                ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                : 'holo-button text-zinc-300 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">PROTO LUMA</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? 'Activar Sonido Sintetizado' : 'Silenciar'}
            className="p-2.5 rounded-full holo-button text-emerald-300 hover:text-white transition-all active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Info Modal Toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            title="Detalles de la instalación"
            className="p-2.5 rounded-full holo-button text-emerald-300 hover:text-white transition-all active:scale-95"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Info Card Drawer */}
      {showInfo && (
        <div className="pointer-events-auto absolute top-20 right-4 md:right-8 w-80 md:w-96 holo-panel p-5 rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200 text-left border border-emerald-500/40">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
            <h3 className="font-cinzel text-sm font-semibold text-emerald-200">ESPECIFICACIONES PROTO LUMA</h3>
            <button onClick={() => setShowInfo(false)} className="text-zinc-400 hover:text-white text-xs px-2 py-0.5">✕</button>
          </div>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-3">
            Diseñado para la escala espacial de <strong className="text-emerald-300">Proto Luma</strong> (223.5 cm alto × 127.6 cm ancho × 60.3 cm profundidad).
          </p>
          <div className="space-y-2 text-[11px] text-zinc-300 font-sans">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-mono">🌱</span>
              <span><strong>Planta:</strong> Toca para agrandar y soltar chispas de energía.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-mono">💧</span>
              <span><strong>Agua:</strong> Toca para generar ondas circulares en 3D.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-mono">🌳</span>
              <span><strong>Árbol:</strong> Toca para agitar su copa y desprender hojas.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-mono">🦋</span>
              <span><strong>Mariposa:</strong> Toca para asustarla en vuelo evasivo.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-mono">✨</span>
              <span><strong>Suelo vacío:</strong> Toca cualquier punto para plantar nuevo brote.</span>
            </div>
          </div>
        </div>
      )}

      {/* Center Holographic Stage Prompt */}
      <div className="flex flex-col items-center justify-center text-center my-auto pointer-events-none">
        {isScanning && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center">
            {/* Holographic scanner visual icon */}
            <div className="relative w-28 h-28 md:w-36 md:h-36 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-emerald-400/40 animate-spin-slow" />
              <div className="absolute inset-2 rounded-full border border-dashed border-teal-300/30 animate-spin-reverse-slow" />
              <div className="absolute inset-6 rounded-full border border-emerald-500/20 animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center border border-emerald-400/50">
                <Sparkles className="w-6 h-6 text-emerald-300 animate-bounce" />
              </div>
            </div>

            <div className="holo-panel px-6 py-4 rounded-2xl max-w-sm border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <h2 className="font-cinzel text-lg md:text-2xl font-bold tracking-wide text-emerald-100 mb-1">
                {stageLabel}
              </h2>
              <p className="font-sans text-xs md:text-sm text-emerald-300/80">
                {stageHint}
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-zinc-400 font-mono">
                Mueve suavemente la cámara o toca la pantalla para fijar
              </div>
            </div>
          </div>
        )}

        {isDetected && (
          <div className="holo-panel px-8 py-5 rounded-2xl border-2 border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.4)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="font-cinzel text-xl md:text-2xl font-bold text-emerald-100">
                Superficie detectada
              </h2>
            </div>
            <p className="font-sans text-xs text-emerald-300/80 font-mono">
              Iniciando gestación del ecosistema…
            </p>
          </div>
        )}

        {isComplete && (
          <div className="holo-panel px-8 py-4 rounded-2xl border border-emerald-400/50 shadow-[0_0_35px_rgba(52,211,153,0.25)] animate-in fade-in duration-700">
            <h2 className="font-cinzel text-lg md:text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-100 to-emerald-300">
              La naturaleza ha despertado.
            </h2>
            <p className="font-sans text-xs text-emerald-300/70 mt-1">
              Espacio físico y holografía fusionados
            </p>
          </div>
        )}

        {/* Temporary Interaction Toast */}
        {interactionFeedback && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-400/60 text-emerald-200 text-xs font-space tracking-wide shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            {interactionFeedback}
          </div>
        )}
      </div>

      {/* Bottom Footer Controls: Progressive Stages & Restart Button */}
      <footer className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Stage Timeline Navigation Pills */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl holo-panel overflow-x-auto max-w-full">
          {STAGES.map((s, idx) => {
            const isActive = stage === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectStage(s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-sans transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.3)] font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-emerald-950/30'
                }`}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* REINICIAR EXPERIENCIA (Discreet Button as explicitly requested) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onRestart}
            className="holo-button px-4 py-2 rounded-full text-xs font-space tracking-wider text-emerald-300 hover:text-white flex items-center gap-2 active:scale-95 shadow-md border border-emerald-500/40 hover:border-emerald-400"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>REINICIAR EXPERIENCIA</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
