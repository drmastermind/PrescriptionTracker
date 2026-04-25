# Prescription Tracker — Mobile (Phase 5)

React Native / Expo app for Android (and iOS).

## Requirements

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- For Android builds: [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
- Android device or emulator with **Expo Go** installed

## Quick start (Expo Go)

```bash
cd mobile
npm install
npm start          # starts Metro bundler + QR code
```

Scan the QR code with Expo Go on your Android device.

On first run, tap **Server settings** on the login screen and enter your backend URL,
e.g. `http://10.0.0.67:42069`.  This is saved on-device and only needs to be set once.

## Build APK (standalone, no Expo Go required)

```bash
eas login          # log in to your Expo account
eas build --platform android --profile preview
```

The `preview` profile produces a signed APK you can install directly.

## Configuration

The default backend URL is `http://10.0.0.67:42069`.  Change it anytime from
**Profile → Server URL** inside the app.

## Auth flow

- Login → username + password → JWT access token + refresh token
- Tokens are stored in `expo-secure-store` (encrypted on-device)
- Access token auto-refreshes on 401; on hard expiry the app returns to login
- Sign out revokes the refresh token on the server and clears local storage
