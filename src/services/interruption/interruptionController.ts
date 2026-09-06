import { InterruptionController, InterruptionEvent, InterruptionConfig } from './types';

export class ConcreteInterruptionController implements InterruptionController {
  private _isInterrupted = false;
  private _activeGenerationToken = '';
  private _interruptionHistory: InterruptionEvent[] = [];
  private listeners: Set<(event: InterruptionEvent) => void> = new Set();
  private config: InterruptionConfig;
  private lastTriggerTime = 0;
  private assistantSpeechText = '';

  constructor(config?: Partial<InterruptionConfig>) {
    this.config = { enabled: true, vadThreshold: 0.12, speechConfidenceThreshold: 0.6, debounceMs: 250, ...config };
    this.beginNewTurn();
  }

  get isInterrupted(): boolean { return this._isInterrupted; }
  get activeGenerationToken(): string { return this._activeGenerationToken; }
  get interruptionHistory(): InterruptionEvent[] { return [...this._interruptionHistory]; }

  /** Tell the guard exactly what Rime is currently saying so its own echo is ignored. */
  setAssistantSpeech(text: string): void { this.assistantSpeechText = this.normalize(text); }
  clearAssistantSpeech(): void { this.assistantSpeechText = ''; }

  beginNewTurn(): string {
    this._isInterrupted = false;
    this._activeGenerationToken = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return this._activeGenerationToken;
  }

  isTokenValid(token: string): boolean {
    return !this._isInterrupted && this._activeGenerationToken === token;
  }

  triggerBargeIn(eventData: Omit<InterruptionEvent, 'generationToken'>): void {
    if (!this.config.enabled) return;

    const speech = this.normalize(eventData.userSpeechSnippet || '');
    // Never treat Rime's own speech, or a near-verbatim echo of it, as user speech.
    if (speech && this.assistantSpeechText && this.isLikelyAssistantEcho(speech)) {
      console.log('[InterruptionGuard] Ignored assistant audio echo:', eventData.userSpeechSnippet);
      return;
    }

    const now = Date.now();
    if (now - this.lastTriggerTime < this.config.debounceMs) return;
    this.lastTriggerTime = now;
    this._isInterrupted = true;
    const event: InterruptionEvent = { ...eventData, generationToken: this._activeGenerationToken };
    this._interruptionHistory.unshift(event);
    if (this._interruptionHistory.length > 50) this._interruptionHistory.pop();
    this._activeGenerationToken = `invalidated_${Date.now()}`;
    for (const listener of this.listeners) {
      try { listener(event); } catch (err) { console.error('Error in interruption listener:', err); }
    }
  }

  private normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isLikelyAssistantEcho(userText: string): boolean {
    const assistantWords = new Set(this.assistantSpeechText.split(' ').filter(w => w.length >= 2));
    const userWords = userText.split(' ').filter(w => w.length >= 2);
    if (userWords.length < 2 || assistantWords.size === 0) return false;
    const overlap = userWords.filter(w => assistantWords.has(w)).length / userWords.length;
    return overlap >= 0.65;
  }

  onInterrupted(callback: (event: InterruptionEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  reset(): void {
    this._isInterrupted = false;
    this.clearAssistantSpeech();
    this.beginNewTurn();
  }

  updateConfig(config: Partial<InterruptionConfig>): void { this.config = { ...this.config, ...config }; }
  getConfig(): InterruptionConfig { return { ...this.config }; }
}
