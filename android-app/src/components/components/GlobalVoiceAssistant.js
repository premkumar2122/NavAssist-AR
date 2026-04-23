// src/components/GlobalVoiceAssistant.js
// Floating microphone button that appears on EVERY screen
// Blind user can always tap this to speak to the AI
// Single tap = start listening
// The AI handles navigation, product info, checkout, etc.

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, TouchableWithoutFeedback, StyleSheet,
  Animated, Vibration,
} from 'react-native';
import { useApp }  from '../context/AppContext';
import WS          from '../services/WebSocketService';
import Speech      from '../services/SpeechService';

export function GlobalVoiceAssistant() {
  const { state, dispatch } = useApp();
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const pressTimer = useRef(null);

  const isListening  = state.orbMode === 'listening';
  const isThinking   = state.orbMode === 'thinking';

  const color = isListening ? '#1de87a' : isThinking ? '#b49dff' : '#4f96ff';

  // Pulse when listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.00, duration: 400, useNativeDriver: true }),
      ])).start();
    } else {
      scaleAnim.stopAnimation();
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    if (isThinking || isListening) return;
    Speech.stop();
    dispatch({ type: 'SET_ORB', mode: 'listening' });
    Vibration.vibrate(40);

    Speech.startListening(
      (text) => {
        if (!text?.trim()) {
          dispatch({ type: 'SET_ORB', mode: 'idle' });
          return;
        }
        dispatch({ type: 'SET_ORB', mode: 'thinking' });
        WS.sendVoice(text);
      },
      () => {
        dispatch({ type: 'SET_ORB', mode: 'idle' });
        Speech.speak('Could not hear you. Try again.', true);
      }
    );
  }, [isThinking, isListening, dispatch]);

  // Long press = emergency
  const onPressIn  = () => {
    pressTimer.current = setTimeout(() => {
      dispatch({ type: 'SET_EMERGENCY', on: true });
      WS.emergency();
      Vibration.vibrate([500, 200, 500]);
    }, 3000);
  };
  const onPressOut = () => clearTimeout(pressTimer.current);

  return (
    <TouchableWithoutFeedback
      onPress={startListening}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={
        isListening ? 'Listening — speak now' :
        isThinking  ? 'AI is thinking — please wait' :
        'Tap to speak to NavAssist AI. Hold 3 seconds for emergency.'
      }
    >
      <Animated.View
        style={[
          s.fab,
          { backgroundColor: color, transform: [{ scale: scaleAnim }] },
        ]}
        accessibilityElementsHidden
      >
        <View style={s.inner}>
          {/* Mic icon using text */}
          <Animated.Text style={s.icon}>
            {isListening ? '🔴' : isThinking ? '⏳' : '🎤'}
          </Animated.Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  fab:   { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  inner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  icon:  { fontSize: 26 },
});
