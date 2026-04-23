// src/components/EmergencyOverlay.js
import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';

export function EmergencyOverlay({ store, onClose }) {
  return (
    <View
      style={s.overlay}
      accessible
      accessibilityViewIsModal={true}
      accessible={true}
      accessibilityLabel="Emergency activated"
    >
      <Text style={s.icon} accessibilityElementsHidden>⚠️</Text>
      <Text style={s.title}>Emergency</Text>
      <Text style={s.sub}>
        Alerting store staff.{'\n'}
        Emergency services notified.{'\n'}
        Stay where you are — help is coming.
      </Text>
      <Text style={s.number} accessibilityLabel="Call 100">📞 100</Text>
      <Text style={s.phone}>
        {store?.info?.phone || '+91 40 2345 6789'}
      </Text>
      <TouchableWithoutFeedback
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="I am safe — cancel emergency"
      >
        <View style={s.btn}>
          <Text style={s.btnTxt}>I am safe — cancel emergency</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position:       'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(170,20,20,0.97)',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            14,
    padding:        32,
    zIndex:         999,
  },
  icon:   { fontSize: 54 },
  title:  { fontSize: 28, fontWeight: '700', color: '#fff' },
  sub:    { fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 22 },
  number: { fontSize: 48, fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  phone:  { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  btn:    { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 18, paddingHorizontal: 36, paddingVertical: 14 },
  btnTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

