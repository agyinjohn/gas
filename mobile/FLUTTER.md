# GetGas Flutter Mobile Apps

Native **customer** and **rider** apps built with **Flutter**. The Express API and Next.js web app (`/user`, `/rider`) are unchanged.

## Structure

```
mobile/
├── packages/
│   ├── getgas_core/     # Dart: config, domain, API client, auth
│   └── getgas_ui/       # Flutter: theme + auth widgets (web parity)
└── apps/
    ├── customer_app/    # GetGas customer
    └── rider_app/       # GetGas rider (scaffold)
```

Legacy Expo apps remain in `apps/customer-mobile` and `apps/rider-mobile` until Flutter reaches Phase 1 parity — then they can be removed.

## Backend URL configuration (embedded at build time)

Each app reads its backend URL and Maps key from a JSON config file that is
**embedded into the binary** at build time via `--dart-define-from-file`:

- `apps/rider_app/config/production.json` / `local.json`
- `apps/customer_app/config/production.json` / `local.json`

All `make` targets and the GitHub release workflows use these files, so the
APK/AAB always carries its backend URL — change the URL in one place and
rebuild. Explicit `--dart-define=API_URL=...` still overrides the file when
needed (e.g. `make rider-device LAN_IP=192.168.1.5`).

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Flutter SDK](https://docs.flutter.dev/get-started/install) (stable) | Build & run |
| Backend on `:4000` | API |
| Android Studio / device | Android testing |

## Run customer app

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — Flutter (physical device: use your PC LAN IP)
cd mobile/apps/customer_app
flutter pub get
dart run tool/sync_env.dart   # once — pulls Maps key from frontend/.env.local
flutter run --dart-define=API_URL=http://192.168.100.2:4000
```

Use the **same Google Maps key** as web `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in `frontend/.env.local`. Sync it into the app once:

```bash
cd mobile/apps/customer_app
dart run tool/sync_env.dart
```

That reads `frontend/.env.local` (or `apps/web/.env.local` / `backend/.env`) and writes:

- `assets/env/mobile.json` — Dart/Places search at runtime
- `android/local.properties` — native Android map tiles
- `ios/Runner/Info.plist` — native iOS map tiles

Then run as usual (no extra `--dart-define` needed for Maps):

```bash
flutter run --dart-define=API_URL=http://192.168.100.2:4000
```

After syncing, do a **full restart** (`R`) so the bundled key loads.

| Target | Command |
|--------|---------|
| Android emulator | `flutter run --dart-define=API_URL=http://10.0.2.2:4000` |
| Physical phone (same Wi‑Fi) | `flutter run --dart-define=API_URL=http://YOUR_PC_IP:4000` |

Debug builds can show a yellow API banner with `--dart-define=SHOW_API_BANNER=true`.

## Phase status

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | Core packages, customer login + home shell | ✅ Done |
| **1** | Register, OTP, forgot password, Google, rider login | ✅ Auth flows |
| **2** | Customer location, stations, checkout, payment, routes | ✅ Done |
| **3** | Live tracking (socket + map), order OTP/rate/cancel | ✅ Done |
| **4** | Profile, addresses, map picker, scheduled orders, theme | ✅ Done |
| **Polish** | Google Maps + Places search, UI parity with web | ✅ Done |
| **5** | Rider app, push notifications | Planned |

## UI consistency

Auth screens follow the web login at `/` (orange brand, uppercase labels, phone prefix, password toggle). Shared widgets live in `getgas_ui`.

Layouts use `GetGasResponsive` / `ResponsiveAuthScroll` in `getgas_ui` — content is scrollable, capped at 400px wide (matching web mobile), with tighter padding on small phones and scaled OTP boxes on narrow screens.

## Android build troubleshooting

**Gradle cache corruption** (`Could not deserialize analysis … instrumentation-hierarchy.bin`):

```powershell
cd mobile/apps/customer_app/android
.\gradlew --stop
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\8.12\transforms" -ErrorAction SilentlyContinue
cd ..
flutter clean
flutter pub get
flutter run --dart-define=API_URL=http://YOUR_PC_IP:4000
```

**Not enough disk space** — free several GB on `C:` (Gradle cache, pub cache) and the project drive before building. You can also prune old Gradle caches:

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\build-cache-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "mobile/apps/customer_app/build" -ErrorAction SilentlyContinue
```

**Kotlin incremental errors** (project on `G:` but pub cache on `C:`) — `kotlin.incremental=false` is set in `android/gradle.properties`.

## Tests

```bash
cd mobile/packages/getgas_core && dart test
cd mobile/apps/customer_app && flutter analyze
```
