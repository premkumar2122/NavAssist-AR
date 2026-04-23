// App.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet }               from 'react-native';
import { NavigationContainer }            from '@react-navigation/native';
import { createStackNavigator }           from '@react-navigation/stack';
import { GestureHandlerRootView }         from 'react-native-gesture-handler';
import { SafeAreaProvider }               from 'react-native-safe-area-context';
import { AppProvider, useApp }            from './src/context/AppContext';
import { BottomAIBar }                    from './src/components/BottomAIBar';

import SplashScreen   from './src/screens/SplashScreen';
import HomeScreen     from './src/screens/HomeScreen';
import NavigateScreen from './src/screens/NavigateScreen';
import FoundScreen    from './src/screens/FoundScreen';
import MapScreen      from './src/screens/MapScreen';
import SuccessScreen  from './src/screens/SuccessScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

const SCREEN_MAP = {
  SPLASH:   'Splash',
  HOME:     'Home',
  NAVIGATE: 'Navigate',
  FOUND:    'Found',
  MAP:      'Map',
  SUCCESS:  'Success',
  SETTINGS: 'Settings',
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <NavShell />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function NavShell() {
  const { state } = useApp();
  const navRef    = useRef(null);

  useEffect(() => {
    const target = SCREEN_MAP[state.screen];
    if (target && navRef.current) navRef.current.navigate(target);
  }, [state.screen]);

  // Home screen has its own big central orb — no bottom bar needed
  // Splash has no bar
  // All other screens get the bottom AI bar
  const showBottomBar = state.screen !== 'HOME' && state.screen !== 'SPLASH';

  return (
    <View style={s.root}>
      <View style={s.navArea}>
        <NavigationContainer ref={navRef}>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown:           false,
              animationEnabled:      true,
              cardStyleInterpolator:  fadeInterp,
            }}
          >
            <Stack.Screen name="Splash"   component={SplashScreen}   />
            <Stack.Screen name="Home"     component={HomeScreen}     />
            <Stack.Screen name="Navigate" component={NavigateScreen} />
            <Stack.Screen name="Found"    component={FoundScreen}    />
            <Stack.Screen name="Map"      component={MapScreen}      />
            <Stack.Screen name="Success"  component={SuccessScreen}  />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>

      {/* Bottom AI bar — on all screens except Home and Splash */}
      {showBottomBar && <BottomAIBar />}
    </View>
  );
}

function fadeInterp({ current }) {
  return { cardStyle: { opacity: current.progress } };
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#060610' },
  navArea: { flex: 1 },
});
