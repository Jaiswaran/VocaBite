const fs = require('fs');
let code = fs.readFileSync('server/geminiService.ts', 'utf8');

const fastPathEndRegex = /if \(norm\.startsWith\('remove'\) \|\| norm\.startsWith\('delete'\) \|\| norm\.startsWith\('take off'\)\) \{[\s\S]*?\}\s*\}\s*const client = getGeminiClient\(\);/;

const fastPathUpdate = `  if (norm.startsWith('remove') || norm.startsWith('delete') || norm.startsWith('take off')) {
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
                  assistantReply: \`Updated \${lastItem.name} to \${qty}.\`,
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

  const client = getGeminiClient();`;

const matched = code.match(fastPathEndRegex);
if (matched) {
    code = code.replace(fastPathEndRegex, fastPathUpdate);
    fs.writeFileSync('server/geminiService.ts', code);
    console.log("Applied 'make it two' fast path.");
} else {
    console.log("Regex not found.");
}
