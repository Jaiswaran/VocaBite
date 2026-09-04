import { LLMService, LLMRequestPayload, LLMResponsePayload } from './types';
import { findMenuItemByNameOrQuery, MENU_ITEMS } from '../order/menu';
import { OrderAction, SpiceLevel } from '../order/types';

export class GeminiAndMockLLMService implements LLMService {
  readonly id = 'llm-gemini-3.1-pro-preview';
  readonly modelName = 'Gemini 3.7 Flash & Fallback Parser';

  async processUtterance(payload: LLMRequestPayload, signal?: AbortSignal): Promise<LLMResponsePayload> {
    const startTime = Date.now();

    // Try server-side Gemini API endpoint
    try {
      const response = await fetch('/api/order/understand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          assistantReply: data.assistantReply,
          orderActions: data.orderActions || [],
          updatedOrderState: data.updatedOrderState || payload.currentOrder,
          intent: data.intent || 'unknown',
          generationToken: payload.generationToken,
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      console.warn('Server LLM endpoint unavailable, falling back to local natural language parser', err);
    }

    // Client-side fallback NLP logic
    return this.fallbackParse(payload, startTime);
  }

  private fallbackParse(payload: LLMRequestPayload, startTime: number): LLMResponsePayload {
    const text = payload.userUtterance.toLowerCase();
    const actions: OrderAction[] = [];
    let assistantReply = '';
    let intent: LLMResponsePayload['intent'] = 'unknown';

    // 1. Check for spicy / spice level corrections (e.g. "Wait, make the biryani less spicy", "make it extra spicy")
    if (text.includes('less spicy') || text.includes('mild') || text.includes('not spicy') || text.includes('lower the spice')) {
      actions.push({
        type: 'UPDATE_CUSTOMIZATION',
        spiceLevel: 'mild',
      });
      assistantReply = "Got it! I've updated the spice level to mild. Anything else you'd like to add or change?";
      intent = 'modify_item';
    } else if (text.includes('medium spicy') || text.includes('medium')) {
      actions.push({
        type: 'UPDATE_CUSTOMIZATION',
        spiceLevel: 'medium',
      });
      assistantReply = "Sure, I set the spice level to medium. What else can I get for you?";
      intent = 'modify_item';
    } else if (text.includes('more spicy') || text.includes('extra spicy') || text.includes('very spicy')) {
      actions.push({
        type: 'UPDATE_CUSTOMIZATION',
        spiceLevel: 'extra_spicy',
      });
      assistantReply = "You got it! Made it extra spicy. Anything else?";
      intent = 'modify_item';
    } else if (text.includes('spicy') && !text.includes('biryani') && payload.currentOrder.items.length > 0) {
      actions.push({
        type: 'UPDATE_CUSTOMIZATION',
        spiceLevel: 'spicy',
      });
      assistantReply = "Updated to spicy! What else would you like?";
      intent = 'modify_item';
    }

    // 2. Check for item removal or cancel (e.g. "remove the coke", "cancel order", "delete biryani")
    if (text.includes('cancel order') || text.includes('clear cart') || text.includes('start over')) {
      actions.push({ type: 'CLEAR_ORDER' });
      assistantReply = "I've cleared your order. What would you like to order today?";
      intent = 'remove_item';
    } else if (text.includes('remove') || text.includes('delete') || text.includes('take off') || text.includes('drop')) {
      const matchItem = MENU_ITEMS.find(m => text.includes(m.name.toLowerCase()) || text.includes(m.id));
      if (matchItem) {
        actions.push({
          type: 'REMOVE_ITEM',
          name: matchItem.name,
        });
        assistantReply = `I've removed the ${matchItem.name} from your order. Anything else?`;
        intent = 'remove_item';
      }
    }

    // 3. Check for adding items (e.g., "I want a chicken biryani, make it spicy. And add one Coke")
    // Match multiple items in a single utterance
    if (actions.length === 0) {
      const addedNames: string[] = [];

      // Check Chicken Biryani
      if (text.includes('chicken biryani') || text.includes('biryani')) {
        let spice: SpiceLevel = 'medium';
        if (text.includes('spicy') && !text.includes('less spicy')) spice = 'spicy';
        if (text.includes('mild') || text.includes('less spicy')) spice = 'mild';
        if (text.includes('extra spicy')) spice = 'extra_spicy';

        const item = MENU_ITEMS.find(m => m.id === 'biryani-chicken-dum');
        if (item) {
          actions.push({
            type: 'ADD_ITEM',
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
            spiceLevel: spice,
          });
          addedNames.push(`${spice !== 'medium' ? spice + ' ' : ''}${item.name}`);
        }
      }

      // Check Coke
      if (text.includes('coke') || text.includes('coca cola') || text.includes('soda')) {
        const item = MENU_ITEMS.find(m => m.id === 'bev-coke');
        if (item) {
          actions.push({
            type: 'ADD_ITEM',
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
          });
          addedNames.push('one Coke');
        }
      }

      // Check Naan
      if (text.includes('naan') || text.includes('garlic naan')) {
        const item = MENU_ITEMS.find(m => m.id === 'bread-garlic-naan');
        if (item) {
          actions.push({
            type: 'ADD_ITEM',
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
          });
          addedNames.push('Garlic Butter Naan');
        }
      }

      // Check Butter Chicken
      if (text.includes('butter chicken')) {
        const item = MENU_ITEMS.find(m => m.id === 'bowl-butter-chicken');
        if (item) {
          actions.push({
            type: 'ADD_ITEM',
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
          });
          addedNames.push(item.name);
        }
      }

      // Check Mango Lassi
      if (text.includes('mango') || text.includes('lassi')) {
        const item = MENU_ITEMS.find(m => m.id === 'bev-mango-lassi');
        if (item) {
          actions.push({
            type: 'ADD_ITEM',
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
          });
          addedNames.push('Mango Lassi');
        }
      }

      // Check Samosa
      if (text.includes('samosa')) {
        const item = MENU_ITEMS.find(m => m.id === 'street-samosa-trio');
        if (item) {
          actions.push({
            type: 'ADD_ITEM',
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
          });
          addedNames.push('Crispy Samosas');
        }
      }

      if (addedNames.length > 0) {
        assistantReply = `Sure! I've added ${addedNames.join(' and ')}. Anything else?`;
        intent = 'add_item';
      }
    }

    // 4. Confirmation / Checkout
    if (text.includes('confirm') || text.includes('place order') || text.includes('checkout') || text.includes("that's all") || text.includes('nothing else')) {
      if (payload.currentOrder.items.length > 0) {
        actions.push({ type: 'SET_STATUS', status: 'confirmed' });
        assistantReply = `Awesome! Your order is confirmed for a total of ₹${payload.currentOrder.total.toFixed(0)}. The kitchen is preparing it now!`;
        intent = 'confirm_order';
      } else {
        assistantReply = "Your cart is currently empty. What delicious food can I get started for you?";
      }
    }

    // 5. Default conversational small talk / greeting
    if (!assistantReply) {
      if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
        assistantReply = "Hello! Welcome to Voice Food Order. What can I get started for you today? We have royal biryanis, warm curry bowls, fresh garlic naan, and drinks.";
        intent = 'small_talk';
      } else if (text.includes('what do you have') || text.includes('menu') || text.includes('recommend')) {
        assistantReply = "Our bestsellers today are the Royal Chicken Dum Biryani, Butter Chicken Rice Bowl, and Garlic Naan. Would you like to try one of those?";
        intent = 'query_menu';
      } else {
        assistantReply = "I heard you! Could you tell me what dishes you'd like to add or customize in your order?";
        intent = 'unknown';
      }
    }

    return {
      assistantReply,
      orderActions: actions,
      updatedOrderState: payload.currentOrder,
      intent,
      generationToken: payload.generationToken,
      latencyMs: Date.now() - startTime,
    };
  }
}
