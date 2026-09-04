const fs = require('fs');
let file = "src/components/OrderCart.tsx";
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/₹₹/g, '₹$');
fs.writeFileSync(file, content);
console.log('Fixed double rupee');
