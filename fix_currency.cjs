const fs = require('fs');
const files = [
  "src/services/llm/llmService.ts",
  "src/components/ConversationView.tsx",
  "src/components/MenuCatalog.tsx",
  "src/components/OrderCart.tsx",
  "src/components/ConfirmationModal.tsx"
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\$\{item\.price/g, '₹${item.price');
  content = content.replace(/\$\{item\.itemTotal/g, '₹${item.itemTotal');
  content = content.replace(/\$\{orderState/g, '₹${orderState');
  // Handle literal $ inside > $ <
  content = content.replace(/>\s*\$/g, '>₹');
  content = content.replace(/\(\$/g, '(₹');
  content = content.replace(/\+\$/g, '+₹');
  
  fs.writeFileSync(file, content);
});
console.log('Fixed currency');
