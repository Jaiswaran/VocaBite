import React from 'react';
import { Mic, ArrowRight, Sparkles, Volume2, Flame, Layers, ShieldCheck, Check, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { MENU_ITEMS } from '../services/order/menu';

interface LandingPageProps {
  onStartTalking: () => void;
  onOpenMenu: () => void;
  onTryExamplePhrase?: (phrase: string) => void;
  backendConfig?: {
    hasGeminiKey: boolean;
    hasRimeKey: boolean;
    geminiModel: string;
    rimeSpeaker: string;
  };
}

const EXAMPLES = [
  { text: 'I want a paneer biryani.', category: 'dish' },
  { text: 'Make it spicy.', category: 'spice' },
  { text: 'Actually, remove the Coke.', category: 'correction' },
  { text: 'Add two garlic naans.', category: 'addition' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartTalking,
  onOpenMenu,
  onTryExamplePhrase,
  backendConfig,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8 pt-4">
        {/* Subtitle Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold uppercase tracking-wider"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Conversational Voice-First Food Ordering</span>
        </motion.div>

        {/* Core Hero Statement */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-neutral-100 tracking-tight max-w-4xl mx-auto leading-[1.1] font-display"
        >
          “Just tell me what you{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
            want to eat
          </span>.”
        </motion.h1>

        {/* Supporting Narrative */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-neutral-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-normal"
        >
          Order food naturally by speaking instead of navigating complicated menus. Talk naturally. Change your mind. I'll keep up.
        </motion.p>

        {/* Primary CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <button
            onClick={onStartTalking}
            className="w-full sm:w-auto px-10 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-neutral-950 font-bold text-lg hover:brightness-110 active:scale-98 transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-3 group"
            id="landing-hero-start-btn"
          >
            <Mic className="w-6 h-6 stroke-[2.5] group-hover:scale-110 transition-transform" />
            <span>Start Talking</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

        </motion.div>
      </section>
      <section className="space-y-4 max-w-3xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="text-xs uppercase tracking-widest text-neutral-400 font-bold">
            Try Saying Anything
          </h2>
          <p className="text-sm text-neutral-300">
            Tap an example to begin conversation or speak your custom craving:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {EXAMPLES.map((ex, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (onTryExamplePhrase) {
                  onTryExamplePhrase(ex.text);
                } else {
                  onStartTalking();
                }
              }}
              className="p-4 rounded-2xl bg-neutral-900/70 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/40 text-left transition-all group flex items-center justify-between"
              id={`landing-example-phrase-${idx}`}
            >
              <div className="space-y-1">
                <span className="text-[11px] text-amber-400/90 font-mono font-medium block capitalize">
                  {ex.category}
                </span>
                <span className="text-sm font-medium text-neutral-200 group-hover:text-amber-300 transition-colors">
                  “{ex.text}”
                </span>
              </div>
              <Mic className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 shrink-0 transition-colors ml-2" />
            </motion.button>
          ))}
        </div>
      </section>

      {/* The Conversational Differentiator: Talk Naturally */}
      <section className="p-6 sm:p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-sm relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Fluid Barge-In Voice Experience</span>
          </div>

          <h3 className="text-2xl font-bold text-neutral-100 font-display">
            Talk naturally. Change your mind. I'll keep up.
          </h3>

          <p className="text-sm text-neutral-300 leading-relaxed">
            Unlike legacy bots where you must wait in silence or tap a button, you can interrupt whenever you want. The AI instantly halts playback, invalidates previous speech tokens, and incorporates your new direction seamlessly.
          </p>
        </div>

        {/* Live Conversation Simulation snippet */}
        <div className="mt-6 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 font-mono text-xs space-y-2.5">
          <div className="flex items-start gap-2.5 text-neutral-300">
            <span className="text-emerald-400 font-bold shrink-0">You:</span>
            <span>"I want a chicken biryani, make it spicy. And one Coke."</span>
          </div>
          <div className="flex items-start gap-2.5 text-neutral-400">
            <span className="text-amber-400 font-bold shrink-0">VocaBite:</span>
            <span>"Adding one spicy chicken biryani and one Co—"</span>
            <span className="text-red-400 text-[10px] bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded font-sans shrink-0 ml-auto">
              Auto-Interrupted
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-neutral-300">
            <span className="text-emerald-400 font-bold shrink-0">You:</span>
            <span>"Wait, make the biryani less spicy."</span>
          </div>
          <div className="flex items-start gap-2.5 text-amber-300">
            <span className="text-amber-400 font-bold shrink-0">VocaBite:</span>
            <span>"Understood! Switched the biryani to mild. Anything else to add?"</span>
          </div>
        </div>
      </section>

      {/* Subtle Powered by Rime & Gemini Section */}
      <section className="border-t border-neutral-850 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-neutral-300 font-medium">Powered by Rime TTS</span>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.2 rounded font-mono">
              {backendConfig?.rimeSpeaker ? `Speaker: ${backendConfig.rimeSpeaker}` : 'Neural Voice'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-300 font-medium">Gemini 3.7 Flash</span>
          </div>
        </div>

        <button
          onClick={onOpenMenu}
          className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
        >
          View Kitchen Menu ({MENU_ITEMS.length} dishes) →
        </button>
      </section>
    </div>
  );
};
