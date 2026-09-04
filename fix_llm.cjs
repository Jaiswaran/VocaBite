const fs = require('fs');
let file = "src/services/llm/llmService.ts";
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/₹\{payload/g, '₹${payload');
fs.writeFileSync(file, content);
console.log('Fixed llmService');
