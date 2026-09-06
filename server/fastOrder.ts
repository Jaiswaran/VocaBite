import { MENU_ITEMS, findMenuItemByNameOrQuery } from '../src/services/order/menu';
import { OrderAction, OrderState } from '../src/services/order/types';

export interface FastOrderResult { assistantReply: string; intent: 'add_item' | 'remove_item' | 'modify_item' | 'confirm_order'; orderActions: OrderAction[]; }
const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const aliases: Record<string, string[]> = {
  'biryani-chicken-dum': ['chicken biryani', 'chicken dum biryani', 'royal chicken dum biryani'],
  'biryani-lamb-shank': ['lamb biryani', 'mutton biryani', 'hyderabadi lamb biryani'],
  'biryani-paneer-veg': ['veg biryani', 'vegetable biryani', 'paneer biryani', 'nawabi paneer'],
  'bowl-butter-chicken': ['butter chicken', 'butter chicken bowl', 'butter chicken rice bowl'],
  'bowl-tikka-masala': ['paneer tikka', 'tikka masala', 'paneer tikka masala'],
  'street-samosa-trio': ['samosa', 'samosas'],
  'street-chicken-65': ['chicken 65'],
  'bread-garlic-naan': ['naan', 'garlic naan', 'garlic butter naan'],
  'bev-coke': ['coke', 'coca cola', 'coca-cola', 'soda'],
  'bev-diet-coke': ['diet coke'],
  'bev-mango-lassi': ['mango lassi', 'lassi'],
  'dessert-gulab-jamun': ['gulab jamun', 'jamun'],
};
function hasPhrase(text: string, phrase: string): boolean { return (` ${text} `).includes(` ${phrase} `); }
function quantityFor(text: string, itemAliases: string[]): number {
  for (const phrase of itemAliases) {
    for (const [word, value] of Object.entries(numberWords)) if (hasPhrase(text, `${word} ${phrase}`)) return value;
    for (let n = 1; n <= 5; n++) if (hasPhrase(text, `${n} ${phrase}`)) return n;
  }
  return 1;
}

export function tryFastOrder(utterance: string, currentOrder: OrderState): FastOrderResult | null {
  const text = utterance.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (/^(confirm|confirm order|place order|checkout|that's all|thats all|nothing else)$/.test(text)) {
    return { assistantReply: currentOrder.items.length ? `Your order total is ₹${currentOrder.total.toFixed(0)}. Ready to place it?` : 'Your cart is empty. What would you like to order?', intent: 'confirm_order', orderActions: [] };
  }

  if (/^(remove|delete|take off|drop)\b/.test(text)) {
    const query = text.replace(/^(remove|delete|take off|drop)\s+(the|my)\s+/, '').replace(/^(remove|delete|take off|drop)\s+/, '').trim();
    const item = findMenuItemByNameOrQuery(query);
    if (item) {
      const inCart = currentOrder.items.find(i => i.menuItemId === item.id);
      return inCart ? { assistantReply: `I've removed the ${item.name} from your order.`, intent: 'remove_item', orderActions: [{ type: 'REMOVE_ITEM', cartItemId: inCart.id }] } : { assistantReply: `You don't have ${item.name} in your order.`, intent: 'remove_item', orderActions: [] };
    }
  }

  if (/^(add|i want|give me|order)\b/.test(text)) {
    const actions: OrderAction[] = [];
    for (const item of MENU_ITEMS) {
      const itemAliases = aliases[item.id] || [item.name.toLowerCase()];
      if (!itemAliases.some(alias => hasPhrase(text, alias))) continue;
      let spiceLevel: any = item.defaultSpiceLevel || 'medium';
      if (item.allowSpiceCustomization) {
        if (/extra spicy|very spicy/.test(text)) spiceLevel = 'extra_spicy';
        else if (/less spicy|mild|not spicy/.test(text)) spiceLevel = 'mild';
        else if (/spicy/.test(text)) spiceLevel = 'spicy';
      }
      actions.push({ type: 'ADD_ITEM', menuItemId: item.id, name: item.name, quantity: quantityFor(text, itemAliases), spiceLevel });
    }
    if (actions.length) return { assistantReply: `Sure! I've added ${actions.map(a => `${a.quantity} ${a.name}`).join(' and ')} to your order.`, intent: 'add_item', orderActions: actions };
  }

  if (/^(make it|change it to)\s+(one|two|three|four|five|[1-5])\b/.test(text)) {
    const last = currentOrder.items[currentOrder.items.length - 1];
    if (last) {
      const match = text.match(/\b(one|two|three|four|five|[1-5])\b/);
      const quantity = match ? (numberWords[match[1]] || Number(match[1])) : last.quantity;
      if (quantity !== last.quantity) return { assistantReply: `Updated ${last.name} to ${quantity}.`, intent: 'modify_item', orderActions: [{ type: 'UPDATE_QUANTITY', cartItemId: last.id, quantity }] };
    }
  }
  return null;
}
