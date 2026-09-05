import { TTSService, TTSVoiceConfig, TTSSpeakOptions } from './types';

export class RimeTTSProvider implements TTSService {
  readonly id = 'tts-rime';
  readonly providerName = 'Rime TTS';
  private _isSpeaking: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private currentToken: string = '';

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && !this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
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
        console.log('[RimeTTSProvider] TTS_REQUEST_STARTED: Requesting audio for:', text);
        const response = await fetch('/api/tts/rime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            speaker: config?.speakerId || 'marsh',
            speed: config?.speed || 1.0,
          }),
        });

        console.log('[RimeTTSProvider] TTS_RESPONSE_RECEIVED');

        if (response.ok) {
          const data = await response.json();
          if (data.audioUrl || data.audioBase64) {
            console.log('[RimeTTSProvider] TTS_AUDIO_READY');
            // Check if interrupted while network request was in-flight
            if (this.currentToken !== activeToken) {
              console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Audio arrived after turn was cancelled (Rime API).');
              options.onInterrupted?.();
              return;
            }
            const format = data.audioFormat || 'wav';
            
            return new Promise<void>(async (resolve, reject) => {
              try {
                // Decode base64 to ArrayBuffer
                const binaryString = window.atob(data.audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                if (!this.audioContext) {
                  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                  this.audioContext = new AudioContextClass();
                }
                
                const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
                
                // Enforce responseId-based stale audio cancellation before playback
                if (this.currentToken !== activeToken) {
                  console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Audio discarded before playback.');
                  resolve();
                  return;
                }
                
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);
                this.audioSource = source;
                
                source.onended = () => {
                  console.log('[RimeTTSProvider] TTS_PLAYBACK_ENDED');
                  this._isSpeaking = false;
                  this.audioSource = null;
                  if (this.currentToken === activeToken) {
                    options.onEnd?.();
                  }
                };
                
                source.start(0);
                console.log('[RimeTTSProvider] TTS_PLAYBACK_STARTED');
                options.onStart?.();
                resolve();
              } catch (err) {
                console.error('[RimeTTSProvider] Playback failed:', err);
                this._isSpeaking = false;
                options.onError?.(err as Error);
                reject(err);
              }
            });
          } else {
             console.error('[RimeTTSProvider] TTS_ERROR: No audio returned from Rime');
             options.onError?.(new Error(data.message || 'No audio returned from Rime'));
             throw new Error(data.message || 'No audio returned from Rime');
          }
        } else {
          console.error(`[RimeTTSProvider] TTS_ERROR: Rime API responded with status ${response.status}`);
          options.onError?.(new Error(`Rime API Error: ${response.status}`));
          throw new Error(`Rime API Error: ${response.status}`);
        }
      } catch (err: any) {
        console.error('[RimeTTSProvider] TTS_ERROR: Rime server unavailable or failed:', err);
        options.onError?.(err);
        throw err;
      }
    }
  }

  async speak(text: string, options: TTSSpeakOptions, config?: Partial<TTSVoiceConfig>): Promise<void> {
    return this.synthesizeAndStream(text, options, config);
  }

  stop(reason?: 'interrupted' | 'user_stopped' | 'reset'): void {
    if (this._isSpeaking || this.audioSource) {
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
