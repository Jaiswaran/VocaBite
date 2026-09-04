import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { processOrderWithGemini } from './server/geminiService';
import { synthesizeRimeSpeech } from './server/rimeService';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      providers: {
        gemini: !!process.env.GEMINI_API_KEY,
        rime: !!process.env.RIME_API_KEY,
        livekit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
      },
      model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview',
    });
  });

  app.get('/api/config', (req, res) => {
    res.json({
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasRimeKey: !!process.env.RIME_API_KEY,
      hasLiveKit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
      geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview',
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
        // Safe mock response if GEMINI_API_KEY not yet provided
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

  app.post('/api/tts/rime', async (req, res) => {
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
  });

  app.post('/api/livekit/token', (req, res) => {
    const { roomName, participantName } = req.body;
    const room = roomName || `room-${Date.now()}`;
    const participant = participantName || `user-${Math.random().toString(36).substring(2, 6)}`;

    const hasLiveKit = !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_URL);

    res.json({
      configured: hasLiveKit,
      roomName: room,
      participantName: participant,
      token: hasLiveKit ? 'livekit_token_placeholder' : null,
      serverUrl: process.env.LIVEKIT_URL || 'wss://demo.livekit.cloud',
      message: hasLiveKit 
        ? 'LiveKit credentials active' 
        : 'LiveKit server keys not configured; using browser Web Audio transport for Phase 1',
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Voice Food Order server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
