# 🔐 Google OAuth 2.0 Setup Guide

## Problem Diagnosed
Your Google sign-in was failing with **"Access blocked: This app's request is invalid"** due to:
1. ✅ **Fixed:** Redirect URI mismatch (localhost vs 192.168.100.2)
2. ⚠️ **Next:** Verify Google Console is configured correctly

---

## Step 1: Verify Your Current Configuration ✅

**Backend URLs (now fixed):**
- Redirect URI: `http://192.168.100.2:4000/api/v1/auth/google/callback`
- Frontend URL: `http://192.168.100.2:3000`

**Credentials in use:**
```
GOOGLE_CLIENT_ID=509102065983-i861hv3bhdd70bc8vlblc2g8cgm1qf8i.apps.googleusercontent.com
```

---

## Step 2: Fix Google Cloud Console ⚠️

Your current Google OAuth credentials need to be **updated in Google Cloud Console** to match the new redirect URI.

### Option A: Update Existing Credentials (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (likely "GasGo" or similar)
3. Go to **APIs & Services → Credentials**
4. Find the OAuth 2.0 Client ID (Web application)
5. Click to edit it
6. Under **Authorized redirect URIs**, update to:
   ```
   http://192.168.100.2:4000/api/v1/auth/google/callback
   ```
7. **Remove** any old localhost URIs if present
8. Click **Save**

### Option B: Create New Credentials (If Credentials are Invalid)

If the above credentials are expired/revoked:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services → Credentials**
3. Click **+ Create Credentials → OAuth 2.0 Client ID**
4. Choose **Web application**
5. Add these **Authorized redirect URIs:**
   ```
   http://192.168.100.2:4000/api/v1/auth/google/callback
   http://192.168.100.2:4000/api/v1/auth/google/callback/
   ```
   (Include with & without trailing slash)
6. Copy the new Client ID and Secret
7. Update in `/backend/.env`:
   ```
   GOOGLE_CLIENT_ID=<your_new_client_id>
   GOOGLE_CLIENT_SECRET=<your_new_client_secret>
   GOOGLE_CALLBACK_URL=http://192.168.100.2:4000/api/v1/auth/google/callback
   ```

### Checklist Before Testing:
- ✅ Google+ API is **enabled** in your GCP project
  - Go to **APIs & Services → Library** → Search "Google+" → Enable it
- ✅ OAuth consent screen is configured
  - Go to **APIs & Services → OAuth consent screen**
  - Set to "External" and add test users if needed
- ✅ Credentials are not expired
  - Credentials don't typically expire, but they can be revoked

---

## Step 3: Restart Services

```bash
# Kill running servers
Ctrl+C in both backend and frontend terminals

# Backend
cd backend
npm install  # if needed
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

---

## Step 4: Test Google Sign-In

1. Open `http://192.168.100.2:3000`
2. Click **"Continue with Google"**
3. You should be redirected to Google login
4. After successful auth, you'll be redirected to the callback and logged in

---

## Troubleshooting

### Still Getting "Access blocked"?
- ✅ Clear browser cache/cookies: `Cmd+Shift+Delete` / `Ctrl+Shift+Delete`
- ✅ Try **Incognito/Private** window
- ✅ Check browser console for exact error
- ✅ Verify `GOOGLE_CALLBACK_URL` in backend .env matches Google Console exactly
- ✅ Ensure no extra spaces or quotes

### Redirect to wrong page?
- ✅ Check `FRONTEND_URL` in backend .env: `http://192.168.100.2:3000`
- ✅ The `/auth/callback` page must exist at `/frontend/src/app/auth/callback/page.tsx` ✓

### Still having issues?
Run this diagnostic:

```bash
# In backend terminal:
echo "Checking Google credentials..."
node -e "console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID); console.log('CALLBACK:', process.env.GOOGLE_CALLBACK_URL);"

# Check if .env is being loaded
npm run dev
# Look for console output showing loaded env vars
```

---

## Testing Credentials

For **development only**, you can use test Google accounts:
1. Add your personal Google account as a **test user** in OAuth consent screen
2. No app approval needed for test users
3. When you try to sign in, select your test account

---

## For Production Deployment

When deploying to production, update:

**In Google Console:**
```
https://your-production-domain.com/api/v1/auth/google/callback
```

**In `/backend/.env`:**
```
GOOGLE_CALLBACK_URL=https://your-production-domain.com/api/v1/auth/google/callback
FRONTEND_URL=https://your-production-domain.com
```

---

## Summary of Changes Made

| File | Change | Reason |
|------|--------|--------|
| `/backend/.env` | `GOOGLE_CALLBACK_URL` → `http://192.168.100.2:4000/...` | Fix redirect URI mismatch |
| `/backend/.env` | `FRONTEND_URL` → `http://192.168.100.2:3000` | Ensure OAuth redirects to correct domain |
| `/frontend/.env.local` | Added comment | Reference consistency |

✅ **Environment files are now synchronized!**

Next: Verify Google Console configuration and restart services.
