# GetGas — On-Demand LPG Delivery Platform

Full-stack monorepo: **Next.js 14** (App Router) frontend + **Node.js/Express** backend + **MongoDB** database.

## Project Structure

```
GetGas/
├── backend/          # Express API server
│   └── src/
│       ├── config/   # DB, env, constants
│       ├── models/   # Mongoose schemas
│       ├── routes/   # Express route handlers
│       ├── services/ # Business logic
│       ├── middleware/
│       └── utils/
└── frontend/         # Next.js 14 App Router
    └── src/
        ├── app/
        │   ├── user/       # Customer-facing pages
        │   ├── rider/      # Rider PWA pages
        │   ├── station/    # Station dashboard
        │   ├── admin/      # Admin dashboard
        │   └── api/        # Next.js API routes (proxy)
        ├── components/
        ├── hooks/
        ├── lib/
        └── types/
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm or pnpm

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # runs on :4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local  # fill in your values
npm install
npm run dev                 # runs on :3000
```

## Environment Variables

### Backend `.env`
| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PAYSTACK_SECRET_KEY` | Paystack API key |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging |
| `MNOTIFY_API_KEY` | mNotify SMS provider (Ghana) |
| `PORT` | Server port (default 4000) |

### Frontend `.env.local`
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps API key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key |

## Actor Interfaces

| Actor | URL | Description |
|---|---|---|
| User | `/user` | Browse stations, order gas, track delivery |
| Rider | `/rider` | Accept orders, navigate, confirm OTP |
| Station | `/station` | Manage prices, inventory, order queue |
| Admin | `/admin` | Approve entities, platform metrics |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB, Mongoose |
| Real-time | Socket.IO (WebSocket) |
| Auth | JWT + OTP via SMS |
| Payments | Paystack (mobile money + card) |
| Notifications | Firebase Cloud Messaging + mNotify SMS |
| Maps | Google Maps API |
| Caching | Redis (optional, for geo queries) |

## Phased Delivery

- **Phase 1 (MVP):** User app + Station dashboard + Rider app basic flow
- **Phase 2:** Admin dashboard + analytics + surge pricing + payouts
- **Phase 3:** Referrals + scheduled deliveries + loyalty + multi-city
