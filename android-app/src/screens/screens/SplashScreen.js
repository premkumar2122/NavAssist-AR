// src/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import Speech from '../services/SpeechService';

export default function SplashScreen() {
  const { dispatch } = useApp();

  useEffect(() => {
    setTimeout(() => Speech.speak(
      'Welcome to NavAssist AR. Your voice shopping guide for BigMart. Tap anywhere to begin.',
      true
    ), 800);
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <TouchableWithoutFeedback
        onPress={() => dispatch({ type: 'SET_SCREEN', screen: 'HOME' })}
        accessibilityRole="button"
        accessibilityLabel="Tap anywhere to start NavAssist"
      >
        <View style={s.body}>
          <View style={s.ring}>
            <Text style={s.ringIcon}>🎯</Text>
          </View>
          <Text style={s.title}>Nav<Text style={s.blue}>Assist</Text> AR</Text>
          <Text style={s.sub}>Voice-First · AI-Powered · For Blind Shoppers</Text>
          <Text style={s.desc}>
            Your voice shopping companion for BigMart.{'\n'}
            No sight required — just your voice.
          </Text>
          <View style={s.btn}>
            <Text style={s.btnTxt}>Tap anywhere to begin</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#060610' },
  body:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  ring:    { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(79,150,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(79,150,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  ringIcon:{ fontSize: 38 },
  title:   { fontSize: 30, fontWeight: '700', color: '#eeeeff' },
  blue:    { color: '#4f96ff' },
  sub:     { fontSize: 11, color: 'rgba(238,238,255,0.3)', fontFamily: 'monospace' },
  desc:    { fontSize: 14, color: 'rgba(238,238,255,0.55)', lineHeight: 22, textAlign: 'center' },
  btn:     { marginTop: 20, backgroundColor: '#4f96ff', borderRadius: 20, paddingHorizontal: 36, paddingVertical: 16 },
  btnTxt:  { fontSize: 16, fontWeight: '700', color: '#03030c' },
});
