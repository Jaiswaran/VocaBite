export interface FastConversationResult {
  assistantReply: string;
  intent: 'small_talk' | 'query_menu';
  orderActions: [];
}

export function tryFastConversation(utterance: string): FastConversationResult | null {
  const text = utterance.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (/^(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening|howdy)( there)?$/.test(text)) {
    return { assistantReply: 'Hi! Welcome to VocaBite. What would you like to eat today?', intent: 'small_talk', orderActions: [] };
  }
  if (/^(how are you|how are you doing|how is it going|how's it going|are you doing well)$/.test(text)) {
    return { assistantReply: "I'm doing great! I'm ready to help with your order. What are you in the mood for?", intent: 'small_talk', orderActions: [] };
  }
  if (/^(what can you do|what do you do|who are you|what are you|help|can you help me)$/.test(text)) {
    return { assistantReply: 'I can take your food order, change quantities, remove items, and help you choose from the menu. Just tell me what you want.', intent: 'small_talk', orderActions: [] };
  }
  if (/^(thanks|thank you|thank you so much|great thanks|okay thanks|thanks a lot)$/.test(text)) {
    return { assistantReply: 'You’re welcome! Anything else I can get for you?', intent: 'small_talk', orderActions: [] };
  }
  if (/^(bye|goodbye|see you|talk to you later)$/.test(text)) {
    return { assistantReply: 'Goodbye! Enjoy your meal.', intent: 'small_talk', orderActions: [] };
  }
  if (/^(menu|show me the menu|what do you have|what's on the menu|what can i order|what should i order|recommend something|recommend something to me)$/.test(text)) {
    return { assistantReply: 'Our popular choices are Chicken Dum Biryani, Butter Chicken Rice Bowl, Garlic Butter Naan, Crispy Samosas, and Mango Lassi. What sounds good?', intent: 'query_menu', orderActions: [] };
  }

  return null;
}
