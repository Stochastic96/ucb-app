# AI Usage Log

Document which AI (Copilot, Claude, Codex, etc.) contributed to which part of the codebase. Add a new entry each time an AI helps with a feature or file.

## 2026-07-28 — Removed camera Waste Scanner; Waste Guide is now text-search-only
- **Owner decision**: the Waste Guide drops the camera/AI/barcode scanner and stays a fast, offline **text search** over the curated bundled lists. Motivation: the barcode mode's Open Food Facts lookup was the app's only third-party network call (undisclosed in the legal screens), and the camera stack added heavy native modules + a `CAMERA` permission.
- services/waste.js: Claude Opus 4.8 — stripped all scanner code (`getBinForAIClass`, `getBinForBarcodeMaterial`, `fetchProductFromOpenFoodFacts`, `resolveBinFromProduct`, `productLikelyHasPfand`, `loadWasteRules`, `matchToken` + OFF helpers). **Strengthened the search**: `normalizeWasteToken` now folds punctuation/hyphens into word breaks; `searchWasteItems` is multi-token with AND semantics + whole-phrase bonus (word-order/typo tolerant, precise) over each item's authoritative EN+DE term list.
- _archive/waste_scanner/: Claude Opus 4.8 — archived `WasteScannerScreen.js`, `waste_model.tflite` (WasteNet), `waste_model_labels.json`, `waste_rules.json` + a `README.md` re-integration checklist (repo `_archive/` convention)
- navigation/ToolsStack.js + screens/waste/WasteGuideScreen.js: Claude Opus 4.8 — removed the `WasteScanner` route, the scan button, the scanner deep-link, and the `loadWasteRules` call
- store/useStore.js, constants/storageKeys.js, services/cache.js: Claude Opus 4.8 — removed the `wasteRules` slice/`setWasteRules`, the `WASTE_RULES` storage key, and its `NON_CACHE_KEYS` entry
- constants/translations/en.js + de.js: Claude Opus 4.8 — removed all `waste_scanner_*` / `screen_waste_scanner` / `waste_scan_btn_a11y` keys
- babel.config.js, metro.config.js, app.json, package.json: Claude Opus 4.8 — dropped the `react-native-worklets-core/plugin` babel plugin, the `tflite` Metro assetExt, the `CAMERA` permission + `NSCameraUsageDescription` + `react-native-vision-camera`/`expo-asset` Expo plugins, and the 5 scanner-only deps (`react-native-vision-camera`, `react-native-worklets-core`, `vision-camera-resize-plugin`, `react-native-fast-tflite`, `expo-asset`)
- __tests__: Claude Opus 4.8 — deleted `WasteScannerScreen.test.js`; rewrote `waste.test.js` (dropped scanner cases, added word-order/punctuation/AND-semantics search tests). Full suite green: **231 passing / 22 suites**
- README.md: Claude Opus 4.8 — full rewrite: fixed false claims (removed "anonymous analytics", "no test suite", "durable analytics queue"), added a Privacy-first section + the real feature set (text-search Waste Guide, Campus Radar, theming, onboarding) and accurate test/EAS commands
- CLAUDE.md: Claude Opus 4.8 — removed the Waste Scanner section; updated Waste Guide, nav tree, store slices, `NON_CACHE_KEYS`, Key Dependencies, App Config, and Archive

## 2026-07-27 — CLAUDE.md audit & refresh (/init)
- CLAUDE.md: Claude Fable 5 — audited the doc against the working tree and fixed stale sections: EAS now documents all three build profiles (development/preview/production, APK outputs); `NON_CACHE_KEYS` list completed (guide checklist, waste rules, campus profile/blocked/consent, onboarded, first steps) and the `ucb_offline_q` literal corrected (doc said `ucb_offline_queue`); store slices added (campus radar, `onboarded`, `wasteRules`, `offlineQueueSize`); navigation tree updated (Onboarding branch, WasteGuide/WasteScanner, Campus* routes, `LegalNotice` route name); NEW "Waste Scanner" section documenting the AI/barcode modes, `waste_rules.json` mapping tables + `WASTE_RULES` override, the majority-vote reliability tuning, and the **Open Food Facts barcode lookup as the app's only third-party network call** (flagged as not yet disclosed in the legal screens); `SECURE_KEYS` list completed (CAMPUS_ID_SK/PK); `react-native-get-random-values` documented as a do-not-remove polyfill; camera permission + vision-camera plugin config documented; `_archive/waste_ai/` documented

## 2026-07-27 — Analytics fully removed + first-run onboarding + list-first design contract
- **Analytics purge (owner decision: the app collects NOTHING)**: deleted `services/analytics.js` + `components/AnalyticsConsentModal.js`; stripped every `trackScreen`/`trackEvent` call from 28 screens/services (`App.js` session lifecycle, `logger.js` error auto-track hook, `bootstrap.js`, `reminders.js`); removed `settings.analyticsEnabled`, `ANALYTICS_CONSENT` storage key, orphaned translation keys (EN+DE); legal screens now state "no analytics, tracking or advertising code of any kind" (Datenschutz/PrivacyPolicy/Impressum rewritten — Impressum previously claimed stats were collected, which would have been a false legal statement after removal). CLAUDE.md documents this as a hard invariant.
- screens/onboarding/OnboardingScreen.js: Claude Fable 5 — NEW pre-login 4-slide welcome flow (research-backed ≤4 steps): language choice EN/DE, four-tabs brief, trust slide (encrypted uni-only login, device-local data, zero tracking, offline-first) with Datenschutz link, login CTA; skippable; `ucb_onboarded` flag; wired via `store.onboarded` + `onboardReady` gate in App.js so no flash
- navigation/RootNavigator.js: Claude Fable 5 — `Onboarding` route for fresh installs; **legal screens moved OUTSIDE the auth gate** (privacy policy was unreachable before login — DSGVO transparency fix)
- services/firstSteps.js + components/GettingStartedCard.js: Claude Fable 5 — NEW post-login "Getting started" checklist on Home (5 tap-through steps, progress bar, dismissible, local-only state `ucb_first_steps`)
- components/ListRow.js: Claude Fable 5 — NEW global list-first design contract (icon tile / title+subtitle / chevron-badge-count accessories, card + compact variants); ToolsScreen, GuideScreen categories and Home quick links (former wrap-grid + QuickLinkButton removed) now all render through it
- screens/tools/ToolsScreen.js: Claude Fable 5 — rows → ListRow; library-booking external link now routed through `services/linking.openExternalUrl` (was raw `Linking.openURL`, against the platform-compat rule)
- __tests__: OnboardingScreen render/skip/trust-link tests, firstSteps unit tests; analytics mocks removed everywhere (238 total passing)

## 2026-07-27 — Campus Radar: premium chat pass (delivery states, trust strip, reliability & security hardening)
- store/useStore.js: Claude Fable 5 — `updateChatMessage`/`removeChatMessage` actions; threads capped at 200 messages
- services/campusRadar.js: Claude Fable 5 — **Delivery ladder** for own DMs (sending → sent → delivered → read, failed on error; monotonic — late acks can't downgrade): local message id now passed into `Mesh.sendPrivateMessage` so `onDeliveryAck`/`onReadReceipt`/`onDeliveryStatusUpdate` correlate; `notifyThreadViewed()` sends read receipts only while the thread is on screen (per-session dedupe). **Security**: Ghost mode now enforced in the service (`_send`/`sendWave`/`shareMyName` no-op) — UI bugs can't leak transmissions; `registerBlockedPeerId()` closes the hole where a blocked identity's ROOM messages still rendered (their peer entry never exists, so the fingerprint check had nothing to match). **Reliability**: native start failure on a device now throws `RADAR_START_FAILED` after cleanup instead of silently showing MOCK students (mock only ever runs where `NativeModules.MeshSdk` is absent); mock mode simulates the full status ladder + read-on-reply
- components/MessageBubble.js: Claude Fable 5 — message grouping (nick once per group, tight spacing, time on last of group), delivery ticks (clock/✓/✓✓/blue-✓✓), failed bubble in warning tint with "Not delivered · Retry" and tap-to-retry
- screens/campus/ChatThreadScreen.js: Claude Fable 5 — inverted FlatList (pinned to bottom, no scroll juggling), trust strip for DMs (E2E · signature-verified/identity-proven · in/out of range), out-of-range warning, room-reach strip ("reaches N students"), radar-off composer state with inline "Turn on", wave debounce + haptics, wave empty-state CTA ("Say hi to X"), handover moved into the ⋯ menu, retry flow (remove failed + resend), read receipts on view, block now also drops the transport id
- screens/campus/RadarScreen.js: Claude Fable 5 — **Chats section** (conversations stay reachable after a peer ages out of Nearby; unread badge, last-message preview, dimmed when out of range); `RADAR_START_FAILED` alert
- constants/translations/en.js + de.js: Claude Fable 5 — 19 new keys (trust/delivery/retry/chats/reach/start-failure)
- __tests__/services/campusRadar.test.js: Claude Fable 5 — service-level Ghost-blocks-all-outbound test, full delivery-ladder test, room-messages-have-no-status, 200-message cap (230 total passing)

## 2026-07-27 — Campus Radar Phase 1: onboarding wizard, ProfileCard v3 (program/semester/languages), wave & encrypted name-sharing
- data/campus_programs.json: Claude Fable 5 — NEW: UCB degree-program catalog with stable 1-byte wire ids (sourced from umwelt-campus.de/studiengaenge + the Birkenfeld Wikipedia article; ids must never be renumbered/reused; review yearly)
- services/campusPrograms.js: Claude Fable 5 — NEW: pure offline lookup (id → bilingual label/degree, umlaut-folded EN+DE search, level grouping) — programs travel as 1 byte, names render locally
- services/campusProfile.js: Claude Fable 5 — ProfileCard **v3**: signed body gains programId (1 B), semester (1 B), "open to" bitmask (1 B, `OPEN_TO` table), speak/learn language ids (≤3 each, `LANGUAGES` wire table). New `tandemMatch()`; `scoreMatch` extended (tandem 4/2, same program 3, same semester 1 — v2 calls unchanged). Profile gains `realName` — **local-only by design: not representable in the card codec**, max 40 chars. Worst-case card ≈ 350 B, still under the 512 B GATT MTU (budget-guarded + tested)
- services/campusRadar.js: Claude Fable 5 — v3 announce/evaluate; sticky per-relationship state (`proven`, shared names, RSSI) now survives 60 s re-announces but resets if the identity fingerprint changes (also fixes pre-existing `proven` reset). NEW message types over the Noise-encrypted DM channel: `__ucb_wave__` (one-tap 👋, rate-limited, freshness-checked) and `__ucb_name__` (real name signed together with recipient fingerprint + timestamp — same anti-replay binding as the identity proof; pure `checkNameShare()` guard). Mock mode upgraded: peers carry v3 fields, wave back, reciprocate name shares
- screens/campus/CampusOnboardingScreen.js: Claude Fable 5 — NEW 5-step animated wizard (consent → identity incl. optional real name → program/semester → open-to/languages/interests → Ghost-mode explainer), useMotion-gated transitions, consent recorded at the consent step, skipped when already granted
- components/ProgramPickerModal.js + LanguagePickerModal.js: Claude Fable 5 — NEW searchable pickers (programs grouped Bachelor/Master/Other; languages max 3 per direction)
- screens/campus/RadarScreen.js: Claude Fable 5 — filter chips (All / My program / My semester / Tandem), search now also matches program label + shared real name, one-tap wave per row (Ghost users get a "Go Visible" prompt), all profile-setup entry points route to the onboarding
- components/MatchCard.js: Claude Fable 5 — program · semester line, Same-program/Tandem badges, shared-name display (nick kept alongside), wave button
- screens/campus/ChatThreadScreen.js: Claude Fable 5 — "Share my name" menu action (confirm dialog; routes to profile edit when unset), wave button in DM composer, centered system chips for wave/name events, header upgrades to "Real Name · nick" after a signature-checked share
- screens/campus/ProfileEditScreen.js: Claude Fable 5 — parity with onboarding: real name (+ privacy note), program picker, semester, open-to chips, speak/learn languages
- constants/translations/en.js + de.js: Claude Fable 5 — ~60 new keys; consent body now discloses program/semester/languages broadcast and states the real name is never broadcast
- __tests__/services/campusProfile.test.js + campusRadar.test.js: Claude Fable 5 — 18 new tests: v3 clamp/round-trip/budget, openTo + language helpers, tandem matrix, score weights, checkNameShare replay/recipient/identity/signature matrix, mock wave/name-share flows (226 total passing)
- __tests__/utils/datetime.test.js: Claude Fable 5 — fixed pre-existing timezone flake: `daysUntil` test built "today" via UTC `toISOString()`, failing between local and UTC midnight; now uses local date parts

## 2026-07-26 — Campus Radar: safety-first defaults (Ghost mode, pseudonyms, safer reporting)
- store/useStore.js: Claude Fable 5 — Added `radarGhost` (default **true**) + `setRadarGhost` — discover-but-hidden safe default
- services/campusRadar.js: Claude Fable 5 — `announcePresence` no-ops in Ghost mode (never broadcast a presence card → invisible in others' Nearby lists); new `setGhostMode(on)` live toggle (going Visible announces immediately)
- screens/campus/RadarScreen.js: Claude Fable 5 — Ghost/Visible segmented control (shown when radar on), three-state status text, consent sheet now shows the safety notice (`campus_consent_safety`) in a warning card
- screens/campus/ChatThreadScreen.js: Claude Fable 5 — Composer locked in Ghost mode with a "Go Visible" bar; `onSend` guarded; report flow upgraded — blocks locally **and** directs serious cases to Campus Security/police with a `tel:110` action (no central moderation, by design)
- constants/translations/en.js + de.js: Claude Fable 5 — Ghost/Visible + safety/report/authority keys; strengthened username hint (pseudonym, never from Stud.IP); consent body mentions Ghost start; added `campus_consent_safety`
- screens/legal/DatenschutzScreen.js: Claude Fable 5 — Campus-Radar section: pseudonym-only, Ghost-start visibility control, "no central moderation → authorities" note
- __tests__/services/campusRadar.test.js: Claude Fable 5 — Ghost toggle test (208 total passing)

## 2026-07-26 — Campus Radar: real BLE transport (react-native-mesh-sdk) + ProfileCard v2 hardening
- package.json: Claude Fable 5 — Added `react-native-mesh-sdk@^1.4.1` (maintained RN port of the current bitchat native cores: BLE mesh, Noise XX E2EE DMs, GCS gossip sync, RSSI). Installed with `--legacy-peer-deps` — a pre-existing Babel 7/8 ERESOLVE in the tree (reproducible with plain `npm install --dry-run`) is unrelated and still needs a separate fix
- services/campusProfile.js: Claude Fable 5 — ProfileCard v2: signed body now embeds a 4-byte unix timestamp + the sender's transport peer id (replay + impersonation protection); `isCardFresh()` freshness policy (10 min age / 2 min skew); `decodeCard` now version-enforcing and fully bounds-checked (throws `UNSUPPORTED_CARD_VERSION` / `CARD_TRUNCATED` instead of over-reading hostile packets)
- services/campusRadar.js: Claude Fable 5 — Rewrote the native adapter against the real `react-native-mesh-sdk` API (probes `NativeModules.MeshSdk` before require; `setMeshId` with private campus UUIDs so UCB devices form their own mesh, separate from public bitchat; `setNickname`/`startServices`/`onMessage`/`onPeerSnapshotsUpdate` mapping). New receive-side `validateHello()` (signature + freshness + transport binding), relay-duplicate LRU, per-peer ingest rate limiting (10 msgs/10 s), reciprocal Ed25519 identity proof over the Noise-encrypted DM channel (`peer.proven`), RSSI/connection merge from peer snapshots, throttled periodic re-announce, Android runtime permission requests (BLE + the location permission the vendored core mandates), delivery acks. Fixed room-vs-DM thread routing (`isPrivate` flag, not sender id)
- store/useStore.js: Claude Fable 5 — Added `radarBtState` (Bluetooth adapter state for UI banners); documented new peer fields (`proven`, `connected`, `rssi`)
- screens/campus/RadarScreen.js: Claude Fable 5 — `startRadar` catch now routes to profile setup only for `PROFILE_REQUIRED` (a declined OS permission no longer bounces the user to the profile editor)
- screens/legal/DatenschutzScreen.js: Claude Fable 5 — Campus-Radar section: added Noise E2EE mention + Android location-permission disclosure (BLE-scan technicality; GPS never read/stored/transmitted)
- __tests__/services/campusProfile.test.js, campusRadar.test.js: Claude Fable 5 — 9 new tests: v2 ts/peerId round-trip, version downgrade rejection, truncation bounds, freshness windows, and validateHello accept/stale/peer-mismatch/tampered-signature/unbound cases (207 total passing)

## 2026-07-22 — Code-review fixes (theming migration + platform-compat + waste)
- screens/calendar/SemesterCalendarScreen.js: Claude Opus 4.8 — **Crash fix**: `KeyDatesTab` referenced `c.mode` without calling `useTheme()`, throwing `ReferenceError: c is not defined` on the Key Dates tab. Added `const c = useTheme()`; also fixed the `'all'` filter chip to keep its neutral (brand-green) active style instead of defaulting to academic blue
- screens/guide/InfoSectionView.js: Claude Opus 4.8 — Added the `.catch(() => {})` the platform-compat commit missed on the "Official Sources" `Linking.openURL` (crash on devices with no `tel:`/`mailto:` handler)
- services/linking.js: Claude Opus 4.8 — **New** centralized `openExternalUrl(url)` + `openInMaps(lat, lng, label)` helpers so the `.catch()` guard and iOS/Android maps-URL divergence live in one place; MapScreen refactored to use them (removes duplicated Platform-branched URL building)
- constants/colors.js: Claude Opus 4.8 — Added `toolIconColor()`/`platformIconColor()` accessors with a neutral fallback (a missing tool/platform id no longer crashes the grid); added `onWarningSolid` palette token (text on the saturated warning fill). ToolsScreen/CampusPlatformsScreen use the accessors
- App.js: Claude Opus 4.8 — Global `maxFontSizeMultiplier` cap now works under React 19 (RN 0.81): `defaultProps` is ignored for forwardRef components, so the cap is injected via a guarded forwardRef-render patch (falls back to legacy `defaultProps` on error)
- screens/timetable/TimetableScreen.js: Claude Opus 4.8 — Tightened event-block line-height (12 vs micro's 14) so short-duration classes don't clip the room line under `overflow:hidden`
- components/OfflineBanner.js: Claude Opus 4.8 — Replaced hardcoded hex/rgba ternaries with the `onWarningSolid` token + `opacity`
- services/waste.js: Claude Opus 4.8 — Skip <4-char product-name words in `resolveBinFromProduct` (so "PET Grooming Wipes" can't map to gelber_sack via the 3-char code); added `iced coffee`/`cold brew` to the Pfand beverage list (canned RTD coffee carries Einwegpfand)
- __tests__/screens/SemesterCalendarScreen.test.js: Claude Opus 4.8 — **New** regression test that opens the Key Dates tab (guards the crash above). Full suite: 176 tests pass

## 2026-07-19 — Platform-compatibility fixes + waste scanner detection robustness
- app.json: Claude Opus 4.8 — Added the missing `react-native-vision-camera` config plugin (`cameraPermissionText`, `enableCodeScanner: true`, `enableMicrophonePermission: false`). The barcode code-scanner + frame processors need the plugin enabled at prebuild/EAS time; camera permission strings now flow from the plugin
- screens/guide/GuideDetailScreen.js, screens/tools/ToolsScreen.js, screens/courses/CourseDetailScreen.js: Claude Opus 4.8 — Added `.catch(() => {})` to unguarded `Linking.openURL` (`tel:`/`mailto:`/external URL). On Wi-Fi iPads (`supportsTablet: true`) with no phone/mail app these reject and surface as an unhandled promise rejection; other screens (CampusResources, Profile) were already guarded
- screens/map/MapScreen.js: Claude Opus 4.8 — Apple Maps deep link `maps://maps.apple.com/…` → standard `https://maps.apple.com/…` universal form; `.catch()` on all four `openURL` calls
- package.json: Claude Opus 4.8 — Removed unused `react-native-reanimated@4.1.1` (nothing imports it, its Babel plugin isn't configured, and it risks the Expo Go worklets version-mismatch documented in the Fact-screen note). Run `npm install` to reconcile the lockfile
- screens/waste/WasteScannerScreen.js: Claude Opus 4.8 — **AI decision layer only** — the worklet/normalization/model-loading is deliberately left to the concurrent model-prediction debugging effort (shared `AI_CONFIDENCE_FLOOR` unchanged). Replaced the strict "2 consecutive identical frames" gate with a rolling majority-vote window (`AI_VOTE_MAJORITY` 3 of `AI_VOTE_WINDOW` 5) plus a per-frame cross-bin margin (`AI_MIN_MARGIN` 12 pts; top bin must beat the best rival bin, else the frame casts a null/ambiguous vote). Majority-of-window survives a flickered/blurred frame → better detection; the margin suppresses near-tied frames → fewer wrong answers. Existing `waste_ai_detected` analytics + result sheet unchanged; `WasteScannerScreen.test.js` still passes

## 2026-07-19 — Waste Scanner: Pfand (deposit) detection for barcodes
- services/waste.js: Claude Opus 4.8 — Added `productLikelyHasPfand(product)` + `resolveBinFromProduct` now returns `pfand` before raw-material matching. A barcode carries no deposit flag, so Pfand is inferred from product-type × packaging (the same rule people use): beverage + can/single-use-PET → Einwegpfand; beer glass → Mehrwegpfand; water/soft-drinks in a bottle → deposit; wine/spirits and cartons/Tetra explicitly excluded. Fixes "beer can → yellow bag" (should be Pfand). Conservative — only fires on clear cases
- screens/waste/WasteScannerScreen.js: Claude Opus 4.8 — Barcode result carries a `hint` when binId==='pfand'; result sheet renders it under a divider ("Deposit is estimated — check for the Pfand logo"). Simulator cola-can mock now demonstrates the Pfand path
- constants/translations/en.js, de.js: Claude Opus 4.8 — Added `waste_scanner_pfand_hint` (EN/DE)
- __tests__/services/waste.test.js: Claude Opus 4.8 — Added Pfand detection tests (beer can, PET soda, energy can, beer/water glass → pfand; wine, juice carton, shampoo → not pfand)

## 2026-07-19 — Waste Scanner: accuracy fix (unnormalized model input) + config cleanup
- screens/waste/WasteScannerScreen.js: Claude Opus 4.8 — Root-cause fix for garbage AI classifications ("can reads as cardboard"): the resize plugin emits float32 pixels in [0,255] but WasteNet was trained/inferred with `image/255.0` (verified against the model's own training notebook — `ImageDataGenerator(rescale=1./255)` — and its author's `load_and_preprocess_image`). Now rescales the frame to [0,1] in place before `runSync`. Also extracted AI confidence floor (0.6) + confirm-streak (2) into named constants, and added an anonymous `waste_ai_detected` analytics signal (class/bin/confidence) for real-world accuracy monitoring
- data/waste_rules.json: Claude Opus 4.8 — Trimmed `mobilenet_mappings` from ~150 stale ImageNet labels (banana, tin can, water bottle…) — leftovers from the old MobileNet ImageNet model that the new 12-class WasteNet model can never emit — down to exactly the 12 real classes. `barcode_mappings` (Open Food Facts material terms) unchanged
- screens/waste/WasteScannerScreen.js: Claude Opus 4.8 — MOCK_SCAN_ITEMS AI labels changed to real WasteNet classes so the simulator exercises the same mapping path as the camera
- __tests__/services/waste.test.js: Claude Opus 4.8 — Replaced the ImageNet-vocabulary assertions with a contract test (labels outside the 12 model classes must return null; case/whitespace normalization) — guards against the rules config drifting back to the old model
- __tests__/screens/WasteScannerScreen.test.js: Claude Opus 4.8 — Updated to the new simulator mock label

## 2026-07-18 — Waste Scanner: dev-build debugging (model loading + camera stack)
- screens/waste/WasteScannerScreen.js: Claude Fable 5 — TFLite model now downloaded to a local file via expo-asset before loading (Metro dev-server URLs fail in fast-tflite); visible error pill + EN/DE strings when the model fails; success/failure logged via logger
- package.json / babel.config.js: Claude Fable 5 — Replaced mismatched camera stack (VisionCamera v5 Nitro + react-native-worklets + v5 resizer) with the mutually compatible v4 stack the screen was written for: react-native-vision-camera@4.7.3, react-native-worklets-core@1.6.3 (+ babel plugin), vision-camera-resize-plugin@3.2.0, react-native-fast-tflite@1.6.1; added expo-asset
- screens/waste/WasteScannerScreen.js: Claude Fable 5 — Frame processor ported to worklets-core (`Worklets.createRunOnJS` bridge, resize-plugin `resize(frame, {scale, pixelFormat, dataType})` API)

## 2026-07-18 — Design-system consolidation (tokens applied app-wide) + Waste Scanner fixes
- constants/colors.js: Claude Fable 5 — Added TYPE typography presets (10 text styles carrying the bundled Space Grotesk/Lexend families — no fontWeight, weights live in the family name), SHADOWS elevation scale (card/raised/overlay per mode), withAlpha() helper, info/infoSurface palette tokens, and centralized feature color maps with dark variants (GUIDE_CATEGORY_COLORS, CALENDAR_CATEGORY_COLORS, TOOL_ICON_COLORS, PLATFORM_ICON_COLORS, PLANNER_CATEGORY_COLORS)
- App.js: Claude Fable 5 — Paper configureFonts (custom fonts for Dialog/Button/Snackbar), global maxFontSizeMultiplier 1.4 cap on Text/TextInput
- navigation/*.js: Claude Fable 5 — headerTitleStyle (Space Grotesk) on all stacks, tabBarLabelStyle (Lexend) on MainTabs
- All screens + components: Claude Fable 5 — Migrated every StyleSheet to the tokens: fontSize/fontWeight pairs → c.type presets, shadow recipes → c.shadows, hardcoded hex → palette tokens/central maps, sub-11px text raised to 11 minimum; removed dozens of inline `c.mode === 'dark'` ternaries (absorbed by the maps). screens/debug/ deliberately skipped (unrouted dev tool)
- screens/LoginScreen.js: Claude Fable 5 — UX: visible field labels, autoComplete/textContentType autofill, show/hide password toggle
- screens/waste/WasteScannerScreen.js: Claude Fable 5 — Fixed native-build crashers: runOnJS now imported from react-native-worklets; hooks (useResizer/useFrameProcessor/useCodeScanner) no longer conditionally called on runtime state (stable hook order); stale-closure guards via refs; useIsFocused for camera isActive; result panel "About this bin" now deep-links into WasteGuide's bin sheet via openBin param
- screens/waste/WasteGuideScreen.js: Claude Fable 5 — Handles route.params.openBin to open a bin detail sheet (scanner deep-link)
- __tests__/constants/colors.test.js: Claude Fable 5 — New token guard tests (light/dark parity of maps, no fontWeight in presets, withAlpha guard)
- package.json: Claude Fable 5 — Removed unused deps: axios, react-native-vector-icons, react-native-calendars

## 2026-07-18 — Offline Waste Scanner (AI & Barcode Scanner)
- package.json, app.json, metro.config.js: Antigravity — Installed react-native-vision-camera, react-native-fast-tflite, and react-native-vision-camera-resizer; added camera permissions for Android/iOS; registered .tflite as a metro asset extension.
- store/useStore.js, constants/storageKeys.js, services/cache.js: Antigravity — Integrated wasteRules store slice, setWasteRules action, WASTE_RULES ('ucb_waste_rules') storage key, and excluded it from cache-clearing.
- data/waste_rules.json: Antigravity — Default mapping rules mapping MobileNet class labels and barcode packaging keywords to Birkenfeld waste bins.
- services/waste.js: Antigravity — Implemented loadWasteRules, getBinForAIClass, getBinForBarcodeMaterial, fetchProductFromOpenFoodFacts (online fetcher), and resolveBinFromProduct (parser).
- screens/waste/WasteGuideScreen.js: Antigravity — Added a camera icon launch button next to search bar in the header, passed down navigation prop, and pre-loaded rules on mount.
- screens/waste/WasteScannerScreen.js: Antigravity — New screen implementing camera view, permission gating, AI/Barcode mode selector, frame processor TFLite inference (utilizing GPU-accelerated react-native-vision-camera-resizer V5 pipeline), Open Food Facts lookup, bottom result sheet, and simulated mock fallback.
- navigation/ToolsStack.js: Antigravity — Registered WasteScanner screen with headerShown: false.
- constants/translations/en.js, de.js: Antigravity — Added bilingual translation strings for permission prompts, mode selectors, HUD status indicators, and offline fallbacks.
- __tests__/services/waste.test.js, __tests__/screens/WasteScannerScreen.test.js: Antigravity — Added unit tests verifying rules mapping, Open Food Facts parsing, mock UI simulation, and mode toggles.

## 2026-07-18 — Waste Guide screen (search UI + answer card + bin sheets)
- screens/waste/WasteGuideScreen.js: Claude (Fable 5) — Search-first screen: bin-tile grid (empty query) → live results while typing → full-colour answer Modal (bin colour flood, variants row for split cases, caution box, haptic + reduced-motion-gated spring entrance) → bin detail bottom sheet (belongs/never/howto). Themed via useThemedStyles; data copy per store language.
- navigation/ToolsStack.js: Claude (Fable 5) — Registered `WasteGuide` route.
- screens/tools/ToolsScreen.js: Claude (Fable 5) — Added Waste Guide tool tile (trash-outline, teal).
- constants/translations/en.js, de.js: Claude (Fable 5) — 18 `waste_*`/`tool_waste*`/`screen_waste_guide` keys per language (parity kept: 476/476).
- __tests__/screens/WasteGuideScreen.test.js: Claude (Fable 5) — 4 render smoke tests (tiles, live search → answer card with variants, empty state, bin sheet); mocks services/analytics (Supabase client can't construct under Jest) and expo-haptics.

## 2026-07-18 — Waste Guide foundation (data + search service)
- data/waste_bins.json: Claude (Fable 5) — 9 disposal destinations (Gelber Sack, Papier, Bio, Restabfall, Altglas, Pfand, Schadstoffe/E-Schrott, Sperrmüll, Altkleider) with real-world bin colors, Ionicons, and full EN/DE copy (belongs/never/howto) referencing Landkreis Birkenfeld practice (AWB pickup, Schadstoffmobil, Wertstoffhof). Content pending review against the AWB Abfallratgeber — items with local variance carry explicit cautions.
- data/waste_items.json: Claude (Fable 5) — 122 bilingual student-life items with aliases, one-line "why", optional caution, and split-destination `variants` (e.g. pizza box clean/greasy). Sustainability nudges (reuse before disposal) built into relevant items.
- services/waste.js: Claude (Fable 5) — Pure offline lookup module (pattern of services/buildings.js): umlaut-folding normalizer, precomputed bilingual search terms, scored search (exact > prefix > word > substring), bin/item accessors, per-language copy helpers with EN fallback.
- __tests__/services/waste.test.js: Claude (Fable 5) — 21 tests: data integrity (unique ids, every bin reference valid, bilingual copy complete), umlaut-insensitive search, ranking, every-alias-findable sweep, language fallback.

## 2026-06-16 — Dark mode completed app-wide (screen-by-screen theming)
- theme/ThemeProvider.js: Claude (Opus 4.8) — Flipped `DARK_MODE_ENABLED` to `true`; `resolveThemeMode` now resolves light/dark/system normally. Re-enabled Dark/System options in SettingsScreen and restored `settings_theme_note` (en/de).
- navigation/MainTabs.js, RootNavigator.js, ToolsStack.js, GuideStack.js: Claude (Opus 4.8) — Themed the tab bar (`tabBarStyle`/active/inactive) and all stack headers (`headerStyle`/`headerTintColor`) + MenuButtons via `useTheme`.
- constants/colors.js: Claude (Opus 4.8) — Added `warningSurface`/`warningBorder`/`onWarning` tokens to both palettes (used by legal/Home/exam/planner warning banners).
- Converted ~20 screens to `useThemedStyles(makeStyles)`: legal (Privacy/Datenschutz/Legal/Impressum), Profile, NewsFeed, Courses, CourseDetail, Events, SemesterCalendar, Planner, AddDeadline, ExamTracker, ExamPlanner, Mensa, Map, CampusPlatforms, Timetable, Fact. Semantic accent colors (info-blue, category chips, urgency badges) made mode-aware via `c.mode` checks. — Claude (Opus 4.8)
- Themed global overlays: components/Sidebar.js, BiometricLockScreen.js, AnalyticsConsentModal.js, ErrorOverlay.js, Tooltip.js, SimpleDatePicker.js (+ `themeVariant`/`textColor` on native pickers). ErrorState.js icon colors now resolve from theme by tone. — Claude (Opus 4.8)
- screens/facts/FactScreen.js: Claude (Opus 4.8) — Themed + gated the card entrance animation behind `useReducedMotion`.
- Note: OfflineBanner (solid-orange status bar) and DebugScreen (not wired into any navigator) intentionally left unthemed.

## 2026-06-16 — UI/UX review fast wins (a11y + dark-mode gating + icon cleanup)
- hooks/useReducedMotion.js: Claude (Opus 4.8) — New hook reading `AccessibilityInfo.isReduceMotionEnabled()` (with live subscription) so animations honor the OS Reduce Motion setting.
- components/SkeletonLoader.js, components/NewsCard.js, components/CourseCard.js, screens/home/HomeScreen.js: Claude (Opus 4.8) — Gate the looping skeleton pulse, card press-scale springs, and Home entrance fade/slide behind `useReducedMotion` (snap to final state when enabled).
- theme/ThemeProvider.js: Claude (Opus 4.8) — Added `DARK_MODE_ENABLED` master switch (currently `false`); `resolveThemeMode` forces light app-wide until dark mode is fully wired, neutralizing any stale `dark`/`system` preference.
- screens/profile/SettingsScreen.js: Claude (Opus 4.8) — Show Dark/System theme options as disabled "Soon" while `DARK_MODE_ENABLED` is false; reordered to Light/Dark/System.
- constants/translations/en.js, de.js: Claude (Opus 4.8) — Added `theme_soon` key and updated `settings_theme_note` for the "coming soon" state.
- constants/colors.js: Claude (Opus 4.8) — Fixed `textFaint` contrast to meet WCAG AA (light `#767676`, dark `#8A8A8A`).
- screens/home/HomeScreen.js: Claude (Opus 4.8) — Bumped header bell/menu touch targets from 42→44pt.
- screens/resources/CampusResourcesScreen.js, screens/guide/GuideDetailScreen.js, screens/legal/PrivacyPolicyScreen.js, screens/legal/DatenschutzScreen.js: Claude (Opus 4.8) — Replaced emoji used as structural/content icons with Ionicons.

## 2026-06-16 — Test suite bootstrap (jest-expo) + logger null-guard fix
- Test framework: Claude (Opus 4.8) — Added jest-expo preset, `babel.config.js`, `jest.setup.js` (AsyncStorage + `@expo/vector-icons` mocks), and `test`/`test:coverage` scripts. Authored 115 tests across utils (datetime, concurrentMap, campusContent), services (facts, news, logger, contentService, offlineQueue, reminders) and components (EventRow, EmptyState).
- services/logger.js: Claude (Opus 4.8) — Fixed `error(source, message)` crashing when called with no error/data argument (`typeof null === 'object'` dereferenced `.type`); added null guards on both branches. Discovered via the logger test suite.

## 2026-06-14 — Critical bug fixes: offline-first launch, cache isolation, database error propagation
- **Issue #10 (Partial news fetch hides course announcements)**: Fixed news merging bug where cached announcements for inactive or failed courses were dropped from the feed.
  - services/news.js: Antigravity — Preserve cached announcements for courses that were not attempted or failed to fetch.
- **Issue #11 (Session analytics may not flush before app kill)**: Fixed background flush delay by removing async promise chaining in endSession.
  - services/analytics.js: Antigravity — Trigger flushNow() immediately during endSession to ensure it executes before app suspension.
- **Issue #12 (Supabase errors silently fail with stale data)**: Fixed silent swallowing of database and RLS policy errors.
  - services/contentService.js: Antigravity — Differentiate network/connection errors from database/API/RLS errors in withFallback, throwing database errors so screens display error states.
- **Issue #13 (Cache clear not atomic)**: Fixed race condition during logout/deletion and ensured in-memory data isolation.
  - store/useStore.js: Antigravity — Extend clearUser to completely wipe all user-created personal data (deadlines, exam plans, registrations, RSVP state) from store memory.
  - screens/profile/SettingsScreen.js: Antigravity — Reorder handleClearCache and handleDeleteAllData to delete personal data from AsyncStorage before executing logout.
- **Issue #14 (Bootstrap error shown too late / Empty cache blank screen / Startup race condition)**: Fixed app startup blockage on network sync, fixed blank screen bug when cache is empty, and resolved a startup race condition.
  - services/bootstrap.js: Antigravity — Implement hydrateStoreFromCache to load cache into store on startup. Returns a boolean indicating if cached data is present, only setting dataReady to true if cache exists. Removed premature store.setUser call which triggered early navigation before hydration completed.
  - App.js: Antigravity — Eagerly hydrate store from cache. If cache exists, transition user to Main tabs instantly and run sync in background; if no cache, show spinner and await bootstrap sync.

## 2026-06-03 — Critical bug fixes: blank screen crash on standalone Android builds
- **Issue**: Standalone Android APK showed blank screen before login; worked in Expo Go due to different native initialization timing
- **Root cause**: Three compounding issues:
  1. `AnalyticsConsentModal.js` called `useNavigation()` at top-level (crashed when navigation context not ready on device)
  2. `services/logger.js` imported analytics at module load, triggering side-effects before app initialized
  3. Dependencies were downgraded from correct Expo 54 versions, causing SDK 50/54 JSI bridge mismatch
- components/AnalyticsConsentModal.js: Claude Haiku 4.5 — Remove useNavigation() hook; accept onLearnMore callback prop instead (uses navigationRef from parent, safe outside nav context)
- App.js: Claude Haiku 4.5 — Pass onLearnMore callback to AnalyticsConsentModal using navigationRef.current?.navigate('PrivacyPolicy')
- services/logger.js: Claude Haiku 4.5 — Lazy-load analytics via require() in getTrackEvent() instead of top-level import; prevents module initialization side-effects
- package.json: Claude Haiku 4.5 — Restore all dependencies to correct Expo 54 versions (react@19.1.0, react-native@0.81.5, all expo-* to original SDK 54 package versions); verified with `npx expo install --check`
- Deleted 12 excess .md files from repo root (documentation clutter from troubleshooting)
- CLAUDE.md: Claude Haiku 4.5 — Added "Navigation Patterns" section explaining useNavigation() vs navigationRef distinction; added "Logging" section documenting services/logger.js usage
- Deployed fixes in commit: 871c63b "fix: fix blank screen crash and clean up codebase"

## 2026-06-02 — Fact of the Day (sustainability trivia)
- data/facts.json: Claude Opus 4.8 — New bundled dataset of 37 curated, deduped sustainability facts (hook + fact + normalised official source URL + category + emoji); bilingual-ready (`en` now, `de` later)
- services/facts.js: Claude Opus 4.8 — Deterministic daily-fact pick + daily-limit logic (3 reveals/day, calendar-midnight reset, seen-tracking) persisted to `ucb_fact_state`
- screens/facts/FactScreen.js: Claude Opus 4.8 — Single card-style screen cycling all facts; built-in Animated entrance per card, expo-haptics on reveal/lock, category-coloured gradient, source out-links via expo-web-browser, reveals-left dots + locked countdown
- screens/home/HomeScreen.js: Claude Opus 4.8 — "Did you know?" teaser card (category-tinted) that opens the Fact screen
- navigation/RootNavigator.js: Claude Opus 4.8 — Registered `FactOfTheDay` screen
- constants/colors.js + translations + storageKeys.js + services/cache.js: Claude Opus 4.8 — `FACT_CATEGORY_COLORS` palette (student colour psychology), EN/DE strings, `FACT_STATE` key protected in `NON_CACHE_KEYS`
- deps/environment: Claude Opus 4.8 — Added expo-haptics only. Trialled Moti + react-native-reanimated but removed them: Expo Go bundles react-native-worklets 0.5.1 while npm pulled 0.8.3 (NativeWorklets HostFunction crash), and Moti added a duplicate React. Switched Fact animations to built-in Animated. Also bumped expo→54.0.35 and expo-updates→29.0.18, added the standard metro.config.js (extends expo/metro-config). `expo-doctor` now passes 18/18 and `expo install --check` is clean; verified dev + prod bundles via `expo export`

## 2026-06-02 — Map: external maps only, main buildings only
- screens/map/MapScreen.js: Claude Opus 4.8 — Removed the "View campus plan" button + its modal (kept "Open campus in maps" external-maps link); filtered the building list to main campus buildings via `searchBuildings(search).filter(isMainCampusBuilding)`; removed now-unused plan styles
- screens/map/CampusPlanView.js: Claude Opus 4.8 — Deleted (the schematic campus plan; its only entry point was the removed plan button)
- services/buildings.js: Claude Opus 4.8 — Added `isMainCampusBuilding` (academic/hotel types) so the Map hides student dormitories and generic "Building 99XX" entries while keeping ZN (9922) + KG (9938); deep-link lookups via `getBuildingByIdOrAlias` still resolve every building

## 2026-06-01 — Copilot init instructions
- COPILOT.md: GPT-5.2-Codex — Added Copilot init instructions mirroring CLAUDE.md for repo guidance

## 2026-06-01 — Home screen liveliness: redesigned cards + basketball scene
- screens/home/HomeScreen.js: Claude Opus 4.8 — Redesigned "What's on today" + "Sports today" rows (category-tinted date tiles, two-line title/meta layout) and Quick Links (white cards with colored circular icon badges, per-link color identity); removed dead `getCampusEventRowLabel` helper
- screens/home/HomeScreen.js: Claude Opus 4.8 — Per-sport icons via `MaterialCommunityIcons` (`SPORT_VISUALS`/`getSportVisual`) so each sport reads at a glance instead of identical barbells

## 2026-06-01 — Beta prep: English-first language + improved engagement analytics
- Map: kept the existing schematic campus map (`screens/map/CampusPlanView.js` + `MapScreen.js`) as-is — no `react-native-maps` (native module, unsupported in Expo Go)
- App.js / store/useStore.js / screens/profile/SettingsScreen.js + constants/translations: Claude Opus 4.8 — Language switch now soft-remounts via `key={language}` instead of `Updates.reloadAsync()`; English-first default
- services/analytics.js: Claude Opus 4.8 — Kept Supabase engagement backend; added session lifecycle (start/end/resume with duration + counts), durable AsyncStorage queue surviving app kills, `app_language` cohort in properties, MAX_QUEUE cap + retry
- screens (Events, Profile, Tools, CampusResources): Claude Opus 4.8 — Added `trackScreen` coverage for engagement analysis
- .env: Claude Opus 4.8 — Removed leftover unused `EXPO_PUBLIC_MAPBOX_TOKEN`; kept Stud.IP + Supabase keys (Supabase key is public anon, not a personal credential); login ships empty

## 2026-05-28 — Events screen: upcoming first
- screens/events/EventsScreen.js: Claude Sonnet 4.6 — Show upcoming events before past ones; past events moved to a "Past Events" section at the bottom (still visible but de-prioritised)

## 2026-05-28 — UI/UX audit fixes
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Remove dead non-interactive "Map" section (static info with no action)
- screens/map/MapScreen.js: Claude Sonnet 4.6 — Fix "Apple Maps" → "Maps" (app supports both iOS and Android); translate "Campusplan anzeigen" → "View Campus Plan" for language consistency
- screens/guide/GuideDetailScreen.js: Claude Sonnet 4.6 — Replace raw TextInput search bars in contacts/glossary/faq/buildings sub-screens with shared SearchBar component for visual consistency

## 2026-05-28 — Navigation fixes + Tooltip component
- screens/events/EventsScreen.js: Claude Sonnet 4.6 — Fix back button: canGoBack/goBack was checking EventsStack (single-screen, always false) instead of the full navigation tree
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — Fix Timetable back arrow from Home: navigate to ToolsHome+openTimetable param instead of directly to Timetable (race condition when ToolsStack uninitialized)
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Handle openTimetable param via useEffect (pushes Timetable from within ToolsStack → guaranteed back arrow); remove "Available" label; informative hero subtitle
- components/Tooltip.js: Claude Sonnet 4.6 — Reusable ? icon with fade modal overlay; tap to dismiss
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Add Tooltip in filter bar explaining deadlines + reminders
- screens/exams/ExamTrackerScreen.js: Claude Sonnet 4.6 — Add Tooltip alongside progress title explaining QIS checklist behaviour

## 2026-05-28 — Guide/Tools UI consistency pass
- screens/guide/GuideScreen.js: Claude Sonnet 4.6 — Align visual style with ToolsScreen: add hero banner, SURFACE background, card borderRadius 14, elevation 2, icon box 48×48/r13, label 16/700, desc 13, chevron size 18, marginHorizontal 12 on cards, "Topics" section label

## 2026-05-28 — Engagement metrics (Supabase analytics)
- services/analytics.js: Claude Sonnet 4.6 — New service: anonymous session-scoped event tracker; batches to Supabase every 30s or 10 events; no-op in dev; session_id is random UUID per cold start, never persisted or linked to user
- App.js: Claude Sonnet 4.6 — Add startSession() on mount, flushNow() on AppState background
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — trackScreen('HomeScreen') in useFocusEffect
- screens/map/MapScreen.js: Claude Sonnet 4.6 — trackScreen, campus_plan_opened, building_selected (list + plan), navigate_to_building, building_search_used
- screens/timetable/TimetableScreen.js: Claude Sonnet 4.6 — trackScreen on mount
- screens/mensa/MensaScreen.js: Claude Sonnet 4.6 — trackScreen on mount
- screens/guide/GuideScreen.js: Claude Sonnet 4.6 — trackScreen + guide_category_opened per category
- screens/news/NewsFeedScreen.js: Claude Sonnet 4.6 — trackScreen in useFocusEffect + news_item_opened
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — deadline_added on new deadline save
- services/reminders.js: Claude Sonnet 4.6 — notification_scheduled (type: event/sport/deadline/exam) in each schedule function
- services/bootstrap.js: Claude Sonnet 4.6 — bootstrap_success (+ course_count) and bootstrap_error (+ error_type)
- screens/legal/DatenschutzScreen.js: Claude Sonnet 4.6 — Add analytics disclosure row, update intro to "studentengeführtes Projekt", update Supabase section, update footer
- screens/legal/ImpressumScreen.js: Claude Sonnet 4.6 — Add "Über dieses Projekt" section, version bump to Beta

## 2026-05-28 — German vocabulary + CampusPlanView integration
- data/buildings.json: Claude Sonnet 4.6 — Renamed all dormitories to "Studierendenwohnheim XXXX", lecture buildings to "Lehrgebäude XXXX", 9912/9913 to German faculty names (Dekanat UWuR/UPuT), 9914 to "Prüfungsamt & AStA", 9925 to "IBT Technikum – Vizepräsidium", 9928 to "Campus Company & Wohnheim-Service"; all service labels converted to German
- screens/map/MapScreen.js: Claude Sonnet 4.6 — Add "Campusplan anzeigen" outlined button in hero card; opens CampusPlanView in a full-screen Modal with back arrow; tapping a building in the plan closes the plan and opens the detail sheet

## 2026-05-27 — Campus map: schematic plan view + building data corrections
- data/buildings.json: Claude Sonnet 4.6 — Corrected 7 buildings from official website crawl: 9912 (UWuR dean's building), 9913 (UPuT vice dean), 9914 (AStA Room 012), 9924 (Studienservice Room 35, Dean, Chancellor), 9925 (VP Room 12), 9917 (IT-ServicePoint Room 112), renamed 9939→9938 (KG building number was wrong per official map)
- screens/map/CampusPlanView.js: Claude Sonnet 4.6 — New component; interactive schematic campus plan matching official Umwelt-Campus map layout; 26 buildings as tappable blocks; parking areas, road labels, legend, compass; no location permission needed
- screens/map/MapScreen.js: Claude Sonnet 4.6 — Add Map / Campus Plan toggle; CampusPlanView shares the same building selection bottom sheet
- screens/map/MapScreen.js: GPT-5.2-Codex — Revert to legacy campus guide list UI (no in-app map), with search + external navigation

## 2026-05-26 — Architecture refactor: quality, scalability, maintainability
- constants/storageKeys.js: Claude Sonnet 4.6 — New file; single source of truth for all AsyncStorage key strings; eliminates scattered literals across App.js, reminders.js, newsState.js, cache.js
- constants/colors.js: Claude Sonnet 4.6 — Add CATEGORY_COLORS export; eliminates identical definition duplicated in HomeScreen and EventsScreen
- utils/datetime.js: Claude Sonnet 4.6 — Add getGreeting, getTimeUntil, formatShortDate, daysUntil; extracted from HomeScreen/EventsScreen where they were defined locally
- services/cache.js: Claude Sonnet 4.6 — Import STORAGE_KEYS; NON_CACHE_KEYS now references constants instead of raw strings (was a manual sync requirement)
- services/bootstrap.js: Claude Sonnet 4.6 — Fix race condition: force=true previously bypassed deduplication guard, allowing two concurrent _runBootstrap calls to race-write the store; now chains after the current run. Also loads going state once per bootstrap, removing duplicate AsyncStorage reads from HomeScreen and EventsScreen mounts
- services/reminders.js: Claude Sonnet 4.6 — Complete DAY_WEEKDAY map (was only Monday/Wednesday/Thursday; sports on Tue/Fri/Sat/Sun silently got no reminder); use STORAGE_KEYS constants for persistence keys
- services/newsState.js: Claude Sonnet 4.6 — Use STORAGE_KEYS.NEWS_LAST_SEEN instead of raw string literal
- services/contentService.js: Claude Sonnet 4.6 — Add console.warn to withFallback catch; bare catch {} previously silenced all Supabase errors making fallback invisible in dev
- App.js: Claude Sonnet 4.6 — Use STORAGE_KEYS for privacy and settings AsyncStorage reads
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — Remove inline EVENT_CATEGORY_COLORS, getGreeting, getTimeUntil, formatShortDate (now imported from shared modules); remove duplicate loadGoingState mount effect
- screens/events/EventsScreen.js: Claude Sonnet 4.6 — Remove inline CATEGORY_COLORS, formatDate, daysUntil (now imported); remove duplicate loadGoingState mount effect

## 2026-05-25 — CLAUDE.md accuracy fixes
- CLAUDE.md: Claude Sonnet 4.6 — Fix clearAllCache() docs (lists all 6 NON_CACHE_KEYS, DSGVO note); add RATE_LIMITED to classifyError types; document WHEN_UNLOCKED_THIS_DEVICE_ONLY SecureStore flag and ucb_session_created key; fix State Management list formatting; add _archive/admin/ section

## 2026-05-23 — Deep security audit: additional hardening
- app.json: Claude Sonnet 4.6 — Set allowBackup:false on Android; prevents ADB backup extracting AsyncStorage (deadlines, exam plans, cached Stud.IP data) on non-rooted devices
- services/supabase.js: Claude Sonnet 4.6 — Disable persistSession + autoRefreshToken; app never uses Supabase auth so no anon JWT should be stored in AsyncStorage
- CLAUDE.md: Claude Sonnet 4.6 — Document required Supabase RLS policies; note that write functions exist for admin tooling only and are not called from active screens

## 2026-05-23 — Full audit: crash fixes, security hardening, state integrity
- CLAUDE.md: Claude Sonnet 4.6 — Improved arch docs: added currentSemester store slice, SESSION_MAX_AGE, bootstrap deduplication guard (_inflightBootstrap), and JS-only codebase clarification
- utils/concurrentMap.js: Claude Sonnet 4.6 — Guard against null/undefined items (`!items?.length`) to prevent TypeError when API returns null
- screens/exams/ExamPlannerScreen.js: Claude Sonnet 4.6 — Safe-guard route.params destructuring (??{}); add .catch() on loadExamData; atomic write order (AsyncStorage before Zustand)
- screens/exams/ExamTrackerScreen.js: Claude Sonnet 4.6 — Add .catch() on loadExamData().then() to prevent unhandled rejection hanging the loading state
- screens/courses/CourseDetailScreen.js: Claude Sonnet 4.6 — Add .catch() on Promise.allSettled chain; clear loading flag in catch so spinner never hangs
- screens/guide/GuideDetailScreen.js: Claude Sonnet 4.6 — Add .catch() on AsyncStorage.getItem().then() to prevent uninitialised checklist state
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Add .catch() on loadDeadlines().then() to prevent unhandled rejection
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Atomic write order reversed (AsyncStorage first, then Zustand) for crash-safe deadline persistence
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Atomic write order for settings (AsyncStorage first); deletion order fix (logout before wipe) for crash-safe data deletion
- screens/mensa/MensaScreen.js: Claude Sonnet 4.6 — mixedContentMode "compatibility" → "never" to block HTTP subresources in HTTPS page
- screens/guide/InfoSectionView.js: Claude Sonnet 4.6 — URL validation guard before Linking.openURL (blocks javascript:/data: injection from Supabase-sourced data)
- services/contentService.js: Claude Sonnet 4.6 — Wrap localFallback() in try/catch; return [] on error instead of crashing the whole fallback chain
- services/bootstrap.js: Claude Sonnet 4.6 — Guard fetchAllEvents return with ?? []; reset courses/events on first-load failure to avoid partial state
- components/BiometricLockScreen.js: Claude Sonnet 4.6 — Add authenticatingRef guard to prevent concurrent auth attempts bypassing the 3-fail limit
- App.js: Claude Sonnet 4.6 — Cold-start biometric gate (checks SecureStore before session restore); AppState listener reads live store state to avoid stale closure; handleUnlock runs session restore after biometric success on cold-start

## 2026-05-19
- screens/mensa/MensaScreen.js: Claude — Replaced static JSON menu with embedded WebView loading mensa.campus-company.eu; added progress bar, loading overlay, error/retry state, and refresh button in header
- components/SearchBar.js: Claude — New shared search input component with clear button, used across list screens
- screens/courses/CoursesScreen.js: Claude — Added search bar filtering by course title, lecturer, semester; switches between SectionList (grouped) and FlatList (search results)
- screens/news/NewsFeedScreen.js: Claude — Added search bar + horizontal course/source filter chips
- screens/guide/GuideScreen.js: Claude — Added search bar filtering 14 guide categories by label and description
- screens/resources/CampusResourcesScreen.js: Claude — Added search bar alongside existing category filter chips; empty state when no results
- screens/events/EventsScreen.js: Claude — Added search bar to Campus Events tab filtering by title, organizer, category
- screens/exams/ExamTrackerScreen.js: Claude Sonnet 4.6 — Fix lecturer field name (course.lecturer → course.lecturerName)
- screens/exams/ExamPlannerScreen.js: Claude Sonnet 4.6 — Fix exam date stored as full ISO string (breaks reminder construction); parse stored YYYY-MM-DD as local midnight to avoid UTC timezone shift
- services/reminders.js: Claude Sonnet 4.6 — Fix thirtyMinBefore() returning negative hour for sports before 00:30; wrap all cancelScheduledNotificationAsync calls in try-catch
- services/cache.js: Claude Sonnet 4.6 — Protect user-owned personal data (deadlines, exam plans, exam registrations, RSVP state, news last-seen) from clearAllCache; DSGVO Art. 5(1)(f) compliance
- services/contentService.js: Claude Sonnet 4.6 — Explicitly pass null for mensa_meta on metaRes.error rather than silently falling through
- components/BiometricLockScreen.js: Claude Sonnet 4.6 — Fix stale closure on mount auto-trigger using useCallback + useRef for failCount
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Fix partial settings write (each toggle now composes full next object); update cache-clear dialog text to clarify personal data is not affected (DSGVO transparency)
- App.js: Claude Sonnet 4.6 — Wire up notification tap → navigate handler (addNotificationResponseReceivedListener + getLastNotificationResponseAsync for cold-start); navigates by identifier only, no personal data handled
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Course picker for Academic category: full current-semester course list shown on field focus, filters as you type, stores courseId link alongside deadline, colour-coded linked-course badge with clear button, auto-unlinks on manual text edit
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Show linked course colour dot next to subject name on deadline cards

## 2026-05-17
- screens/admin/*: Claude — Make all admin panel UI consistently bilingual (English / Deutsch) — labels, dialog titles, alerts, snackbars, and action buttons
- LoginScreen.js, App.js, services/auth.js, components/Sidebar.js, navigation/RootNavigator.js: Claude — Wire up admin feature: call checkAdminStatus after login and session restore, clear on logout, register AdminStack in navigator, add gated Admin Panel entry in Sidebar

## 2026-05-20
- services/news.js: Claude Sonnet 4.6 — Fix ReferenceError: results is not defined (renamed variable after concurrentSettled refactor; correct to sources.some())
- services/contentService.js: Claude Sonnet 4.6 — Fix withFallback caching empty Supabase arrays and bypassing local JSON; now falls back to stale cache or bundled data when Supabase table is unpopulated

## 2026-04-28
- README.md: GitHub Copilot — Created initial project README and AI tracking instructions

[Add more entries below as you use AI for different features.]

## 2026-05-14 (session 2)
- components/BiometricLockScreen.js: Claude Sonnet 4.6 — New component: full-screen biometric lock with 3-fail auto-logout
- App.js: Claude Sonnet 4.6 — AppState listener to lock app after 30s in background when biometric lock enabled
- store/useStore.js: Claude Sonnet 4.6 — Added biometricLockEnabled to persisted settings
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Added biometric lock toggle (hidden on devices without enrolled biometrics)
- screens/LoginScreen.js: Claude Sonnet 4.6 — Accessibility labels on username, password, login button
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — Accessibility labels on quick links, news bell, menu button, cards, see-all links
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Accessibility labels on filter chips, checkbox, card body, delete button, FAB
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Accessibility labels on inputs, course suggestions, category chips, save button
- screens/mensa/MensaScreen.js: Claude Sonnet 4.6 — Accessibility labels on day selector, filter chips, contact button
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Accessibility labels on all tool cards
- components/Sidebar.js: Claude Sonnet 4.6 — Accessibility labels on close button, nav items, logout button
- navigation/MainTabs.js: Claude Sonnet 4.6 — tabBarAccessibilityLabel on all four tabs; menu button labelled

## 2026-05-17
- screens/collaboration/CampusPlatformsScreen.js: Claude Sonnet 4.6 — New screen: in-app launcher for Mattermost, BigBlueButton and Microsoft Teams via expo-web-browser (SFSafariViewController); collapsible course name copier and setup tips
- navigation/ToolsStack.js: Claude Sonnet 4.6 — Added CampusPlatforms route
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Added Campus Platforms card
- CLAUDE.md: Claude Sonnet 4.6 — Added admin panel, biometric lock, navigationRef, datetime utils, missing Supabase tables, withFallback pattern name

## 2026-05-14
- CLAUDE.md: Claude Sonnet 4.6 — Expanded codebase guide: screen data-fetch pattern, notifications section, complete data/ inventory, Supabase table list, key dependencies, app config highlights, all three EAS build profiles
- components/SimpleDatePicker.js: Claude Sonnet 4.6 — Replaced custom chevron-spinner with @react-native-community/datetimepicker (native OS picker on iOS and Android)
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — Fixed persistence desync (save from Zustand store instead of re-reading AsyncStorage); added deadline categories (Academic/Bureaucratic/Personal) with color-coded chip selector
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — Fixed stale list with useFocusEffect; added category filter tabs and colored category pills on each card
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — Activated Deadline Planner and Campus Resources (moved from Coming Soon to live tools list)
- data/events_sports.json, data/events_campus.json: Claude Sonnet 4.6 — Verified SoSe 26 hall schedule and Eventkalender data; seeded Supabase sports_schedule and campus_events tables via SQL

## 2026-04-28
- GuideScreen.js, GuideDetailScreen.js: GitHub Copilot — Added Contacts section with clickable email links

## 2026-05-01
- constants/colors.js: Claude — Added ACCENT and TEXT_SECONDARY tokens; color system documentation
- screens/legal/ImpressumScreen.js: Claude — New screen (DSGVO/TMG compliance)
- screens/legal/DatenschutzScreen.js: Claude — New screen (DSGVO compliance, Art. 13 transparency)
- screens/LoginScreen.js: Claude — Added unofficial app disclaimer
- screens/profile/SettingsScreen.js: Claude — Added Legal section with Impressum and Datenschutz navigation
- navigation/RootNavigator.js: Claude — Registered Impressum and Datenschutz screens
- components/CourseCard.js: Claude — Press scale animation (Animated API)
- components/NewsCard.js: Claude — Press scale animation (Animated API)
- screens/home/HomeScreen.js: Claude — Gradient header (expo-linear-gradient), FadeSlide content animation, color fixes (PRIMARY→DARK for text), ACCENT quick links background, press scale on quick links
- screens/courses/CoursesScreen.js: Claude — FadeSlide animation on content load

## 2026-05-03 — Navigation Restructure + New Features (Claude)

### Navigation Architecture
- navigation/navigationRef.js: Claude — Created `createNavigationContainerRef` for navigation from outside React tree (used by Sidebar)
- App.js: Claude — Added `SafeAreaProvider` wrapper, attached `navigationRef` to `NavigationContainer`, rendered `<Sidebar />` outside NavigationContainer as a global overlay
- navigation/MainTabs.js: Claude — Restructured to 4 tabs (Home / Tools / Guide / Map), removed Profile tab, added `MenuButton` (hamburger) as `headerRight` on all tab headers
- navigation/RootNavigator.js: Claude — Added Profile as root stack screen accessible from Sidebar; added `MenuButton` to Settings, NewsFeed, CoursesList, CourseDetail, Profile headers
- navigation/ToolsStack.js: Claude — Created new stack navigator (ToolsHome → Timetable, Mensa, SemesterCalendar, ExamTracker, ExamPlanner, CampusResources, PlannerList, AddDeadline) with `MenuButton` on all screens
- navigation/GuideStack.js: Claude — Added `MenuButton` as headerRight to GuideHome and GuideDetail

### New Components
- components/Sidebar.js: Claude — Right-slide modal sidebar with spring animation; sections: user avatar/name, tab navigation (Home/Tools/Guide/Map), Account (Profile/Settings), Quick Links (QIS/Student Portal), Logout with Alert confirmation; uses `navigationRef` for navigation
- components/SimpleDatePicker.js: Claude — Custom date + time picker using React Native Modal + SpinColumn (chevron-based spin wheels); exports `SimpleDatePicker` and `SimpleTimePicker`; built to avoid missing `@react-native-community/datetimepicker` dependency

### State Management
- store/useStore.js: Claude — Added sidebar state (`sidebarOpen`, `openSidebar`, `closeSidebar`), deadlines state (`deadlines[]`, `setDeadlines`, `addDeadline`, `updateDeadline`, `removeDeadline`), exam tracking (`examRegistrations{}`, `setExamRegistrations`, `setExamRegistration`), exam plans (`examPlans{}`, `setExamPlans`, `setExamPlan`)

### Screen Changes
- screens/home/HomeScreen.js: Claude — Added hamburger icon to gradient header; updated QUICK_LINKS Timetable to navigate into ToolsStack (`Tools → Timetable`); fixed "Next Class" card navigation
- screens/profile/ProfileScreen.js: Claude — Moved from tab to root stack; added `PORTAL_LINKS` array with QIS (`https://qis.hochschule-trier.de/`) and Student Portal URLs as tappable cards; removed logout (moved to Sidebar)
- screens/timetable/TimetableScreen.js: Claude — Fixed navigation depth after move into ToolsStack: `navigateToBuilding` → `navigation.getParent()?.navigate('Map')`; `openCourseDetail` → `navigation.getParent()?.getParent()?.navigate('CourseDetail', ...)`
- screens/tools/ToolsScreen.js: Claude — Created tools hub with 7 active tools (Timetable, Mensa, Semester Planner, Exam Registration, Events, Courses, News) and 2 coming-soon items (Deadline Planner, Campus Resources) shown with dashed border + "Soon" badge

### New Screens
- screens/mensa/MensaScreen.js: Claude — Weekly mensa menu; day selector (Mon–Fri, today pre-selected); Vegan Monday banner; dietary filter chips (All/Vegan/Vegetarian); bilingual dish names (DE+EN); 3-tier pricing (student/employee/guest)
- screens/calendar/SemesterCalendarScreen.js: Claude — 3-tab semester planning hub: (1) Overview with exam-reg alert banner + horizontal milestone cards + upcoming events + QIS/Portal quick actions; (2) Key Dates with category filter + countdown chips + expandable descriptions; (3) My Courses showing current semester courses from Zustand + exam planning reminders
- screens/exams/ExamTrackerScreen.js: Claude — Per-course exam registration toggle with progress bar; auto-detects current semester from Zustand courses; QIS deeplink button; deadline banner from semester_calendar.json (urgent ≤7 days)
- screens/exams/ExamPlannerScreen.js: Claude — Exam detail form per course (date, time, room, building with campus search, notes); missing-fields warning banner; reminders toggle (day-before + 2h-before notifications)
- screens/planner/PlannerScreen.js: Claude — Deadline list sorted by urgency; UrgencyBadge; mark-done toggle; delete; FAB to add — currently in "Coming Soon" state in ToolsScreen
- screens/planner/AddDeadlineScreen.js: Claude — Deadline form: title, subject (autocomplete from Zustand courses), date+time (SimpleDatePicker), note (200 char), reminder toggles — currently in "Coming Soon" state
- screens/resources/CampusResourcesScreen.js: Claude — 18 UCB campus resources from umwelt-campus.de; category filter chips; expandable cards with tips + contact links — currently in "Coming Soon" state

### Services & Data
- services/reminders.js: Claude — Added `scheduleDeadlineReminders`, `cancelDeadlineReminders`, `scheduleExamReminders`, `cancelExamReminders`; AsyncStorage helpers: `loadDeadlines`, `saveDeadlines`, `loadExamData`, `saveExamRegistrations`, `saveExamPlans`
- services/buildings.js: Claude — `searchBuildings()` fuzzy search over UCB campus building list
- data/mensa_week.json: Claude — Week W19 2026 menu (5 days, Vegan Monday, dietary tags, 3-tier pricing)
- data/semester_calendar.json: Claude — SS 2026 key dates (12 events: lectures, registration windows, holidays, exam periods)
- data/campus_resources.json: Claude — 18 UCB resources (bike rental, repair day, Green Office events, sports, etc.)

### Bug Fixes
- Fixed `@react-native-community/datetimepicker` missing dependency by creating custom `SimpleDatePicker`
- Fixed TimetableScreen navigation depth after moving from direct tab into ToolsStack
- Fixed HomeScreen QUICK_LINKS pointing to removed Timetable tab
- Fixed SafeAreaProvider missing (Sidebar used `useSafeAreaInsets` outside NavigationContainer)

## 2026-05-20 — Security & Compliance hardening
### New Files
- utils/concurrentMap.js: Claude Sonnet 4.6 — concurrentMap + concurrentSettled utilities; cap Stud.IP parallel requests at 3
- supabase/functions/check-admin/index.ts: Claude Sonnet 4.6 — Deno Edge Function; validates Stud.IP credentials then checks admin_users with service_role key (never exposes table to anon)

### Services
- services/auth.js: Claude Sonnet 4.6 — Session expiry (7 days), saveCredentials() helper, WHEN_UNLOCKED_THIS_DEVICE_ONLY SecureStore option, _deleteCredentials() utility
- services/api.js: Claude Sonnet 4.6 — Handle HTTP 429 (RATE_LIMITED) in classifyError
- services/events.js: Claude Sonnet 4.6 — Replace Promise.all with concurrentMap(limit=3)
- services/news.js: Claude Sonnet 4.6 — Restructure to fire personal+global news eagerly and course news via concurrentSettled(limit=3); was firing all N+2 requests simultaneously
- services/bootstrap.js: Claude Sonnet 4.6 — Add _inflightBootstrap deduplication guard; concurrent callers share one in-flight bootstrap

### Store
- store/useAdminStore.js: Claude Sonnet 4.6 — Admin check via Supabase Edge Function (check-admin) instead of direct table query; admin_users table now inaccessible to anon client

### Screens
- screens/LoginScreen.js: Claude Sonnet 4.6 — Rate limiting: 3 failed AUTH_FAILED attempts → 30s lockout with countdown; use saveCredentials() from auth.js
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — "Delete all my data" danger action; clears user-created keys + cache + logout
- screens/legal/DatenschutzScreen.js: Claude Sonnet 4.6 — Accurate third-party disclosure (Supabase, Expo); correct cache TTL; separate Datenweitergabe section
- App.js: Claude Sonnet 4.6 — First-run privacy notice modal (ucb_privacy_v1 flag); only shown once

### Config
- constants/config.js: Claude Sonnet 4.6 — NEWS TTL 15min → 1 hour; add SESSION_MAX_AGE (7 days)

## 2026-05-28 — Full multilingual support (EN / DE)
- services/i18n.js: Claude Sonnet 4.6 — New module-level i18n singleton: initLanguage, getLanguage, saveLanguage, t(key, params), useTranslation hook; language persisted to AsyncStorage 'ucb_language'
- constants/translations/en.js: Claude Sonnet 4.6 — Full English string map (~300+ keys) with {{param}} interpolation syntax
- constants/translations/de.js: Claude Sonnet 4.6 — Full German string map using UCB campus terminology (Stundenplan, Prüfungsanmeldung, Speiseplan, Semesterkalender, etc.)
- App.js: Claude Sonnet 4.6 — languageReady gate: renders null until initLanguage() resolves to prevent first-render flash of wrong language
- screens/profile/SettingsScreen.js: Claude Sonnet 4.6 — Language section with EN/DE pill buttons; confirm dialog + Updates.reloadAsync() hard restart; try/catch fallback for Expo Go dev mode
- navigation/MainTabs.js: Claude Sonnet 4.6 — Tab labels use t() from i18n (safe at startup since language is fixed until restart)
- navigation/ToolsStack.js: Claude Sonnet 4.6 — All screen title options use t() calls
- navigation/RootNavigator.js: Claude Sonnet 4.6 — All screen title options use t() calls
- navigation/GuideStack.js: Claude Sonnet 4.6 — All screen title options use t() calls
- screens/LoginScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/home/HomeScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/tools/ToolsScreen.js: Claude Sonnet 4.6 — TOOLS array refactored to labelKey/descKey; all strings translated
- screens/profile/ProfileScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/map/MapScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/timetable/TimetableScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/mensa/MensaScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/news/NewsFeedScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/courses/CoursesScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t() calls
- screens/courses/CourseDetailScreen.js: Claude Sonnet 4.6 — TAB_KEYS array replaces English label strings; sub-components receive t as prop
- screens/events/EventsScreen.js: Claude Sonnet 4.6 — All hardcoded UI strings replaced with t(); day filter, reminder alerts, past section header translated
- screens/exams/ExamTrackerScreen.js: Claude Sonnet 4.6 — Progress count, deadline banner, toggle labels translated
- screens/exams/ExamPlannerScreen.js: Claude Sonnet 4.6 — Form labels, field names in error messages, alerts translated
- screens/planner/PlannerScreen.js: Claude Sonnet 4.6 — CATEGORY_META/FILTERS use labelKey; UrgencyBadge receives t as prop; delete dialog, reminder pills translated
- screens/planner/AddDeadlineScreen.js: Claude Sonnet 4.6 — CATEGORIES use labelKey; subject label/placeholder, picker header, save button translated
- screens/resources/CampusResourcesScreen.js: Claude Sonnet 4.6 — Hero, search, filter chips, empty state translated
- screens/collaboration/CampusPlatformsScreen.js: Claude Sonnet 4.6 — Section headers, copy hint, accessibility labels translated
- screens/calendar/SemesterCalendarScreen.js: Claude Sonnet 4.6 — TAB_KEYS array; CATEGORY_CONFIG uses labelKey; all sub-components receive t as prop; progress, countdown, course count labels translated
- screens/guide/GuideDetailScreen.js: Claude Sonnet 4.6 — EmptyState calls useTranslation() itself; all search placeholders, checklist progress, week headers, services label, building number, copy feedback translated
- components/Sidebar.js: Claude Sonnet 4.6 — Nav labels and logout dialog translated
- components/OfflineBanner.js: Claude Sonnet 4.6 — Banner text translated
- screens/guide/GuideScreen.js: Claude Sonnet 4.6 — Hero title/sub, search placeholder, category labels/descs, disclaimer translated

## 2026-05-20 — Archive admin, clean code
- _archive/admin/: Claude Sonnet 4.6 — Moved screens/admin/, navigation/AdminStack.js, store/useAdminStore.js, supabase/functions/check-admin/ to _archive/admin/ — admin panel shelved until needed
- components/Sidebar.js: Claude Sonnet 4.6 — Removed useAdminStore import and Admin section
- navigation/RootNavigator.js: Claude Sonnet 4.6 — Removed AdminStack import and Admin screen registration
- screens/LoginScreen.js: Claude Sonnet 4.6 — Removed checkAdminStatus call
- services/auth.js: Claude Sonnet 4.6 — Removed useAdminStore import and clearAdminStatus call
- App.js: Claude Sonnet 4.6 — Removed useAdminStore import and checkAdminStatus call

## 2026-07-18 — Waste scanner detection accuracy overhaul
- screens/waste/WasteScannerScreen.js: Claude Fable 5 — Frame processor: float32 [-1,1] model input (was uint8 crash), rotation from frame.orientation (sensor frames are landscape, MobileNet needs upright), center-square crop aligned with reticle box, runAtTargetFps(3), top-3 candidates dispatched as JSON; JS side picks best mapped candidate + requires same bin on 2 consecutive dispatches before showing result
- services/waste.js: Claude Fable 5 — matchToken(): keys/tokens <4 chars match exact-only (fixes "pp" hijacking "apple"/"Pappe"); resolveBinFromProduct(): reads OFF structured packagings[].material (v2 string + v3 object) and packaging_materials_tags before free-text fields
- data/waste_rules.json: Claude Fable 5 — Fixed wrong mappings (ImageNet "notebook"=laptop → sondermuell, not papier; drinking glasses → restmuell, not glas; deposit bottles → pfand); added ~40 detectable classes (food, e-waste→sondermuell, clothing/shoes→altkleider, containers); barcode: German terms (Kunststoff, Getränkekarton, Dose…), polymer names, ceramics, drink-carton brands ordered before "karton"
- __tests__/services/waste.test.js: Claude Fable 5 — Locked in new mappings, short-key guard, structured packagings resolution (v2+v3 shapes)

## 2026-07-18 — Purpose-built waste model (replaces generic ImageNet MobileNet)
- assets/waste_model.tflite: Claude Fable 5 — Bundled WasteNet (MIT, github.com/KrisnaSantosa15/wastenet-garbage-classifier): MobileNetV2 fine-tuned on 12 household-garbage classes; verified locally with LiteRT (metal photo → metal 100%, banana photo → biological 98.5%); input 224×224 float32 [0,1], softmax output
- data/waste_model_labels.json: Claude Fable 5 — 12 alphabetical class labels matching the softmax order
- data/waste_rules.json: Claude Fable 5 — 12 direct class→bin keys (battery→sondermuell, biological→bio, 3×glass→glas, metal/plastic→gelber_sack, cardboard/paper→papier, clothes/shoes→altkleider, trash→restmuell); legacy ImageNet keys kept for mock mode
- screens/waste/WasteScannerScreen.js: Claude Fable 5 — Loads waste_model.tflite; dropped [-1,1] remap (model trained on [0,1]); confidence floor raised to 0.55 (all classes map to bins, so the floor is the only guard against firing on backgrounds); label display prettified
- _archive/waste_ai/: Claude Fable 5 — Old mobilenet_v2.tflite + mobilenet_labels.json moved here (repo has no git history)

## 2026-07-31 — P0 store-readiness follow-ups (verification of prior batch)
- constants/config.js: Claude Opus 5 — Added PRIVACY_POLICY_URL (store-listing metadata); the prior batch reported this as done but it was never written to the file
- constants/storageKeys.js: Claude Opus 5 — Promoted `ucb_logs` to a real STORAGE_KEYS.LOGS entry; as a raw literal it fell outside `Object.values(STORAGE_KEYS)`, so "Delete all data" never erased the diagnostic logs (Art. 17 DSGVO gap)
- services/logger.js, services/cache.js: Claude Opus 5 — Both now reference STORAGE_KEYS.LOGS instead of the raw literal; NON_CACHE_KEYS exported so tests can assert against it
- screens/profile/SettingsScreen.js: Claude Opus 5 — handleDeleteAllData() calls clearLogs() so the logger's in-memory buffer can't re-persist ucb_logs right after the multiRemove
- __tests__/screens/LegalScreens.test.js: Claude Opus 5 — Replaced the tautological USER_DATA_KEYS===Object.values(STORAGE_KEYS) assertion (could never fail) with the real invariant: everything clearAllCache() preserves must be erasable by delete-all, plus explicit ucb_logs and ucb_-prefix checks. Verified by mutation (removing STORAGE_KEYS.LOGS fails 2 tests). Uses toStrictEqual — toEqual treats [undefined] as []
- .gitignore: Claude Opus 5 — Ignore pc-api-key.json / *-api-key.json (Play service account key referenced by eas.json submit config; was uncovered by the existing *.key rule)
