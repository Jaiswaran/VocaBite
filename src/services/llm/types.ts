/**
 * Large Language Model (LLM) Service Interface
 * Designed to support Gemini 3.7 Flash, Gemini 3.1 Pro, or mock fallback models.
 */

import { OrderState, OrderAction } from '../order/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  interrupted?: boolean;
  cutOffContent?: string;
  orderUpdates?: OrderAction[];
}

export interface LLMRequestPayload {
  userUtterance: string;
  conversationHistory: ChatMessage[];
  currentOrder: OrderState;
  generationToken: string; // Token used to invalidate stale in-flight responses when interrupted
  interruptionContext?: {
    previousAssistantUtterance: string;
    interruptedAtMs: number;
  };
}

export interface LLMResponsePayload {
  assistantReply: string;
  orderActions: OrderAction[];
  updatedOrderState: OrderState;
  intent: 'add_item' | 'modify_item' | 'remove_item' | 'query_menu' | 'confirm_order' | 'small_talk' | 'correction' | 'unknown';
  generationToken: string;
  latencyMs: number;
}

export interface LLMService {
  readonly id: string;
  readonly modelName: string;
  
  processUtterance(payload: LLMRequestPayload, signal?: AbortSignal): Promise<LLMResponsePayload>;
}
