# Rime Evidence — VocaBite

## 1. Hard Voice Claim

**VocaBite solves interruption and recovery during an active voice conversation.**

The hard voice problem is **barge-in**: a restaurant customer should be able to speak a correction while the agent is still responding, without the previous response continuing to control the interaction.

This matters in restaurant ordering because customers naturally change their minds mid-conversation: they may remove an item, change a quantity, or replace one dish with another. A voice agent that forces the customer to wait for speech to finish makes these corrections cumbersome and can produce conflicting audio or order state.

This requires real voice interaction because the failure occurs during **simultaneous human speech and agent audio playback**. A normal text interface does not exercise the same microphone, speech-detection, playback, and concurrent-response behavior.

The submitted implementation contains a dedicated interruption controller, browser speech recognition, Rime TTS playback, cancellation logic, and generation-token validation.

## 2. User-Visible Problem

Before interruption handling, a customer could begin speaking while the agent was already producing a response.

The problematic behavior was that the previous TTS response could continue playing after the customer had started a correction, while the previous response could also conflict with the updated interaction.

The intended recovery behavior is therefore:

1. Detect that the customer has started speaking.
2. Stop the currently playing agent audio.
3. Invalidate the previous response.
4. Process the customer's new instruction.
5. Apply only the current instruction to the order.
6. Speak the current response.

The implementation explicitly marks interrupted assistant messages and transitions the conversation into an `INTERRUPTED` state before returning to listening.

## 3. Acceptance Test

### Scenario

Initial user instruction:

> "Add a chicken burger."

The agent begins responding.

While the agent is speaking, the customer interrupts:

> "Actually remove the burger and add pizza."

### Acceptance criteria

| Criterion                                                     | Verification target                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| User speech interrupts active Rime playback                   | User speech causes a barge-in event while the agent is speaking.                                        |
| Obsolete speech stops                                         | The active TTS playback is stopped by the interruption path.                                            |
| Obsolete results cannot incorrectly re-enter the conversation | Invalid generation tokens and inactive response IDs are rejected before the response is applied/spoken. |
| Updated instruction reaches the application                   | The final STT result is passed to `ConversationAgent.processUtterance()`.                               |
| Order state reflects the updated request                      | The current response's `orderActions` are applied to `OrderManager`.                                    |
| Final spoken response reflects the latest request             | The current response is passed to the TTS provider only after response/token validation.                |

The repository contains automated unit tests covering generation-token invalidation, barge-in listener notification, and active-response cancellation. The repository also contains a manual voice-testing path for microphone/speaker behavior.

**Important:** The repository does not provide a recorded quantitative pass/fail result for the complete end-to-end chicken-burger/pizza scenario. Therefore, this document does not claim that every acceptance criterion has been quantitatively benchmarked.

## 4. Test Procedure

1. Start VocaBite using the repository's development command.
2. Open the application and allow microphone access.
3. Start the voice-ordering interaction.
4. Ask the agent to add an item.
5. Wait until the agent is actively speaking through Rime.
6. Interrupt the agent while it is speaking.
7. Give a contradictory or updated instruction.
8. Observe whether the current Rime playback stops.
9. Observe the order/cart state.
10. Verify that the new instruction is processed rather than the previous response being repeated.
11. Verify that the final spoken response corresponds to the latest instruction.
12. Repeat the scenario with different realistic interruption timing, including interruptions made shortly after the agent begins speaking.

The application uses Web Speech API input and an interruption listener connected to the conversation agent. The application also records interruption events for display in the UI.

## 5. Stress / Failure Case

### Deliberate interruption scenario

User:

> "Add a chicken burger."

Agent starts responding.

User interrupts:

> "Actually remove the burger and add pizza."

### Expected behavior

* The previous Rime speech stops.
* The previous response is invalidated.
* The new utterance is captured.
* The new instruction is processed.
* The resulting order state reflects the latest instruction.
* Obsolete audio/results do not become the current response.
* The final spoken response corresponds to the latest request.

The implementation performs barge-in through STT partial transcript activity when the agent is speaking, subject to its speech-content and grace-period checks. The interruption controller rotates the active generation token, while `ConversationAgent` cancels the active response and stops TTS.

### Known limitation

**Very fast interruptions can occasionally take approximately 1–3 seconds to register.**

This limitation is disclosed rather than treated as a perfect-interruption claim.

The repository also documents a short initial speaking grace period intended to reduce false interruptions caused by the agent's own audio being picked up by the microphone.

## 6. Results

### Available evidence

The repository contains automated tests for the interruption controller and conversation agent. These tests verify, among other things:

* generation-token creation and validation;
* invalidation of an earlier token when a new turn begins;
* barge-in event delivery to registered listeners;
* invalidation of the active token after barge-in;
* cancellation of the active TTS response on interruption;
* conversation state transition into `INTERRUPTED`.

The project information also records manual testing of interruption/recovery behavior.

### Quantitative measurements

**Numerical success-rate and latency measurements were not collected for this manual test.**

No unsupported success percentage, sample size, average latency, or benchmark is reported here.

The source code contains diagnostic latency logging for transcript readiness, LLM response time, order update timing, and Rime audio start timing, but the presence of these logs is not treated as a measured benchmark.

Cached and uncached measurements: **Not measured.**

## 7. Rime Integration

Rime is part of the actual spoken interaction. VocaBite uses a dedicated `RimeTTSProvider` and requests speech from the Rime TTS endpoint. The browser then plays the returned audio through an HTML audio element.

Rime is therefore not limited to a welcome message or final confirmation; it is used for generated assistant responses during the conversational ordering flow. `ConversationAgent` passes generated assistant responses to the TTS provider during normal conversation turns.

### Configuration

| Configuration   | Value                             |
| --------------- | --------------------------------- |
| Model           | `mist`                            |
| Speaker         | `astra`                           |
| Language        | English                           |
| Endpoint/Region | Not specified                     |
| Audio format    | MP3 / MPEG audio                  |
| Transport       | HTTP request to Rime TTS endpoint |

**Repository verification note:** The supplied project description identifies `marsh` as the Rime model, but the submitted implementation uses `marsh` as the speaker and sends `modelId: 'mist'` to Rime. This evidence document reports the implementation value rather than silently changing or assuming the configuration.

The Rime request is made against the Rime TTS API endpoint configured in the server implementation. The server returns the resulting audio as MPEG audio to the client.

If `RIME_API_KEY` is absent, the implementation can report failure and expose browser-speech fallback behavior; a configured Rime key is therefore required to exercise the Rime path.

## 8. Technical Implementation

### Audio playback control

`RimeTTSProvider` maintains the active audio element and provides a `stop()` method. On interruption, it:

* sets the speaking state to false;
* clears the current token;
* pauses the active HTML audio element;
* resets its playback position;
* clears its source;
* clears the active response references.

The provider also contains an `AudioBufferSourceNode` path and cleanup logic, although the current synthesis path constructs an `HTMLAudioElement` for playback.

### Cancellation

`ConversationAgent` owns an `AbortController` for the active LLM request. Before starting a new response, it calls `cancelActiveResponse()`, which aborts the active controller and calls:

```text
tts.stop('interrupted')
```

The LLM service passes the supplied `AbortSignal` into the `/api/order/understand` request. An `AbortError` is explicitly handled as cancellation.

### Generation IDs / stale-response protection

Each conversation turn obtains a generation token from `ConcreteInterruptionController.beginNewTurn()`.

The controller validates tokens using:

```text
!isInterrupted && activeGenerationToken === token
```

When a barge-in occurs, the active token is immediately replaced with an invalidated token.

`ConversationAgent` checks the generation token before applying order actions or starting TTS. It also checks that its `activeResponseId` still matches the response being processed.

### TTS queue / active playback management

There is no separate multi-item TTS queue implementation identified in the inspected TTS provider. Instead, starting synthesis first calls `stop('reset')`, and the provider maintains one active audio element/reference at a time.

### State synchronization

`OrderManager` is instantiated once by the application and subscribed to so that UI order state is updated whenever the manager changes. Conversation responses apply their returned `orderActions` to the same order manager.

### Microphone / input handling

The application uses `WebSpeechSTTService` for speech recognition and `WebAudioRealtimeService` for microphone capture and audio-level analysis. The microphone is obtained with browser `getUserMedia()` and configured with echo cancellation, noise suppression, and automatic gain control.

The application patches the STT listener so partial transcripts can trigger barge-in while the agent is speaking. It requires actual transcript content longer than two characters and waits beyond an approximately 800 ms speaking grace period before triggering this STT-based interruption path.

### Rime integration

The client TTS provider requests:

```text
/api/tts/rime
```

and the server calls the Rime TTS API with the configured speaker, text, model ID, and speed.

### Concurrency handling

The implementation uses several concurrent-response safeguards:

* `AbortController` for the active LLM request;
* generation tokens for turn validity;
* response IDs for active-response identity;
* interruption events;
* explicit TTS stopping;
* state transitions between `LISTENING`, `THINKING`, `SPEAKING`, and `INTERRUPTED`.

## 9. Conversation State and Stale Result Protection

VocaBite uses two related identifiers to prevent an obsolete response from becoming the current response.

### Generation token

At the beginning of each turn, `ConversationAgent` calls `beginNewTurn()` and receives a unique generation token.

If the user barges in, `ConcreteInterruptionController.triggerBargeIn()`:

1. marks the conversation as interrupted;
2. records the interruption;
3. replaces the active generation token with an invalidated token;
4. notifies registered listeners.

Before a response is applied, `ConversationAgent` verifies that the original generation token is still valid. If it is invalid, the response returns without applying its order actions or starting TTS.

### Active response ID

Each generated response receives an `activeResponseId`.

Before processing a response, the agent verifies that its response ID is still the active response. When an active response is cancelled, the ID is cleared. This prevents an older response from continuing through the normal response path after a newer turn has taken control.

### Important scope

The implementation provides explicit stale-response protection in the conversation/TTS path. It does **not** implement a separate distributed transaction or server-side cancellation protocol for already-completed external LLM/Rime requests. The protection is implemented at the application/conversation layer through abort signals, token checks, response IDs, and playback cancellation.

## 10. Reproducibility

### Repository

The submitted project is hosted at:

`Jaiswaran/VocaBite`

The repository's default branch is `main`.

### Required software

The repository is a TypeScript/React application using Vite, Express, Vitest, and related JavaScript/TypeScript tooling. Its package scripts include development, build, start, lint, and test commands.

### Installation

```bash
npm install
```

### Environment variables

The repository provides `.env.example` with the following configuration fields:

```text
GEMINI_API_KEY
GEMINI_MODEL
RIME_API_KEY
RIME_SPEAKER_ID
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_URL
APP_URL
```

Do not commit actual credentials. The repository's example file contains placeholders/empty values rather than secrets.

For the Rime path, `RIME_API_KEY` must be configured. The repository specifies `marsh` as the default Rime speaker.

### Start development server

```bash
npm run dev
```

The server implementation listens on port `3000`.

### Automated tests

```bash
npm run test
```

The repository contains:

```text
tests/interruption/interruptionController.test.ts
tests/conversation/conversationAgent.test.ts
tests/ordering/orderManager.test.ts
```

The available interruption and conversation tests exercise token invalidation and active-response cancellation behavior.

### Manual voice reproduction

1. Start the application.
2. Configure a valid Rime API key.
3. Open the ordering interface.
4. Enable microphone access.
5. Start a voice ordering interaction.
6. Ask the agent to add an item.
7. Wait until the agent is speaking.
8. Interrupt the response with a correction.
9. Observe Rime playback.
10. Observe the cart/order state.
11. Verify the final spoken response.
12. Repeat with different interruption timing.

No API keys, secrets, or private credentials are included in this evidence document.

## 11. Limitations

* **Very fast interruptions:** Very fast interruptions can occasionally take approximately **1–3 seconds** to register.
* **Initial speaking grace period:** The application waits approximately 800 ms after AI speech begins before the STT-based barge-in path can trigger, reducing false interruptions from initial audio bleed.
* **Browser speech recognition:** Input relies on the browser's Web Speech API, so recognition behavior depends on browser/OS implementation and environmental conditions.
* **Rime availability:** If `RIME_API_KEY` is not configured, the Rime provider reports failure and the application can fall back to browser speech synthesis.
* **Network dependency:** LLM and Rime operations depend on network requests; the implementation contains diagnostic latency logging but no quantitative network-performance benchmark is reported here.
* **LiveKit:** The repository contains a LiveKit interface, but the inspected audio service does not contain an actual LiveKit SDK connection implementation; it currently logs connection/disconnection operations instead. Therefore LiveKit is not claimed as the active transport for the interruption test.
* **Quantitative benchmarking:** Numerical success-rate and latency measurements were not collected for the manual interruption test.

## 12. Evidence Summary

| Requirement                | Evidence                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Hard voice problem         | Interruption & recovery                                                                                                                   |
| Target user                | Restaurant customers                                                                                                                      |
| Voice-native interaction   | Voice ordering using browser speech recognition and spoken agent responses                                                                |
| Rime primary spoken output | Dedicated `RimeTTSProvider` is used by `ConversationAgent` for generated responses; Rime requires a configured API key for the Rime path. |
| Stress case                | Mid-response order modification                                                                                                           |
| Test method                | Manual reproducible voice test plus repository unit tests                                                                                 |
| Known limitation           | 1–3 second registration delay for very fast interruptions                                                                                 |
| Quantitative benchmark     | Not measured                                                                                                                              |

## 13. Judge Verification Checklist

* [ ] Application runs successfully — **Requires verification in the judge's environment**
* [ ] Voice ordering works — **Requires live microphone verification**
* [ ] Rime is actively used for spoken output — **Implementation verified; live credential/runtime verification required**
* [ ] Agent can be interrupted during speech — **Implementation and unit-test path present; live end-to-end verification recommended**
* [ ] Previous speech stops/gets invalidated appropriately — **Implementation verified**
* [ ] Updated user instruction is processed — **Implementation path verified; live stress-case verification recommended**
* [ ] Order state remains consistent — **OrderManager integration and automated ordering tests are present; end-to-end stress-case verification required**
* [ ] Final response reflects the latest instruction — **Generation/response checks are implemented; live end-to-end verification required**
* [ ] Stress case can be reproduced — **Manual procedure defined**
* [ ] Known limitations are disclosed — **Yes**
* [ ] No credentials are exposed — **No credentials included in this document; repository example uses placeholders**
