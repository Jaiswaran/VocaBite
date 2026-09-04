/**
 * Interruption Controller Service Interface
 * Coordinates automatic user speech detection, immediate AI audio cancellation,
 * stale request invalidation, and seamless conversational recovery.
 */

export interface InterruptionEvent {
  interruptedAtMs: number;
  aiUtteranceSnippet: string;
  userSpeechSnippet?: string;
  generationToken: string;
  triggerType: 'vad_threshold' | 'stt_speech_start' | 'stt_partial_text';
}

export interface InterruptionConfig {
  enabled: boolean;
  vadThreshold: number; // Volume threshold (0.01 - 0.5) to detect barge-in
  speechConfidenceThreshold: number;
  debounceMs: number;
}

export interface InterruptionController {
  readonly isInterrupted: boolean;
  readonly activeGenerationToken: string;
  readonly interruptionHistory: InterruptionEvent[];

  /**
   * Generates a new generation token when a new request starts.
   */
  beginNewTurn(): string;

  /**
   * Check if a generation token is still valid (not interrupted / invalidated).
   */
  isTokenValid(token: string): boolean;

  /**
   * Automatically triggered when user speech is detected while AI is speaking.
   */
  triggerBargeIn(event: Omit<InterruptionEvent, 'generationToken'>): void;

  /**
   * Registers callback to immediately stop playing audio and kill in-flight requests.
   */
  onInterrupted(callback: (event: InterruptionEvent) => void): () => void;

  /**
   * Resets interruption state for a fresh turn.
   */
  reset(): void;
}
