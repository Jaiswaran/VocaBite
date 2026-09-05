/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { ConversationView } from './components/ConversationView';
import { ConfirmationModal } from './components/ConfirmationModal';
import { OrderCart } from './components/OrderCart';
import { MenuCatalog } from './components/MenuCatalog';
import { EvidencePage } from './components/EvidencePage';
import { VoiceState } from './components/AudioVisualizer';

import { ConcreteInterruptionController } from './services/interruption/interruptionController';
import { ConcreteOrderManager, createInitialOrderState } from './services/order/orderManager';
import { WebSpeechSTTService } from './services/stt/sttService';
import { RimeTTSProvider } from './services/tts/ttsService';
import { WebAudioRealtimeService } from './services/audio/audioService';
import { GeminiAndMockLLMService } from './services/llm/llmService';
import { ConversationAgent, ConversationState } from './services/conversation/ConversationAgent';

import { ChatMessage } from './services/llm/types';
import { OrderState, MenuItem, SpiceLevel } from './services/order/types';
import { InterruptionEvent } from './services/interruption/types';

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<'landing' | 'ordering' | 'evidence'>('landing');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  // Backend environment & Rime dynamic configuration
  const [backendConfig, setBackendConfig] = useState<{
    hasGeminiKey: boolean;
    hasRimeKey: boolean;
    hasLiveKit: boolean;
    geminiModel: string;
    rimeSpeaker: string;
  }>({
    hasGeminiKey: true,
    hasRimeKey: false,
    hasLiveKit: false,
    geminiModel: 'gemini-3.6-flash',
    rimeSpeaker: 'marsh',
  });

  // Core Service Instances
  const interruptionControllerRef = useRef(new ConcreteInterruptionController());
  const orderManagerRef = useRef(new ConcreteOrderManager());
  const sttServiceRef = useRef(new WebSpeechSTTService());
  const ttsServiceRef = useRef(new RimeTTSProvider());
  const audioServiceRef = useRef(new WebAudioRealtimeService());
  const llmServiceRef = useRef(new GeminiAndMockLLMService());
  const conversationAgentRef = useRef<ConversationAgent | null>(null);

  // Conversation & Order Reactive States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [orderState, setOrderState] = useState<OrderState>(createInitialOrderState());
  const [interruptionEvents, setInterruptionEvents] = useState<InterruptionEvent[]>([]);

  // Live Audio & Engine States
  const [agentState, setAgentState] = useState<ConversationState>('IDLE');
  const [volume, setVolume] = useState(0);
  const [frequencies, setFrequencies] = useState<Uint8Array | undefined>(undefined);
  const [statusText, setStatusText] = useState<string>('');
  const [detectedSpeechSnippet, setDetectedSpeechSnippet] = useState<string>('');

  const isAiSpeakingRef = useRef(false);
  const aiSpeakStartTimeRef = useRef(0);
  const isSttPatchedRef = useRef(false);

  useEffect(() => {
    isAiSpeakingRef.current = agentState === 'SPEAKING';
    if (agentState === 'SPEAKING') {
      aiSpeakStartTimeRef.current = Date.now();
    }
  }, [agentState]);

  // Determine current Voice State for visualizer
  const voiceState: VoiceState = agentState === 'INTERRUPTED'
    ? 'interrupted'
    : agentState === 'SPEAKING'
    ? 'speaking'
    : agentState === 'THINKING'
    ? 'thinking'
    : agentState === 'LISTENING'
    ? 'listening'
    : 'idle';

  // Fetch dynamic backend configuration on load
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setBackendConfig((prev) => ({
            ...prev,
            ...data,
          }));
        }
      })
      .catch((err) => console.log('Config fetch notice:', err));
  }, []);

  // Initialize ConversationAgent
  useEffect(() => {
    if (!conversationAgentRef.current) {
      conversationAgentRef.current = new ConversationAgent({
        stt: sttServiceRef.current,
        llm: llmServiceRef.current,
        tts: ttsServiceRef.current,
        orderManager: orderManagerRef.current,
        interruptionController: interruptionControllerRef.current,
        onStateChange: (state) => {
          setAgentState(state);
          if (state === 'LISTENING') setStatusText('Listening... Say your order or change anytime.');
          else if (state === 'THINKING') setStatusText('Thinking and updating order...');
          else if (state === 'INTERRUPTED') setStatusText('Barge-in caught — listening to your updated request...');
          else if (state === 'ERROR') setStatusText('An error occurred. Please try again.');
          else if (state === 'IDLE') setStatusText('Voice input paused.');
          else if (state === 'SPEAKING') setStatusText('');
        },
        onMessageAdded: (msg) => {
          setMessages((prev) => {
            // Check for direct conversational confirmation trigger
            if (msg.role === 'user') {
              const lowerUtterance = msg.content.toLowerCase();
              if (
                lowerUtterance.includes('place order') ||
                lowerUtterance.includes('place my order') ||
                lowerUtterance.includes("that's all") ||
                lowerUtterance.includes("here's what i have") ||
                lowerUtterance.includes('confirm order')
              ) {
                setIsConfirmationOpen(true);
              }
            }
            return [...prev, msg];
          });
        },
        onError: (err) => console.error('Agent Error:', err),
      });
    }
  }, []);

  // Sync with Order Manager
  useEffect(() => {
    const unsub = orderManagerRef.current.subscribe((newState) => {
      setOrderState({ ...newState });
    });
    return unsub;
  }, []);

  // Interruption Controller Listener
  useEffect(() => {
    const unsub = interruptionControllerRef.current.onInterrupted((event) => {
      setInterruptionEvents((prev) => [event, ...prev]);
      
      // Update UI transcript to show interrupted
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'assistant') {
            next[i] = {
              ...next[i],
              interrupted: true,
            };
            break;
          }
        }
        return next;
      });
    });

    return unsub;
  }, []);

  const handleProcessUserUtterance = useCallback(async (utteranceText: string) => {
    await ttsServiceRef.current.initialize?.();
    if (conversationAgentRef.current) {
      await conversationAgentRef.current.processUtterance(utteranceText);
    }
  }, []);

  // Toggle Microphone / Continuous Listening Session
  const toggleListening = async () => {
    if (agentState === 'LISTENING' || agentState === 'SPEAKING' || agentState === 'THINKING') {
      conversationAgentRef.current?.stopListening();
      audioServiceRef.current.stopCapture();
      setVolume(0);
    } else {
      try {
        await ttsServiceRef.current.initialize?.();
        await audioServiceRef.current.initialize();
        await audioServiceRef.current.startCapture((data) => {
          setVolume(data.volume);
          setFrequencies(data.frequencies);
        });

        // Patch STT event listeners to also trigger barge in via audio activity/speech events
        if (!isSttPatchedRef.current) {
          const originalStartListening = sttServiceRef.current.startListening.bind(sttServiceRef.current);
          sttServiceRef.current.startListening = async (onRes, onStart, onEnd, onError) => {
            return originalStartListening(
              (event) => {
                setDetectedSpeechSnippet(event.transcript);
                
                // Use a longer grace period (800ms) to ignore the initial echo of the AI speaking
                const hasGracePeriodPassed = Date.now() - aiSpeakStartTimeRef.current > 800;
                // Only barge in if the transcript has actual content (length > 2) to ignore random noise/coughs
                const hasActualSpeech = event.transcript && event.transcript.trim().length > 2;

                if (isAiSpeakingRef.current && hasGracePeriodPassed && hasActualSpeech) {
                  interruptionControllerRef.current.triggerBargeIn({
                    interruptedAtMs: Date.now(),
                    aiUtteranceSnippet: 'AI speech interrupted by speech recognition event',
                    userSpeechSnippet: event.transcript,
                    triggerType: 'stt_partial_text',
                  });
                }

                onRes(event);

                if (event.isFinal) {
                  setDetectedSpeechSnippet('');
                }
              },
              () => {
                if (onStart) onStart();
              },
              onEnd,
              onError
            );
          };
          isSttPatchedRef.current = true;
        }

        await conversationAgentRef.current?.startListening();
      } catch (err: any) {
        console.error('Failed to start microphone audio:', err);
        setStatusText('Microphone permission denied. Please allow microphone access or open the app in a new tab.');
      }
    }
  };

  // Cart helper functions
  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    orderManagerRef.current.applyAction({
      type: 'UPDATE_QUANTITY',
      cartItemId,
      quantity: newQty,
    });
  };

  const handleRemoveItem = (cartItemId: string) => {
    orderManagerRef.current.applyAction({
      type: 'REMOVE_ITEM',
      cartItemId,
    });
  };

  const handleUpdateSpice = (cartItemId: string, spice: SpiceLevel) => {
    orderManagerRef.current.applyAction({
      type: 'UPDATE_CUSTOMIZATION',
      cartItemId,
      spiceLevel: spice,
    });
  };

  const handleFinalConfirmOrder = () => {
    orderManagerRef.current.applyAction({
      type: 'SET_STATUS',
      status: 'confirmed',
    });
    setIsConfirmationOpen(false);

    const confirmationSpeech = `Awesome! Your order for ${orderState.items.length} items totaling $${orderState.total.toFixed(2)} is placed and sent to the kitchen.`;

    const msg: ChatMessage = {
      id: `msg_order_confirmed_${Date.now()}`,
      role: 'assistant',
      content: `🎉 ${confirmationSpeech}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);

    ttsServiceRef.current.speak(confirmationSpeech, {
      generationToken: interruptionControllerRef.current.beginNewTurn(),
    });
  };

  const handleClearOrder = () => {
    orderManagerRef.current.resetOrder();
  };

  const handleSelectMenuItem = (item: MenuItem, spiceLevel?: SpiceLevel) => {
    orderManagerRef.current.applyAction({
      type: 'ADD_ITEM',
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      spiceLevel: spiceLevel || item.defaultSpiceLevel || 'medium',
    });
    setIsMenuOpen(false);
    if (currentView === 'landing') {
      setCurrentView('ordering');
    }
  };

  const handleResetConversation = () => {
    interruptionControllerRef.current.reset();
    conversationAgentRef.current?.reset();
    setMessages([]);
    setInterruptionEvents([]);
  };


  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950">
      {/* Top Header with VocaBite branding & navigation */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        orderState={orderState}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        voiceState={voiceState}
        backendConfig={backendConfig}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' ? (
          <LandingPage
            onStartTalking={() => {
              setCurrentView('ordering');
              setTimeout(() => {
                toggleListening();
              }, 300);
            }}
            onOpenEvidence={() => setCurrentView('evidence')}
            onOpenMenu={() => setIsMenuOpen(true)}
            onTryExamplePhrase={(phrase) => {
              setCurrentView('ordering');
              setTimeout(() => {
                toggleListening();
                handleProcessUserUtterance(phrase);
              }, 400);
            }}
            backendConfig={backendConfig}
          />
        ) : currentView === 'evidence' ? (
          <EvidencePage
            onBackToApp={() => setCurrentView('ordering')}
            backendConfig={backendConfig}
          />
        ) : (
          <ConversationView
            messages={messages}
            voiceState={voiceState}
            interruptionEvents={interruptionEvents}
            volume={volume}
            frequencies={frequencies}
            orderState={orderState}
            onToggleMic={toggleListening}
            onSendTextUtterance={handleProcessUserUtterance}
            onOpenConfirmation={() => setIsConfirmationOpen(true)}
            onOpenCart={() => setIsCartOpen(true)}
            onResetConversation={handleResetConversation}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            statusText={statusText}
            detectedSpeechSnippet={detectedSpeechSnippet}
            backendConfig={backendConfig}
          />
        )}
      </main>

      {/* Confirmation Modal ("Here's what I have:") */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        orderState={orderState}
        onFinalConfirm={handleFinalConfirmOrder}
        onContinueTalking={() => {
          setIsConfirmationOpen(false);
          if (agentState !== 'LISTENING') toggleListening();
        }}
      />

      {/* Order Cart Drawer */}
      <OrderCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        orderState={orderState}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onUpdateSpice={handleUpdateSpice}
        onConfirmOrder={() => {
          setIsCartOpen(false);
          setIsConfirmationOpen(true);
        }}
        onClearOrder={handleClearOrder}
      />

      {/* Menu Catalog Modal */}
      <MenuCatalog
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectMenuItem={handleSelectMenuItem}
      />
    </div>
  );
}
