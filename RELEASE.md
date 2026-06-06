# Release Setup Guide

One-time steps to enable automatic Play Store deployment via GitHub Actions + EAS.

---

## 1. Generate Android keystores

Run once per app. Store the `.jks` files somewhere safe (password manager, not in the repo).

```bash
# Rider app
keytool -genkey -v \
  -keystore rider-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias rider \
  -dname "CN=GetGas Rider, OU=Mobile, O=GetGas, L=Accra, S=Greater Accra, C=GH"

# Customer app
keytool -genkey -v \
  -keystore customer-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias customer \
  -dname "CN=GetGas, OU=Mobile, O=GetGas, L=Accra, S=Greater Accra, C=GH"
```

> ⚠️ If you lose the keystore you can never update the app on Play Store. Back it up.

---

## 2. Base64-encode keystores for GitHub Secrets

```bash
base64 -i rider-release.jks    | tr -d '\n'   # → KEYSTORE_BASE64
base64 -i customer-release.jks | tr -d '\n'   # → CUSTOMER_KEYSTORE_BASE64
```

---

## 3. Create the Play Store apps

1. Go to [Google Play Console](https://play.google.com/console) → **Create app** (do this for both apps)
2. Fill in store listing basics
3. Do **one manual APK/AAB upload** to the Internal Testing track to get the app out of draft state — the API cannot submit until this is done

For the first manual upload, build locally:
```bash
# from mobile/
make rider-bundle    # → mobile/apps/rider_app/build/app/outputs/bundle/release/app-release.aab
make customer-bundle
```

Sign the AAB using the keystore you just generated (or use the unsigned debug build just to initialise the app — you'll replace it).

---

## 4. Create a Google Play Service Account

1. In Play Console → **Setup → API access** → link to a Google Cloud project
2. In [Google Cloud Console](https://console.cloud.google.com) → **IAM & Admin → Service Accounts** → Create service account
3. Download the JSON key file
4. Back in Play Console → **Users and permissions → Invite new users** → paste the service account email → grant **Release Manager** role

---

## 5. Store service account in EAS

```bash
cd mobile/apps/rider_app
npx eas login
npx eas build:configure          # creates app.json with projectId — commit this file

eas secret:create \
  --scope project \
  --name GOOGLE_SERVICE_ACCOUNT_KEY \
  --type file \
  --value /path/to/service-account.json
```

Repeat for `customer_app`.

Update `eas.json` in each app to reference it:
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "$GOOGLE_SERVICE_ACCOUNT_KEY",
      "track": "internal"
    }
  }
}
```

---

## 6. Add GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**.

### Shared (both apps)
| Secret name | Value |
|-------------|-------|
| `EXPO_TOKEN` | Run `npx eas whoami --json` or get from [expo.dev/accounts](https://expo.dev/accounts) → Settings → Access Tokens |
| `GOOGLE_MAPS_API_KEY` | Your Maps API key |

### Rider app
| Secret name | Value |
|-------------|-------|
| `KEYSTORE_BASE64` | Output of step 2 for `rider-release.jks` |
| `KEY_STORE_PASSWORD` | Keystore password you chose |
| `KEY_ALIAS` | `rider` |
| `KEY_PASSWORD` | Key password you chose |

### Customer app
| Secret name | Value |
|-------------|-------|
| `CUSTOMER_KEYSTORE_BASE64` | Output of step 2 for `customer-release.jks` |
| `CUSTOMER_KEY_STORE_PASSWORD` | Keystore password |
| `CUSTOMER_KEY_ALIAS` | `customer` |
| `CUSTOMER_KEY_PASSWORD` | Key password |

---

## 7. Release workflow

```bash
# Bump version in pubspec.yaml (versionName and versionCode), commit, then:

git tag rider-v1.0.1
git push --tags
# → GitHub Actions triggers → EAS builds signed AAB → submits to Play internal track

git tag customer-v1.0.1
git push --tags
```

You can also trigger a release manually from **GitHub → Actions → select workflow → Run workflow**.

After the build lands in Play Console internal track, promote it to production manually — this is intentional so you have a human gate before it hits all users.

---

## Workflow files

| File | Trigger |
|------|---------|
| `.github/workflows/rider-release.yml` | `rider-v*` tags or manual |
| `.github/workflows/customer-release.yml` | `customer-v*` tags or manual |
