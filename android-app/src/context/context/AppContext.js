// src/context/AppContext.js
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import WS     from '../services/WebSocketService';
import Speech from '../services/SpeechService';

const Ctx = createContext(null);

const INIT = {
  screen:         'SPLASH',
  connected:      false,
  store:          null,
  storeVersion:   0,
  route:          [],
  currentStop:    0,
  collected:      0,
  startTime:      null,
  currentProduct: null,
  currentInstrs:  [],
  currentStep:    0,
  aiText:         'Welcome! I am NavAssist. Tap anywhere and tell me what you need to buy.',
  orbMode:        'idle',
  emergencyOn:    false,
  settings: {
    speechRate:    0.5,
    speechLang:    'en-IN',
    haptic:        true,
    priceAnnounce: true,
  },
};

function reducer(state, action) {
  switch (action.type) {

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_CONNECTED':
      return { ...state, connected: action.connected };

    case 'SET_STORE':
      return { ...state, store: action.store, storeVersion: action.version || 0 };

    case 'STORE_UPDATED':
      return {
        ...state,
        store:        action.store,
        storeVersion: action.version || state.storeVersion + 1,
      };

    case 'SET_ORB':
      return { ...state, orbMode: action.mode };

    case 'SET_AI_TEXT':
      return { ...state, aiText: action.text };

    case 'SET_ROUTE':
      return {
        ...state,
        route:          action.route,
        currentStop:    0,
        collected:      0,
        startTime:      Date.now(),
        currentProduct: action.route[0]?.product || null,
        currentInstrs:  action.route[0]?.instructions || [],
        currentStep:    0,
      };

    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };

    case 'ITEM_COLLECTED': {
      const nextStop = state.currentStop + 1;
      return {
        ...state,
        collected:      state.collected + 1,
        currentStop:    nextStop,
        currentProduct: state.route[nextStop]?.product || null,
        currentInstrs:  state.route[nextStop]?.instructions || [],
        currentStep:    0,
      };
    }

    case 'SET_EMERGENCY':
      return { ...state, emergencyOn: action.on };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'RESET':
      return {
        ...INIT,
        store:       state.store,
        storeVersion:state.storeVersion,
        connected:   state.connected,
        settings:    state.settings,
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    WS.connect();

    const unsubs = [
      WS.on('connected',    ()  => dispatch({ type: 'SET_CONNECTED', connected: true  })),
      WS.on('disconnected', ()  => dispatch({ type: 'SET_CONNECTED', connected: false })),

      WS.on('welcome', (d) => {
        dispatch({ type: 'SET_STORE', store: d.store, version: d.version });
        Speech.speak('Welcome to ' + (d.store?.info?.name || 'the store') +
          '! I am NavAssist. Tell me what you need to buy today.', true);
      }),

      WS.on('store_updated', (d) => {
        dispatch({ type: 'STORE_UPDATED', store: d.store, version: d.version });
      }),

      WS.on('thinking', () => {
        dispatch({ type: 'SET_ORB', mode: 'thinking' });
      }),

      WS.on('speak', (d) => {
        dispatch({ type: 'SET_ORB',     mode: 'speaking' });
        dispatch({ type: 'SET_AI_TEXT', text: d.text });
        Speech.speak(d.text, true);
      }),

      WS.on('ai_response', (d) => {
        dispatch({ type: 'SET_ORB',     mode: 'idle' });
        dispatch({ type: 'SET_AI_TEXT', text: d.speech || '' });
        // Action-specific handling
        if (d.action === 'START_NAV' && d.productIds?.length) {
          WS.startNav(d.productIds);
        }
        if (d.action === 'EMERGENCY') {
          dispatch({ type: 'SET_EMERGENCY', on: true });
          Speech.hapticEmergency();
        }
      }),

      WS.on('route_ready', (d) => {
        dispatch({ type: 'SET_ROUTE', route: d.route });
        dispatch({ type: 'SET_SCREEN', screen: 'NAVIGATE' });
        dispatch({ type: 'SET_ORB', mode: 'navigating' });
      }),

      WS.on('instruction', (d) => {
        dispatch({ type: 'NEXT_STEP' });
        dispatch({ type: 'SET_AI_TEXT', text: d.instruction.text });
        // Haptic per direction
        const dir = d.instruction.direction;
        if (state.settings.haptic) {
          if (dir === 'LEFT')     Speech.hapticLeft();
          else if (dir === 'RIGHT')    Speech.hapticRight();
          else if (dir === 'FORWARD')  Speech.hapticForward();
          else if (dir === 'STOP')     Speech.hapticStop();
          else if (dir === 'BACKWARD') Speech.hapticLeft();
        }
      }),

      WS.on('arrived', () => {
        if (stateRef.current.settings.haptic) Speech.hapticArrived();
        dispatch({ type: 'SET_SCREEN', screen: 'FOUND' });
      }),

      WS.on('next_stop', (d) => {
        if (stateRef.current.settings.haptic) Speech.hapticCollected();
        dispatch({ type: 'ITEM_COLLECTED' });
        dispatch({ type: 'SET_SCREEN', screen: 'NAVIGATE' });
        dispatch({ type: 'SET_AI_TEXT', text: d.firstInstr?.text || '' });
      }),

      WS.on('shopping_complete', () => {
        if (stateRef.current.settings.haptic) Speech.hapticSuccess();
        dispatch({ type: 'SET_SCREEN', screen: 'SUCCESS' });
      }),

      WS.on('emergency_on', () => {
        dispatch({ type: 'SET_EMERGENCY', on: true });
        if (stateRef.current.settings.haptic) Speech.hapticEmergency();
      }),
    ];

    return () => {
      unsubs.forEach(fn => fn());
      Speech.destroy();
    };
  }, []);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useApp() { return useContext(Ctx); }

