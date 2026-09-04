import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles, ShoppingBag, Flame, RotateCcw, CheckCircle2, Volume2, Radio, UtensilsCrossed, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioVisualizer, VoiceState } from './AudioVisualizer';
import { ChatMessage } from '../services/llm/types';
import { OrderState, SpiceLevel } from '../services/order/types';
import { InterruptionEvent } from '../services/interruption/types';

interface ConversationViewProps {
  messages: ChatMessage[];
  voiceState: VoiceState;
  interruptionEvents: InterruptionEvent[];
  volume: number;
  frequencies?: Uint8Array;
  orderState: OrderState;
  onToggleMic: () => void;
  onSendTextUtterance: (text: string) => void;
  onOpenConfirmation: () => void;
  onOpenCart: () => void;
  onResetConversation: () => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  statusText?: string;
  detectedSpeechSnippet?: string;
  backendConfig?: {
    hasGeminiKey: boolean;
    hasRimeKey: boolean;
    geminiModel: string;
    rimeSpeaker: string;
  };
}

const QUICK_VOICE_SUGGESTIONS = [
  'I want a chicken biryani, make it spicy. And add a Coke.',
  'Wait, make the biryani less spicy.',
  'Add two garlic naans.',
  'What drinks do you have?',
  'Remove the Coke.',
  'Here’s what I have, place my order.',
];

const SPICE_COLORS: Record<SpiceLevel, string> = {
  mild: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  spicy: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
  extra_spicy: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  voiceState,
  interruptionEvents,
  volume,
  frequencies,
  orderState,
  onToggleMic,
  onSendTextUtterance,
  onOpenConfirmation,
  onOpenCart,
  onResetConversation,
  onUpdateQuantity,
  onRemoveItem,
  statusText,
  detectedSpeechSnippet,
  backendConfig,
}) => {
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat smoothly
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, voiceState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendTextUtterance(inputText.trim());
    setInputText('');
  };

  const totalItems = orderState.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Center Left: Voice Interface & Transcript (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Animated Voice Orb (Visual Centerpiece) */}
        <AudioVisualizer
          voiceState={voiceState}
          volume={volume}
          frequencies={frequencies}
          onToggleMic={onToggleMic}
          statusText={statusText}
          connectionStatus="connected"
          detectedSpeechSnippet={detectedSpeechSnippet}
        />

        {/* Live Conversation Transcript */}
        <div className="flex flex-col h-[400px] sm:h-[460px] bg-neutral-900/50 rounded-3xl border border-neutral-800/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Transcript Top Bar */}
          <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-xs text-neutral-200 uppercase tracking-wider">
                Live Conversation Stream
              </span>
              {backendConfig?.hasRimeKey && (
                <span className="ml-2 text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5 opacity-80">
                  <Volume2 className="w-3 h-3 text-emerald-400" /> Rime Voice Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {interruptionEvents.length > 0 && (
                <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
                  {interruptionEvents.length} {interruptionEvents.length === 1 ? 'Barge-In' : 'Barge-Ins'} Caught
                </span>
              )}

              <button
                onClick={onResetConversation}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Restart Conversation"
                id="reset-chat-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Transcript Message Feed */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800/60 flex items-center justify-center text-amber-400">
                  <Mic className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-200 text-sm">Say what you're craving</h3>
                  <p className="text-xs text-neutral-400 max-w-xs">
                    Talk freely. If you change your mind mid-order, just speak up. No buttons required!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      {msg.role === 'user' ? 'You' : 'VocaBite Concierge'}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl max-w-[88%] sm:max-w-[82%] text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-neutral-950 font-medium rounded-tr-sm shadow-md'
                        : 'bg-neutral-950/90 text-neutral-100 border border-neutral-800 rounded-tl-sm shadow-md'
                    }`}
                  >
                    <p>{msg.content}</p>

                    {/* Auto-Interruption Notification Badge */}
                    {msg.interrupted && (
                      <div className="mt-2 pt-2 border-t border-red-500/20 text-[11px] text-red-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                        <span>Cut off & invalidated by user barge-in</span>
                      </div>
                    )}

                    {/* Extracted Structured Order Actions */}
                    {msg.orderUpdates && msg.orderUpdates.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-neutral-800 flex flex-wrap gap-1">
                        {msg.orderUpdates.map((act, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-neutral-900 text-amber-300 px-2 py-0.5 rounded border border-neutral-700 font-mono"
                          >
                            ✓ {act.type.replace('_', ' ')}: {act.name || act.spiceLevel || act.status || 'Applied'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Quick Voice Prompt Suggestions Bar */}
          <div className="p-2.5 px-4 bg-neutral-950/90 border-t border-neutral-800/80 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-neutral-500 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Try:</span>
            </span>
            {QUICK_VOICE_SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => onSendTextUtterance(sug)}
                className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/30 text-neutral-300 hover:text-amber-300 transition-colors shrink-0"
              >
                "{sug}"
              </button>
            ))}
          </div>

          {/* Text input fallback */}
          <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/95">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a voice order correction (e.g. 'make it spicy')..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/40"
                id="conversation-text-input"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold transition-all"
                id="conversation-send-btn"
                aria-label="Send text utterance"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Center Right: Synchronized Live Order Panel (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Current Order Card */}
        <div className="bg-neutral-900/50 rounded-3xl border border-neutral-800/80 backdrop-blur-xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between min-h-[580px]">
          <div className="space-y-4">
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-100 font-display">
                    Current Order
                  </h3>
                  <p className="text-[11px] text-neutral-400">Live synchronized with voice</p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Synchronized Item List */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {orderState.items.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-neutral-400">
                  <UtensilsCrossed className="w-8 h-8 mx-auto text-neutral-700" />
                  <p className="text-xs font-medium text-neutral-300">No items added yet</p>
                  <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                    Try speaking: "I want a paneer biryani, make it spicy."
                  </p>
                </div>
              ) : (
                orderState.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-neutral-100 flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <span className="text-amber-400 font-mono text-xs">× {item.quantity}</span>
                        </div>

                        {/* Spice & Customizations */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {item.customization.spiceLevel && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-0.5 ${SPICE_COLORS[item.customization.spiceLevel]}`}>
                              <Flame className="w-3 h-3" />
                              <span className="capitalize">{item.customization.spiceLevel.replace('_', ' ')}</span>
                            </span>
                          )}
                          {item.customization.selectedOptions?.map((opt, i) => (
                            <span key={i} className="text-[10px] bg-neutral-900 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-800">
                              +{opt.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <span className="font-bold text-xs sm:text-sm text-neutral-200 font-mono">
                        ₹{item.itemTotal.toFixed(0)}
                      </span>
                    </div>

                    {/* Item Inline Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="font-mono px-1 font-bold text-neutral-200">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-[11px] text-neutral-400 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Synchronized Bill Summary & Confirmation Trigger */}
          <div className="pt-4 border-t border-neutral-800/80 space-y-3">
            <div className="space-y-1.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-neutral-200 font-mono">₹{orderState.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax</span>
                <span className="text-neutral-200 font-mono">₹{orderState.tax.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-emerald-400 font-medium">Free</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-neutral-100 pt-1.5 border-t border-neutral-800">
                <span>Total</span>
                <span className="text-amber-400 font-mono text-base">₹{orderState.total.toFixed(0)}</span>
              </div>
            </div>

            {/* Conversational Confirmation Action */}
            <button
              onClick={onOpenConfirmation}
              disabled={orderState.items.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-40"
              id="review-order-conversational-btn"
            >
              <span>Review Order ("Here's what I have")</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
