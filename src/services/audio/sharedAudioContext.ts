let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }

  return sharedAudioContext;
}

export async function resumeSharedAudioContext(): Promise<AudioContext | null> {
  const context = getSharedAudioContext();
  if (context && context.state === 'suspended') {
    await context.resume();
  }
  return context;
}

export function closeSharedAudioContext(): void {
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    void sharedAudioContext.close();
  }
  sharedAudioContext = null;
}
