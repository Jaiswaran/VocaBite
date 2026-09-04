import React from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, Flame, CheckCircle2, UtensilsCrossed, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderState, SpiceLevel } from '../services/order/types';

interface OrderCartProps {
  isOpen: boolean;
  onClose: () => void;
  orderState: OrderState;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onUpdateSpice: (cartItemId: string, spice: SpiceLevel) => void;
  onConfirmOrder: () => void;
  onClearOrder: () => void;
}

const SPICE_COLORS: Record<SpiceLevel, string> = {
  mild: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  spicy: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  extra_spicy: 'bg-red-500/15 text-red-400 border-red-500/40',
};

export const OrderCart: React.FC<OrderCartProps> = ({
  isOpen,
  onClose,
  orderState,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateSpice,
  onConfirmOrder,
  onClearOrder,
}) => {
  if (!isOpen) return null;

  const isConfirmed = orderState.status === 'confirmed' || orderState.status === 'cooking';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Cart Drawer Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-neutral-100 font-display">Your Order Receipt</h2>
              <span className="text-xs text-neutral-400 font-mono">{orderState.orderId}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
            id="close-cart-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Status Timeline */}
        <div className="px-5 py-3 bg-neutral-950/30 border-b border-neutral-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConfirmed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            <span className="font-semibold text-neutral-300 capitalize">
              Status: {isConfirmed ? 'Order Confirmed' : orderState.items.length === 0 ? 'Empty' : 'Voice Drafting'}
            </span>
          </div>
          {orderState.items.length > 0 && !isConfirmed && (
            <button
              onClick={onClearOrder}
              className="text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Item List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {orderState.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-3">
              <UtensilsCrossed className="w-12 h-12 text-neutral-700" />
              <p className="font-semibold text-neutral-300">Your cart is empty</p>
              <p className="text-xs text-neutral-500 max-w-xs">
                Speak your order aloud, like: "I want a chicken biryani spicy and one Coke."
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderState.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-neutral-100">{item.name}</h4>
                      <div className="text-xs text-amber-400 font-semibold">
                        ₹{item.price.toFixed(0)} each
                      </div>
                    </div>
                    <span className="font-bold text-sm text-neutral-100">
                      ₹{item.itemTotal.toFixed(0)}
                    </span>
                  </div>

                  {/* Spice Level & Customization Options */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {item.customization.spiceLevel && (
                      <div className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${SPICE_COLORS[item.customization.spiceLevel]}`}>
                        <Flame className="w-3 h-3" />
                        <span className="capitalize">{item.customization.spiceLevel.replace('_', ' ')}</span>
                      </div>
                    )}

                    {item.customization.selectedOptions?.map((opt, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-neutral-900 text-neutral-300 border border-neutral-800 px-2 py-0.5 rounded-lg"
                      >
                        +{opt.name} (₹{opt.price.toFixed(0)})
                      </span>
                    ))}
                  </div>

                  {/* Quantity & Remove Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-xs text-neutral-200 px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors p-1"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bill Breakdown & Checkout */}
        {orderState.items.length > 0 && (
          <div className="p-5 border-t border-neutral-800 bg-neutral-950/90 space-y-3">
            <div className="space-y-1.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-neutral-200 font-mono">₹{orderState.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax (8.25%)</span>
                <span className="text-neutral-200 font-mono">₹{orderState.tax.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-neutral-200 font-mono">
                  {orderState.deliveryFee === 0 ? <span className="text-emerald-400">Free</span> : `₹${orderState.deliveryFee.toFixed(0)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-neutral-100 pt-2 border-t border-neutral-800">
                <span>Total</span>
                <span className="text-amber-400 font-mono text-base">₹{orderState.total.toFixed(0)}</span>
              </div>
            </div>

            {isConfirmed ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Order Placed & Sent to Kitchen!</span>
              </div>
            ) : (
              <button
                onClick={onConfirmOrder}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                id="confirm-order-btn"
              >
                <span>Confirm & Place Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
