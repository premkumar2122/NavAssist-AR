// src/screens/MapScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import Speech     from '../services/SpeechService';

const LAYOUT = [
  [{ id:'ZONE_CHECKOUT', span:3 }],
  [{ id:'ZONE_BEVERAGES' }, { id:'ZONE_PERSONAL_CARE' }, { id:'ZONE_SNACKS' }],
  [{ id:'ZONE_DAIRY' },     { id:'ZONE_GRAINS' },        { id:'ZONE_GROCERY' }],
  [{ id:'ZONE_PRODUCE' },   { id:'ZONE_BAKERY' },        { id:'' }],
];

export default function MapScreen() {
  const { state, dispatch } = useApp();
  const zones    = state.store?.zones    || {};
  const products = state.store?.products || {};

  const announceZone = (id) => {
    const z = zones[id]; if (!z) return;
    const prods = Object.values(products).filter(p => p.zone === id).map(p => p.name).join(', ') || 'none';
    Speech.speak(z.name + '. ' + z.sensory + '. ' + z.stepsFromEntrance + ' steps from entrance. Products: ' + prods + '.', true);
  };

  const pct = state.route.length > 0 ? Math.round((state.collected / state.route.length) * 100) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableWithoutFeedback onPress={() => dispatch({ type:'SET_SCREEN', screen:'HOME' })} accessibilityRole="button" accessibilityLabel="Back">
          <View style={s.back}><Text style={s.backTxt}>‹</Text></View>
        </TouchableWithoutFeedback>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>Store Map</Text>
          <Text style={s.headerSub}>Tap a zone to hear what products are there</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {LAYOUT.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map(({ id, span }) => {
              if (!id) return <View key="empty" style={{ flex:1 }} />;
              const z = zones[id];
              const routeIn = state.route.filter(s => s.product?.zone === id).length;
              const doneIn  = state.route.filter((s,i) => s.product?.zone === id && i < state.collected).length;
              return (
                <TouchableWithoutFeedback key={id} onPress={() => announceZone(id)} accessibilityRole="button" accessibilityLabel={(z?.name||id) + ' zone'}>
                  <View style={[s.cell, span===3 && s.cellFull]}>
                    <Text style={s.cellName}>{z?.shortName||id.replace('ZONE_','')}</Text>
                    <Text style={s.cellAisles}>{(z?.aisles||[]).join('·')}</Text>
                    {routeIn > 0 && <Text style={s.cellBadge}>{doneIn}/{routeIn}</Text>}
                  </View>
                </TouchableWithoutFeedback>
              );
            })}
          </View>
        ))}
        <Text style={s.entranceLbl}>▲ ENTRANCE</Text>
        {state.route.length > 0 && (
          <View style={s.progRow}>
            <Text style={s.progLbl}>{state.collected}/{state.route.length}</Text>
            <View style={s.progBar}><View style={[s.progFill, { width:pct+'%' }]}/></View>
            <Text style={s.progPct}>{pct}%</Text>
          </View>
        )}
        <TouchableWithoutFeedback onPress={() => dispatch({ type:'SET_SCREEN', screen:'NAVIGATE' })} accessibilityRole="button" accessibilityLabel="Start navigation">
          <View style={s.navBtn}><Text style={s.navBtnTxt}>Start Navigation →</Text></View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor:'#060610' },
  header:     { flexDirection:'row', alignItems:'center', gap:10, padding:12, borderBottomWidth:0.5, borderBottomColor:'rgba(255,255,255,0.07)' },
  back:       { width:34, height:34, borderRadius:17, backgroundColor:'#12122a', borderWidth:0.5, borderColor:'rgba(238,238,255,0.13)', alignItems:'center', justifyContent:'center' },
  backTxt:    { fontSize:18, color:'rgba(238,238,255,0.6)' },
  headerInfo: { flex:1 },
  headerTitle:{ fontSize:15, fontWeight:'600', color:'#eeeeff' },
  headerSub:  { fontSize:10, color:'rgba(238,238,255,0.3)', marginTop:1 },
  scroll:     { padding:10, gap:5 },
  row:        { flexDirection:'row', gap:5 },
  cell:       { flex:1, backgroundColor:'#12122a', borderWidth:0.5, borderColor:'rgba(238,238,255,0.13)', borderRadius:10, padding:9, alignItems:'center', justifyContent:'center', minHeight:52, position:'relative' },
  cellFull:   { flex:3 },
  cellName:   { fontSize:10, color:'#eeeeff', fontWeight:'600', textAlign:'center' },
  cellAisles: { fontSize:8, color:'rgba(238,238,255,0.35)', marginTop:2, fontFamily:'monospace' },
  cellBadge:  { position:'absolute', top:4, right:5, fontSize:8, color:'#1de87a', fontFamily:'monospace' },
  entranceLbl:{ textAlign:'center', fontSize:10, color:'rgba(29,232,122,0.8)', fontFamily:'monospace', marginVertical:4 },
  progRow:    { flexDirection:'row', alignItems:'center', gap:8 },
  progLbl:    { fontSize:10, color:'rgba(238,238,255,0.4)', fontFamily:'monospace' },
  progBar:    { flex:1, height:4, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' },
  progFill:   { height:'100%', backgroundColor:'#4f96ff', borderRadius:4 },
  progPct:    { fontSize:10, color:'rgba(238,238,255,0.4)', fontFamily:'monospace' },
  navBtn:     { backgroundColor:'#4f96ff', borderRadius:14, padding:14, alignItems:'center', marginTop:8 },
  navBtnTxt:  { fontSize:14, fontWeight:'700', color:'#03030c' },
});
