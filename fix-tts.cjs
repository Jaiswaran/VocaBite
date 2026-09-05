const fs = require('fs');
let code = fs.readFileSync('src/services/tts/ttsService.ts', 'utf8');

const oldCode = `        if (response.ok) {
          const data = await response.json();
          if (data.audioUrl || data.audioBase64) {
            console.log('[RimeTTSProvider] TTS_AUDIO_READY');
            
            // Check if interrupted while network request was in-flight
            if (this.currentToken !== activeToken) {
              console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Audio arrived after turn was cancelled (Rime API).');
              options.onInterrupted?.();
              return;
            }

            return new Promise<void>(async (resolve, reject) => {
              try {
                // Decode base64 to Uint8Array
                const binaryString = window.atob(data.audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], { type: 'audio/mp3' });`;

const newCode = `        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer && arrayBuffer.byteLength > 0) {
            console.log('[RimeTTSProvider] TTS_AUDIO_READY');
            
            // Check if interrupted while network request was in-flight
            if (this.currentToken !== activeToken) {
              console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Audio arrived after turn was cancelled (Rime API).');
              options.onInterrupted?.();
              return;
            }

            return new Promise<void>(async (resolve, reject) => {
              try {
                const bytes = new Uint8Array(arrayBuffer);
                const blob = new Blob([bytes], { type: 'audio/mp3' });`;

code = code.replace(oldCode, newCode);

const oldCode2 = `          } else {
             console.error('[RimeTTSProvider] TTS_ERROR: No audio returned from Rime');
             options.onError?.(new Error(data.message || 'No audio returned from Rime'));
             throw new Error(data.message || 'No audio returned from Rime');
          }
        } else {`;

const newCode2 = `          } else {
             console.error('[RimeTTSProvider] TTS_ERROR: No audio returned from Rime');
             options.onError?.(new Error('No audio returned from Rime'));
             throw new Error('No audio returned from Rime');
          }
        } else {`;
code = code.replace(oldCode2, newCode2);

fs.writeFileSync('src/services/tts/ttsService.ts', code);
