# Running GetGas Mobile Apps

Native **customer** and **rider** apps for iOS and Android, built with [Expo](https://expo.dev). The web app (`/user` and `/rider`) stays available for users who prefer a browser.

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| **Node.js 18+** | Monorepo + Expo CLI |
| **Backend running** | API on port `4000` |
| **Expo Go** (physical device) | Scan QR to run without a simulator |
| *Optional* Android Studio / Xcode | Emulators |

Install dependencies once from the **repo root**:

```bash
npm install
```

---

## 1. Start the backend

```bash
cd backend
npm run dev
# API → http://localhost:4000
```

---

## 2. Configure API URL for mobile

Mobile devices cannot reach `localhost` on your PC. Use your **PC's LAN IP** — the machine where you run `npm run dev` in `backend/`.

**This is different from the Expo QR URL** (`exp://192.168.x.x:8081`). That IP/port is Metro (JS bundler). The API must be `:4000` on the backend host.

**Customer and rider apps use the same `.env` values** — one API serves both.

**Find your IP (Windows PowerShell):**

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
```

Create `apps/customer-mobile/.env` and `apps/rider-mobile/.env` (same values in both):

```env
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:4000
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.XXX:4000
```

| Environment | `EXPO_PUBLIC_API_URL` |
|-------------|------------------------|
| Physical phone (same Wi‑Fi) | `http://YOUR_PC_LAN_IP:4000` |
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator (Mac) | `http://localhost:4000` |

On the login screen, a **yellow dev banner** shows the resolved API URL.

> After changing `.env`, restart Expo (`Ctrl+C` then `npm run dev` again).

---

## Expo account / infinite loading

**Expo CLI is already installed** via the project's `expo` package (`npx expo`, version bundled with SDK 52). You do **not** need a separate global install.

For **local Expo Go development**, you do **not** need an Expo account. If the terminal loops on "An Expo user account is required", it was caused by placeholder EAS `projectId` values (now removed). Use:

```bash
npm run dev
```

This runs `expo start --offline` — no Expo login, no EAS code-signing fetch.

**Steps if Expo Go keeps spinning:**

1. Stop Expo (`Ctrl+C`) on both customer and rider terminals.
2. Clear Metro cache and restart:
   ```bash
   cd apps/customer-mobile
   npx expo start --offline --clear
   ```
3. Force-close **Expo Go** on your phone, reopen, scan QR again.
4. Ensure only **one** app uses port 8081 (stop the other terminal or use different ports).

**Expo Go SDK version:** This project uses **Expo SDK 54** to match the current Expo Go app from the Play Store / App Store. If you see "Project is incompatible with this version of Expo Go", update the project (already on SDK 54) or reinstall Expo Go.

---

## 3. Run the customer app

**Option A — from repo root** (`G:\projects\gasgo-1`):

```bash
npm run dev:customer
```

**Option B — from the app folder** (`apps/customer-mobile`):

```bash
npm run dev
# or: npm start
```

> `dev:customer` only exists in the **root** `package.json`. Inside `apps/customer-mobile`, use `npm run dev` or `npm start`.

Then:

| Target | Action |
|--------|--------|
| **Physical device** | Install **Expo Go**, scan the QR code in the terminal |
| **Android emulator** | Press `a` in the Expo terminal |
| **iOS simulator** (Mac only) | Press `i` |

### Customer auth flows (Phase 1)

- Sign in with phone + password
- Register (OTP → name + password)
- Forgot password (OTP → new password)
- Continue with Google (opens browser → returns to app)
- Complete profile after Google (name + phone)

---

## 4. Run the rider app

**From repo root:**

```bash
npm run dev:rider
```

**From `apps/rider-mobile`:**

```bash
npm run dev
```

Same QR / `a` / `i` options as above.

### Rider auth flows (Phase 1)

- Sign in (approved riders only)
- Register (personal + vehicle → awaits admin KYC)

---

## 5. Run web alongside mobile

Web is independent — keep it for users without the app:

```bash
npm run dev:web
# http://localhost:3000/user  — customer
# http://localhost:3000/rider  — rider
```

All three (web + 2 mobile apps) can talk to the **same backend** at once.

---

## Troubleshooting

### "Network Error" on login

- Backend not running → start `backend` on `:4000`
- Wrong API URL → use LAN IP, not `localhost`, on a real phone
- Windows Firewall → allow Node on private networks

### Google sign-in doesn't return to the app

- Backend must allow redirect to `getgas://auth/callback` (configured in `backend/src/routes/auth.ts`)
- In Google Cloud Console, authorized redirect URI remains the **backend** callback:
  `http://localhost:4000/api/v1/auth/google/callback` (or your production API URL)

### "Network Error" / health check unreachable from phone

The backend may work on your PC (`curl http://127.0.0.1:4000/health`) but **not from your phone**. Common causes:

1. **Windows Firewall + Public Wi‑Fi** (very common) — the default rule only allowed **Private** networks, but Windows often marks Wi‑Fi as **Public**, so phones are still blocked.
   - Open **PowerShell as Administrator** and run:
     ```powershell
     cd G:\projects\gasgo-1\scripts
     .\allow-api-firewall.ps1
     ```
   - **Or** switch Wi‑Fi to Private: Settings → Network & Internet → Wi‑Fi → your network (e.g. HUAWEI-2.4G) → **Private network**.
   - Then retry on phone: `http://YOUR_PC_IP:4000/health`

2. **Wrong network** — phone must be on the **same Wi‑Fi** as your PC (not mobile data, not guest Wi‑Fi with “client isolation”).

3. **Wrong IP** — use the IP of the **Wi‑Fi adapter** running the backend (often the same subnet as the Expo QR, but port **4000** not 8081). On your PC:
   ```powershell
   (Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -eq 'Wi-Fi').IPAddress
   ```

4. **Verify from phone browser:** `http://192.168.x.x:4000/health` should return JSON like `{"status":"ok",...}`.

**Alternative (no firewall changes):** expose API via ngrok:
```bash
ngrok http 4000
```
Set `EXPO_PUBLIC_API_URL` to the ngrok `https://....ngrok-free.app` URL in both mobile `.env` files, restart Expo.

### OTP in development

When SMS is unavailable, the API returns `_devCode` in the response — the register/forgot-password screens show it in a yellow dev hint box.

### `ERR_REQUIRE_ESM` / `expo-modules-core/src/index.ts` on `expo start`

Two common causes:

1. **Invalid plugins in `app.json`** — only list packages that ship a config plugin (e.g. `expo-router`). Do **not** add `expo-secure-store` or `expo-web-browser` to `plugins`; they work without it.
2. **Node.js 22+** — Expo CLI can hit type-stripping errors. The mobile apps set `NODE_OPTIONS=--no-experimental-strip-types` in their `dev` scripts. For best compatibility, use **Node 20 LTS** (see repo `.nvmrc`).

### Package changes not picked up

Rebuild shared packages:

```bash
npm run build:packages
```

Then restart Expo.

---

## Production builds (later)

When ready for TestFlight / Play Store internal testing:

```bash
cd apps/customer-mobile
npx eas login
npx eas build:configure   # replaces placeholder projectId in app.json
npx eas build --platform all --profile preview
```

Same for `apps/rider-mobile`.

---

## Quick reference

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — Web (optional)
npm run dev:web

# Terminal 3 — Customer app
npm run dev:customer

# Terminal 4 — Rider app
npm run dev:rider
```
