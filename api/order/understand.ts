import { processOrderWithGemini } from '../../server/geminiService';
import { tryFastConversation } from '../../server/fastConversation';
import { tryFastOrder } from '../../server/fastOrder';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userUtterance, conversationHistory, currentOrder, generationToken, interruptionContext } = req.body || {};
    if (!userUtterance) return res.status(400).json({ error: 'userUtterance is required.' });

    const fastConversation = tryFastConversation(userUtterance);
    if (fastConversation) return res.status(200).json({ ...fastConversation, generationToken, latencyMs: 0 });

    const fastOrder = tryFastOrder(userUtterance, currentOrder || { items: [] });
    if (fastOrder) return res.status(200).json({ ...fastOrder, generationToken, latencyMs: 0 });

    if (process.env.GEMINI_API_KEY) {
      const result = await processOrderWithGemini(
        userUtterance,
        conversationHistory || [],
        currentOrder || { items: [] },
        interruptionContext,
      );
      return res.status(200).json({ ...result, generationToken });
    }

    return res.status(200).json({
      assistantReply: `I heard: "${userUtterance}". What would you like to order?`,
      intent: 'unknown',
      orderActions: [],
      generationToken,
    });
  } catch (error: any) {
    console.error('[OrderAPI] Error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error processing speech turn' });
  }
}
