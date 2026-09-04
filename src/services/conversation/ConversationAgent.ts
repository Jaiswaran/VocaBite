import { STTService } from '../stt/types';
import { LLMService, ChatMessage, LLMResponsePayload } from '../llm/types';
import { TTSService } from '../tts/types';
import { OrderManager } from '../order/types';
import { InterruptionController } from '../interruption/types';

export type ConversationState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'ERROR';

export interface ConversationTurn {
  id: string;
  userUtterance: string;
  assistantResponseId?: string;
  assistantReply?: string;
  timestamp: number;
  interrupted: boolean;
}

export interface ConversationAgentOptions {
  stt: STTService;
  llm: LLMService;
  tts: TTSService;
  orderManager: OrderManager;
  interruptionController: InterruptionController;
  onStateChange: (state: ConversationState) => void;
  onMessageAdded: (message: ChatMessage) => void;
  onTurnStart?: (turnId: string) => void;
  onTurnComplete?: (turnId: string) => void;
  onError?: (error: Error) => void;
}

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

  constructor(options: ConversationAgentOptions) {
    this.stt = options.stt;
    this.llm = options.llm;
    this.tts = options.tts;
    this.orderManager = options.orderManager;
    this.interruptionController = options.interruptionController;
    this.onStateChange = options.onStateChange;
    this.onMessageAdded = options.onMessageAdded;
    this.onTurnStart = options.onTurnStart;
    this.onTurnComplete = options.onTurnComplete;
    this.onErrorCb = options.onError;

    // Listen for barge-in events
    this.interruptionController.onInterrupted((event) => {
      this.handleInterruption(event);
    });
  }

  get state(): ConversationState {
    return this.currentState;
  }

  get history(): ChatMessage[] {
    return this.messages;
  }

  private setState(state: ConversationState) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.onStateChange(state);
  }

  private generateTurnId(): string {
    this.turnCounter++;
    return `turn_${this.turnCounter.toString().padStart(3, '0')}`;
  }

  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Main entry point for a user utterance (from STT or text input).
   */
  async processUtterance(text: string): Promise<void> {
    if (!text.trim()) return;
    
    // We do not allow multiple active responses. Abort current one.
    this.cancelActiveResponse();

    const turnId = this.generateTurnId();
    const generationToken = this.interruptionController.beginNewTurn();
    console.log(`[ConversationAgent] NEW_TURN_STARTED: ${turnId}`);
    this.onTurnStart?.(turnId);

    this.setState('THINKING');

    const userMsg: ChatMessage = {
      id: `msg_${turnId}_u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    
    this.addMessage(userMsg);

    this.activeAbortController = new AbortController();
    const responseId = this.generateResponseId();
    this.activeResponseId = responseId;

    try {
      const response = await this.llm.processUtterance({
        userUtterance: text,
        conversationHistory: this.messages, // including current user msg
        currentOrder: this.orderManager.state,
        generationToken,
      }, this.activeAbortController.signal);

      // Verify token hasn't been invalidated by barge-in
      if (!this.interruptionController.isTokenValid(generationToken)) {
        console.log(`[ConversationAgent] RESPONSE_INVALIDATED: Turn ${turnId} aborted due to barge-in before TTS.`);
        return;
      }

      // Ensure we are still the active response
      if (this.activeResponseId !== responseId) {
        console.log(`[ConversationAgent] STALE_AUDIO_DISCARDED: Response ${responseId} is no longer active.`);
        return;
      }

      // Apply actions to OrderManager
      if (response.orderActions && response.orderActions.length > 0) {
        this.orderManager.applyActions(response.orderActions);
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${turnId}_a_${responseId}`,
        role: 'assistant',
        content: response.assistantReply,
        timestamp: Date.now(),
        orderUpdates: response.orderActions,
      };

      this.addMessage(assistantMsg);

      // Play audio response
      this.setState('SPEAKING');

      await this.tts.speak(response.assistantReply, {
        generationToken,
        responseId,
        onStart: () => {
          if (this.interruptionController.isTokenValid(generationToken) && this.activeResponseId === responseId) {
            this.setState('SPEAKING');
          }
        },
        onEnd: () => {
          if (this.activeResponseId === responseId) {
            this.setState('LISTENING'); // Wait for next turn
            this.activeResponseId = null;
            this.onTurnComplete?.(turnId);
          }
        },
        onError: (err) => {
          console.error('[ConversationAgent] TTS Error:', err);
          if (this.activeResponseId === responseId) {
            this.setState('LISTENING');
            this.activeResponseId = null;
          }
        },
        onInterrupted: () => {
          // handled globally by handleInterruption, but could be specific here
        }
      });
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[ConversationAgent] LLM_CANCELLED: LLM for turn ${turnId} aborted.`);
        return;
      }
      this.setState('ERROR');
      this.onErrorCb?.(err);
      console.error(`[ConversationAgent] Error in turn ${turnId}:`, err);
    }
  }

  private handleInterruption(event: any) {
    console.log(`[ConversationAgent] INTERRUPTION_DETECTED:`, event);
    this.cancelActiveResponse();
    this.setState('INTERRUPTED');
    
    // Mark last assistant message as interrupted if applicable
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') {
        this.messages[i].interrupted = true;
        break;
      }
    }
    
    // Resume listening after interruption
    setTimeout(() => {
      if (this.currentState === 'INTERRUPTED') {
        this.setState('LISTENING');
      }
    }, 1000);
  }

  private cancelActiveResponse() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.tts.stop('interrupted');
    this.activeResponseId = null;
  }

  private addMessage(msg: ChatMessage) {
    this.messages = [...this.messages, msg];
    this.onMessageAdded(msg);
  }

  async startListening() {
    this.setState('LISTENING');
    await this.stt.startListening(
      (result) => {
        // If speaking and vad hits, trigger barge-in via InterruptionController
        // We will assume the App handles wiring STT partials/volume to InterruptionController
        // If final result, process utterance
        if (result.isFinal) {
          this.processUtterance(result.transcript);
        }
      },
      () => {}, // speech start
      () => {}, // speech end
      (err) => {
        this.setState('ERROR');
        this.onErrorCb?.(err);
      }
    );
  }

  async stopListening() {
    await this.stt.stopListening();
    this.cancelActiveResponse();
    this.setState('IDLE');
  }

  reset() {
    this.cancelActiveResponse();
    this.turnCounter = 0;
    this.messages = [];
    this.setState('IDLE');
  }
}
