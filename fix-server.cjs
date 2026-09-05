const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const ttsRouteOld = `app.post('/api/tts/rime', async (req, res) => {
    try {
      const { text, speaker, speed } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'text is required.' });
      }
      const result = await synthesizeRimeSpeech({ text, speaker, speed });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        fallbackToBrowser: true,
        error: error.message,
      });
    }
  });`;

const ttsRouteNew = `app.post('/api/tts/rime', async (req, res) => {
    try {
      const { text, speaker, speed } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'text is required.' });
      }
      const apiKey = process.env.RIME_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'RIME_API_KEY not configured' });
      }
  
      const response = await fetch('https://users.rime.ai/v1/rime-tts', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mp3',
          'Authorization': \`Bearer \${apiKey}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speaker: speaker || 'marsh',
          text: text,
          modelId: 'mist',
          speedAlpha: Number(speed) || 1.0,
        }),
      });
  
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: \`Rime API Error: \${errText}\` });
      }
  
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.setHeader('Content-Type', 'audio/mp3');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });`;

code = code.replace(ttsRouteOld, ttsRouteNew);
fs.writeFileSync('server.ts', code);
