import { InterruptionController, InterruptionEvent, InterruptionConfig } from './types';

export class ConcreteInterruptionController implements InterruptionController {
  private _isInterrupted: boolean = false;
  private _activeGenerationToken: string = '';
  private _interruptionHistory: InterruptionEvent[] = [];
  private listeners: Set<(event: InterruptionEvent) => void> = new Set();
  private config: InterruptionConfig;
  private lastTriggerTime: number = 0;

  constructor(config?: Partial<InterruptionConfig>) {
    this.config = {
      enabled: true,
      vadThreshold: 0.12, // Audio energy threshold
      speechConfidenceThreshold: 0.6,
      debounceMs: 250,
      ...config,
    };
    this.beginNewTurn();
  }

  get isInterrupted(): boolean {
    return this._isInterrupted;
  }

  get activeGenerationToken(): string {
    return this._activeGenerationToken;
  }

  get interruptionHistory(): InterruptionEvent[] {
    return [...this._interruptionHistory];
  }

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

    const now = Date.now();
    if (now - this.lastTriggerTime < this.config.debounceMs) {
      return; // Debounce rapid triggers
    }
    this.lastTriggerTime = now;

    this._isInterrupted = true;
    const event: InterruptionEvent = {
      ...eventData,
      generationToken: this._activeGenerationToken,
    };

    this._interruptionHistory.unshift(event);
    if (this._interruptionHistory.length > 50) {
      this._interruptionHistory.pop();
    }

    // Invalidate current token by immediately rotating it
    this._activeGenerationToken = `invalidated_${Date.now()}`;

    // Notify all audio players and network abort controllers
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in interruption listener:', err);
      }
    }
  }

  onInterrupted(callback: (event: InterruptionEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  reset(): void {
    this._isInterrupted = false;
    this.beginNewTurn();
  }

  updateConfig(config: Partial<InterruptionConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  getConfig(): InterruptionConfig {
    return { ...this.config };
  }
}
