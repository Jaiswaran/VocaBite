import { MENU_ITEMS, findMenuItemByNameOrQuery } from '../src/services/order/menu';
import { OrderAction, OrderState } from '../src/services/order/types';

export interface FastOrderResult {
  assistantReply: string;
  intent: 'add_item' | 'remove_item' | 'modify_item' | 'confirm_order';
  orderActions: OrderAction[];
}

const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

export function tryFastOrder(utterance: string, currentOrder: OrderState): FastOrderResult | null {
  const text = utterance.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (/^(confirm|confirm order|place order|checkout|that's all|thats all|nothing else)$/.test(text)) {
    return { assistantReply: currentOrder.items.length ? `Your order total is ₹${currentOrder.total.toFixed(0)}. Ready to place it?` : 'Your cart is empty. What would you like to order?', intent: 'confirm_order', orderActions: [] };
  }

  if (/^(remove|delete|take off|drop)\b/.test(text)) {
    const query = text.replace(/^(remove|delete|take off|drop)\s+(the|my)\s+/, '').replace(/^(remove|delete|take off|drop)\s+/, '').trim();
    const item = findMenuItemByNameOrQuery(query);
    if (item) {
      const inCart = currentOrder.items.find(i => i.menuItemId === item.id);
      if (inCart) return { assistantReply: `I've removed the ${item.name} from your order.`, intent: 'remove_item', orderActions: [{ type: 'REMOVE_ITEM', cartItemId: inCart.id }] };
      return { assistantReply: `You don't have ${item.name} in your order.`, intent: 'remove_item', orderActions: [] };
    }
  }

  if (/^(add|i want|give me|order)\b/.test(text)) {
    const actions: OrderAction[] = [];
    const matchedIds = new Set<string>();
    for (const item of MENU_ITEMS) {
      const aliases = [item.name.toLowerCase(), ...item.name.toLowerCase().split(/\s+/).filter(w => w.length > 3)];
      if (aliases.some(alias => text.includes(alias)) || (item.id === 'bev-coke' && /\bcoke\b|coca cola|soda/.test(text)) || (item.id === 'bev-mango-lassi' && /mango|lassi/.test(text))) {
        if (matchedIds.has(item.id)) continue;
        matchedIds.add(item.id);
        let quantity = 1;
        for (const [word, value] of Object.entries(numberWords)) if (text.includes(`${word} ${item.name.toLowerCase()}`) || text.includes(`${word} ${item.name.split(' ')[0].toLowerCase()}`)) quantity = value;
        const digit = text.match(new RegExp(`\\b([1-5])\\s+${item.name.split(' ')[0].toLowerCase()}`));
        if (digit) quantity = Number(digit[1]);
        let spiceLevel: any = item.defaultSpiceLevel || 'medium';
        if (item.allowSpiceCustomization) {
          if (/extra spicy|very spicy/.test(text)) spiceLevel = 'extra_spicy';
          else if (/less spicy|mild|not spicy/.test(text)) spiceLevel = 'mild';
          else if (/spicy/.test(text)) spiceLevel = 'spicy';
        }
        actions.push({ type: 'ADD_ITEM', menuItemId: item.id, name: item.name, quantity, spiceLevel });
      }
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
