import { RealtimeAudioService, AudioStreamConfig, AudioFrequencyData } from './types';
import { getSharedAudioContext, resumeSharedAudioContext } from './sharedAudioContext';

export class WebAudioRealtimeService implements RealtimeAudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private _isConnected = false;
  private _isCapturing = false;
  private currentVolume = 0;

  get isConnected(): boolean { return this._isConnected; }
  get isCapturing(): boolean { return this._isCapturing; }
  getAudioContext(): AudioContext | null { return this.audioContext; }
  getVolume(): number { return this.currentVolume; }

  async initialize(config?: Partial<AudioStreamConfig>): Promise<MediaStream> {
    if (typeof window === 'undefined') {
      throw new Error('Web Audio is only supported in browser environments.');
    }

    const streamConfig: MediaStreamConstraints = {
      audio: {
        echoCancellation: config?.echoCancellation ?? true,
        noiseSuppression: config?.noiseSuppression ?? true,
        autoGainControl: config?.autoGainControl ?? true,
        sampleRate: config?.sampleRate ?? 44100,
        channelCount: config?.channelCount ?? 1,
      },
      video: false,
    };

    if (this.mediaStream) return this.mediaStream;

    this.mediaStream = await navigator.mediaDevices.getUserMedia(streamConfig);
    this.audioContext = await resumeSharedAudioContext();
    if (!this.audioContext) throw new Error('Web Audio API is not available in this browser.');

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.analyser);
    this._isConnected = true;
    return this.mediaStream;
  }

  async startCapture(onAudioData?: (data: AudioFrequencyData) => void): Promise<void> {
    if (!this.mediaStream || !this.analyser) await this.initialize();
    this.audioContext = await resumeSharedAudioContext();
    if (!this.analyser || !this.audioContext) throw new Error('Audio capture is unavailable.');

    this._isCapturing = true;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudio = () => {
      if (!this._isCapturing || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength;
      this.currentVolume = Math.min(1, avg / 128);

      onAudioData?.({
        frequencies: new Uint8Array(dataArray),
        volume: this.currentVolume,
        isSpeaking: this.currentVolume > 0.08,
      });
      this.animationFrameId = requestAnimationFrame(checkAudio);
    };
    checkAudio();
  }

  stopCapture(): void {
    this._isCapturing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.currentVolume = 0;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }

    // IMPORTANT: do not close the shared AudioContext here.
    // Rime TTS uses the same context for playback.
    this.analyser = null;
    this._isConnected = false;
  }

  async connectLiveKitRoom(roomName: string, token: string): Promise<void> {
    console.log(`[LiveKit Interface] Connecting to room ${roomName} with provided auth token...`);
  }

  async disconnectLiveKitRoom(): Promise<void> {
    console.log('[LiveKit Interface] Disconnecting LiveKit room transport.');
  }
}
