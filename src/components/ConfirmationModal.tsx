import React from 'react';
import { X, CheckCircle2, ShoppingBag, ArrowRight, Flame, Sparkles, Utensils, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderState, SpiceLevel } from '../services/order/types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderState: OrderState;
  onFinalConfirm: () => void;
  onContinueTalking: () => void;
}

const SPICE_BADGES: Record<SpiceLevel, { label: string; color: string }> = {
  mild: { label: 'Mild', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  medium: { label: 'Medium', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  spicy: { label: 'Spicy', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  extra_spicy: { label: 'Extra Spicy', color: 'bg-red-500/15 text-red-400 border-red-500/40' },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  orderState,
  onFinalConfirm,
  onContinueTalking,
}) => {
  if (!isOpen) return null;

  const totalQuantity = orderState.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-950/70 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Conversational Review</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-100 font-display">
              “Here’s what I have:”
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
            id="close-confirmation-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Itemized Review List */}
        <div className="p-6 max-h-96 overflow-y-auto space-y-3">
          {orderState.items.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-sm">
              No items in your order yet. Speak to add food!
            </div>
          ) : (
            orderState.items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      {item.quantity}×
                    </span>
                    <h3 className="font-semibold text-sm text-neutral-100">{item.name}</h3>
                  </div>

                  {/* Customizations */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {item.customization.spiceLevel && (
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          SPICE_BADGES[item.customization.spiceLevel]?.color || ''
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>{SPICE_BADGES[item.customization.spiceLevel]?.label || item.customization.spiceLevel}</span>
                      </span>
                    )}
                    {item.customization.selectedOptions?.map((opt, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-neutral-900 text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-800"
                      >
                        +{opt.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-sm text-neutral-100">
                    ₹{item.itemTotal.toFixed(0)}
                  </span>
                  <div className="text-[11px] text-neutral-400">
                    (₹{item.price.toFixed(0)} ea)
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Total Summary */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-950/90 space-y-4">
          <div className="space-y-1 text-xs text-neutral-400">
            <div className="flex justify-between">
              <span>Subtotal ({totalQuantity} items)</span>
              <span className="text-neutral-200 font-mono">₹{orderState.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tax (8.25%)</span>
              <span className="text-neutral-200 font-mono">₹{orderState.tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="text-emerald-400 font-medium">Free Delivery</span>
            </div>
            <div className="flex justify-between text-base font-bold text-neutral-100 pt-2 border-t border-neutral-800">
              <span>Total Amount</span>
              <span className="text-amber-400 font-mono text-lg">₹{orderState.total.toFixed(0)}</span>
            </div>
          </div>

          {/* Conversational Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={onFinalConfirm}
              disabled={orderState.items.length === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-base transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              id="confirm-place-order-conversational-btn"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Yes, Looks Great — Place My Order</span>
            </button>

            <button
              onClick={onContinueTalking}
              className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              id="continue-talking-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Wait, I want to change or add something (Keep Talking)</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
