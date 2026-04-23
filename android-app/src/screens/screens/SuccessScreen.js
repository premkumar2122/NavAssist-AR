// src/screens/SuccessScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp }  from '../context/AppContext';
import Speech      from '../services/SpeechService';

export default function SuccessScreen() {
  const { state, dispatch } = useApp();
  const elapsed = state.startTime ? Math.max(1, Math.round((Date.now()-state.startTime)/60000)) : 0;

  useEffect(() => {
    Speech.speak(
      'Congratulations! All ' + state.route.length + ' items collected in ' + elapsed +
      ' minute' + (elapsed!==1?'s':'') + '. Checkout counters are straight ahead, about 60 steps. Well done!',
      true
    );
    if (state.settings?.haptic) Speech.hapticSuccess();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.ring} accessible accessibilityLiveRegion="assertive" accessibilityLabel="Shopping complete">
          <Text style={s.ringIcon}>✅</Text>
        </View>
        <Text style={s.title}>Shopping complete!</Text>
        <Text style={s.sub}>All {state.route.length} items in {elapsed} min{elapsed!==1?'s':''}. Checkout is ahead.</Text>
        <View style={s.stats}>
          {[['Items',String(state.route.length)],['Time',elapsed+'m'],['Done','100%']].map(([l,v])=>(
            <View key={l} style={s.stat}><Text style={s.statVal}>{v}</Text><Text style={s.statLbl}>{l}</Text></View>
          ))}
        </View>
        {state.route.map((stop,i)=>(
          <View key={stop.product?.id||i} style={s.item}>
            <View style={s.check}><Text style={s.checkTxt}>✓</Text></View>
            <Text style={s.itemEmoji}>{stop.product?.emoji}</Text>
            <Text style={s.itemName}>{stop.product?.name}</Text>
          </View>
        ))}
        <TouchableWithoutFeedback onPress={()=>{dispatch({type:'RESET'});Speech.speak('Starting fresh. Tell me your new shopping list.',true);}} accessibilityRole="button" accessibilityLabel="Start a new shopping trip">
          <View style={s.btn}><Text style={s.btnTxt}>Start new shopping trip</Text></View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex:1, backgroundColor:'#060610' },
  scroll:   { alignItems:'center', padding:24, gap:14, paddingBottom:32 },
  ring:     { width:100, height:100, borderRadius:50, backgroundColor:'rgba(29,232,122,0.1)', borderWidth:2, borderColor:'rgba(29,232,122,0.44)', alignItems:'center', justifyContent:'center' },
  ringIcon: { fontSize:44 },
  title:    { fontSize:24, fontWeight:'700', color:'#eeeeff', textAlign:'center' },
  sub:      { fontSize:13, color:'rgba(238,238,255,0.6)', textAlign:'center', lineHeight:20 },
  stats:    { flexDirection:'row', gap:9, width:'100%' },
  stat:     { flex:1, backgroundColor:'#12122a', borderWidth:0.5, borderColor:'rgba(238,238,255,0.07)', borderRadius:12, padding:13, alignItems:'center' },
  statVal:  { fontSize:22, fontWeight:'700', color:'#eeeeff', fontFamily:'monospace' },
  statLbl:  { fontSize:10, color:'rgba(238,238,255,0.35)', marginTop:2 },
  item:     { flexDirection:'row', alignItems:'center', gap:9, paddingVertical:9, borderBottomWidth:0.5, borderBottomColor:'rgba(238,238,255,0.07)', width:'100%' },
  check:    { width:22, height:22, borderRadius:11, backgroundColor:'rgba(29,232,122,0.12)', borderWidth:1, borderColor:'rgba(29,232,122,0.3)', alignItems:'center', justifyContent:'center' },
  checkTxt: { fontSize:10, color:'#1de87a' },
  itemEmoji:{ fontSize:18 },
  itemName: { fontSize:12, color:'rgba(238,238,255,0.72)', flex:1 },
  btn:      { width:'100%', backgroundColor:'#1de87a', borderRadius:18, padding:16, alignItems:'center', marginTop:8 },
  btnTxt:   { fontSize:15, fontWeight:'700', color:'#021408' },
});
