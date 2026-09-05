import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { MENU_ITEMS } from '../src/services/order/menu';
import { OrderState, OrderAction } from '../src/services/order/types';
import { ChatMessage } from '../src/services/llm/types';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid if not present, or use crypto.randomUUID

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface UnderstandOrderResult {
  assistantReply: string;
  orderActions: OrderAction[];
  intent: 'add_item' | 'modify_item' | 'remove_item' | 'query_menu' | 'confirm_order' | 'small_talk' | 'correction' | 'unknown';
}

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'search_menu',
    description: 'Search the restaurant menu by query to find available items, prices, and IDs. Always use this to verify item existence before adding to cart.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search query (e.g., "burger", "vegetarian", "spicy").' }
      },
      required: ['query']
    }
  },
  {
    name: 'add_to_cart',
    description: 'Add a verified menu item to the cart. DO NOT call this if the user request is ambiguous (e.g. "a biryani"). Instead, ask them to clarify (e.g. "Chicken or Veg?").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        menuItemId: { type: Type.STRING, description: 'The exact ID of the menu item (from search_menu).' },
        quantity: { type: Type.INTEGER, description: 'Number of items to add.' },
        spiceLevel: { type: Type.STRING, description: 'mild, medium, spicy, or extra_spicy (if applicable).' }
      },
      required: ['menuItemId', 'quantity']
    }
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the cart. You can provide either the cartItemId (preferred), menuItemId, or the name of the item.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cartItemId: { type: Type.STRING, description: 'The unique cart item ID.' },
        menuItemId: { type: Type.STRING, description: 'The menu item ID.' },
        name: { type: Type.STRING, description: 'The name of the item to remove.' }
      }
    }
  },
  {
    name: 'update_quantity',
    description: 'Change the quantity of an existing item in the cart. You can provide either the cartItemId (preferred), or the name of the item.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cartItemId: { type: Type.STRING, description: 'The unique cart item ID.' },
        name: { type: Type.STRING, description: 'The name of the item to update.' },
        newQuantity: { type: Type.INTEGER, description: 'The new quantity.' }
      },
      required: ['newQuantity']
    }
  },
  {
    name: 'update_customization',
    description: 'Update the spice level or customizations of an existing item in the cart.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cartItemId: { type: Type.STRING, description: 'The unique cart item ID.' },
        spiceLevel: { type: Type.STRING, description: 'mild, medium, spicy, or extra_spicy.' }
      },
      required: ['cartItemId']
    }
  },
  {
    name: 'clear_order',
    description: 'Remove all items from the cart.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: 'confirm_order',
    description: 'Call this when the user explicitly confirms they want to place the final order.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  }
];

import { findMenuItemByNameOrQuery } from '../src/services/order/menu';
export async function processOrderWithGemini(
  userUtterance: string,
  history: ChatMessage[],
  currentOrder: OrderState,
  interruptionContext?: { previousAssistantUtterance: string; interruptedAtMs: number }
): Promise<UnderstandOrderResult> {
  const norm = userUtterance.toLowerCase().trim();
  
  // Fast path for simple "Add X" or "Remove X" to bypass LLM latency
  if (norm.startsWith('add') || norm.startsWith('i want') || norm.startsWith('give me')) {
    const itemQuery = norm.replace(/add|i want|give me|a |an |one |two |three /g, '').trim();
    const item = findMenuItemByNameOrQuery(itemQuery);
    if (item) {
      let qty = 1;
      if (norm.includes('two')) qty = 2;
      if (norm.includes('three')) qty = 3;
      if (norm.includes('four')) qty = 4;
      if (norm.match(/\b2\b/)) qty = 2;
      if (norm.match(/\b3\b/)) qty = 3;
      if (norm.match(/\b4\b/)) qty = 4;
      
      return {
        assistantReply: `I've added ${qty} ${item.name} to your order.`,
        intent: 'add_item',
        orderActions: [{
          type: 'ADD_ITEM',
          menuItemId: item.id,
          name: item.name,
          quantity: qty,
          spiceLevel: item.defaultSpiceLevel || 'medium'
        }]
      };
    }
  }

    if (norm.startsWith('remove') || norm.startsWith('delete') || norm.startsWith('take off')) {
    const itemQuery = norm.replace(/remove|delete|take off|the |my /g, '').trim();
    const item = findMenuItemByNameOrQuery(itemQuery);
    if (item) {
      const inCart = currentOrder.items.find(i => i.menuItemId === item.id);
      if (inCart) {
        return {
          assistantReply: `I've removed the ${item.name} from your order.`,
          intent: 'remove_item',
          orderActions: [{
            type: 'REMOVE_ITEM',
            cartItemId: inCart.cartItemId,
          }]
        };
      } else {
        return {
          assistantReply: `You don't have ${item.name} in your order.`,
          intent: 'remove_item',
          orderActions: []
        };
      }
    }
  }

  // Fast path for quantity update (e.g., "make it two", "change it to 3")
  if (norm.includes('make it ') || norm.includes('change it to ')) {
      const lastItem = currentOrder.items[currentOrder.items.length - 1];
      if (lastItem) {
          let qty = lastItem.quantity;
          if (norm.includes('one') || norm.includes('1')) qty = 1;
          if (norm.includes('two') || norm.includes('2')) qty = 2;
          if (norm.includes('three') || norm.includes('3')) qty = 3;
          if (norm.includes('four') || norm.includes('4')) qty = 4;
          
          if (qty !== lastItem.quantity) {
              return {
                  assistantReply: `Updated ${lastItem.name} to ${qty}.`,
                  intent: 'modify_item',
                  orderActions: [{
                      type: 'UPDATE_QUANTITY',
                      cartItemId: lastItem.cartItemId,
                      quantity: qty
                  }]
              };
          }
      }
  }

  const client = getGeminiClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  const systemInstruction = `
You are the voice assistant for an authentic food ordering kitchen called "VocaBite".
You converse naturally with humans speaking aloud. Keep spoken responses concise (1-2 sentences), friendly, warm, and natural. Do not repeat the entire order unless asked.

CRITICAL VOICE BEHAVIORS:
1. Never invent missing information. If an item is ambiguous (e.g., "Give me a biryani"), DO NOT add it yet. Ask a short clarification ("Chicken or veg?").
2. Validate actions: use the search_menu tool to find exact menuItemIds before adding items.
3. If the user corrects something (e.g., "Wait, make the biryani less spicy"), use the appropriate tool (update_customization, update_quantity, remove_from_cart) and acknowledge naturally.
4. Support natural phrasing: "Add one more" or "Wait, remove the last item". You have access to the current cart state to figure out what they mean.
5. Order confirmation: Before final submission, explicitly summarize the final order and ask for confirmation. Use confirm_order only when they say yes.
6. Use structured tools to mutate state. Do not invent your own item IDs.

CURRENT CART STATE:
${JSON.stringify(currentOrder.items, null, 2)}
`;

  // Build the conversation history for the chat session
  // We need to exclude the latest user message from the history array, 
  // as it will be sent separately via chat.sendMessage(finalPrompt).
  // Also, ensure no text part is completely empty to prevent 400 errors.
  let historyForGemini = history.length > 0 && history[history.length - 1].role === 'user' && history[history.length - 1].content === userUtterance
    ? history.slice(0, -1)
    : history;
    
  // OPTIMIZATION: Only send the last 2 turns to minimize latency
  historyForGemini = historyForGemini.slice(-2);

  const contents = historyForGemini.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: (m.content || ' ') + (m.interrupted ? ' [USER INTERRUPTED THIS MESSAGE]' : '') }]
  }));

  // Append context to the latest user utterance
  let finalPrompt = userUtterance;
  if (interruptionContext) {
    finalPrompt = `[NOTE: I interrupted your previous message: "${interruptionContext.previousAssistantUtterance}"]\n` + finalPrompt;
  }

  const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const chat = client.chats.create({
        model,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations }],
          temperature: 0.2, // Low temp for more deterministic tool use
        },
        history: contents,
      });

      let response = await chat.sendMessage({ message: finalPrompt });
      let orderActions: OrderAction[] = [];
      let intent: 'add_item' | 'modify_item' | 'remove_item' | 'query_menu' | 'confirm_order' | 'small_talk' | 'correction' | 'unknown' = 'unknown';

      // Tool execution loop (max 5 iterations to prevent infinite loops)
      for (let i = 0; i < 5; i++) {
        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
          break;
        }

        const functionResponses: any[] = [];
        
        for (const call of functionCalls) {
          const { name, args } = call;
          let result: any = { error: 'Unknown function' };

          try {
            if (name === 'search_menu') {
              const query = (args.query as string).toLowerCase();
              const matches = MENU_ITEMS.filter(item => 
                item.name.toLowerCase().includes(query) || 
                item.category.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query)
              );
              result = { matches: matches.map(m => ({ id: m.id, name: m.name, price: m.price, spice: m.allowSpiceCustomization })) };
              if (matches.length > 0) intent = 'query_menu';
            } else if (name === 'add_to_cart') {
              const menuItemId = args.menuItemId as string;
              const qty = args.quantity as number;
              const spice = args.spiceLevel as 'mild'|'medium'|'spicy'|'extra_spicy';
              const menuItem = MENU_ITEMS.find(m => m.id === menuItemId);
              if (!menuItem) {
                result = { error: 'Invalid menuItemId. Use search_menu to find correct IDs.' };
              } else {
                const tempCartItemId = uuidv4();
                orderActions.push({
                  type: 'ADD_ITEM',
                  menuItemId,
                  name: menuItem.name,
                  quantity: qty,
                  spiceLevel: spice || menuItem.defaultSpiceLevel || 'medium'
                });
                result = { success: true, cartItemId: tempCartItemId, message: 'Added to pending actions.' };
                intent = 'add_item';
              }
            } else if (name === 'remove_from_cart') {
              orderActions.push({
                type: 'REMOVE_ITEM',
                cartItemId: args.cartItemId as string | undefined,
                menuItemId: args.menuItemId as string | undefined,
                name: args.name as string | undefined
              });
              result = { success: true, message: 'Removed in pending actions.' };
              intent = 'remove_item';
            } else if (name === 'update_quantity') {
              orderActions.push({
                type: 'UPDATE_QUANTITY',
                cartItemId: args.cartItemId as string | undefined,
                name: args.name as string | undefined,
                quantity: args.newQuantity as number
              });
              result = { success: true };
              intent = 'modify_item';
            } else if (name === 'update_customization') {
              orderActions.push({
                type: 'UPDATE_CUSTOMIZATION',
                cartItemId: args.cartItemId as string,
                spiceLevel: args.spiceLevel as any
              });
              result = { success: true };
              intent = 'modify_item';
            } else if (name === 'clear_order') {
              orderActions.push({ type: 'CLEAR_ORDER' });
              result = { success: true };
              intent = 'remove_item';
            } else if (name === 'confirm_order') {
              orderActions.push({ type: 'SET_STATUS', status: 'confirmed' });
              result = { success: true };
              intent = 'confirm_order';
            }
          } catch (err: any) {
            result = { error: err.message };
          }

          functionResponses.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: result
            }
          });
        }

        response = await chat.sendMessage({ message: functionResponses });
      }

      return {
        assistantReply: response.text || "I'm sorry, I didn't quite get that.",
        intent,
        orderActions,
      };
    } catch (err: any) {
      console.warn(`[GeminiService] Model ${model} failed:`, err.message);
      lastError = err;
      // try next candidate model
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to process the request.');
}
