const fs = require('fs');
let code = fs.readFileSync('server/geminiService.ts', 'utf8');

const regex = /const historyForGemini = history\.length > 0 && history\[history\.length - 1\]\.role === 'user' && history\[history\.length - 1\]\.content === userUtterance\s*\? history\.slice\(0, -1\)\s*\: history;/;

const newCode = `let historyForGemini = history.length > 0 && history[history.length - 1].role === 'user' && history[history.length - 1].content === userUtterance
    ? history.slice(0, -1)
    : history;
    
  // OPTIMIZATION: Only send the last 2 turns to minimize latency
  historyForGemini = historyForGemini.slice(-2);`;

if (code.match(regex)) {
   code = code.replace(regex, newCode);
   fs.writeFileSync('server/geminiService.ts', code);
   console.log('History fast path applied.');
} else {
   console.log('Regex did not match.');
}
