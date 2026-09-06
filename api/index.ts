import express from 'express';
import { processOrderWithGemini } from '../server/geminiService';
import { tryFastConversation } from '../server/fastConversation';
import { tryFastOrder } from '../server/fastOrder';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), providers: { gemini: !!process.env.GEMINI_API_KEY, rime: !!process.env.RIME_API_KEY, livekit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET) }, model: 'gemini-2.5-flash' });
});

app.get('/api/config', (req, res) => {
  res.json({ hasGeminiKey: !!process.env.GEMINI_API_KEY, hasRimeKey: !!process.env.RIME_API_KEY, hasLiveKit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET), geminiModel: 'gemini-2.5-flash', rimeSpeaker: 'marsh' });
});

app.post('/api/order/understand', async (req, res) => {
  try {
    const { userUtterance, conversationHistory, currentOrder, generationToken, interruptionContext } = req.body;
    if (!userUtterance) return res.status(400).json({ error: 'userUtterance is required.' });

    // Fast paths: no Gemini network round trip for common conversation or simple order mutations.
    const fastConversation = tryFastConversation(userUtterance);
    if (fastConversation) return res.json({ ...fastConversation, generationToken, latencyMs: 0 });

    const fastOrder = tryFastOrder(userUtterance, currentOrder || { items: [] });
    if (fastOrder) return res.json({ ...fastOrder, generationToken, latencyMs: 0 });

    if (process.env.GEMINI_API_KEY) {
      const result = await processOrderWithGemini(userUtterance, conversationHistory || [], currentOrder || { items: [] }, interruptionContext);
      return res.json({ ...result, generationToken });
    }

    return res.json({ assistantReply: `I heard: "${userUtterance}". What would you like to order?`, intent: 'unknown', orderActions: [], generationToken });
  } catch (error: any) {
    console.error('Error processing order:', error);
    return res.status(500).json({ error: error.message || 'Internal server error processing speech turn' });
  }
});

async function proxyRime(text: string, speaker: string, speed: number, res: express.Response) {
  const apiKey = process.env.RIME_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RIME_API_KEY not configured' });
  const response = await fetch('https://users.rime.ai/v1/rime-tts', {
    method: 'POST', headers: { Accept: 'audio/mpeg', Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ speaker, text, modelId: 'mist', speedAlpha: speed }),
  });
  if (!response.ok) {
    const errText = await response.text();
    return res.status(response.status).json({ error: `Rime API Error: ${errText}` });
  }
  res.setHeader('Content-Type', 'audio/mpeg');
  if (response.body) {
    const { Readable } = await import('stream');
    Readable.fromWeb(response.body as any).pipe(res);
  } else {
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}

app.get('/api/tts/rime', async (req, res) => {
  try {
    const text = String(req.query.text || '');
    if (!text) return res.status(400).json({ error: 'text is required.' });
    return proxyRime(text, String(req.query.speaker || 'marsh'), Number(req.query.speed || 1), res);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Rime TTS failed' });
  }
});

app.post('/api/tts/rime', async (req, res) => {
  try {
    const { text, speaker, speed } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required.' });
    return proxyRime(String(text), String(speaker || 'marsh'), Number(speed) || 1, res);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Rime TTS failed' });
  }
});

export default app;
