import { STTService, STTOptions, STTTranscriptionEvent, STTStatus } from './types';

// Declare Web Speech API types if not globally present
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export class WebSpeechSTTService implements STTService {
  readonly id = 'stt-web-speech';
  readonly name = 'Browser Web Speech STT';
  private _status: STTStatus = 'idle';
  private recognition: any = null;
  private isListeningActive: boolean = false;
  private options: STTOptions = {
    language: 'en-US',
    continuous: false,
    interimResults: true,
  };

  get status(): STTStatus {
    return this._status;
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  async initialize(options?: STTOptions): Promise<boolean> {
    this.options = { ...this.options, ...options };
    if (!this.isSupported()) {
      this._status = 'error';
      return false;
    }
    return true;
  }

  async startListening(
    onResult: (event: STTTranscriptionEvent) => void,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const err = new Error('SpeechRecognition is not supported on this browser.');
      this._status = 'error';
      onError?.(err);
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = this.options.continuous ?? false;
      this.recognition.interimResults = this.options.interimResults ?? true;
      this.recognition.lang = this.options.language ?? 'en-US';

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        this._status = 'listening';
      };

      this.recognition.onspeechstart = () => {
        this._status = 'speech_started';
        onSpeechStart?.();
      };

      this.recognition.onspeechend = () => {
        this._status = 'processing';
        onSpeechEnd?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let highestConfidence = 0.85;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          if (result[0].confidence) {
            highestConfidence = result[0].confidence;
          }

          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        if (text.trim()) {
          onResult({
            transcript: text.trim(),
            isFinal: !!finalTranscript,
            confidence: highestConfidence,
            rawEvent: event,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore "no-speech" as standard pause in continuous listening
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        console.warn('STT recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          this._status = 'error';
          onError?.(new Error('Microphone access was denied. Please allow microphone permissions.'));
        }
      };

      this.recognition.onend = () => {
        // Automatically restart if still active (e.g. continuous voice session)
        if (this.isListeningActive) {
          try {
            this.recognition.start();
          } catch {
            // will restart on next trigger
          }
        } else {
          this._status = 'idle';
        }
      };

      this.recognition.start();
    } catch (err: any) {
      this._status = 'error';
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async stopListening(): Promise<void> {
    this.isListeningActive = false;
    this._status = 'idle';
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  abort(): void {
    this.isListeningActive = false;
    this._status = 'idle';
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
  }
}
