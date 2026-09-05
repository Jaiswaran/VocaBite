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

            return new Promise<void>(async (resolve, reject) => {
              try {
                // Decode base64 to Uint8Array
                const binaryString = window.atob(data.audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: 'audio/mp3' });
                const blobUrl = URL.createObjectURL(blob);
                this.activeBlobUrl = blobUrl;

                // Check again before playback
                if (this.currentToken !== activeToken) {
                  console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Discarded before playback.');
                  this.cleanupActiveUrl();
                  resolve();
                  return;
                }

                let playedViaWebAudio = false;

                // Try Web Audio API first
                if (this.audioContext) {
                  try {
                    if (this.audioContext.state === 'suspended') {
                      await this.audioContext.resume();
                    }

                    // Slice creates an independent ArrayBuffer copy
                    const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer.slice(0));

                    if (this.currentToken !== activeToken) {
                      this.cleanupActiveUrl();
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
                      this.cleanupActiveUrl();
                      if (this.currentToken === activeToken) {
                        options.onEnd?.();
                      }
                    };

                    source.start(0);
                    console.log('[RimeTTSProvider] TTS_PLAYBACK_STARTED (WebAudio)');
                    this._isSpeaking = true;
                    playedViaWebAudio = true;
                    options.onStart?.();
                    resolve();
                  } catch (webAudioErr) {
                    console.warn('[RimeTTSProvider] Web Audio playback failed, falling back to HTMLAudioElement:', webAudioErr);
                  }
                }

                // Fallback to HTMLAudioElement
                if (!playedViaWebAudio) {
                  const audio = new Audio(blobUrl);
                  this.audioElement = audio;

                  audio.onplay = () => {
                    console.log('[RimeTTSProvider] TTS_PLAYBACK_STARTED (HTMLAudio)');
                    this._isSpeaking = true;
                    options.onStart?.();
                  };

                  audio.onended = () => {
                    console.log('[RimeTTSProvider] TTS_PLAYBACK_ENDED');
                    this._isSpeaking = false;
                    this.audioElement = null;
                    this.cleanupActiveUrl();
                    if (this.currentToken === activeToken) {
                      options.onEnd?.();
                    }
                  };

                  audio.onerror = (err) => {
                    console.error('[RimeTTSProvider] HTMLAudio error:', err);
                    this._isSpeaking = false;
                    this.audioElement = null;
                    this.cleanupActiveUrl();
                    options.onError?.(new Error('HTMLAudio playback failed'));
                    reject(err);
                  };

                  await audio.play();
                  resolve();
                }
              } catch (err) {
                console.error('[RimeTTSProvider] Playback error:', err);
                this._isSpeaking = false;
                this.cleanupActiveUrl();
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
