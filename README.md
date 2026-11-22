# Blockcrawl Dungeon (Android, offline)

An original, offline dungeon crawler in a blocky style, built as a web game
(HTML5 canvas, no network or CDN dependencies) that can be packaged as an
Android APK.

> This is an original project. It is not a port of the proprietary
> Minecraft Dungeons game: that game's code and assets are not available
> here, and this project does not use them.

## Current state (prototype)

- Procedurally generated dungeon levels (rooms + corridors), increasing difficulty.
- Player with HP, melee attack with a front arc, cooldown, and knockback.
- Two enemy types (zombie, skeleton) with chase and attack AI.
- Stairs unlock once every monster in the level is defeated.
- Touch controls: left-side virtual joystick, right-side ATK button.
  Keyboard: WASD / arrows to move, Space or J to attack, Enter to confirm.
- Works offline: `www/sw.js` caches all assets after the first load.

## Layout

```
www/
  index.html            entry page
  game.js               all game logic and rendering (no dependencies)
  sw.js                 service worker for offline use in a browser
  manifest.webmanifest  PWA manifest
```

## Run locally

```bash
cd www
python3 -m http.server 8080
# open http://localhost:8080
```

## Roadmap to a full game

1. Content: more enemy types, bosses, items, weapons and armour, potions.
2. Progression: XP, stat upgrades, save/load to localStorage.
3. Level variety: themed room sets, traps, locked doors, keys, and treasure rooms.
4. Audio: original sound effects and music, bundled locally.
5. Android packaging (see below), then device testing on phones and tablets.

## Building the Android APK

Recommended path: wrap `www/` with [Capacitor](https://capacitorjs.com/).
The app then runs inside a WebView with no network needed.

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Blockcrawl Dungeon" com.example.blockcrawl --web-dir=www
npx cap add android
npx cap sync android
npx cap open android      # build the APK from Android Studio
```

Requirements: Node 18+, JDK 17, Android Studio with the Android SDK.
Replace `com.example.blockcrawl` with your own application id before release.

Notes:
- Lock orientation to landscape in `AndroidManifest.xml` (already set in the manifest file).
- Keep all assets in `www/`; the app must not fetch anything at runtime for offline play.
