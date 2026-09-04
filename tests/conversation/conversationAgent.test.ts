import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationAgent } from '../../src/services/conversation/ConversationAgent';
import { ConcreteInterruptionController } from '../../src/services/interruption/interruptionController';
import { ConcreteOrderManager } from '../../src/services/order/orderManager';
import { TTSSpeakOptions } from '../../src/services/tts/types';

describe('ConversationAgent', () => {
  let agent: ConversationAgent;
  let mockSTT: any;
  let mockLLM: any;
  let mockTTS: any;
  let orderManager: ConcreteOrderManager;
  let interruptionController: ConcreteInterruptionController;
  let stateChanges: string[];

  beforeEach(() => {
    stateChanges = [];
    mockSTT = {
      startListening: vi.fn(),
      stopListening: vi.fn()
    };
    mockLLM = {
      processUtterance: vi.fn().mockResolvedValue({
        assistantReply: 'Hello, how can I help?',
        actions: []
      })
    };
    mockTTS = {
      speak: vi.fn().mockImplementation(async (text, options: TTSSpeakOptions) => {
        options.onStart?.();
        options.onEnd?.();
      }),
      stop: vi.fn()
    };
    orderManager = new ConcreteOrderManager();
    interruptionController = new ConcreteInterruptionController();

    agent = new ConversationAgent({
      stt: mockSTT,
      llm: mockLLM,
      tts: mockTTS,
      orderManager,
      interruptionController,
      onStateChange: (state) => stateChanges.push(state),
      onMessageAdded: vi.fn(),
      onTurnComplete: vi.fn(),
      onError: vi.fn(),
    });
  });

  it('starts listening and transitions state', async () => {
    mockSTT.startListening.mockImplementationOnce((onRes, onStart) => {
      onStart();
    });
    
    await agent.startListening();
    expect(mockSTT.startListening).toHaveBeenCalled();
    expect(stateChanges).toContain('LISTENING');
  });

  it('processes a full turn successfully', async () => {
    mockSTT.startListening.mockImplementationOnce((onRes, onStart, onEnd) => {
      onStart();
      onRes({ transcript: 'I want a biryani', isFinal: true });
      onEnd();
    });

    await agent.startListening();
    
    // Check that LLM was called
    expect(mockLLM.processUtterance).toHaveBeenCalled();
    const args = mockLLM.processUtterance.mock.calls[0][0];
    expect(args.userUtterance).toBe('I want a biryani');

    // Wait a tick for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check that TTS was called
    expect(mockTTS.speak).toHaveBeenCalled();
    const speakArgs = mockTTS.speak.mock.calls[0];
    expect(speakArgs[0]).toBe('Hello, how can I help?');

    // Final state should be back to listening if we started listening initially
    expect(stateChanges).toContain('THINKING');
    expect(stateChanges).toContain('SPEAKING');
  });

  it('cancels active response on interruption', async () => {
    // Start a turn
    const turnPromise = agent.processUtterance('Hello');
    
    // Trigger barge-in
    interruptionController.triggerBargeIn({
      interruptedAtMs: Date.now(),
      triggerType: 'stt_speech_start',
      aiUtteranceSnippet: 'interrupted text'
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(stateChanges).toContain('INTERRUPTED');
    expect(mockTTS.stop).toHaveBeenCalledWith('interrupted');
  });
});
