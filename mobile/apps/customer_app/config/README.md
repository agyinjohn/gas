# Config

- `local.json` — dev machine (gitignored). Update `API_URL` to your machine IP when testing on a physical device.
- `production.json` — production backend. Used by `make build` and CI.

Run with local config:
```
make dev
```

Build release AAB:
```
make build
```
