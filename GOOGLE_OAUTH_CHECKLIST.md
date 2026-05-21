# ✅ Google OAuth Fix - COMPLETE CHECKLIST

## What Was Fixed

| Item | Status | Details |
|------|--------|---------|
| Backend Environment URLs | ✅ FIXED | Updated to use `192.168.100.2` consistently |
| Callback URL | ✅ FIXED | Now: `http://192.168.100.2:4000/api/v1/auth/google/callback` |
| Frontend URL | ✅ FIXED | Now: `http://192.168.100.2:3000` |
| Configuration Alignment | ✅ FIXED | Frontend & Backend URLs now match |

## ⚠️ NEXT: Google Cloud Console (CRITICAL)

Your backend is now correctly configured, but **Google Cloud Console still needs updating** to recognize these redirect URIs.

### Required Action: Update Google OAuth Credentials

1. **Go to**: [https://console.cloud.google.com](https://console.cloud.google.com)

2. **Select Your Project** (appears to be "GasGo" or similar)

3. **Navigate to**:
   ```
   APIs & Services → Credentials
   ```

4. **Find Your OAuth 2.0 Client** (Web application type)
   - Look for Client ID: `509102065983-i861hv3bhdd70bc8vlblc2g8cgm1qf8i.apps.googleusercontent.com`

5. **Edit the Credential**:
   - Click the pencil ✎ icon
   - Scroll to "Authorized redirect URIs"

6. **Update Redirect URIs** to:
   ```
   http://192.168.100.2:4000/api/v1/auth/google/callback
   ```
   
   ✅ **IMPORTANT**: 
   - Add the redirect URI from step 6
   - **REMOVE** any old `http://localhost:4000/...` entries
   - You can have multiple URIs for different environments (dev/prod)

7. **SAVE** the changes

### Verification Steps

After updating Google Console:

1. **Reload .env** - Backend needs to restart:
   ```bash
   # Stop backend server (Ctrl+C)
   # Restart:
   npm run dev
   ```

2. **Test in Incognito Mode**:
   - Open: `http://192.168.100.2:3000`
   - Click "Continue with Google"
   - ✅ Should redirect to Google login (not "Access blocked" error)

3. **Expected Flow**:
   - Google login screen appears → Select your account → Grant permissions → Redirected to `/auth/callback` → Logged in ✅

---

## 🔍 Troubleshooting

### Issue: Still Getting "Access blocked"

**Solution**:
1. Clear browser cookies/cache (Ctrl+Shift+Delete)
2. Try **Incognito/Private Window**
3. Verify **Google Console redirect URI** is saved (refresh the page to confirm)
4. Check **Google+ API is enabled**:
   - Go to APIs & Services → Library
   - Search "Google+"
   - Click "Enable" if showing

### Issue: Redirects to Wrong URL

**Solution**:
- Verify `FRONTEND_URL` in `/backend/.env` is exactly: `http://192.168.100.2:3000`
- Backend must be restarted after any .env changes

### Issue: Blank Page After Google Login

**Solution**:
- Check browser console for errors (F12)
- Verify `/frontend/src/app/auth/callback/page.tsx` exists
- Ensure backend is responding to `/api/v1/users/me` with valid token

---

## 📝 Files Changed

```
/backend/.env
  - GOOGLE_CALLBACK_URL: http://localhost → http://192.168.100.2
  - FRONTEND_URL: http://localhost:3000 → http://192.168.100.2:3000

/frontend/.env.local
  - [No changes needed - already correct]
```

## ✨ Summary

| Step | Status | Action |
|------|--------|--------|
| 1. Backend Configuration | ✅ DONE | `.env` files updated |
| 2. Diagnostic Verification | ✅ DONE | All checks passed |
| 3. Google Console Update | ⏳ **NEXT** | Update redirect URIs in Google Console |
| 4. Service Restart | ⏳ PENDING | Restart backend after Google Console update |
| 5. Test Google Sign-In | ⏳ PENDING | Try signing in |

---

## 🚀 Quick Start After Fixing Google Console

```bash
# Backend terminal
cd backend
npm run dev

# Frontend terminal (another tab)
cd frontend
npm run dev

# Then open in browser:
# http://192.168.100.2:3000
# Click "Continue with Google"
```

---

## If Credentials Are Invalid

If the current Google Client ID/Secret credentials don't work:

### Create New Credentials:

1. Go to Google Cloud Console → **Credentials**
2. Click **+ Create Credentials → OAuth 2.0 Client ID**
3. Choose **Web application**
4. Under "Authorized redirect URIs" add:
   - `http://192.168.100.2:4000/api/v1/auth/google/callback`
5. Copy new credentials
6. Update `/backend/.env`:
   ```
   GOOGLE_CLIENT_ID=<new_client_id>
   GOOGLE_CLIENT_SECRET=<new_client_secret>
   ```
7. Restart backend and test again

---

**Status**: ✅ Configuration ready → ⏳ Waiting for Google Console update → 🎉 Google sign-in should work

