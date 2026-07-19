# GetGas Flutter — build & run commands
# Usage: make <target>
#
# Prerequisites:
#   - Flutter 3.x installed
#   - For release builds: keystore files in place (see RELEASE_SIGNING.md)
#
# Backend URL / Maps key configuration lives in ONE place per app:
#   apps/<app>/config/production.json  — release builds (committed)
#   apps/<app>/config/local.json       — local dev (update IP to your machine)
# The values are embedded into the binary at build time via
# --dart-define-from-file, so the APK/AAB always carries its backend URL.

RIDER_DIR    = apps/rider_app
CUSTOMER_DIR = apps/customer_app

DEFINES_DEV  = --dart-define-from-file=config/local.json
DEFINES_PROD = --dart-define-from-file=config/production.json

# ── Rider app ─────────────────────────────────────────────────────────────────

.PHONY: rider-dev rider-release rider-apk rider-bundle

rider-dev:
	cd $(RIDER_DIR) && flutter run $(DEFINES_DEV)

rider-release:
	cd $(RIDER_DIR) && flutter run --release $(DEFINES_PROD)

rider-apk:
	cd $(RIDER_DIR) && flutter build apk --release $(DEFINES_PROD)
	@echo "APK → $(RIDER_DIR)/build/app/outputs/flutter-apk/app-release.apk"

rider-bundle:
	cd $(RIDER_DIR) && flutter build appbundle --release $(DEFINES_PROD)
	@echo "AAB → $(RIDER_DIR)/build/app/outputs/bundle/release/app-release.aab"

# ── Customer app ──────────────────────────────────────────────────────────────
# The customer app also bundles config as a runtime asset (assets/env/mobile.json,
# gitignored) — regenerate it from the config file before every build.

.PHONY: customer-dev customer-release customer-apk customer-bundle customer-env-dev customer-env-prod

customer-env-dev:
	cd $(CUSTOMER_DIR) && mkdir -p assets/env && cp config/local.json assets/env/mobile.json

customer-env-prod:
	cd $(CUSTOMER_DIR) && mkdir -p assets/env && cp config/production.json assets/env/mobile.json

customer-dev: customer-env-dev
	cd $(CUSTOMER_DIR) && flutter run $(DEFINES_DEV)

customer-release: customer-env-prod
	cd $(CUSTOMER_DIR) && flutter run --release $(DEFINES_PROD)

customer-apk: customer-env-prod
	cd $(CUSTOMER_DIR) && flutter build apk --release $(DEFINES_PROD)
	@echo "APK → $(CUSTOMER_DIR)/build/app/outputs/flutter-apk/app-release.apk"

customer-bundle: customer-env-prod
	cd $(CUSTOMER_DIR) && flutter build appbundle --release $(DEFINES_PROD)
	@echo "AAB → $(CUSTOMER_DIR)/build/app/outputs/bundle/release/app-release.aab"

# ── Physical device (replace IP with your machine's LAN IP) ──────────────────
# Explicit --dart-define overrides the value from the config file.

.PHONY: rider-device customer-device

rider-device:
	@echo "Set LAN_IP to your machine's IP e.g: make rider-device LAN_IP=192.168.1.5"
	cd $(RIDER_DIR) && flutter run $(DEFINES_DEV) \
		--dart-define=API_URL=http://$(LAN_IP):4000 \
		--dart-define=SOCKET_URL=http://$(LAN_IP):4000

customer-device: customer-env-dev
	cd $(CUSTOMER_DIR) && flutter run $(DEFINES_DEV) \
		--dart-define=API_URL=http://$(LAN_IP):4000 \
		--dart-define=SOCKET_URL=http://$(LAN_IP):4000

# ── Deps ──────────────────────────────────────────────────────────────────────

.PHONY: get clean

get:
	cd $(RIDER_DIR)    && flutter pub get
	cd $(CUSTOMER_DIR) && flutter pub get

clean:
	cd $(RIDER_DIR)    && flutter clean
	cd $(CUSTOMER_DIR) && flutter clean
