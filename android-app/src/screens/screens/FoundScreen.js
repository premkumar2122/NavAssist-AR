// src/screens/FoundScreen.js
//
// ARRIVAL SCREEN — split into two halves
//
// TOP HALF (green):
//   Tap here = "I have picked up the item" → moves to next
//   This is the ONLY way to collect — no auto-collect
//   The user MUST physically confirm
//
// BOTTOM HALF (blue):
//   Tap here = repeat all product details aloud
//   Hold 3 sec = emergency
//
// On mount: AI speaks full product details automatically
// NO auto-collect timer — user confirms manually

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableWithoutFeedback,
  Dimensions, AccessibilityInfo,
} from 'react-native';
import { SafeAreaView }     from 'react-native-safe-area-context';
import { useApp }           from '../context/AppContext';
import WS                   from '../services/WebSocketService';
import Speech               from '../services/SpeechService';
import { EmergencyOverlay } from '../components/EmergencyOverlay';

const { height: SCREEN_H } = Dimensions.get('window');

export default function FoundScreen() {
  const { state, dispatch } = useApp();
  const prod      = state.currentProduct;
  const zone      = prod ? (state.store?.zones?.[prod.zone] || null) : null;
  const announced = useRef(false);
  const holdTimer = useRef(null);

  // ── Full product announcement ─────────────────────────────
  const announce = () => {
    if (!prod) return;

    const msg =
      'You have arrived at your item. ' +

      prod.name + ' by ' + prod.brand + '. ' +

      prod.desc + ' ' +

      'To find it: stand still and reach your hand forward. ' +
      'The item is at ' + prod.bodyHeight + '. ' +
      'It is the ' + prod.bodyDir + '. ' +

      (zone ? 'You are in the ' + zone.name + ' section, aisle ' + prod.aisle + '. ' : '') +

      'Package size is ' + prod.size + '. ' +

      (state.settings?.priceAnnounce ? 'Price is rupees ' + prod.price + '. ' : '') +

      'Once you have the item in your hand, ' +
      'tap the TOP half of your screen to confirm you have collected it. ' +
      'Tap the BOTTOM half of your screen to hear all this again.';

    Speech.speak(msg, true);
    AccessibilityInfo.announceForAccessibility(msg);
    if (state.settings?.haptic) Speech.hapticArrived();
  };

  // ── Auto-announce on arrival ──────────────────────────────
  useEffect(() => {
    if (!prod || announced.current) return;
    announced.current = true;
    // Short delay to let screen render
    const t = setTimeout(() => announce(), 700);
    return () => clearTimeout(t);
  }, [prod?.id]); // eslint-disable-line

  // Cleanup
  useEffect(() => {
    return () => clearTimeout(holdTimer.current);
  }, []);

  // ── TOP HALF — user confirms they have the item ───────────
  const handleCollect = () => {
    if (state.settings?.haptic) Speech.hapticCollected();
    Speech.speak(prod.name + ' collected! Great job. Moving to your next item.', true);
    setTimeout(() => WS.itemCollected(), 1500);
  };

  // ── BOTTOM HALF — repeat details ──────────────────────────
  const handleRepeat = () => {
    announce();
  };

  if (!prod) return null;

  return (
    <SafeAreaView style={s.safe}>

      {/* ══ TOP HALF — TAP = I HAVE THE ITEM ══ */}
      <TouchableWithoutFeedback
        onPress={handleCollect}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          'TOP HALF of screen. ' +
          'Tap here when you have ' + prod.name + ' in your hand. ' +
          'This will mark it as collected and move to the next item.'
        }
      >
        <View style={s.topHalf}>
          <View style={s.topRing}>
            <Text style={s.topIcon} accessibilityElementsHidden>✅</Text>
          </View>
          <Text style={s.topTitle}>TAP HERE</Text>
          <Text style={s.topSub}>I have the item in my hand</Text>
          <View style={s.topChip} accessibilityElementsHidden>
            <Text style={s.topChipTxt}>{prod.emoji}  {prod.name}</Text>
          </View>
          <View style={s.locChip} accessibilityElementsHidden>
            <Text style={s.locChipTxt}>{prod.bodyHeight}  ·  {prod.bodyDir}</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* ══ DIVIDER ══ */}
      <View style={s.divider}>
        <View style={s.divLine} />
        <View style={s.divBadge}>
          <Text style={s.divBadgeTxt} accessibilityElementsHidden>
            {zone?.name || ''} · Aisle {prod.aisle}
          </Text>
        </View>
        <View style={s.divLine} />
      </View>

      {/* ══ BOTTOM HALF — TAP = REPEAT DETAILS ══ */}
      <TouchableWithoutFeedback
        onPress={handleRepeat}
        onPressIn={() => {
          holdTimer.current = setTimeout(() => {
            dispatch({ type: 'SET_EMERGENCY', on: true });
            WS.emergency();
          }, 3000);
        }}
        onPressOut={() => clearTimeout(holdTimer.current)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          'BOTTOM HALF of screen. ' +
          'Tap here to hear the product location details again. ' +
          'Hold 3 seconds for emergency.'
        }
      >
        <View style={s.bottomHalf}>
          <View style={s.bottomRing}>
            <Text style={s.bottomIcon} accessibilityElementsHidden>🔊</Text>
          </View>
          <Text style={s.bottomTitle}>TAP HERE</Text>
          <Text style={s.bottomSub}>Repeat product location</Text>

          {/* Location details for sighted helpers */}
          <View style={s.detailBox} accessibilityElementsHidden>
            <Text style={s.detailRow}>📍  {prod.bodyHeight}</Text>
            <Text style={s.detailRow}>👋  {prod.bodyDir}</Text>
            <Text style={s.detailRow}>🏪  {zone?.name || ''}  ·  Aisle {prod.aisle}</Text>
            {state.settings?.priceAnnounce && (
              <Text style={s.detailRow}>💰  ₹{prod.price}</Text>
            )}
          </View>

          <Text style={s.holdHint} accessibilityElementsHidden>
            Hold 3 seconds = emergency SOS
          </Text>
        </View>
      </TouchableWithoutFeedback>

      {state.emergencyOn && (
        <EmergencyOverlay
          store={state.store}
          onClose={() => {
            dispatch({ type: 'SET_EMERGENCY', on: false });
            Speech.speak('Emergency cancelled. You are safe.', true);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Divide screen into two equal halves (minus status bar ~80px + divider ~40px)
const HALF = (SCREEN_H - 120) / 2;

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#060610' },

  topHalf: {
    height:          HALF,
    backgroundColor: 'rgba(29,232,122,0.07)',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             9,
    paddingHorizontal: 24,
  },
  topRing:    { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(29,232,122,0.18)', borderWidth: 3, borderColor: '#1de87a', alignItems: 'center', justifyContent: 'center' },
  topIcon:    { fontSize: 36 },
  topTitle:   { fontSize: 30, fontWeight: '700', color: '#1de87a', letterSpacing: 0.5 },
  topSub:     { fontSize: 16, color: '#eeeeff', fontWeight: '500', textAlign: 'center' },
  topChip:    { backgroundColor: 'rgba(29,232,122,0.15)', borderWidth: 0.5, borderColor: 'rgba(29,232,122,0.35)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  topChipTxt: { fontSize: 13, color: '#1de87a' },
  locChip:    { backgroundColor: 'rgba(29,232,122,0.08)', borderWidth: 0.5, borderColor: 'rgba(29,232,122,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  locChipTxt: { fontSize: 11, color: 'rgba(29,232,122,0.8)', fontFamily: 'monospace' },

  divider:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, backgroundColor: '#060610', paddingVertical: 7 },
  divLine:    { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.08)' },
  divBadge:   { backgroundColor: '#12122a', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  divBadgeTxt:{ fontSize: 11, color: 'rgba(238,238,255,0.45)', fontFamily: 'monospace' },

  bottomHalf: {
    flex:            1,
    backgroundColor: 'rgba(79,150,255,0.06)',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             9,
    paddingHorizontal: 24,
    paddingBottom:   8,
  },
  bottomRing:  { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(79,150,255,0.18)', borderWidth: 2.5, borderColor: '#4f96ff', alignItems: 'center', justifyContent: 'center' },
  bottomIcon:  { fontSize: 30 },
  bottomTitle: { fontSize: 26, fontWeight: '700', color: '#4f96ff', letterSpacing: 0.5 },
  bottomSub:   { fontSize: 15, color: '#eeeeff', fontWeight: '500', textAlign: 'center' },
  detailBox:   { gap: 5, alignItems: 'flex-start', backgroundColor: '#12122a', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 13, width: '100%' },
  detailRow:   { fontSize: 13, color: 'rgba(238,238,255,0.75)', lineHeight: 22 },
  holdHint:    { fontSize: 9, color: 'rgba(238,238,255,0.18)', fontFamily: 'monospace', marginTop: 2 },
});
