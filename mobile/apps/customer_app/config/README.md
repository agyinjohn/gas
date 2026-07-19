# Build Config

Edit these files to change the backend URL — no code changes needed.
The values are embedded into the binary at build time via `--dart-define-from-file`.

## Files

| File | Used for |
|------|----------|
| `production.json` | Play Store / release builds (used by `make customer-apk`, `make customer-bundle` and CI) |
| `local.json` | Local development (update `API_URL` to your machine IP when testing on a physical device) |

## Build commands (from `mobile/`)

```bash
make customer-dev      # local dev, uses config/local.json
make customer-apk      # release APK, uses config/production.json
make customer-bundle   # release AAB, uses config/production.json
```

Or directly:

```bash
flutter build apk --release --dart-define-from-file=config/production.json
```

The `make` targets also regenerate `assets/env/mobile.json` (runtime fallback
asset) from the same config file, so both sources always agree.

## Variables

| Key | Description |
|-----|-------------|
| `API_URL` | Backend REST API base URL |
| `SOCKET_URL` | Socket.IO server URL (usually same as API_URL) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
