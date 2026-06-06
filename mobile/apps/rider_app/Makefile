CONFIG := config/production.json
LOCAL  := config/local.json

.PHONY: build apk dev clean

build:
	flutter build appbundle --release --dart-define-from-file=$(CONFIG)

apk:
	flutter build apk --release --dart-define-from-file=$(CONFIG)

dev:
	flutter run --dart-define-from-file=$(LOCAL)

clean:
	flutter clean
