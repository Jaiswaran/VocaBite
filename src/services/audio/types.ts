/**
 * Realtime Audio Transport Interface
 * Designed to support Web Audio API local capture and LiveKit realtime room audio transport.
 */

export interface AudioStreamConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface AudioFrequencyData {
  frequencies: Uint8Array;
  volume: number; // 0 to 1
  isSpeaking: boolean;
}

export interface RealtimeAudioService {
  readonly isConnected: boolean;
  readonly isCapturing: boolean;
  
  initialize(config?: Partial<AudioStreamConfig>): Promise<MediaStream>;
  startCapture(onAudioData?: (data: AudioFrequencyData) => void): Promise<void>;
  stopCapture(): void;
  getAudioContext(): AudioContext | null;
  getVolume(): number;
  connectLiveKitRoom?(roomName: string, token: string): Promise<void>;
  disconnectLiveKitRoom?(): Promise<void>;
}
