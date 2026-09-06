import { STTService } from '../stt/types';
import { LLMService, ChatMessage } from '../llm/types';
import { TTSService } from '../tts/types';
import { OrderManager } from '../order/types';
import { InterruptionController } from '../interruption/types';

export type ConversationState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'ERROR';
export interface ConversationTurn { id: string; userUtterance: string; assistantResponseId?: string; assistantReply?: string; timestamp: number; interrupted: boolean; }
export interface ConversationAgentOptions { stt: STTService; llm: LLMService; tts: TTSService; orderManager: OrderManager; interruptionController: InterruptionController; onStateChange: (state: ConversationState) => void; onMessageAdded: (message: ChatMessage) => void; onTurnStart?: (turnId: string) => void; onTurnComplete?: (turnId: string) => void; onError?: (error: Error) => void; }

export class ConversationAgent {
  private stt: STTService;
  private llm: LLMService;
  private tts: TTSService;
  private orderManager: OrderManager;
  private interruptionController: InterruptionController;
  private currentState: ConversationState = 'IDLE';
  private turnCounter = 0;
  private messages: ChatMessage[] = [];
  private activeAbortController: AbortController | null = null;
  private activeResponseId: string | null = null;
  private onStateChange: (state: ConversationState) => void;
  private onMessageAdded: (message: ChatMessage) => void;
  private onTurnStart?: (turnId: string) => void;
  private onTurnComplete?: (turnId: string) => void;
  private onErrorCb?: (error: Error) => void;
  private lastProcessedUtterance = '';
  private lastProcessedTime = 0;

  constructor(options: ConversationAgentOptions) {
    this.stt = options.stt; this.llm = options.llm; this.tts = options.tts; this.orderManager = options.orderManager; this.interruptionController = options.interruptionController;
    this.onStateChange = options.onStateChange; this.onMessageAdded = options.onMessageAdded; this.onTurnStart = options.onTurnStart; this.onTurnComplete = options.onTurnComplete; this.onErrorCb = options.onError;
    this.interruptionController.onInterrupted((event) => this.handleInterruption(event));
  }
  get state(): ConversationState { return this.currentState; }
  get history(): ChatMessage[] { return this.messages; }
  private setState(state: ConversationState) { if (this.currentState === state) return; this.currentState = state; this.onStateChange(state); }
  private generateTurnId(): string { this.turnCounter++; return `turn_${this.turnCounter.toString().padStart(3, '0')}`; }
  private generateResponseId(): string { return `resp_${Date.now()}_${Math.floor(Math.random() * 1000)}`; }

  async processUtterance(text: string): Promise<void> {
    const transcriptReadyTime = Date.now();
    const trimmedText = text.trim();
    if (!trimmedText) return;
    if (this.lastProcessedUtterance === trimmedText && Date.now() - this.lastProcessedTime < 2000) return;
    this.lastProcessedUtterance = trimmedText; this.lastProcessedTime = Date.now();
    this.cancelActiveResponse();
    const turnId = this.generateTurnId();
    const generationToken = this.interruptionController.beginNewTurn();
    this.onTurnStart?.(turnId); this.setState('THINKING');
    this.addMessage({ id: `msg_${turnId}_u`, role: 'user', content: text, timestamp: Date.now() });
    this.activeAbortController = new AbortController();
    const responseId = this.generateResponseId(); this.activeResponseId = responseId;

    try {
      const llmStartTime = Date.now();
      const response = await this.llm.processUtterance({ userUtterance: text, conversationHistory: this.messages, currentOrder: this.orderManager.state, generationToken }, this.activeAbortController.signal);
      console.log(`[LATENCY] Order/AI response: ${Date.now() - llmStartTime}ms`);
      if (!this.interruptionController.isTokenValid(generationToken) || this.activeResponseId !== responseId) return;

      if (response.orderActions?.length) this.orderManager.applyActions(response.orderActions);
      this.addMessage({ id: `msg_${turnId}_a_${responseId}`, role: 'assistant', content: response.assistantReply, timestamp: Date.now(), orderUpdates: response.orderActions });

      // Register Rime's exact text with the echo guard before audio starts.
      (this.interruptionController as any).setAssistantSpeech?.(response.assistantReply);
      this.setState('SPEAKING');
      await this.tts.speak(response.assistantReply, {
        generationToken, responseId,
        onStart: () => { if (this.interruptionController.isTokenValid(generationToken) && this.activeResponseId === responseId) this.setState('SPEAKING'); },
        onEnd: () => { if (this.activeResponseId === responseId) { (this.interruptionController as any).clearAssistantSpeech?.(); this.setState('LISTENING'); this.activeResponseId = null; this.onTurnComplete?.(turnId); } },
        onError: (err) => { console.error('[ConversationAgent] TTS Error:', err); (this.interruptionController as any).clearAssistantSpeech?.(); if (this.activeResponseId === responseId) { this.setState('LISTENING'); this.activeResponseId = null; } },
        onInterrupted: () => {},
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      this.setState('ERROR'); this.onErrorCb?.(err); console.error(`[ConversationAgent] Error in turn ${turnId}:`, err);
    }
  }

  private handleInterruption(event: any) {
    this.cancelActiveResponse();
    this.setState('INTERRUPTED');
    for (let i = this.messages.length - 1; i >= 0; i--) if (this.messages[i].role === 'assistant') { this.messages[i].interrupted = true; break; }
    setTimeout(() => { if (this.currentState === 'INTERRUPTED') this.setState('LISTENING'); }, 250);
  }

  private cancelActiveResponse() {
    if (this.activeAbortController) { this.activeAbortController.abort(); this.activeAbortController = null; }
    this.tts.stop('interrupted');
    (this.interruptionController as any).clearAssistantSpeech?.();
    this.activeResponseId = null;
  }
  private addMessage(msg: ChatMessage) { this.messages = [...this.messages, msg]; this.onMessageAdded(msg); }

  async startListening() {
    this.setState('LISTENING');
    await this.stt.startListening((result) => { if (result.isFinal) this.processUtterance(result.transcript); }, () => {}, () => {}, (err) => { this.setState('ERROR'); this.onErrorCb?.(err); });
  }
  async stopListening() { await this.stt.stopListening(); this.cancelActiveResponse(); this.setState('IDLE'); }
  reset() { this.cancelActiveResponse(); this.turnCounter = 0; this.messages = []; this.setState('IDLE'); }
}
