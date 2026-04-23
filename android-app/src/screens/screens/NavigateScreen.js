// src/screens/NavigateScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableWithoutFeedback,
  AccessibilityInfo, NativeModules, NativeEventEmitter,
} from 'react-native';
import { SafeAreaView }     from 'react-native-safe-area-context';
import { useApp }           from '../context/AppContext';
import WS                   from '../services/WebSocketService';
import Speech               from '../services/SpeechService';
import { EmergencyOverlay } from '../components/EmergencyOverlay';

const { StepDetector } = NativeModules;
const stepEmitter = StepDetector ? new NativeEventEmitter(StepDetector) : null;

const DIR_COLOR = { START:'#4f96ff',FORWARD:'#4f96ff',WALK:'#4f96ff',LEFT:'#ffb84a',RIGHT:'#ffb84a',BACKWARD:'#ff6b6b',STOP:'#1de87a' };
const DIR_ICON  = { START:'🚶',FORWARD:'⬆️',WALK:'⬆️',LEFT:'⬅️',RIGHT:'➡️',BACKWARD:'⬇️',STOP:'🛑' };
const DIR_LABEL = { START:'READY',FORWARD:'WALK FORWARD',WALK:'WALK FORWARD',LEFT:'TURN LEFT',RIGHT:'TURN RIGHT',BACKWARD:'TURN AROUND',STOP:'ARRIVED' };

export default function NavigateScreen() {
  const { state, dispatch } = useApp();
  const { route, currentStop, collected, currentInstrs, currentStep } = state;
  const total    = route.length;
  const pct      = total > 0 ? Math.round((collected / total) * 100) : 0;
  const instr    = currentInstrs[currentStep] || null;
  const dirColor = DIR_COLOR[instr?.direction] || '#4f96ff';
  const dirIcon  = DIR_ICON[instr?.direction]  || '⬆️';
  const dirLabel = DIR_LABEL[instr?.direction] || 'WALK FORWARD';
  const isWalk   = instr?.direction === 'FORWARD' || instr?.direction === 'WALK';

  const stepCount      = useRef(0);
  const stepTarget     = useRef(0);
  const stepSub        = useRef(null);
  const advanced       = useRef(false);
  const milestones     = useRef(new Set());
  const currentStepRef = useRef(currentStep);
  const autoStarted    = useRef(false);
  const turnTimer      = useRef(null);
  const [displaySteps, setDisplaySteps] = useState(0);

  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

  const speak = useCallback((text, interrupt = true) => {
    if (!text) return;
    Speech.speak(text, interrupt);
    AccessibilityInfo.announceForAccessibility(text);
  }, []);

  const haptic = useCallback((d) => {
    if (!state.settings?.haptic) return;
    if (d==='LEFT'||d==='BACKWARD') { Speech.hapticLeft(); setTimeout(()=>Speech.hapticLeft(),600); }
    else if (d==='RIGHT') { Speech.hapticRight(); setTimeout(()=>Speech.hapticRight(),600); }
    else if (d==='STOP')  { Speech.hapticStop(); }
    else                  { Speech.hapticForward(); }
  }, [state.settings]);

  const advance = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    stepSub.current?.remove();
    stepSub.current = null;
    if (StepDetector) StepDetector.stop();
    WS.stepDone(currentStepRef.current);
  }, []);

  useEffect(() => {
    if (!autoStarted.current && route.length > 0 && currentInstrs.length > 0) {
      autoStarted.current = true;
      setTimeout(() => { const f=currentInstrs[0]; speak(f.text); haptic(f.direction); }, 1200);
    }
  }, [route, currentInstrs]);

  useEffect(() => {
    if (!instr) return;
    clearTimeout(turnTimer.current);
    stepSub.current?.remove(); stepSub.current = null;
    if (StepDetector) StepDetector.stop();
    stepCount.current=0; stepTarget.current=instr.steps||0;
    advanced.current=false; milestones.current=new Set();
    setDisplaySteps(0);
    speak(instr.text); haptic(instr.direction);
    const d = instr.direction;
    if (d==='LEFT')     { speak('Turn left now.',true); turnTimer.current=setTimeout(()=>{speak('Good.',false);setTimeout(()=>advance(),1000);},4500); }
    if (d==='RIGHT')    { speak('Turn right now.',true); turnTimer.current=setTimeout(()=>{speak('Good.',false);setTimeout(()=>advance(),1000);},4500); }
    if (d==='BACKWARD') { speak('Turn completely around.',false); turnTimer.current=setTimeout(()=>advance(),5000); }
    if (d==='START')    { setTimeout(()=>advance(),2000); }
    if (d==='STOP')     { setTimeout(()=>advance(),800); }
  }, [currentStep, currentStop]);

  useEffect(() => {
    if (!isWalk||!instr?.steps) return;
    stepCount.current=0; stepTarget.current=instr.steps;
    milestones.current=new Set(); setDisplaySteps(0);
    if (!StepDetector||!stepEmitter) { speak('No step sensor. Tap screen once per step.',false); return; }
    stepSub.current?.remove(); stepSub.current=null;
    StepDetector.start();
    stepSub.current = stepEmitter.addListener('onStep', () => {
      const target=stepTarget.current;
      stepCount.current++;
      const count=stepCount.current, remaining=target-count;
      setDisplaySteps(count);
      const mk='r'+remaining;
      if (!milestones.current.has(mk)&&remaining>0) {
        const half=Math.floor(target/2);
        if (remaining===half&&half>4)    { milestones.current.add(mk); speak('Halfway. '+remaining+' more steps.',false); }
        else if(remaining===10&&target>15){ milestones.current.add(mk); speak('10 steps remaining.',false); }
        else if(remaining===5)           { milestones.current.add(mk); speak('5 steps.',false); }
        else if(remaining===3)           { milestones.current.add(mk); speak('3 steps.',false); }
        else if(remaining===1)           { milestones.current.add(mk); speak('1 more step.',false); }
      }
      if (count>=target) advance();
    });
    return () => { stepSub.current?.remove(); stepSub.current=null; if(StepDetector) StepDetector.stop(); };
  }, [currentStep, currentStop]);

  useEffect(() => { return () => { stepSub.current?.remove(); if(StepDetector) StepDetector.stop(); clearTimeout(turnTimer.current); }; }, []);

  const tapCount=useRef(0), tapTimer=useRef(null);
  const handleTap = () => {
    tapCount.current++;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      const n=tapCount.current; tapCount.current=0;
      if (n===1&&instr) speak(instr.text,true);
      else if(n>=3) { dispatch({type:'SET_EMERGENCY',on:true}); WS.emergency(); }
    }, 400);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.pill}><View style={s.dot}/><Text style={s.pillTxt}>{Math.min(currentStop+1,total)} of {total} · Navigating</Text></View>
        <Text style={s.hRight}>{collected}/{total} collected</Text>
      </View>

      <TouchableWithoutFeedback onPress={handleTap} accessible accessibilityRole="button"
        accessibilityLabel={(instr?.text||'Navigation')+'. Tap to repeat. Triple tap for emergency.'}>
        <View style={s.main}>
          <View style={[s.circle,{backgroundColor:dirColor+'22',borderColor:dirColor}]}>
            <Text style={s.circleIcon} accessibilityElementsHidden>{dirIcon}</Text>
          </View>
          <View style={[s.badge,{backgroundColor:dirColor+'22',borderColor:dirColor+'55'}]}>
            <Text style={[s.badgeTxt,{color:dirColor}]}>{dirLabel}</Text>
          </View>
          {isWalk&&instr?.steps>0&&(
            <View style={s.stepWrap} accessibilityElementsHidden>
              <Text style={s.stepNum}>{displaySteps}</Text>
              <Text style={s.stepOf}>of {instr.steps} steps</Text>
              <View style={s.stepBar}><View style={[s.stepFill,{width:Math.min(100,Math.round((displaySteps/instr.steps)*100))+'%',backgroundColor:dirColor}]}/></View>
            </View>
          )}
          <Text style={s.instrTxt} accessible accessibilityLiveRegion="polite">{instr?.text||'Starting…'}</Text>
          {!!instr?.sensory&&<Text style={s.sensory} accessibilityElementsHidden>{instr.sensory}</Text>}
        </View>
      </TouchableWithoutFeedback>

      <View style={s.list}>
        {route.map((stop,i) => {
          const isDone=i<collected, isCur=i===currentStop;
          return (
            <View key={stop.product?.id||i} style={[s.irow,isCur&&s.iCur,isDone&&s.iDone]}
              accessible accessibilityLabel={stop.product?.name+(isDone?', collected':isCur?', going here':`, stop ${i+1}`)}>
              <Text style={s.iEmj}>{stop.product?.emoji}</Text>
              <View style={s.iInfo}><Text style={s.iNm}>{stop.product?.name}</Text><Text style={s.iLc}>{stop.product?.bodyHeight} · {stop.product?.aisle}</Text></View>
              <View style={[s.iBdg,isDone?s.bDone:isCur?s.bCur:s.bWait]}>
                <Text style={[s.iBdgT,isDone?s.tD:isCur?s.tC:s.tW]}>{isDone?'✓':isCur?'NOW':String(i+1)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={s.prog}>
        <View style={s.progBar}><View style={[s.progFill,{width:pct+'%'}]}/></View>
        <Text style={s.progTxt}>{pct}%</Text>
      </View>

      {state.emergencyOn&&<EmergencyOverlay store={state.store} onClose={()=>{dispatch({type:'SET_EMERGENCY',on:false});speak('Emergency cancelled.',true);}}/>}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#060610'},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:'rgba(255,255,255,0.07)',gap:8},
  pill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(255,184,74,0.12)',borderWidth:0.5,borderColor:'rgba(255,184,74,0.28)',borderRadius:20,paddingHorizontal:10,paddingVertical:4,flex:1},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:'#ffb84a'},
  pillTxt:{fontSize:10,fontWeight:'600',color:'#ffb84a',fontFamily:'monospace'},
  hRight:{fontSize:10,color:'rgba(238,238,255,0.3)',fontFamily:'monospace'},
  main:{flex:1,alignItems:'center',justifyContent:'center',gap:12,paddingHorizontal:20},
  circle:{width:110,height:110,borderRadius:55,borderWidth:2.5,alignItems:'center',justifyContent:'center'},
  circleIcon:{fontSize:48},
  badge:{paddingHorizontal:20,paddingVertical:9,borderRadius:30,borderWidth:0.5},
  badgeTxt:{fontSize:13,fontWeight:'700',fontFamily:'monospace',letterSpacing:1},
  stepWrap:{alignItems:'center',gap:4,width:'100%'},
  stepNum:{fontSize:56,fontWeight:'700',color:'#eeeeff',fontFamily:'monospace',lineHeight:64},
  stepOf:{fontSize:12,color:'rgba(238,238,255,0.4)',fontFamily:'monospace'},
  stepBar:{width:'80%',height:8,backgroundColor:'rgba(255,255,255,0.08)',borderRadius:8,overflow:'hidden'},
  stepFill:{height:'100%',borderRadius:8},
  instrTxt:{fontSize:17,color:'#eeeeff',lineHeight:26,fontWeight:'500',textAlign:'center'},
  sensory:{fontSize:11,color:'rgba(238,238,255,0.35)',textAlign:'center',fontStyle:'italic'},
  list:{paddingHorizontal:12,gap:4},
  irow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#12122a',borderWidth:0.5,borderColor:'rgba(238,238,255,0.07)',borderRadius:10,padding:8},
  iCur:{borderColor:'rgba(255,184,74,0.4)',backgroundColor:'rgba(255,184,74,0.08)'},
  iDone:{opacity:0.4},
  iEmj:{fontSize:16,width:24,textAlign:'center'},
  iInfo:{flex:1},
  iNm:{fontSize:11,color:'#eeeeff',fontWeight:'500'},
  iLc:{fontSize:9,color:'rgba(238,238,255,0.3)',marginTop:1},
  iBdg:{paddingHorizontal:6,paddingVertical:2,borderRadius:20,borderWidth:0.5},
  bCur:{backgroundColor:'rgba(255,184,74,0.12)',borderColor:'rgba(255,184,74,0.3)'},
  bDone:{backgroundColor:'rgba(29,232,122,0.12)',borderColor:'rgba(29,232,122,0.3)'},
  bWait:{backgroundColor:'rgba(238,238,255,0.04)',borderColor:'rgba(238,238,255,0.1)'},
  iBdgT:{fontSize:8,fontWeight:'700',fontFamily:'monospace'},
  tC:{color:'#ffb84a'},tD:{color:'#1de87a'},tW:{color:'rgba(238,238,255,0.3)'},
  prog:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:5},
  progBar:{flex:1,height:4,backgroundColor:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'},
  progFill:{height:'100%',backgroundColor:'#4f96ff',borderRadius:4},
  progTxt:{fontSize:10,color:'rgba(238,238,255,0.3)',fontFamily:'monospace',minWidth:30,textAlign:'right'},
});
