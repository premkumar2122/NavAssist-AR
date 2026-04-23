// src/screens/HomeScreen.js
// Home screen with big central voice orb — primary interface for blind users
// Entire screen is one tap zone
// No buttons, no menus — just voice

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableWithoutFeedback,
  Animated, Dimensions, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp }       from '../context/AppContext';
import WS               from '../services/WebSocketService';
import Speech           from '../services/SpeechService';

const { width: W } = Dimensions.get('window');
const ORB = Math.min(W * 0.62, 230);

const ORB_COLOR = {
  idle:       '#4f96ff',
  listening:  '#1de87a',
  thinking:   '#ffb84a',
  speaking:   '#b49dff',
  navigating: '#ffb84a',
};
const ORB_LABEL = {
  idle:       'Tap anywhere — speak to NavAssist',
  listening:  'Listening — speak now…',
  thinking:   'AI is thinking…',
  speaking:   'Speaking — listen carefully',
  navigating: 'Navigation active',
};

export default function HomeScreen() {
  const { state, dispatch } = useApp();
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const tapCount   = useRef(0);
  const tapTimer   = useRef(null);
  const pressTimer = useRef(null);
  const greeted    = useRef(false);

  const color = ORB_COLOR[state.orbMode] || ORB_COLOR.idle;
  const label = ORB_LABEL[state.orbMode] || ORB_LABEL.idle;

  // Welcome message on first connect
  useEffect(() => {
    if (state.connected && !greeted.current) {
      greeted.current = true;
      setTimeout(() => {
        Speech.speak(
          'Welcome to ' + (state.store?.info?.name || 'BigMart') + '. ' +
          'I am NavAssist. Tap anywhere on the screen and tell me what you need to buy.',
          true
        );
      }, 600);
    }
  }, [state.connected]);

  // Pulse when listening
  useEffect(() => {
    if (state.orbMode === 'listening') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [state.orbMode]);

  const startListening = useCallback(() => {
    if (state.orbMode === 'thinking') return;
    if (state.orbMode === 'listening') {
      Speech.stopListening();
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
        Speech.speak('Did not catch that. Tap and try again.', true);
      }
    );
  }, [state.orbMode, dispatch]);

  // Single tap = listen, double tap = repeat
  const handleTap = useCallback(() => {
    tapCount.current++;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      if (tapCount.current >= 2) {
        Speech.speak(state.aiText || 'Nothing to repeat.', true);
      } else {
        startListening();
      }
      tapCount.current = 0;
    }, 320);
  }, [state.aiText, startListening]);

  // Long press = emergency
  const onPressIn  = () => { pressTimer.current = setTimeout(() => { dispatch({ type: 'SET_EMERGENCY', on: true }); WS.emergency(); Vibration.vibrate([600,200,600]); }, 3000); };
  const onPressOut = () => clearTimeout(pressTimer.current);

  return (
    <SafeAreaView style={s.safe}>
      {/* Tiny status row */}
      <View style={s.statusRow}>
        <View style={[s.pill, { backgroundColor: color + '18', borderColor: color + '44' }]}>
          <View style={[s.pillDot, { backgroundColor: state.connected ? '#1de87a' : '#ff5f5f' }]} />
          <Text style={[s.pillTxt, { color }]}>
            {state.connected ? 'AI Ready' : 'Offline'}
          </Text>
        </View>
        <Text style={s.storeTxt} numberOfLines={1}>
          {state.store?.info?.name || 'BigMart'} · {state.store?.info?.branch || ''}
        </Text>
      </View>

      {/* ENTIRE SCREEN = tap zone */}
      <TouchableWithoutFeedback
        onPress={handleTap}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          label + '. Single tap to speak. Double tap to repeat. Hold 3 seconds for emergency.'
        }
      >
        <View style={s.tapZone}>

          {/* Central voice orb */}
          <Animated.View
            style={[
              s.orb,
              {
                width:           ORB,
                height:          ORB,
                borderRadius:    ORB / 2,
                backgroundColor: color + '1a',
                borderColor:     color + '70',
                transform:       [{ scale: pulseAnim }],
              },
            ]}
            accessibilityElementsHidden
          >
            {/* Inner ring */}
            <View style={[s.orbInner, { borderColor: color + '55' }]}>
              {state.orbMode === 'thinking'
                ? <ThinkingDots />
                : state.orbMode === 'listening'
                  ? <WaveBars color={color} />
                  : <Text style={s.micIcon}>🎤</Text>
              }
            </View>
          </Animated.View>

          {/* Status label under orb */}
          <View style={s.statusLabel} accessibilityElementsHidden>
            <View style={[s.labelDot, { backgroundColor: color }]} />
            <Text style={[s.labelTxt, { color }]}>{label}</Text>
          </View>

          {/* AI response text */}
          <View
            style={s.aiBox}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={'NavAssist: ' + state.aiText}
          >
            <Text style={s.aiBoxLabel} accessibilityElementsHidden>NavAssist</Text>
            <Text style={s.aiBoxText}>
              {state.aiText || 'Tap anywhere on the screen and tell me what you need to buy.'}
            </Text>
          </View>

          {/* Hint text */}
          <Text style={s.hint} accessibilityElementsHidden>
            Tap = speak  ·  Double tap = repeat  ·  Hold 3s = emergency
          </Text>

        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────
function WaveBars({ color }) {
  const bars = [0, 80, 160, 240, 160, 80, 0].map((delay, i) => {
    const h = useRef(new Animated.Value(8)).current;
    useEffect(() => {
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(h, { toValue: 32, duration: 280, useNativeDriver: false }),
        Animated.timing(h, { toValue: 8,  duration: 280, useNativeDriver: false }),
      ])).start();
    }, []);
    return <Animated.View key={i} style={{ width: 5, borderRadius: 5, backgroundColor: color, height: h, marginHorizontal: 2 }} />;
  });
  return <View style={{ flexDirection: 'row', alignItems: 'center', height: 40 }}>{bars}</View>;
}

function ThinkingDots() {
  const dots = [0, 1, 2].map(i => {
    const a = useRef(new Animated.Value(0.2)).current;
    useEffect(() => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 200),
        Animated.timing(a, { toValue: 1,   duration: 400, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.2, duration: 400, useNativeDriver: true }),
      ])).start();
    }, []);
    return <Animated.View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffb84a', opacity: a, marginHorizontal: 4 }} />;
  });
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{dots}</View>;
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#060610' },
  statusRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 8 },
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5 },
  pillDot:    { width: 6, height: 6, borderRadius: 3 },
  pillTxt:    { fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },
  storeTxt:   { flex: 1, fontSize: 10, color: 'rgba(238,238,255,0.3)', textAlign: 'right' },
  tapZone:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24 },
  orb:        { borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  orbInner:   { width: '60%', height: '60%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  micIcon:    { fontSize: 52 },
  statusLabel:{ flexDirection: 'row', alignItems: 'center', gap: 7 },
  labelDot:   { width: 7, height: 7, borderRadius: 3.5 },
  labelTxt:   { fontSize: 14, fontWeight: '600' },
  aiBox:      { width: '100%', backgroundColor: '#12122a', borderWidth: 0.5, borderColor: 'rgba(79,150,255,0.22)', borderRadius: 18, padding: 16 },
  aiBoxLabel: { fontSize: 9, color: '#4f96ff', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  aiBoxText:  { fontSize: 15, color: '#eeeeff', lineHeight: 24 },
  hint:       { fontSize: 11, color: 'rgba(238,238,255,0.2)', textAlign: 'center' },
});
