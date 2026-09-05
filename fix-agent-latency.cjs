const fs = require('fs');
let code = fs.readFileSync('src/services/conversation/ConversationAgent.ts', 'utf8');

const regex = /async processUtterance\(text: string\): Promise<void> \{([\s\S]*?)const response = await this\.llm\.processUtterance\(\{([\s\S]*?)this\.activeAbortController\.signal\);([\s\S]*?)if \(response\.orderActions && response\.orderActions\.length > 0\) \{([\s\S]*?)this\.orderManager\.applyActions\(response\.orderActions\);([\s\S]*?)\}([\s\S]*?)this\.setState\('SPEAKING'\);([\s\S]*?)await this\.tts\.speak\(response\.assistantReply, \{/m;

const newCode = `async processUtterance(text: string): Promise<void> {
    const transcriptReadyTime = Date.now();
    console.log(\`[LATENCY] Speech End / Transcript Ready at \${transcriptReadyTime}\`);$1const llmStartTime = Date.now();
    const response = await this.llm.processUtterance({$2this.activeAbortController.signal);
    const llmEndTime = Date.now();
    console.log(\`[LATENCY] AI Response received. LLM Latency: \${llmEndTime - llmStartTime}ms\`);$3if (response.orderActions && response.orderActions.length > 0) {$4this.orderManager.applyActions(response.orderActions);
        const orderUpdateTime = Date.now();
        console.log(\`[LATENCY] Order Updated. Time from transcript: \${orderUpdateTime - transcriptReadyTime}ms\`);$5}$6this.setState('SPEAKING');
      const ttsStartTime = Date.now();$7await this.tts.speak(response.assistantReply, {`;

if (code.match(regex)) {
   code = code.replace(regex, newCode);
   
   const ttsStartRegex = /onStart: \(\) => \{([\s\S]*?)if \(this\.interruptionController\.isTokenValid/m;
   const ttsStartNew = `onStart: () => {
          console.log(\`[LATENCY] Rime Audio Started. Total latency from speech end: \$\{Date.now() - transcriptReadyTime}ms\`);$1if (this.interruptionController.isTokenValid`;
   
   if (code.match(ttsStartRegex)) {
      code = code.replace(ttsStartRegex, ttsStartNew);
      fs.writeFileSync('src/services/conversation/ConversationAgent.ts', code);
      console.log('Latency logging applied.');
   } else {
      console.log('TTS start regex did not match.');
   }
} else {
   console.log('Regex did not match.');
}
