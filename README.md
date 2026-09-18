# Netaville

React Native (bare CLI) mobile app.

## Requirements

- Node >= 22.11
- Xcode + CocoaPods (iOS)
- Android Studio / Android SDK (Android) — not yet installed on this machine

## Setup

```sh
npm install
npm run pods   # iOS only; runs `bundle exec pod install`
```

## Run

```sh
npm start      # Metro bundler
npm run ios
npm run android
```

## Checks

```sh
npm run typecheck   # tsc --noEmit, strict
npm run lint        # eslint + prettier
npm test            # jest
```

## Layout

```
src/
  api/          typed fetch client (client.ts) + endpoint config (config.ts)
  components/   shared UI primitives (Screen, Card)
  navigation/   bottom tabs + native stack, typed param lists
  screens/      Home, Details, Settings
  theme/        light/dark palette + spacing scale
```

`@/*` is aliased to `src/*` (tsconfig paths + babel-plugin-module-resolver + jest moduleNameMapper).

Point the app at a backend by editing `src/api/config.ts`.
