# Build Config

Edit these files to change the backend URL — no code changes needed.

## Files

| File | Used for |
|------|----------|
| `production.json` | Play Store / release builds |
| `local.json` | Local development (update IP to your machine) |

## Build commands

```bash
# Production (Play Store AAB)
flutter build appbundle --release --dart-define-from-file=config/production.json

# Preview APK (internal testing)
flutter build apk --release --dart-define-from-file=config/production.json

# Local dev
flutter run --dart-define-from-file=config/local.json
```

## Variables

| Key | Description |
|-----|-------------|
| `API_URL` | Backend REST API base URL |
| `SOCKET_URL` | Socket.IO server URL (usually same as API_URL) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
