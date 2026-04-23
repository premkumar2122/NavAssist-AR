// src/components/BottomAIBar.js
// Full-width, 150px tall AI bar — permanent on all screens except Home
// Single tap anywhere = start/stop mic
// Shows AI message above mic status

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableWithoutFeedback,
  Animated, Vibration,
} from 'react-native';
import { useApp }  from '../context/AppContext';
import WS          from '../services/WebSocketService';
import Speech      from '../services/SpeechService';

export function BottomAIBar() {
  const { state, dispatch } = useApp();
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pressTimer = useRef(null);

  const isListening = state.orbMode === 'listening';
  const isThinking  = state.orbMode === 'thinking';
  const isSpeaking  = state.orbMode === 'speaking';

  const barColor =
    isListening ? '#1de87a' :
    isThinking  ? '#ffb84a' :
    isSpeaking  ? '#b49dff' :
    '#4f96ff';

  const statusText =
    isListening ? '🔴  Listening — speak now' :
    isThinking  ? '⏳  Thinking…' :
    isSpeaking  ? '🔊  Speaking' :
    '🎤  Tap anywhere here to speak';

  // Pulse bar when listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 420, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 420, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [isListening]);

  const handleTap = useCallback(() => {
    if (isThinking) return;

    if (isListening) {
      Speech.stopListening();
      dispatch({ type: 'SET_ORB', mode: 'idle' });
      return;
    }
    if (isSpeaking) {
      Speech.stop();
      dispatch({ type: 'SET_ORB', mode: 'idle' });
      return;
    }

    Speech.stop();
    dispatch({ type: 'SET_ORB', mode: 'listening' });
    Vibration.vibrate(40);

    Speech.startListening(
      (text) => {
        if (!text?.trim()) { dispatch({ type: 'SET_ORB', mode: 'idle' }); return; }
        dispatch({ type: 'SET_ORB', mode: 'thinking' });
        WS.sendVoice(text);
      },
      () => {
        dispatch({ type: 'SET_ORB', mode: 'idle' });
        Speech.speak('Could not hear you. Tap and try again.', true);
      }
    );
  }, [isThinking, isListening, isSpeaking, dispatch]);

  const onPressIn  = () => { pressTimer.current = setTimeout(() => { dispatch({ type: 'SET_EMERGENCY', on: true }); WS.emergency(); Vibration.vibrate([600,200,600,200,600]); }, 3000); };
  const onPressOut = () => clearTimeout(pressTimer.current);

  return (
    <TouchableWithoutFeedback
      onPress={handleTap}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={
        isListening ? 'Listening. Speak now. Tap to cancel.' :
        isThinking  ? 'AI is thinking. Please wait.' :
        'NavAssist microphone. Tap anywhere on this bar to speak. Hold 3 seconds for emergency SOS.'
      }
    >
      <Animated.View
        style={[s.bar, { borderTopColor: barColor, transform: [{ scaleY: pulseAnim }] }]}
      >
        {/* AI message */}
        <View style={s.msgRow}>
          <View style={[s.aiDot, { backgroundColor: state.connected ? '#1de87a' : '#ff5f5f' }]} />
          <Text
            style={s.msgText}
            numberOfLines={2}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={'NavAssist says: ' + (state.aiText || 'Tap to speak')}
          >
            {state.aiText || 'Tap this bar to speak to NavAssist.'}
          </Text>
        </View>

        {/* Full-width mic zone */}
        <View style={[s.micZone, { backgroundColor: barColor + '18', borderTopColor: barColor + '40' }]}>
          <Text style={[s.micStatus, { color: barColor }]}>{statusText}</Text>
          <Text style={s.micHint} accessibilityElementsHidden>
            Hold 3 seconds = emergency SOS
          </Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  bar: {
    width:           '100%',
    backgroundColor: '#0a0a1e',
    borderTopWidth:  2.5,
  },

  msgRow: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    paddingHorizontal: 16,
    paddingTop:        10,
    paddingBottom:     8,
    gap:               8,
  },
  aiDot: {
    width:        7,
    height:       7,
    borderRadius: 3.5,
    marginTop:    5,
    flexShrink:   0,
  },
  msgText: {
    flex:       1,
    fontSize:   14,
    color:      '#eeeeff',
    lineHeight: 21,
  },

  micZone: {
    width:             '100%',
    borderTopWidth:    1,
    paddingVertical:   14,
    paddingHorizontal: 16,
    alignItems:        'center',
    gap:               4,
  },
  micStatus: {
    fontSize:      16,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },
  micHint: {
    fontSize:    10,
    color:       'rgba(238,238,255,0.22)',
    fontFamily:  'monospace',
  },
});
