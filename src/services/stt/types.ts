/**
 * Speech-to-Text (STT) Service Interface
 * Designed to be pluggable with Web Speech API, Deepgram, Whisper, LiveKit STT, or Google Cloud Speech.
 */

export interface STTOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  vadSensitivity?: number; // 0 to 1
}

export interface STTTranscriptionEvent {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  speechStartTime?: number;
  speechEndTime?: number;
  rawEvent?: unknown;
}

export type STTStatus = 'idle' | 'listening' | 'speech_started' | 'processing' | 'error';

export interface STTService {
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
}
