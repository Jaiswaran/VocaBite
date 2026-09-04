import React, { useState } from 'react';
import { X, Flame, Plus, Sparkles, Check, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { MENU_ITEMS } from '../services/order/menu';
import { MenuItem, SpiceLevel } from '../services/order/types';

interface MenuCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMenuItem: (item: MenuItem, spiceLevel?: SpiceLevel) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'biryani', label: 'Biryanis' },
  { id: 'bowls', label: 'Curry Bowls' },
  { id: 'street_eats', label: 'Street Eats' },
  { id: 'breads', label: 'Tandoor Breads' },
  { id: 'beverages', label: 'Drinks' },
  { id: 'desserts', label: 'Desserts' },
];

export const MenuCatalog: React.FC<MenuCatalogProps> = ({
  isOpen,
  onClose,
  onSelectMenuItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = selectedCategory === 'all'
    ? MENU_ITEMS
    : MENU_ITEMS.filter(m => m.category === selectedCategory);

  const handleAddItem = (item: MenuItem) => {
    onSelectMenuItem(item, item.defaultSpiceLevel || 'medium');
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div>
            <h2 className="font-bold text-lg text-neutral-100 font-display">Kitchen Menu</h2>
            <p className="text-xs text-neutral-400">Order by voice at any time or select items below</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
            id="close-menu-catalog-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="p-3 px-5 border-b border-neutral-800/80 bg-neutral-950/30 flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800/70 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 flex gap-4 items-start hover:border-neutral-700 transition-all group"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-24 h-24 rounded-xl object-cover shrink-0 bg-neutral-800"
                referrerPolicy="no-referrer"
              />

              <div className="flex-1 flex flex-col justify-between h-full min-h-[96px]">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-neutral-100 line-clamp-1">{item.name}</h3>
                    <span className="font-bold text-sm text-amber-400 shrink-0">
                      ₹{item.price.toFixed(0)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{item.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5">
                    {item.allowSpiceCustomization && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>Spiceable</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddItem(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      addedItemId === item.id
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200'
                    }`}
                  >
                    {addedItemId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
