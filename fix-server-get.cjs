const fs = require('fs');

function addGetRoute(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');

  const getRoute = `
  app.get('/api/tts/rime', async (req, res) => {
    try {
      const text = req.query.text;
      const speaker = req.query.speaker || 'marsh';
      const speed = req.query.speed || 1.0;

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
          speaker: speaker,
          text: text,
          modelId: 'mist',
          speedAlpha: Number(speed),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: \`Rime API Error: \${errText}\` });
      }

      res.setHeader('Content-Type', 'audio/mp3');
      const { Readable } = require('stream');
      if (response.body) {
         Readable.fromWeb(response.body).pipe(res);
      } else {
         const arrayBuffer = await response.arrayBuffer();
         const buffer = Buffer.from(arrayBuffer);
         res.setHeader('Content-Length', buffer.length);
         res.send(buffer);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
`;

  // Insert before app.post('/api/tts/rime'
  if (!code.includes("app.get('/api/tts/rime'")) {
      code = code.replace("app.post('/api/tts/rime'", getRoute + "\n  app.post('/api/tts/rime'");
      fs.writeFileSync(filepath, code);
      console.log('Added GET route to ' + filepath);
  }
}

addGetRoute('server.ts');
addGetRoute('api/index.ts');
