const RIME_ENDPOINT = 'https://users.rime.ai/v1/rime-tts';
const RIME_MODEL = 'mistv2';
const RIME_SPEAKER = 'astra';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.RIME_API_KEY;
    if (!apiKey) {
      console.error('[RimeTTS] RIME_API_KEY is missing');
      return res.status(500).json({ error: 'RIME_API_KEY is not configured in Vercel.' });
    }

    let text = '';
    let speaker = RIME_SPEAKER;
    let speed = 1;

    if (req.method === 'GET') {
      text = String(req.query?.text || '');
      speaker = String(req.query?.speaker || RIME_SPEAKER);
      speed = Number(req.query?.speed || 1);
    } else {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      text = String(body.text || '');
      speaker = String(body.speaker || RIME_SPEAKER);
      speed = Number(body.speed || 1);
    }

    text = text.trim();
    if (!text) return res.status(400).json({ error: 'text is required.' });
    if (text.length > 500) return res.status(400).json({ error: 'text is too long for a single Rime request.' });
    if (!Number.isFinite(speed) || speed <= 0) speed = 1;

    console.log(`[RimeTTS] Requesting ${RIME_MODEL}/${speaker}, ${text.length} chars`);

    const rimeResponse = await fetch(RIME_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        speaker,
        text,
        modelId: RIME_MODEL,
        lang: 'eng',
        samplingRate: 22050,
        speedAlpha: speed,
      }),
    });

    if (!rimeResponse.ok) {
      const errorText = await rimeResponse.text().catch(() => 'Unknown Rime error');
      console.error('[RimeTTS] Upstream error:', rimeResponse.status, errorText);
      return res.status(502).json({
        error: `Rime API returned ${rimeResponse.status}`,
        details: errorText,
      });
    }

    const audio = Buffer.from(await rimeResponse.arrayBuffer());
    if (!audio.length) return res.status(502).json({ error: 'Rime returned an empty audio response.' });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audio.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(audio);
  } catch (error: any) {
    console.error('[RimeTTS] Function error:', error);
    return res.status(500).json({
      error: 'Rime TTS server error',
      details: error?.message || String(error),
    });
  }
}
