import { TTSService, TTSVoiceConfig, TTSSpeakOptions } from './types';
import { getSharedAudioContext, resumeSharedAudioContext } from '../audio/sharedAudioContext';

export class RimeTTSProvider implements TTSService {
  readonly id = 'tts-rime';
  readonly providerName = 'Rime TTS';
  private _isSpeaking = false;
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private currentToken = '';

  get isSpeaking(): boolean { return this._isSpeaking; }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      this.audioContext = await resumeSharedAudioContext();
    } catch (err) {
      console.warn('[RimeTTSProvider] initialize error:', err);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      return !!data.hasRimeKey;
    } catch { return false; }
  }

  async synthesizeAndStream(text: string, options: TTSSpeakOptions, config?: Partial<TTSVoiceConfig>): Promise<void> {
    this.stop('reset');
    if (!text?.trim() || typeof window === 'undefined') return;

    this._isSpeaking = true;
    const activeToken = options.responseId || options.generationToken;
    this.currentToken = activeToken;

    try {
      this.audioContext = await resumeSharedAudioContext();
      if (!this.audioContext) throw new Error('Web Audio API is not available in this browser.');
      if (this.audioContext.state !== 'running') await this.audioContext.resume();
      if (this.currentToken !== activeToken) return;

      // Rime Mist v2: known MP3 voice configuration.
      const speaker = config?.speakerId || 'astra';
      const speed = config?.speed || 1.0;
      const url = `/api/tts/rime?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(speaker)}&speed=${encodeURIComponent(String(speed))}`;
      console.log('[RimeTTSProvider] TTS_REQUEST_STARTED:', text);

      const response = await fetch(url, { headers: { Accept: 'audio/mpeg' }, cache: 'no-store' });
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
      if (this.currentToken !== activeToken) return;

      const audioBuffer = await this.audioContext.decodeAudioData(audioBytes.slice(0));
      if (this.currentToken !== activeToken) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      this.audioSource = source;

      source.onended = () => {
        if (this.audioSource === source) this.audioSource = null;
        this._isSpeaking = false;
        if (this.currentToken === activeToken) {
          this.currentToken = '';
          console.log('[RimeTTSProvider] TTS_PLAYBACK_ENDED');
          options.onEnd?.();
        }
      };

      console.log('[RimeTTSProvider] TTS_PLAYBACK_STARTED (shared Web Audio)');
      options.onStart?.();
      source.start(0);
    } catch (err: any) {
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

  async speak(text: string, options: TTSSpeakOptions, config?: Partial<TTSVoiceConfig>): Promise<void> {
    return this.synthesizeAndStream(text, options, config);
  }

  stop(reason?: 'interrupted' | 'user_stopped' | 'reset'): void {
    if (this._isSpeaking || this.audioSource) console.log(`[RimeTTSProvider] AUDIO_CANCELLED: ${reason || 'reset'}`);
    this._isSpeaking = false;
    this.currentToken = '';
    if (this.audioSource) {
      const source = this.audioSource;
      this.audioSource = null;
      try { source.onended = null; source.stop(0); source.disconnect(); } catch {}
    }
  }

  pause(): void {
    if (this.audioContext?.state === 'running') void this.audioContext.suspend();
  }

  resume(): void {
    if (this.audioContext?.state === 'suspended') void this.audioContext.resume();
  }

  cleanup(): void { this.stop('reset'); }
}
