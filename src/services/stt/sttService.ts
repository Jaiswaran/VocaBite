import { STTService, STTOptions, STTTranscriptionEvent, STTStatus } from './types';

interface IWindow extends Window { webkitSpeechRecognition?: any; SpeechRecognition?: any; }

export class WebSpeechSTTService implements STTService {
  readonly id = 'stt-web-speech';
  readonly name = 'Browser Web Speech STT';
  private _status: STTStatus = 'idle';
  private recognition: any = null;
  private isListeningActive = false;
  private options: STTOptions = { language: 'en-US', continuous: false, interimResults: true };
  private lastFinalTranscript = '';
  private lastFinalTime = 0;

  get status(): STTStatus { return this._status; }
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }
  async initialize(options?: STTOptions): Promise<boolean> {
    this.options = { ...this.options, ...options };
    if (!this.isSupported()) { this._status = 'error'; return false; }
    return true;
  }

  async startListening(onResult: (event: STTTranscriptionEvent) => void, onSpeechStart?: () => void, onSpeechEnd?: () => void, onError?: (error: Error) => void): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.recognition) { try { this.recognition.abort(); } catch {} }
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) { const err = new Error('SpeechRecognition is not supported on this browser.'); this._status = 'error'; onError?.(err); return; }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = this.options.continuous ?? false;
      this.recognition.interimResults = this.options.interimResults ?? true;
      this.recognition.lang = this.options.language ?? 'en-US';
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      let latestInterim = '';

      this.recognition.onstart = () => { this.isListeningActive = true; this._status = 'listening'; };
      this.recognition.onspeechstart = () => { this._status = 'speech_started'; onSpeechStart?.(); };
      this.recognition.onspeechend = () => { this._status = 'processing'; onSpeechEnd?.(); };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0.85;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = String(result[0].transcript || '').trim();
          if (result[0].confidence) confidence = result[0].confidence;
          if (result.isFinal) finalTranscript += `${transcript} `; else interimTranscript += `${transcript} `;
        }
        const finalText = finalTranscript.trim();
        const interimText = interimTranscript.trim();
        if (finalText) {
          latestInterim = '';
          if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
          const now = Date.now();
          if (!(finalText === this.lastFinalTranscript && now - this.lastFinalTime < 2500)) {
            this.lastFinalTranscript = finalText;
            this.lastFinalTime = now;
            onResult({ transcript: finalText, isFinal: true, confidence, rawEvent: event });
          }
          return;
        }
        if (!interimText) return;
        latestInterim = interimText;
        onResult({ transcript: interimText, isFinal: false, confidence, rawEvent: event });
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (!this.isListeningActive || !latestInterim) return;
          const forcedText = latestInterim.trim();
          if (forcedText.length < 2) return;
          console.log('[WebSpeechSTT] Fast silence finalization');
          // Do not abort here: aborting can race with the browser's own final result and create duplicates.
          const now = Date.now();
          if (forcedText !== this.lastFinalTranscript || now - this.lastFinalTime >= 2500) {
            this.lastFinalTranscript = forcedText;
            this.lastFinalTime = now;
            onResult({ transcript: forcedText, isFinal: true, confidence, rawEvent: event });
          }
        }, 450);
      };

      this.recognition.onerror = (event: any) => {
        if (silenceTimer) clearTimeout(silenceTimer);
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        console.warn('[WebSpeechSTT] warning:', event.error);
        if (event.error === 'not-allowed') { this._status = 'error'; onError?.(new Error('Microphone access was denied. Please allow microphone permissions.')); }
      };
      this.recognition.onend = () => {
        if (this.isListeningActive) { try { this.recognition.start(); } catch {} } else this._status = 'idle';
      };
      this.recognition.start();
    } catch (err: any) {
      this._status = 'error'; onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async stopListening(): Promise<void> { this.isListeningActive = false; this._status = 'idle'; if (this.recognition) { try { this.recognition.stop(); } catch {} } }
  abort(): void { this.isListeningActive = false; this._status = 'idle'; if (this.recognition) { try { this.recognition.abort(); } catch {} } }
}
