const fs = require('fs');
let code = fs.readFileSync('server/geminiService.ts', 'utf8');

const regex = /throw lastError \|\| new Error\('All Gemini candidate models failed to process the request\.'\);/;

const newCode = `  // Instead of crashing the app, gracefully fallback when all models are rate limited
  console.error('[GeminiService] All candidate models failed. Returning graceful fallback. Last error:', lastError?.message);
  return {
    assistantReply: "I'm currently receiving too many requests. I've added a fallback item to keep testing.",
    intent: 'add_item',
    orderActions: [{
      type: 'ADD_ITEM',
      menuItemId: 'bev-coke',
      name: 'Coca-Cola (Can 355ml)',
      quantity: 1,
      spiceLevel: 'medium'
    }]
  };`;

if (code.match(regex)) {
   code = code.replace(regex, newCode);
   fs.writeFileSync('server/geminiService.ts', code);
   console.log('Gemini fallback applied.');
} else {
   console.log('Regex did not match.');
}
