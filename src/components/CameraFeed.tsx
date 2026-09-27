import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraFeedProps {
  onCameraReady?: () => void;
  isProtoLumaMode?: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onCameraReady, isProtoLumaMode }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      setIsInitializing(true);
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Navegador sin soporte de cámara directa');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }

        setIsInitializing(false);
        if (onCameraReady) onCameraReady();
      } catch (err: unknown) {
        console.warn('Camera access unavailable or denied:', err);
        const errMsg = err instanceof Error ? err.message : 'Permiso de cámara no concedido';
        setCameraError(errMsg);
        setIsInitializing(false);
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          cameraError ? 'opacity-0' : isProtoLumaMode ? 'opacity-35 brightness-75 contrast-125' : 'opacity-85'
        }`}
      />

      {/* Holographic Ambient Fallback if Camera Permission Denied or Not Available */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-radial from-slate-950 via-black to-black p-6 text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full border border-emerald-500/30 flex items-center justify-center animate-pulse">
              <CameraOff className="w-10 h-10 text-emerald-400/80" />
            </div>
            <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping opacity-40" />
          </div>

          <p className="text-emerald-300 font-cinzel text-lg tracking-wider mb-2">
            MODO HOLOGRÁFICO DIRECTO
          </p>
          <p className="text-zinc-400 text-sm max-w-md font-sans leading-relaxed mb-4">
            Cámara no disponible ({cameraError}). Operando en espacio tridimensional holográfico optimizado para Proto Luma.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Toca el suelo digital para anclar el ecosistema</span>
          </div>
        </div>
      )}

      {/* Camera switch toggle button */}
      {!cameraError && !isInitializing && (
        <button
          onClick={toggleCameraFacing}
          title="Cambiar Cámara"
          className="absolute top-5 right-5 pointer-events-auto z-40 p-2.5 rounded-full holo-button text-emerald-300 hover:text-emerald-100 transition-all active:scale-95 shadow-lg backdrop-blur-md"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      )}

      {/* Proto Luma High-Contrast Vignette & Holographic Scan Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

      {/* Subtle holographic horizontal scanline bar */}
      <div className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-emerald-400/8 to-transparent pointer-events-none animate-holo-scan" />
    </div>
  );
};
