import { TTSService, TTSVoiceConfig, TTSSpeakOptions } from './types';

export class RimeTTSProvider implements TTSService {
  readonly id = 'tts-rime';
  readonly providerName = 'Rime TTS';
  private _isSpeaking: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private activeBlobUrl: string | null = null;
  private currentToken: string = '';

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  async initialize(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        if (!this.audioContext) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            this.audioContext = new AudioContextClass();
          }
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } catch (err) {
        console.warn('[RimeTTSProvider] initialize error:', err);
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      return !!data.hasRimeKey;
    } catch {
      return false;
    }
  }

  async synthesizeAndStream(text: string, options: TTSSpeakOptions, config?: Partial<TTSVoiceConfig>): Promise<void> {
    this.stop('reset');

    if (!text || !text.trim()) return;

    this._isSpeaking = true;
    const activeToken = options.responseId || options.generationToken;
    this.currentToken = activeToken;

    if (typeof window !== 'undefined') {
      try {
        // Ensure AudioContext is initialized and active
        await this.initialize();

        console.log('[RimeTTSProvider] TTS_REQUEST_STARTED: Requesting audio for:', text);
                const url = `/api/tts/rime?text=${encodeURIComponent(text)}&speaker=${config?.speakerId || 'marsh'}&speed=${config?.speed || 1.0}`;
        
        return new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            this.audioElement = audio;
            audio.onplay = () => {
                console.log('[RimeTTSProvider] TTS_PLAYBACK_STARTED (HTMLAudio Native Stream)');
                this._isSpeaking = true;
                options.onStart?.();
            };
            audio.onended = () => {
                console.log('[RimeTTSProvider] TTS_PLAYBACK_ENDED');
                this._isSpeaking = false;
                this.audioElement = null;
                if (this.currentToken === activeToken) {
                    options.onEnd?.();
                }
                resolve();
            };
            audio.onerror = (err) => {
                console.error('[RimeTTSProvider] HTMLAudio error:', err);
                this._isSpeaking = false;
                this.audioElement = null;
                options.onError?.(new Error('HTMLAudio playback failed'));
                reject(err);
            };
            
            // Check again before playback
            if (this.currentToken !== activeToken) {
                console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Discarded before playback.');
                resolve();
                return;
            }
            
            audio.play().catch(err => {
                console.error('[RimeTTSProvider] Playback error:', err);
                this._isSpeaking = false;
                options.onError?.(err);
                reject(err);
            });
        });
      } catch (err: any) {
        console.error('[RimeTTSProvider] TTS_ERROR: Rime server unavailable or failed:', err);
        options.onError?.(err);
        throw err;
      }
    }
  }

  private cleanupActiveUrl(): void {
    if (this.activeBlobUrl) {
      try {
        URL.revokeObjectURL(this.activeBlobUrl);
      } catch {}
      this.activeBlobUrl = null;
    }
  }

  async speak(text: string, options: TTSSpeakOptions, config?: Partial<TTSVoiceConfig>): Promise<void> {
    return this.synthesizeAndStream(text, options, config);
  }

  stop(reason?: 'interrupted' | 'user_stopped' | 'reset'): void {
    if (this._isSpeaking || this.audioSource || this.audioElement) {
      if (reason === 'interrupted') {
        console.log('[RimeTTSProvider] AUDIO_CANCELLED: TTS playback stopped due to interruption.');
      } else {
        console.log(`[RimeTTSProvider] AUDIO_CANCELLED: TTS playback stopped. Reason: ${reason}`);
      }
    }
    
    this._isSpeaking = false;
    this.currentToken = '';

    if (this.audioSource) {
      try {
        this.audioSource.stop();
        this.audioSource.disconnect();
      } catch {}
      this.audioSource = null;
    }

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.src = '';
      } catch {}
      this.audioElement = null;
    }

    this.cleanupActiveUrl();
  }

  pause(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  
  cleanup(): void {
    this.stop('reset');
  }
}
