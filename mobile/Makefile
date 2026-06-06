# GetGas Flutter — build & run commands
# Usage: make <target>
#
# Prerequisites:
#   - Flutter 3.x installed
#   - For release builds: keystore files in place (see RELEASE_SIGNING.md)

RIDER_DIR   = apps/rider_app
CUSTOMER_DIR = apps/customer_app

# ── API URLs ──────────────────────────────────────────────────────────────────

API_DEV  = http://192.168.100.7:4000        # Android emulator → localhost
API_PROD = https://gas-1-io3c.onrender.com       # Production — update before release

MAPS_KEY = $(shell grep -E '^GOOGLE_MAPS_API_KEY' ../backend/.env | cut -d= -f2 | tr -d ' ')

DEFINES_DEV  = --dart-define=API_URL=$(API_DEV)  --dart-define=GOOGLE_MAPS_API_KEY=$(MAPS_KEY)
DEFINES_PROD = --dart-define=API_URL=$(API_PROD) --dart-define=GOOGLE_MAPS_API_KEY=$(MAPS_KEY)

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

.PHONY: customer-dev customer-release customer-apk customer-bundle

customer-dev:
	cd $(CUSTOMER_DIR) && flutter run $(DEFINES_DEV)

customer-release:
	cd $(CUSTOMER_DIR) && flutter run --release $(DEFINES_PROD)

customer-apk:
	cd $(CUSTOMER_DIR) && flutter build apk --release $(DEFINES_PROD)
	@echo "APK → $(CUSTOMER_DIR)/build/app/outputs/flutter-apk/app-release.apk"

customer-bundle:
	cd $(CUSTOMER_DIR) && flutter build appbundle --release $(DEFINES_PROD)
	@echo "AAB → $(CUSTOMER_DIR)/build/app/outputs/bundle/release/app-release.aab"

# ── Physical device (replace IP with your machine's LAN IP) ──────────────────

.PHONY: rider-device customer-device

rider-device:
	@echo "Set LAN_IP to your machine's IP e.g: make rider-device LAN_IP=192.168.1.5"
	cd $(RIDER_DIR) && flutter run \
		--dart-define=API_URL=http://$(LAN_IP):4000 \
		--dart-define=GOOGLE_MAPS_API_KEY=$(MAPS_KEY)

customer-device:
	cd $(CUSTOMER_DIR) && flutter run \
		--dart-define=API_URL=http://$(LAN_IP):4000 \
		--dart-define=GOOGLE_MAPS_API_KEY=$(MAPS_KEY)

# ── Deps ──────────────────────────────────────────────────────────────────────

.PHONY: get clean

get:
	cd $(RIDER_DIR)    && flutter pub get
	cd $(CUSTOMER_DIR) && flutter pub get

clean:
	cd $(RIDER_DIR)    && flutter clean
	cd $(CUSTOMER_DIR) && flutter clean
