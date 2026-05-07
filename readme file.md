# NavAssist AR — Setup Guide

## Project Structure

```
navassist-final/
├── backend/                     Node.js + Express + WebSocket + Claude AI
│   ├── src/
│   │   ├── server.js            Entry point
│   │   ├── models/
│   │   │   ├── storeDB.js       All 20 products + zones + landmarks (editable)
│   │   │   └── navigationGraph.js  Indoor graph + Dijkstra pathfinding
│   │   ├── routes/
│   │   │   ├── storeRoutes.js   REST CRUD — pushes to Android on every change
│   │   │   └── navigateRoutes.js  Route planning API
│   │   └── websocket/
│   │       └── wsHandler.js     Claude AI voice + live sync to all Android apps
│   ├── package.json
│   └── .env.example
│
├── android-app/                 React Native Android app
│   ├── App.js                   Root entry
│   ├── src/
│   │   ├── context/AppContext.js   Global state + all WS event handlers
│   │   ├── services/
│   │   │   ├── WebSocketService.js  Persistent WS with auto-reconnect
│   │   │   └── SpeechService.js     Android TTS + STT + haptic
│   │   ├── screens/
│   │   │   ├── SplashScreen.js
│   │   │   ├── HomeScreen.js        Full-screen tap zone + voice orb
│   │   │   ├── NavigateScreen.js    Turn-by-turn: FORWARD/LEFT/RIGHT/BACKWARD
│   │   │   ├── FoundScreen.js       AR item identification
│   │   │   ├── MapScreen.js         Store floor map
│   │   │   ├── SuccessScreen.js     Trip complete
│   │   │   └── SettingsScreen.js
│   │   └── components/
│   │       └── EmergencyOverlay.js
│   ├── package.json
│   ├── app.json
│   ├── babel.config.js
│   └── metro.config.js
│
└── admin/
    └── index.html               Shopkeeper dashboard (open in any browser)
```

---

## Step 1 — Start the Backend

```bash
cd backend
cp .env.example .env

# Open .env and set your key:
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

npm install
npm run dev
```

You will see:
```
NavAssist backend running on port 4000
REST  : http://0.0.0.0:4000/api
WS    : ws://0.0.0.0:4000
```

Test it: open `http://localhost:4000/api/health` in your browser.

---

## Step 2 — Open Admin Panel (shopkeeper)

Open `admin/index.html` in any browser (Chrome, Firefox, Edge).

The panel connects to `localhost:4000` automatically.
You will see all 20 products, 9 zones, routes, and landmarks.

**When you save anything in admin panel, it pushes to all connected Android apps in under 1 second.**

---

## Step 3 — Build the Android APK

### What you need to install first
- [Node.js 18+](https://nodejs.org)
- [Android Studio](https://developer.android.com/studio) (includes Android SDK)
- [JDK 17](https://adoptium.net)

### Find your PC's IP address
```bash
# Linux/Mac:
ip route get 1 | awk '{print $7}'

# Windows (in Command Prompt):
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

### Configure backend URL
```bash
cd android-app
```

Open `src/services/WebSocketService.js` and change line 5:
```js
// For same WiFi network (phone and PC both on same router):
const DEFAULT_URL = 'ws://192.168.1.5:4000';  // ← your PC IP here

// For Android emulator on same PC:
const DEFAULT_URL = 'ws://10.0.2.2:4000';
```

### Install React Native dependencies
```bash
cd android-app
npm install
```

### Build debug APK (for testing)
```bash
cd android-app/android
./gradlew assembleDebug
```
APK will be at: `android-app/android/app/build/outputs/apk/debug/app-debug.apk`

### Build release APK (for distribution)
```bash
# 1. Generate a keystore (only needed once):
cd android-app/android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore navassist.keystore -alias navassist \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass navassist123 -keypass navassist123 \
  -dname "CN=NavAssist AR,O=NavAssist,L=Hyderabad,C=IN"

# 2. Add signing config to android-app/android/gradle.properties:
MYAPP_UPLOAD_STORE_FILE=navassist.keystore
MYAPP_UPLOAD_KEY_ALIAS=navassist
MYAPP_UPLOAD_STORE_PASSWORD=navassist123
MYAPP_UPLOAD_KEY_PASSWORD=navassist123

# 3. Build:
cd android-app/android
./gradlew assembleRelease
```
APK at: `android-app/android/app/build/outputs/apk/release/app-release.apk`

### Install on phone
```bash
# Via USB (enable USB Debugging on phone first):
adb install android-app/android/app/build/outputs/apk/debug/app-debug.apk

# Via file transfer:
# Copy APK to phone → Settings → Install unknown apps → install
```

---

## How it works

### Turn-by-turn navigation
When a blind user says "I need milk, bread and shampoo":
1. Claude AI extracts items from natural speech
2. Backend finds each product's `nodeId` in the navigation graph
3. Dijkstra's algorithm computes the shortest path visiting each item once
4. Path is converted to spoken instructions:
   - "Walk straight ahead for 38 steps"
   - "Turn left" (phone vibrates left pattern)
   - "Walk forward 8 steps into Dairy aisle — refrigerator hum guides you"
   - "Walk forward 4 steps"
   - "Stop. Milk cartons at chest height, second from left. White and blue carton."
5. User taps the direction card to confirm each step is done
6. Next instruction is spoken

### Live store sync
When shopkeeper changes a product location in admin panel:
1. Admin panel → PUT `/api/store/products/:id`
2. Backend saves to storeDB.js
3. Backend broadcasts `store_updated` event via WebSocket
4. ALL connected Android apps receive the update instantly
5. Next navigation uses the new location

### No backtracking
The route planner uses a nearest-neighbour greedy algorithm:
- Groups same-zone products together
- Picks shortest total path across all items
- Result: shopper visits each aisle at most once

---

## Troubleshooting

**App can't connect to backend:**
- Your phone and PC must be on the same WiFi network
- Check firewall: allow port 4000 inbound on your PC
- Verify IP: open `http://YOUR_PC_IP:4000/api/health` on your phone browser

**Voice recognition not working:**
- Go to Settings → Apps → NavAssist AR → Permissions → Microphone → Allow
- Must use Chrome-based Android WebView (default on most phones)

**APK build fails:**
- Run `cd android-app/android && ./gradlew clean` then retry
- Ensure `ANDROID_HOME` environment variable points to your Android SDK
- Ensure JDK 17 is active: `java -version` should show version 17

**Store changes not reaching phone:**
- Check WebSocket status in admin panel sidebar (should show green "Connected")
- Restart the backend server
- Reopen the app on phone
