# Real Device Testing Checklist

Run these on a **physical Android device** (and iPhone for iOS-specific items) before TestFlight / Play Store submission.

---

## 1. FCM — all 3 notification states

| # | State | Steps | Pass criteria |
|---|-------|-------|---------------|
| 1a | **Foreground** | App open and on home screen. Trigger an order from backend/Postman. | Heads-up notification appears. Tapping it navigates to `/orders/:id`. |
| 1b | **Background** | Press Home (app in background). Trigger order. | System tray notification appears with sound + vibration. Tapping navigates correctly. |
| 1c | **Terminated** | Force-stop the app. Trigger order. | Tapping notification cold-launches the app and lands on `/orders/:id`. |

**Checklist:**
- [ ] `order_alert` custom sound plays on Android (file in `android/app/src/main/res/raw/`)
- [ ] Vibration pattern fires on silent-mode Android
- [ ] iOS: alert, badge, and sound all present (test on real iPhone — simulator does not deliver APNs)
- [ ] Duplicate pushes for the same `orderId` do not stack (stable notification ID)

---

## 2. Location streaming — 30+ minutes

**Setup:** Rider app running, rider set to **Online**, drive/walk a route or leave device on desk.

| Check | Pass criteria |
|-------|---------------|
| Foreground notification persists | "Sharing your location — HH:MM" updates every 30 s |
| Socket emits visible in backend logs | `rider:location` events arriving with correct `riderId` |
| No service kill on budget Android | Still streaming after 30 min with screen off (battery saver OFF for test) |
| Re-routes on NavMap | Polyline refreshes when rider moves > ~30 m from last route origin |
| ETA / distance badge updates | Badge in NavMap changes as rider moves |
| `stop` command works | Rider goes Offline → location stream stops, foreground notification dismissed |

**Battery optimisation:** Confirm `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` prompt appeared after first login and was accepted.

---

## 3. OTP flow — end-to-end

### 3a. Customer registration OTP

| Step | Expected |
|------|----------|
| Enter phone → Request OTP | SMS arrives within 60 s |
| Enter correct 4-digit OTP | Proceeds to name/password screen |
| Enter wrong OTP | Error message shown, field cleared |
| OTP expires (> TTL) | Descriptive error; resend option available |

### 3b. Rider — pickup OTP (accepted → at_station)

| Step | Expected |
|------|----------|
| Rider taps "Confirm Pickup" | OTP dialog appears with 4-digit field |
| Customer shares their OTP | Rider enters it; status moves to `at_station` |
| Wrong OTP | Backend rejects; snackbar shows error from API |

### 3c. Rider — delivery OTP (en_route → delivered)

| Step | Expected |
|------|----------|
| Rider taps "Mark as Delivered" | OTP dialog appears |
| Correct OTP entered | Status → `delivered`; rider navigated to `/` |
| Cash-on-delivery variant | Dialog label reads "Confirm Pickup" not "Confirm Delivery" |

---

## 4. Incoming order overlay — from different screens

Trigger a new order while the rider app is on each screen below. Confirm the overlay appears correctly and actions work.

| Screen active | Overlay appears | Accept navigates to order | Decline dismisses |
|---------------|-----------------|--------------------------|-------------------|
| Home (`/`) | ☐ | ☐ | ☐ |
| Orders list (`/orders`) | ☐ | ☐ | ☐ |
| Order detail (`/orders/:id`) | ☐ | ☐ | ☐ |
| Earnings (`/earnings`) | ☐ | ☐ | ☐ |
| Profile (`/profile`) | ☐ | ☐ | ☐ |

**Additional overlay checks:**
- [ ] Countdown timer reaches 0 → overlay auto-dismisses (order times out)
- [ ] Countdown turns red at ≤ 30 s
- [ ] Accepting while offline queues the mutation and shows snackbar
- [ ] Screen reader / large-font mode: overlay text not clipped

---

## 5. Pre-submission smoke tests

- [ ] `flutter analyze` — zero errors in both apps
- [ ] Cold launch < 3 s on mid-range Android (e.g. Samsung A-series)
- [ ] Deep link `/orders/:id` from notification opens correct order when app is terminated
- [ ] `usesCleartextTraffic` is `false` (or removed) in customer `AndroidManifest.xml` before production build
- [ ] Release APK / AAB signed with production keystore (not debug key)
- [ ] iOS `CFBundleDisplayName` matches App Store listing name
