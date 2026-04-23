// src/screens/SettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp }  from '../context/AppContext';
import Speech      from '../services/SpeechService';

export default function SettingsScreen() {
  const { state, dispatch } = useApp();
  const cfg = state.settings;

  const toggle = (key) => {
    const next = !cfg[key];
    dispatch({ type:'UPDATE_SETTINGS', settings:{ [key]:next } });
    Speech.speak((key==='haptic'?'Haptic feedback':'Price announcements')+(next?' on':' off'), true);
  };

  const setRate = (rate) => {
    dispatch({ type:'UPDATE_SETTINGS', settings:{ speechRate:rate } });
    Speech.setRate(rate);
    Speech.speak('Speed changed.', true);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableWithoutFeedback onPress={()=>dispatch({type:'SET_SCREEN',screen:'HOME'})} accessibilityRole="button" accessibilityLabel="Back to home">
          <View style={s.back}><Text style={s.backTxt}>‹</Text></View>
        </TouchableWithoutFeedback>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={s.verRow}>
          <View style={[s.verDot,{backgroundColor:state.connected?'#1de87a':'#ff5f5f'}]}/>
          <Text style={s.verTxt}>v{state.storeVersion}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionLbl}>Voice & Feedback</Text>
        {[
          {key:'haptic',label:'Haptic feedback',desc:'Vibrate to confirm steps and directions'},
          {key:'priceAnnounce',label:'Price announcements',desc:'Speak item prices when found'},
        ].map(({key,label,desc})=>(
          <View key={key} style={s.row}>
            <View style={s.rowInfo}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowDesc}>{desc}</Text></View>
            <TouchableWithoutFeedback onPress={()=>toggle(key)} accessibilityRole="switch" accessibilityState={{checked:!!cfg[key]}} accessibilityLabel={label}>
              <View style={[s.toggle,cfg[key]&&s.toggleOn]}><View style={[s.knob,cfg[key]&&s.knobOn]}/></View>
            </TouchableWithoutFeedback>
          </View>
        ))}
        <Text style={s.sectionLbl}>Speech Speed</Text>
        <View style={s.speedCard}>
          <View style={s.speedRow}>
            {[{l:'Slow',r:0.3},{l:'Normal',r:0.5},{l:'Fast',r:0.7},{l:'Max',r:0.9}].map(({l,r})=>(
              <TouchableWithoutFeedback key={l} onPress={()=>setRate(r)} accessibilityRole="button" accessibilityState={{selected:cfg.speechRate===r}}>
                <View style={[s.speedBtn,cfg.speechRate===r&&s.speedBtnOn]}><Text style={[s.speedTxt,cfg.speechRate===r&&s.speedTxtOn]}>{l}</Text></View>
              </TouchableWithoutFeedback>
            ))}
          </View>
        </View>
        <Text style={s.sectionLbl}>System Info</Text>
        {[
          ['Store',(state.store?.info?.name||'BigMart')+' · '+(state.store?.info?.branch||''),'#1de87a'],
          ['AI Engine','Claude Haiku 4.5','#4f96ff'],
          ['Products',Object.keys(state.store?.products||{}).length+' loaded','#4f96ff'],
          ['Connection',state.connected?'Connected':'Offline',state.connected?'#1de87a':'#ff5f5f'],
          ['DB Version','v'+state.storeVersion,'#4f96ff'],
        ].map(([l,v,c])=>(
          <View key={l} style={s.infoRow}>
            <Text style={s.infoLabel}>{l}</Text>
            <View style={[s.infoBadge,{backgroundColor:c+'22',borderColor:c+'44'}]}>
              <Text style={[s.infoBadgeTxt,{color:c}]} numberOfLines={1}>{v}</Text>
            </View>
          </View>
        ))}
        <Text style={s.sectionLbl}>Emergency</Text>
        <View style={s.row}>
          <View style={s.rowInfo}><Text style={s.rowLabel}>Hold mic bar 3 seconds</Text><Text style={s.rowDesc}>Triggers emergency alert immediately</Text></View>
          <Text style={s.emTag}>SOS</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex:1, backgroundColor:'#060610' },
  header:      { flexDirection:'row', alignItems:'center', gap:10, padding:12, borderBottomWidth:0.5, borderBottomColor:'rgba(255,255,255,0.07)' },
  back:        { width:34, height:34, borderRadius:17, backgroundColor:'#12122a', borderWidth:0.5, borderColor:'rgba(238,238,255,0.13)', alignItems:'center', justifyContent:'center' },
  backTxt:     { fontSize:18, color:'rgba(238,238,255,0.6)' },
  headerTitle: { fontSize:16, fontWeight:'600', color:'#eeeeff', flex:1 },
  verRow:      { flexDirection:'row', alignItems:'center', gap:5 },
  verDot:      { width:7, height:7, borderRadius:3.5 },
  verTxt:      { fontSize:10, color:'rgba(238,238,255,0.4)', fontFamily:'monospace' },
  scroll:      { padding:14, gap:8, paddingBottom:32 },
  sectionLbl:  { fontSize:9, color:'rgba(238,238,255,0.35)', letterSpacing:1, fontFamily:'monospace', textTransform:'uppercase', paddingTop:8 },
  row:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#12122a', borderWidth:0.5, borderColor:'rgba(238,238,255,0.07)', borderRadius:12, padding:14 },
  rowInfo:     { flex:1, marginRight:12 },
  rowLabel:    { fontSize:12, color:'#eeeeff', fontWeight:'500' },
  rowDesc:     { fontSize:10, color:'rgba(238,238,255,0.35)', marginTop:2, lineHeight:15 },
  toggle:      { width:42, height:22, borderRadius:11, backgroundColor:'#1a1a38', borderWidth:1, borderColor:'rgba(238,238,255,0.13)', justifyContent:'center', padding:2 },
  toggleOn:    { backgroundColor:'#4f96ff', borderColor:'#4f96ff' },
  knob:        { width:16, height:16, borderRadius:8, backgroundColor:'#fff', alignSelf:'flex-start' },
  knobOn:      { alignSelf:'flex-end' },
  speedCard:   { backgroundColor:'#12122a', borderWidth:0.5, borderColor:'rgba(238,238,255,0.07)', borderRadius:12, padding:12 },
  speedRow:    { flexDirection:'row', gap:5 },
  speedBtn:    { flex:1, backgroundColor:'#0c0c1e', borderWidth:0.5, borderColor:'rgba(238,238,255,0.07)', borderRadius:8, padding:8, alignItems:'center' },
  speedBtnOn:  { backgroundColor:'rgba(79,150,255,0.15)', borderColor:'rgba(79,150,255,0.35)' },
  speedTxt:    { fontSize:11, color:'rgba(238,238,255,0.4)' },
  speedTxtOn:  { color:'#4f96ff' },
  infoRow:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#12122a', borderWidth:0.5, borderColor:'rgba(238,238,255,0.07)', borderRadius:10, padding:12 },
  infoLabel:   { fontSize:12, color:'rgba(238,238,255,0.6)' },
  infoBadge:   { borderWidth:0.5, borderRadius:20, paddingHorizontal:9, paddingVertical:3, maxWidth:200 },
  infoBadgeTxt:{ fontSize:10, fontFamily:'monospace' },
  emTag:       { fontSize:10, color:'#ffb84a', fontFamily:'monospace', backgroundColor:'rgba(255,184,74,0.12)', borderWidth:0.5, borderColor:'rgba(255,184,74,0.3)', paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
});
