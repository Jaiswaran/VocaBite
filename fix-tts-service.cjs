const fs = require('fs');
let code = fs.readFileSync('src/services/tts/ttsService.ts', 'utf8');

const regex = /const response = await fetch\('\/api\/tts\/rime'[\s\S]*?\} catch \(err: any\) \{/m;

const newCode = `        const url = \`/api/tts/rime?text=\${encodeURIComponent(text)}&speaker=\${config?.speakerId || 'marsh'}&speed=\${config?.speed || 1.0}\`;
        
        return new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            this.audioElement = audio;
            audio.onplay = () => {
                console.log('[RimeTTSProvider] TTS_PLAYBACK_STARTED (HTMLAudio Native Stream)');
                this._isSpeaking = true;
                options.onStart?.();
            };
            audio.onended = () => {
                console.log('[RimeTTSProvider] TTS_PLAYBACK_ENDED');
                this._isSpeaking = false;
                this.audioElement = null;
                if (this.currentToken === activeToken) {
                    options.onEnd?.();
                }
                resolve();
            };
            audio.onerror = (err) => {
                console.error('[RimeTTSProvider] HTMLAudio error:', err);
                this._isSpeaking = false;
                this.audioElement = null;
                options.onError?.(new Error('HTMLAudio playback failed'));
                reject(err);
            };
            
            // Check again before playback
            if (this.currentToken !== activeToken) {
                console.log('[RimeTTSProvider] STALE_AUDIO_DISCARDED: Discarded before playback.');
                resolve();
                return;
            }
            
            audio.play().catch(err => {
                console.error('[RimeTTSProvider] Playback error:', err);
                this._isSpeaking = false;
                options.onError?.(err);
                reject(err);
            });
        });
      } catch (err: any) {`;

if (code.match(regex)) {
   code = code.replace(regex, newCode);
   fs.writeFileSync('src/services/tts/ttsService.ts', code);
   console.log('Streamed TTS path applied.');
} else {
   console.log('Regex did not match.');
}
