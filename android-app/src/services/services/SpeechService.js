// src/services/SpeechService.js
import Tts   from 'react-native-tts';
import Voice from '@react-native-voice/voice';
import { Vibration } from 'react-native';

let _rate     = 0.5;
let _lang     = 'en-IN';
let _speaking = false;
let _listening= false;

// ── TTS INIT ───────────────────────────────────────────────────
Tts.setDefaultLanguage(_lang);
Tts.setDefaultRate(_rate);
Tts.setDefaultPitch(1.05);
Tts.addEventListener('tts-start',  () => { _speaking = true;  });
Tts.addEventListener('tts-finish', () => { _speaking = false; });
Tts.addEventListener('tts-cancel', () => { _speaking = false; });

// ── STT INIT ───────────────────────────────────────────────────
let _onResult = null;
let _onError  = null;

Voice.onSpeechStart   = ()  => { _listening = true;  };
Voice.onSpeechEnd     = ()  => { _listening = false; };
Voice.onSpeechError   = (e) => { _listening = false; _onError?.(e?.error?.message || 'Error'); };
Voice.onSpeechResults = (e) => {
  _listening = false;
  const text = e?.value?.[0] || '';
  _onResult?.(text);
};

const Speech = {
  // ── TTS ──────────────────────────────────────────────────────
  speak(text, interrupt = true) {
    if (!text) return;
    if (interrupt) Tts.stop();
    Tts.speak(String(text));
  },
  stop()        { Tts.stop(); _speaking = false; },
  setRate(r)    { _rate = r; Tts.setDefaultRate(r); },
  setLang(l)    { _lang = l; Tts.setDefaultLanguage(l); },
  get speaking(){ return _speaking; },

  // ── STT ──────────────────────────────────────────────────────
  startListening(onResult, onError) {
    if (_listening) return;
    _onResult = onResult;
    _onError  = onError;
    Speech.stop();
    Voice.start(_lang).catch(err => onError?.(err?.message || 'mic error'));
  },
  stopListening() {
    Voice.stop();
    _listening = false;
  },
  get listening() { return _listening; },

  // ── HAPTIC patterns ──────────────────────────────────────────
  hapticLeft()      { Vibration.vibrate([80, 40, 80]);           },
  hapticRight()     { Vibration.vibrate([200, 40, 80]);          },
  hapticForward()   { Vibration.vibrate([50]);                   },
  hapticStop()      { Vibration.vibrate([500]);                  },
  hapticArrived()   { Vibration.vibrate([200, 100, 200, 100, 400]); },
  hapticCollected() { Vibration.vibrate([300, 100, 300]);        },
  hapticSuccess()   { Vibration.vibrate([100, 50, 100, 50, 600]); },
  hapticEmergency() { Vibration.vibrate([600, 200, 600, 200, 600]); },

  destroy() {
    Voice.destroy().then(Voice.removeAllListeners);
  },
};

export default Speech;

