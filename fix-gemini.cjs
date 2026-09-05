const fs = require('fs');
let code = fs.readFileSync('server/geminiService.ts', 'utf8');

const regex = /export async function processOrderWithGemini\([\s\S]*?\n\)\: Promise<UnderstandOrderResult> \{/;

const newCode = `import { findMenuItemByNameOrQuery } from '../src/services/order/menu';
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
      if (norm.match(/\\b2\\b/)) qty = 2;
      if (norm.match(/\\b3\\b/)) qty = 3;
      if (norm.match(/\\b4\\b/)) qty = 4;
      
      return {
        assistantReply: \`I've added \${qty} \${item.name} to your order.\`,
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
          assistantReply: \`I've removed the \${item.name} from your order.\`,
          intent: 'remove_item',
          orderActions: [{
            type: 'REMOVE_ITEM',
            cartItemId: inCart.cartItemId,
          }]
        };
      } else {
        return {
          assistantReply: \`You don't have \${item.name} in your order.\`,
          intent: 'remove_item',
          orderActions: []
        };
      }
    }
  }`;

if (code.match(regex)) {
   code = code.replace(regex, newCode);
   fs.writeFileSync('server/geminiService.ts', code);
   console.log('Gemini fast path applied.');
} else {
   console.log('Regex did not match.');
}
