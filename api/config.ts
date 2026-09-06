export default function handler(req: any, res: any) {
  res.status(200).json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasRimeKey: !!process.env.RIME_API_KEY,
    hasLiveKit: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    geminiModel: 'gemini-2.5-flash',
    rimeModel: 'mistv2',
    rimeSpeaker: 'astra',
  });
}
