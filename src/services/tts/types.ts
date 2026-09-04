/**
 * Text-to-Speech (TTS) Service Interface
 * Designed around Rime TTS as primary provider with Web Speech API and synthesis fallback.
 */

export interface TTSVoiceConfig {
  provider: 'rime' | 'browser' | 'mock';
  speakerId: string; // e.g. "marsh", "amber", "abbie", "allison"
  speed?: number; // 0.5 to 2.0
  pitch?: number;
  sampleRate?: number;
}

export interface TTSSpeakOptions {
  generationToken: string; // Token used to ensure playback is aborted if stale
  responseId?: string;
  onStart?: () => void;
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onInterrupted?: () => void;
}

export interface TTSService {
  readonly id: string;
  readonly providerName: string;
  readonly isSpeaking: boolean;

  speak(text: string, options: TTSSpeakOptions, config?: Partial<TTSVoiceConfig>): Promise<void>;
  stop(reason?: 'interrupted' | 'user_stopped' | 'reset'): void;
  pause(): void;
  resume(): void;
}
