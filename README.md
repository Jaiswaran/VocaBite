# Voice Food Order — Conversational Voice-First Food Ordering

A voice-first food ordering platform where customers can order food naturally by speaking aloud, with **automatic interruption and real-time order recovery**.

## Automatic Interruption & Recovery

Traditional voice assistants force users to wait for the bot to finish speaking or require pressing a manual "Stop" button before saying a correction.

In **Voice Food Order**:
- **Automatic User Speech Detection**: Voice Activity Detection (VAD) and speech start listeners monitor audio energy continuously.
- **Immediate Audio Halting**: As soon as the user speaks, currently playing AI audio is immediately stopped.
- **Token Invalidation**: The in-flight generation token is marked invalid so stale responses or audio chunks are discarded.
- **Contextual Recovery**: The agent processes the user's correction (e.g., *"Wait, make the biryani less spicy"*), preserves the prior cart state, updates the dish's spice level to mild, and answers without repetition.

---

## 🏛️ Architecture

The system is decoupled into modular, production-ready TypeScript interfaces:

1. **User (Microphone) → VAD (Voice Activity Detection)**: Real-time volume energy analysis.
2. **STT Service**: Web Speech API captures user speech to text.
3. **Conversation Agent**: Coordinates STT, LLM, and TTS.
4. **Gemini 3.1 Pro**: Server-side LLM endpoint parses intents and manipulates the `OrderManager` state.
5. **Rime TTS Service**: Highly responsive TTS provider that streams audio back to the client.
6. **Web Audio API**: Client-side decoding and playback engine (`AudioContext`) for fast execution and instantaneous interruption.
7. **Interruption Controller**: Monitors tokens to prevent stale AI speech from overlapping.

---

## 🚀 Setup & Running Locally

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

Create `.env` (or configure via AI Studio Secrets):

```env
# Gemini API Key (injected automatically in AI Studio)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Rime TTS API Key
RIME_API_KEY="YOUR_RIME_API_KEY"
RIME_SPEAKER_ID="marsh"
```

### 3. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to start ordering by voice!

---

## 🎤 Rime Integration & Interruption Behavior

- **Rime TTS**: The application uses the `synthesizeAndStream` Rime TTS endpoint. Audio is fetched as Base64 encoded MP3 on the backend, sent to the frontend, decoded as an `ArrayBuffer`, and directly attached to an `AudioBufferSourceNode`.
- **Interruption Behavior**: If you interrupt the AI (by speaking loudly), the `InterruptionController` triggers a barge-in event. The `AudioBufferSourceNode` is immediately destroyed (`stop()` and `disconnect()`). If the interruption happens *while* the network request is en-route from Rime, the stale audio is immediately dropped upon arrival.

---

## 🧪 Testing

We have built a comprehensive automated and manual testing suite (detailed in `RIME_EVIDENCE.md`). 

To run the automated test suite (testing OrderManager, Interruption logic, and Agent state):
```bash
npm run test
```

### Manual Voice Test Procedure:
1. Click the microphone icon to start.
2. Say: *"I want a chicken biryani, but make it spicy."*
3. While the assistant is responding, speak up: *"Wait, make the biryani less spicy."*
4. Watch the AI auto-interrupt, update the cart to mild spice, and confirm your changes.

---

## ⚠️ Known Limitations

- **Browser STT Quality**: Web Speech API heavily depends on browser and OS implementation. It may struggle in noisy environments.
- **VAD Echo Avoidance**: There is a 1-second grace period when the AI starts speaking where the microphone VAD threshold is raised, ensuring the bot does not interrupt itself via speaker bleed. Rapid interruptions within the first second may be missed.
- **Network Latency**: TTS decoding relies on HTTP POST cycles. Slow connections may result in a small delay before the voice answers.
