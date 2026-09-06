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
    if (typeof window === 'undefined') return;

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

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      return !!data.hasRimeKey;
    } catch {
      return false;
    }
  }

  async synthesizeAndStream(
    text: string,
    options: TTSSpeakOptions,
    config?: Partial<TTSVoiceConfig>
  ): Promise<void> {
    this.stop('reset');

    if (!text || !text.trim()) return;

    this._isSpeaking = true;
    const activeToken = options.responseId || options.generationToken;
    this.currentToken = activeToken;

    if (typeof window === 'undefined') return;

    try {
      // The AudioContext is unlocked from the user's microphone/listening gesture
      // in App.tsx. Unlike HTMLAudioElement.play(), AudioBuffer playback remains
      // usable after the async STT -> Gemini/Rime round trip.
      await this.initialize();

      if (!this.audioContext) {
        throw new Error('Web Audio API is not available in this browser.');
      }

      if (this.audioContext.state !== 'running') {
        await this.audioContext.resume();
      }

      if (this.currentToken !== activeToken) {
        this._isSpeaking = false;
        return;
      }

      const speaker = config?.speakerId || 'marsh';
      const speed = config?.speed || 1.0;
      const url = `/api/tts/rime?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(speaker)}&speed=${encodeURIComponent(String(speed))}`;

      console.log('[RimeTTSProvider] TTS_REQUEST_STARTED: Requesting audio for:', text);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'audio/mpeg' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown TTS error');
        throw new Error(`Rime TTS request failed (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio/')) {
        const errorText = await response.text().catch(() => 'Invalid audio response');
        throw new Error(`Rime returned a non-audio response: ${errorText}`);
      }

      const audioBytes = await response.arrayBuffer();

      if (this.currentToken !== activeToken) {
        console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Response arrived after interruption.');
        this._isSpeaking = false;
        return;
      }

      const audioBuffer = await this.audioContext.decodeAudioData(audioBytes.slice(0));

      if (this.currentToken !== activeToken) {
        console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Audio decoded after interruption.');
        this._isSpeaking = false;
        return;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      this.audioSource = source;

      source.onended = () => {
        if (this.audioSource === source) {
          this.audioSource = null;
        }

        this._isSpeaking = false;

        if (this.currentToken === activeToken) {
          console.log('[RimeTTSProvider] TTS_PLAYBACK_ENDED');
          this.currentToken = '';
          options.onEnd?.();
        }
      };

      console.log('[RimeTTSProvider] TTS_PLAYBACK_STARTED (Web Audio)');
      options.onStart?.();
      source.start(0);
    } catch (err: any) {
      // An intentional interruption should not be reported as a TTS failure.
      if (this.currentToken !== activeToken) {
        this._isSpeaking = false;
        return;
      }

      this._isSpeaking = false;
      console.error('[RimeTTSProvider] TTS_ERROR:', err);
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async speak(
    text: string,
    options: TTSSpeakOptions,
    config?: Partial<TTSVoiceConfig>
  ): Promise<void> {
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
      const source = this.audioSource;
      this.audioSource = null;
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch {
        // The source may already have ended.
      }
    }
  }

  pause(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      void this.audioContext.suspend();
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
  }

  cleanup(): void {
    this.stop('reset');
  }
}
