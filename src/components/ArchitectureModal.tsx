import React, { useState } from 'react';
import { X, Layers, Code, Zap, Mic, Volume2, Sparkles, ShoppingBag, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INTERFACE_TABS = [
  { id: 'interruption', label: 'Interruption Controller', icon: Zap },
  { id: 'stt', label: 'STT Service', icon: Mic },
  { id: 'llm', label: 'LLM (Gemini 3.7)', icon: Sparkles },
  { id: 'tts', label: 'Rime TTS', icon: Volume2 },
  { id: 'audio', label: 'Realtime Audio / LiveKit', icon: Layers },
  { id: 'order', label: 'Order Manager', icon: ShoppingBag },
];

const CODE_EXAMPLES: Record<string, { desc: string; code: string }> = {
  interruption: {
    desc: 'Automatic barge-in detector and token invalidator. Halts playing audio immediately when user speech begins and prevents stale responses.',
    code: `export interface InterruptionController {
  readonly isInterrupted: boolean;
  readonly activeGenerationToken: string;
  readonly interruptionHistory: InterruptionEvent[];

  beginNewTurn(): string;
  isTokenValid(token: string): boolean;
  triggerBargeIn(event: Omit<InterruptionEvent, 'generationToken'>): void;
  onInterrupted(callback: (event: InterruptionEvent) => void): () => void;
  reset(): void;
}`,
  },
  stt: {
    desc: 'Pluggable Speech-to-Text interface supporting browser Web Speech API, Deepgram, Whisper, or LiveKit audio transport streams.',
    code: `export interface STTService {
  readonly id: string;
  readonly name: string;
  readonly status: STTStatus;

  initialize(options?: STTOptions): Promise<boolean>;
  startListening(
    onResult: (event: STTTranscriptionEvent) => void,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void>;
  stopListening(): Promise<void>;
  abort(): void;
  isSupported(): boolean;
}`,
  },
  llm: {
    desc: 'Multi-turn conversational comprehension and structured JSON order action extraction using Gemini 3.7 Flash server-side.',
    code: `export interface LLMService {
  readonly id: string;
  readonly modelName: string;

  processUtterance(
    payload: LLMRequestPayload,
    signal?: AbortSignal
  ): Promise<LLMResponsePayload>;
}

// Request payload includes active generation token for barge-in cancellation:
export interface LLMRequestPayload {
  userUtterance: string;
  conversationHistory: ChatMessage[];
  currentOrder: OrderState;
  generationToken: string;
  interruptionContext?: {
    previousAssistantUtterance: string;
    interruptedAtMs: number;
  };
}`,
  },
  tts: {
    desc: 'Low-latency Text-to-Speech contract designed for Rime neural voice synthesis with seamless Web Speech fallback and instant abort capability.',
    code: `export interface TTSService {
  readonly id: string;
  readonly providerName: string;
  readonly isSpeaking: boolean;

  speak(
    text: string,
    options: TTSSpeakOptions,
    config?: Partial<TTSVoiceConfig>
  ): Promise<void>;
  stop(reason?: 'interrupted' | 'user_stopped' | 'reset'): void;
  pause(): void;
  resume(): void;
}`,
  },
  audio: {
    desc: 'Real-time audio capture, Web Audio API frequency visualizer, and LiveKit WebRTC room connection transport abstraction.',
    code: `export interface RealtimeAudioService {
  readonly isConnected: boolean;
  readonly isCapturing: boolean;

  initialize(config?: Partial<AudioStreamConfig>): Promise<MediaStream>;
  startCapture(onAudioData?: (data: AudioFrequencyData) => void): Promise<void>;
  stopCapture(): void;
  getAudioContext(): AudioContext | null;
  getVolume(): number;
  connectLiveKitRoom?(roomName: string, token: string): Promise<void>;
  disconnectLiveKitRoom?(): Promise<void>;
}`,
  },
  order: {
    desc: 'Stateful cart manager handling item additions, real-time spice modifications, removals, quantities, subtotal/tax calculations, and subscribers.',
    code: `export interface OrderManager {
  readonly state: OrderState;

  applyAction(action: OrderAction): OrderState;
  applyActions(actions: OrderAction[]): OrderState;
  getItem(cartItemId: string): OrderItem | undefined;
  calculateTotals(): { subtotal: number; tax: number; deliveryFee: number; total: number };
  resetOrder(): OrderState;
  subscribe(listener: (state: OrderState) => void): () => void;
}`,
  },
};

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('interruption');

  if (!isOpen) return null;

  const currentInfo = CODE_EXAMPLES[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-neutral-100 font-display">
                Phase 1 Service Architecture
              </h2>
              <p className="text-xs text-neutral-400">Pluggable contracts for STT, LLM, Rime TTS, LiveKit & Interruption</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
            id="close-architecture-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-3 px-5 border-b border-neutral-800/80 bg-neutral-950/30 flex items-center gap-2 overflow-x-auto">
          {INTERFACE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800/70 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interface Content View */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 text-xs text-neutral-300">
            <span className="font-semibold text-amber-400">Service Responsibility: </span>
            {currentInfo.desc}
          </div>

          <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
            <div className="px-4 py-2 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-mono">
              <span>TypeScript Contract</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Production Adapter
              </span>
            </div>
            <pre className="p-5 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
              <code>{currentInfo.code}</code>
            </pre>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
