# Rime Voice Agent Evidence

## Product

The product is a voice-first food ordering assistant designed to allow users to build, modify, and review their cart exclusively through natural spoken language. It provides an interactive dining experience by removing the friction of manual UI navigation and form filling.

## Why Voice Matters

Speaking is materially better than typing or tapping for this use case because it enables eyes-free, hands-free ordering. Customers can express complex, multi-variable requests (e.g., "Add two chicken biryanis, but make one mild and one extra spicy") in a single breath—a task that would otherwise require multiple screen taps, dropdown selections, and cognitive load on a mobile device.

## Hard Voice Problem

The most difficult engineering challenge in a real-time voice agent is **automatic interruption and recovery** (barge-in). When a user speaks over the AI, the system must immediately stop physical audio playback, halt network streams, invalidate the previous context, and smoothly pivot to answering the new utterance without playing overlapping "stale" audio fragments.

## Architecture

User
→ VAD (Voice Activity Detection)
→ STT (Web Speech API)
→ Conversation Agent (Turn Management)
→ Gemini (LLM & Logic)
→ Rime (High-Quality TTS)
→ Audio (Web Audio API / AudioContext)

## Acceptance Criteria

1. User speech is automatically detected.
2. AI audio stops.
3. Active TTS is cancelled.
4. Old response is invalidated.
5. Stale audio cannot resume.
6. User's new utterance is accepted.
7. New utterance updates the order correctly.
8. New AI response is generated.
9. New response is spoken through Rime.
10. Only the latest response is audible.

## Test Procedure

Automated tests are located in `tests/`. We also conduct manual integration testing to verify hardware-dependent behavior (microphone and speaker).
1. **Normal ordering**: Ask the agent to add an item. Verify the agent speaks and the UI updates.
2. **Interrupt AI**: While the agent is mid-sentence, speak a new command (e.g., "Actually, make it two").
3. **Stale audio protection**: The system logs `[RimeTTSProvider] STALE_AUDIO_DISCARDED` if an interruption happens while the network request is still flying or decoding.
4. **Order consistency**: Verify the cart reflects the *interrupted* logic (e.g., the quantity is 2, not 1).

## Results

| Test                  | Passed | Failed |
| --------------------- | -----: | -----: |
| Interruption detected |    1   |    0   |
| Audio cancelled       |    1   |    0   |
| Stale audio blocked   |    1   |    0   |
| New request accepted  |    1   |    0   |
| Correct order update  |    1   |    0   |

*(Note: Automated test suites passing for OrderManager, InterruptionController, and ConversationAgent structure. Hardware integration tests passed manually).*

## Limitations

- **Browser STT Quality**: Web Speech API is dependent on the OS and browser implementation. It can sometimes hallucinate or truncate on noisy backgrounds.
- **VAD Echo**: If speakers are too loud, the microphone can pick up the TTS and trigger a false barge-in. We mitigate this with a 1-second grace period (`aiSpeakStartTimeRef`).
- **Network Latency**: Rime TTS and Gemini calls are sequential. Network latency can cause a slight delay before the audio begins.

## Reproduction

To reproduce the interruption test:
1. Start the dev server and click the microphone icon.
2. Say: "Tell me a long story about Biryani."
3. Wait for the agent to start speaking.
4. While it speaks, quickly say: "Stop, add a coke to my order."
5. Observe the agent instantly mute, process the coke, and reply with a new voice confirmation. You will not hear the rest of the Biryani story.
