import React from 'react';
import { Mic, Sparkles, Volume2, ShoppingBag, Layers, Utensils, Check, Radio } from 'lucide-react';
import { OrderState } from '../services/order/types';
import { VoiceState } from './AudioVisualizer';

interface HeaderProps {
  currentView: 'landing' | 'ordering' | 'evidence';
  onNavigate: (view: 'landing' | 'ordering' | 'evidence') => void;
  orderState: OrderState;
  onOpenCart: () => void;
  onOpenMenu: () => void;
  voiceState: VoiceState;
  backendConfig?: {
    hasGeminiKey: boolean;
    hasRimeKey: boolean;
    geminiModel: string;
    rimeSpeaker: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  orderState,
  onOpenCart,
  onOpenMenu,
  voiceState,
  backendConfig,
}) => {
  const itemCount = orderState.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Name & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
            id="brand-logo-btn"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
              <Mic className="w-5 h-5 text-neutral-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-neutral-100 font-display transition-colors group-hover:text-amber-400">
                  VocaBite
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Voice
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-900/80 p-1 rounded-2xl border border-neutral-800/80 text-xs font-semibold">
          <button
            onClick={() => onNavigate('ordering')}
            className={`px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
              currentView === 'ordering'
                ? 'bg-amber-500 text-neutral-950'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            id="nav-ordering-btn"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Order</span>
          </button>

          <button
            onClick={() => onNavigate('landing')}
            className={`px-3.5 py-1.5 rounded-xl transition-colors ${
              currentView === 'landing'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            id="nav-landing-btn"
          >
            Overview
          </button>

          <button
            onClick={onOpenMenu}
            className="px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1.5"
            id="nav-menu-btn"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Menu</span>
          </button>
        </nav>

        {/* Right Action Icons & Badges */}
        <div className="flex items-center gap-3">
          {/* Rime Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium">Rime TTS</span>
            <span className="text-[10px] text-sky-400/90 font-mono">
              ({backendConfig?.rimeSpeaker || 'marsh'})
            </span>
          </div>

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-200 text-xs font-semibold transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            id="header-cart-btn"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Cart</span>
            {itemCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center text-[10px] font-bold shadow-md shadow-amber-500/30">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
