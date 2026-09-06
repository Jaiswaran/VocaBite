export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    providers: {
      gemini: !!process.env.GEMINI_API_KEY,
      rime: !!process.env.RIME_API_KEY,
      livekit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    },
    model: 'gemini-2.5-flash',
    rimeModel: 'mistv2',
    rimeSpeaker: 'astra',
  });
}
