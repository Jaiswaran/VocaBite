export interface RimeTTSRequest {
  text: string;
  speaker?: string;
  speed?: number;
}

export interface RimeTTSResponse {
  success: boolean;
  audioBase64?: string;
  audioUrl?: string;
  audioFormat?: string;
  fallbackToBrowser?: boolean;
  message?: string;
}

export async function synthesizeRimeSpeech(req: RimeTTSRequest): Promise<RimeTTSResponse> {
  const apiKey = process.env.RIME_API_KEY;
  // Always fallback to 'marsh' if the speaker isn't explicitly supported, 
  // or explicitly handle the one we know works with 'mist'.
  const speaker = req.speaker || 'marsh';

  if (!apiKey) {
    return {
      success: false,
      fallbackToBrowser: true,
      message: 'RIME_API_KEY not configured. Falling back to browser speech synthesis.',
    };
  }

  try {
    const bodyPayload = {
      speaker: speaker,
      text: req.text,
      modelId: 'mist',
      speedAlpha: Number(req.speed) || 1.0,
    };
    console.log('Sending to Rime:', bodyPayload);

    // Official Rime TTS API format
    const response = await fetch('https://users.rime.ai/v1/rime-tts', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mp3',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Rime TTS API responded with status ${response.status}: ${errText}`);
      return {
        success: false,
        fallbackToBrowser: true,
        message: `Rime API status ${response.status}: ${errText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    return {
      success: true,
      audioBase64: base64,
      audioFormat: 'mp3',
    };
  } catch (error: any) {
    console.warn('Error synthesizing with Rime TTS:', error.message);
    return {
      success: false,
      fallbackToBrowser: true,
      message: error.message,
    };
  }
}
