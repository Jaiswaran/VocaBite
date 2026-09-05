import express from 'express';
import { processOrderWithGemini } from '../server/geminiService';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    providers: {
      gemini: !!process.env.GEMINI_API_KEY,
      rime: !!process.env.RIME_API_KEY,
      livekit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    },
    model: 'gemini-2.5-flash',
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasRimeKey: !!process.env.RIME_API_KEY,
    hasLiveKit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    geminiModel: 'gemini-2.5-flash',
    rimeSpeaker: 'marsh',
  });
});

app.post('/api/order/understand', async (req, res) => {
  try {
    const { userUtterance, conversationHistory, currentOrder, generationToken, interruptionContext } = req.body;
    if (!userUtterance) {
      return res.status(400).json({ error: 'userUtterance is required.' });
    }
    if (process.env.GEMINI_API_KEY) {
      const result = await processOrderWithGemini(
        userUtterance,
        conversationHistory || [],
        currentOrder || { items: [] },
        interruptionContext
      );
      return res.json({
        ...result,
        generationToken,
      });
    } else {
      return res.json({
        assistantReply: `I heard: "${userUtterance}". Let me update your order!`,
        intent: 'unknown',
        orderActions: [],
        generationToken,
      });
    }
  } catch (error: any) {
    console.error('Error processing order with Gemini:', error);
    res.status(500).json({
      error: error.message || 'Internal server error processing speech turn',
    });
  }
});


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
          'Authorization': `Bearer ${apiKey}`,
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
        return res.status(response.status).json({ error: `Rime API Error: ${errText}` });
      }

      res.setHeader('Content-Type', 'audio/mp3');
      const { Readable } = await import('stream');
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

  app.post('/api/tts/rime', async (req, res) => {
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
        'Authorization': `Bearer ${apiKey}`,
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
      return res.status(response.status).json({ error: `Rime API Error: ${errText}` });
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
