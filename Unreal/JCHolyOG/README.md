# JC The Holy OG — Unreal Engine 5.8 (PC + Android + iPhone)

This is the **native port foundation** for the existing web game in the parent repository. It is not a WebView wrapper and it does not replace or redeploy the browser version. Unreal Engine cannot directly run the original Three.js/WebGL JavaScript modules: gameplay must be reimplemented and city assets exported/imported.

## What is implemented in source

- Unreal C++ game and editor targets with a native game mode and third-person character
- Desktop keyboard/mouse plus gamepad movement/look; native flight, ascend, descend, boost
- Mobile dual virtual joystick mapping and a basic native touch HUD with flight, boost, ascend, descend, lightning buttons
- One visible lightning debug ray and a Blueprint event for later authored effects
- Temporary ground and block towers generated at runtime for a test environment
- Mobile-forward rendering settings and initial low/mid device profiles

**Not implemented:** Imported Las Vegas, JC model/animations, Satan, vehicles, missions, AI NPCs, persistent world streaming, production-quality abilities, native multiplayer, or a release build. The placeholder actor and floor are not the production city. All mobile and controller behavior still requires real-device testing.

## Open the project

1. Install Unreal Engine **5.8** with C++ development tools. For Android/iOS, install the platform toolchains described by Epic.
2. Open `JCHolyOG.uproject` in Unreal Editor, generate/compile project code, and check the output log.
3. Create a new **Empty Level** and save it as `Content/Maps/JCProvingGround.umap`.
4. In Project Settings > Maps & Modes, set the Editor Startup Map and Game Default Map to `JCProvingGround` and use `JCGameMode`.
5. Press Play. The Game Mode creates temporary testing geometry and the pawn should be controllable.

This source was generated without running Unreal Editor or device packaging. Treat compile, play, and device checks as pending rather than passed.

## Controls

| Action | Keyboard/mouse | Xbox / PS5-style gamepad | Mobile |
| --- | --- | --- | --- |
| Walk / fly | W A S D | Left stick | Left virtual joystick |
| Look / aim | Mouse | Right stick | Right virtual joystick |
| Flight toggle | F | South face button (Cross / A) | FLY |
| Boost (hold) | Left Shift | Left shoulder (L1/LB) | BOOST (hold) |
| Ascend (hold) | E | North face button (Triangle / Y) | UP (hold) |
| Descend (hold) | Q | East face button (Circle / B) | DOWN (hold) |
| Lightning debug ray | Left click | Right shoulder (R1/RB) | LIGHTNING |

Actual PS5 controller mapping, touch safe-areas, touch multitouch, camera response, and sustained boost speed need hardware QA. The lightning effect is a debug placeholder, not a finished attack.

## Source-preserving migration plan

1. **Flight:** Port the behavior of `../../jc-flight-state.js` into native movement state transitions, including takeoff, hover, hypersonic, dive, and touchdown. This starter implements flight toggle and boost only.
2. **Playable vertical slice:** Replace cube placeholder with JC mesh and animation state machine; implement reliable third-person camera and controller inputs; test frame rate on PC/Android/iPhone.
3. **Vegas assets:** Inspect `../../assets/vegas-city/`, `../../assets/models/manifest.json`, and `../../city-tile-index.js`. Extract verified source ZIP volumes, preserve provenance/license metadata, export geometries to interoperable formats, and import to UE assets. Do **not** import the web-only manifests as though they are Unreal maps.
4. **World:** Use World Partition, level instances/HLOD, mobile-specific mesh/material budgets, streaming memory limits, and origin/coordinate checks. Avoid loading the whole 35 × 35 km world on phones.
5. **Gameplay:** Migrate powers, JC/Satan, NPC AI, traffic, player saves, and missions as native systems using feature tests before content expansion.
6. **Mobile:** Profile on actual iPhone and Android hardware. Budget for lower texture resolution, limited dynamic lights, simplified effects and scalable draw distance. Avoid making FPS guarantees from config alone.

## Platform packaging blockers

- Android: install supported SDK/NDK/JDK and configure signing.
- iOS: use supported macOS/Xcode and Apple signing/provisioning for device distribution.
- Replace example identifiers in Config/DefaultEngine.ini before publishing.
- Create and configure the saved startup map, build native binaries, test both touch and external PS5 controllers.
- Unreal World Partition cells, character art, animations and gameplay assets are *not* currently converted.

Epic UE 5.8 references:
- https://dev.epicgames.com/documentation/unreal-engine/android-support-for-unreal-engine?lang=en-US
- https://dev.epicgames.com/documentation/en-us/unreal-engine/ios-ipados-and-tvos-development-requirements-for-unreal-engine
- https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-creating-mobile-games
