import React, { useEffect, useRef } from 'react';
import { Mic, Volume2, Sparkles, Zap, Radio, CheckCircle2, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted';

interface AudioVisualizerProps {
  voiceState: VoiceState;
  volume: number;
  frequencies?: Uint8Array;
  onToggleMic?: () => void;
  statusText?: string;
  connectionStatus?: 'connected' | 'connecting' | 'idle';
  detectedSpeechSnippet?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  voiceState,
  volume,
  frequencies,
  onToggleMic,
  statusText,
  connectionStatus = 'connected',
  detectedSpeechSnippet,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth canvas audio visualizer wave & orbital frequencies
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const midY = height / 2;
      const isListening = voiceState === 'listening';
      const isSpeaking = voiceState === 'speaking';
      const isThinking = voiceState === 'thinking';
      const isInterrupted = voiceState === 'interrupted';

      // Wave styling based on state
      let strokeStyle = 'rgba(160, 160, 160, 0.25)';
      let glowColor = 'transparent';
      let lineWidth = 2;

      if (isInterrupted) {
        strokeStyle = 'rgba(239, 68, 68, 0.9)';
        glowColor = 'rgba(239, 68, 68, 0.4)';
        lineWidth = 3;
      } else if (isSpeaking) {
        strokeStyle = 'rgba(245, 158, 11, 0.95)';
        glowColor = 'rgba(245, 158, 11, 0.4)';
        lineWidth = 2.5;
      } else if (isThinking) {
        strokeStyle = 'rgba(168, 85, 247, 0.85)';
        glowColor = 'rgba(168, 85, 247, 0.3)';
        lineWidth = 2;
      } else if (isListening) {
        const energyBoost = Math.min(1, volume * 3);
        strokeStyle = energyBoost > 0.1 
          ? 'rgba(16, 185, 129, 0.95)' 
          : 'rgba(52, 211, 153, 0.7)';
        glowColor = 'rgba(16, 185, 129, 0.35)';
        lineWidth = 2.5;
      }

      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      const numPoints = 48;
      const step = width / numPoints;

      for (let i = 0; i <= numPoints; i++) {
        let amp = 2;
        const normalizedX = (i / numPoints) * Math.PI * 2;

        if (isSpeaking) {
          amp = 14 + Math.sin(phase * 2 + i * 0.4) * 8 + Math.cos(phase + i * 0.2) * 6;
        } else if (isListening) {
          const userEnergy = Math.min(30, volume * 90);
          amp = 3 + userEnergy + Math.sin(phase * 1.5 + i * 0.5) * (userEnergy > 5 ? 6 : 2);
        } else if (isThinking) {
          amp = 4 + Math.sin(phase * 3 + i * 0.8) * 5;
        } else if (isInterrupted) {
          amp = 18 * Math.sin(phase * 4 + i * 1.5);
        }

        // Taper edges to center
        const envelope = Math.sin((i / numPoints) * Math.PI);
        const y = midY + Math.sin(normalizedX * 2 + phase) * amp * envelope;

        if (i === 0) {
          ctx.moveTo(0, y);
        } else {
          ctx.lineTo(i * step, y);
        }
      }

      ctx.stroke();
      ctx.restore();

      // Second subtle harmonic wave
      if (isSpeaking || isListening) {
        ctx.save();
        ctx.strokeStyle = isSpeaking ? 'rgba(251, 191, 36, 0.35)' : 'rgba(110, 231, 183, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= numPoints; i++) {
          const envelope = Math.sin((i / numPoints) * Math.PI);
          const amp2 = isSpeaking ? 10 : Math.min(18, volume * 50);
          const y2 = midY + Math.cos(i * 0.3 - phase * 1.2) * amp2 * envelope;
          if (i === 0) ctx.moveTo(0, y2);
          else ctx.lineTo(i * step, y2);
        }
        ctx.stroke();
        ctx.restore();
      }

      phase += isSpeaking ? 0.09 : isListening ? 0.06 : isThinking ? 0.12 : isInterrupted ? 0.15 : 0.02;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [voiceState, volume]);

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-neutral-900/50 rounded-3xl border border-neutral-800/80 backdrop-blur-xl relative overflow-hidden shadow-2xl transition-all duration-500">
      {/* Background Ambient Radial Glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          voiceState === 'interrupted'
            ? 'opacity-30 bg-radial from-red-600/30 via-red-900/10 to-transparent'
            : voiceState === 'speaking'
            ? 'opacity-35 bg-radial from-amber-500/25 via-orange-950/10 to-transparent'
            : voiceState === 'thinking'
            ? 'opacity-30 bg-radial from-purple-500/25 via-purple-950/10 to-transparent'
            : voiceState === 'listening'
            ? 'opacity-25 bg-radial from-emerald-500/20 via-emerald-950/10 to-transparent'
            : 'opacity-5'
        }`}
      />

      {/* Connection State Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
          }`}
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-300">
          {connectionStatus === 'connected' ? 'Live Audio' : 'Connecting'}
        </span>
      </div>

      {/* Central Interactive Voice Orb */}
      <div className="relative my-4 flex items-center justify-center">
        {/* Animated Outer Rings */}
        <AnimatePresence>
          {(voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'thinking' || voiceState === 'interrupted') && (
            <>
              {/* Outer Pulse Ring 1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  scale: [1, 1.35, 1],
                  opacity: [0.35, 0.05, 0.35],
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  duration: voiceState === 'interrupted' ? 0.6 : voiceState === 'thinking' ? 1.2 : voiceState === 'speaking' ? 1.5 : 2.0,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`absolute w-36 h-36 rounded-full -z-10 ${
                  voiceState === 'interrupted'
                    ? 'bg-red-500/30'
                    : voiceState === 'speaking'
                    ? 'bg-amber-500/25'
                    : voiceState === 'thinking'
                    ? 'bg-purple-500/25'
                    : 'bg-emerald-500/20'
                }`}
              />

              {/* Outer Pulse Ring 2 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  scale: [1, 1.65, 1],
                  opacity: [0.2, 0, 0.2],
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  duration: voiceState === 'interrupted' ? 0.6 : voiceState === 'thinking' ? 1.2 : voiceState === 'speaking' ? 1.5 : 2.0,
                  repeat: Infinity,
                  delay: 0.3,
                  ease: 'easeInOut',
                }}
                className={`absolute w-36 h-36 rounded-full -z-10 ${
                  voiceState === 'interrupted'
                    ? 'bg-red-500/20'
                    : voiceState === 'speaking'
                    ? 'bg-amber-500/15'
                    : voiceState === 'thinking'
                    ? 'bg-purple-500/15'
                    : 'bg-emerald-500/10'
                }`}
              />
            </>
          )}
        </AnimatePresence>

        {/* Rotating Thinking Ring Orbit */}
        {voiceState === 'thinking' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute w-28 h-28 rounded-full border-2 border-dashed border-purple-400/60 pointer-events-none"
          />
        )}

        {/* Main Microphone / Voice Orb Button */}
        <button
          onClick={onToggleMic}
          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 ${
            voiceState === 'interrupted'
              ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-500/40 ring-red-500/50 scale-105'
              : voiceState === 'speaking'
              ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-neutral-950 shadow-amber-500/40 ring-amber-500/30'
              : voiceState === 'thinking'
              ? 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-purple-500/40 ring-purple-500/30'
              : voiceState === 'listening'
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-neutral-950 shadow-emerald-500/30 ring-emerald-500/30 scale-100 hover:scale-105'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 ring-neutral-700 shadow-neutral-950/50'
          }`}
          id="main-voice-orb-btn"
          aria-label="Voice Interface Status Orb"
        >
          {voiceState === 'interrupted' ? (
            <Zap className="w-10 h-10 stroke-[2.5] animate-bounce" />
          ) : voiceState === 'speaking' ? (
            <Volume2 className="w-10 h-10 stroke-[2.2] animate-pulse" />
          ) : voiceState === 'thinking' ? (
            <Sparkles className="w-10 h-10 stroke-[2.2] animate-spin" />
          ) : (
            <Mic className={`w-10 h-10 ${voiceState === 'listening' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          )}
        </button>
      </div>

      {/* Audio Waveform Canvas */}
      <div className="w-full max-w-sm h-12 my-2 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={320}
          height={48}
          className="w-full h-full"
        />
      </div>

      {/* State Badge & Caption */}
      <div className="text-center mt-1 space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950/70 border border-neutral-800">
          <span
            className={`w-2 h-2 rounded-full ${
              voiceState === 'interrupted'
                ? 'bg-red-400 animate-ping'
                : voiceState === 'speaking'
                ? 'bg-amber-400 animate-pulse'
                : voiceState === 'thinking'
                ? 'bg-purple-400 animate-pulse'
                : voiceState === 'listening'
                ? 'bg-emerald-400'
                : 'bg-neutral-500'
            }`}
          />
          <span className="font-semibold text-xs text-neutral-200 tracking-wide uppercase">
            {voiceState === 'interrupted'
              ? 'Interrupted — Listening'
              : voiceState === 'speaking'
              ? 'Speaking with Rime'
              : voiceState === 'thinking'
              ? 'Understanding Order'
              : voiceState === 'listening'
              ? 'Listening to You'
              : 'Mic Paused'}
          </span>
        </div>

        <p className="text-xs text-neutral-400 max-w-md pt-1">
          {statusText ||
            (voiceState === 'listening'
              ? 'Speak naturally anytime. You can interrupt mid-sentence without pressing stop.'
              : voiceState === 'speaking'
              ? 'Just speak aloud anytime to cut in with corrections.'
              : 'Click the orb to start talking.')}
        </p>

        {detectedSpeechSnippet && (
          <div className="text-xs text-amber-300 font-mono italic mt-1 max-w-xs truncate mx-auto bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            "{detectedSpeechSnippet}"
          </div>
        )}
      </div>
    </div>
  );
};
