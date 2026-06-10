CONFIG := config/production.json
LOCAL  := config/local.json

.PHONY: build apk ipa dev icons splash clean

build:
	flutter build appbundle --release --dart-define-from-file=$(CONFIG)

apk:
	flutter build apk --release --dart-define-from-file=$(CONFIG)

ipa:
	flutter build ipa --release --dart-define-from-file=$(CONFIG) \
		--export-options-plist=ios/ExportOptions.plist

dev:
	flutter run --dart-define-from-file=$(LOCAL)

icons:
	flutter pub run flutter_launcher_icons

splash:
	flutter pub run flutter_native_splash:create

clean:
	flutter clean
