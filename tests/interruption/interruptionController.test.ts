import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConcreteInterruptionController } from '../../src/services/interruption/interruptionController';

describe('InterruptionController', () => {
  let controller: ConcreteInterruptionController;

  beforeEach(() => {
    controller = new ConcreteInterruptionController();
  });

  it('generates a valid token on beginNewTurn', () => {
    const token = controller.beginNewTurn();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(controller.isTokenValid(token)).toBe(true);
  });

  it('invalidates previous token when a new turn begins', () => {
    const token1 = controller.beginNewTurn();
    expect(controller.isTokenValid(token1)).toBe(true);

    const token2 = controller.beginNewTurn();
    expect(controller.isTokenValid(token1)).toBe(false);
    expect(controller.isTokenValid(token2)).toBe(true);
  });

  it('triggers barge-in and calls registered listeners', () => {
    const callback = vi.fn();
    controller.onInterrupted(callback);

    controller.triggerBargeIn({
      interruptedAtMs: Date.now(),
      aiUtteranceSnippet: 'some text',
      triggerType: 'stt_speech_start'
    });

    expect(callback).toHaveBeenCalledOnce();
    const arg = callback.mock.calls[0][0];
    expect(arg.triggerType).toBe('stt_speech_start');
    expect(arg.aiUtteranceSnippet).toBe('some text');
  });

  it('barge-in immediately invalidates the active turn', () => {
    const token = controller.beginNewTurn();
    expect(controller.isTokenValid(token)).toBe(true);

    controller.triggerBargeIn({
      interruptedAtMs: Date.now(),
      aiUtteranceSnippet: 'some text',
      triggerType: 'stt_speech_start'
    });

    expect(controller.isTokenValid(token)).toBe(false);
  });
});
