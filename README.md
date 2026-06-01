# GetGas — Monorepo

On-demand LPG delivery: **Next.js web** + **Flutter native apps** + **Express API** + **MongoDB**.

Customer and rider experiences are available on **web and native** (iOS/Android). Station and admin remain **web-only**.

> **Mobile:** New apps under [`mobile/`](mobile/FLUTTER.md) (Flutter). Legacy Expo in `apps/customer-mobile` and `apps/rider-mobile` will be retired after Flutter Phase 1.

## Structure

```
gasgo-1/
├── mobile/                  # Flutter — customer_app, rider_app, getgas_core, getgas_ui
├── apps/
│   ├── web/                 # Next.js — user, rider, station, admin (all web routes)
│   ├── customer-mobile/     # Legacy Expo (being replaced)
│   └── rider-mobile/        # Legacy Expo (being replaced)
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── config/              # Constants, storage keys, auth routes
│   ├── domain/              # Business logic (fees, loyalty, labels)
│   └── api-client/          # Axios API client (web)
├── backend/                 # Express API
└── frontend/                # ⚠️ Legacy copy — use apps/web instead
```

## Quick start

### Prerequisites

- Node.js 18+
- MongoDB
- For mobile: [Expo Go](https://expo.dev/go) on a device, or Android/iOS simulator

### 1. Install (from repo root)

```bash
npm install
```

This builds shared packages automatically (`postinstall`).

### 2. Backend

```bash
cd backend
cp .env.example .env
npm run dev          # :4000
```

### 3. Web (customer, rider, station, admin)

```bash
npm run dev:web      # :3000 — from root
# or
cd apps/web && cp .env.example .env.local && npm run dev
```

Web routes unchanged:

| Actor   | URL        |
|---------|------------|
| Customer | `/user`   |
| Rider    | `/rider`  |
| Station  | `/station`|
| Admin    | `/admin`  |

### 4. Customer mobile app

```bash
cd apps/customer-mobile
cp .env.example .env
npm run start
# Press i (iOS) or a (Android) in Expo CLI
```

Set `EXPO_PUBLIC_API_URL` to your machine IP when testing on a physical device (not `localhost`).

### 5. Rider mobile app

```bash
cd apps/rider-mobile
cp .env.example .env
npm run start
```

## Shared packages

All clients import the same API and domain logic:

- **Web:** `@getgas/api-client` via `apps/web/src/lib/api.ts`
- **Mobile:** `@getgas/mobile-core` (SecureStore + same API modules)

Change API behavior once in `packages/api-client` — web and mobile pick it up after rebuild.

## Mobile roadmap

| Phase | Scope |
|-------|--------|
| **0** ✅ | Monorepo, shared packages, Expo scaffolds, login shells |
| 1 | Full auth (OTP, Google), session polish |
| 2–4 | Customer parity with `/user` |
| 5–6 | Rider parity with `/rider` |
| 7–8 | Offline, push, store release |

See conversation plan for full phase breakdown.

## Mobile apps

See **[MOBILE.md](./MOBILE.md)** for full instructions on running the native customer and rider apps (Expo, iOS/Android).

Quick start:

```bash
npm run dev:customer   # GetGas customer app
npm run dev:rider      # GetGas rider app
```

Web `/user` and `/rider` remain available for users who don't install the apps.

## Docker

```bash
docker compose up
```

Web image builds from `apps/web/`.

## EAS (App Store / Play Store)

When ready for device builds:

```bash
cd apps/customer-mobile
npx eas login
npx eas build:configure
npx eas build --platform all --profile preview
```

Replace placeholder `projectId` in each `app.json` after `eas init`.
