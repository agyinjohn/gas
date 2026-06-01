// Syncs Google Maps key from web env into Flutter + native config.
//
// Reads (first found):
//   frontend/.env.local  → NEXT_PUBLIC_GOOGLE_MAPS_KEY
//   apps/web/.env.local  → NEXT_PUBLIC_GOOGLE_MAPS_KEY
//   backend/.env         → GOOGLE_MAPS_API_KEY
//
// Writes:
//   assets/env/mobile.json
//   android/local.properties (GOOGLE_MAPS_API_KEY)
//   ios/Runner/Info.plist (GoogleMapsAPIKey)
//
// Run from customer_app: dart run tool/sync_env.dart

import 'dart:convert';
import 'dart:io';

void main() {
  final repoRoot = _findRepoRoot();
  final key = _readMapsKey(repoRoot);
  if (key.isEmpty) {
    stderr.writeln(
      'No Google Maps key found. Set NEXT_PUBLIC_GOOGLE_MAPS_KEY in frontend/.env.local',
    );
    exit(1);
  }

  final appRoot = _appRoot(repoRoot);

  _writeMobileJson(appRoot, key);
  _mergeAndroidLocalProperties(appRoot, key);
  _patchIosInfoPlist(appRoot, key);

  stdout.writeln('Synced Google Maps key from web env.');
  stdout.writeln('  → assets/env/mobile.json');
  stdout.writeln('  → android/local.properties');
  stdout.writeln('  → ios/Runner/Info.plist');
  stdout.writeln('Hot restart the app (R) or rebuild if maps were blank.');
}

Directory _findRepoRoot() {
  var dir = Directory.current;
  for (var i = 0; i < 8; i++) {
    if (File('${dir.path}${Platform.pathSeparator}frontend${Platform.pathSeparator}.env.local').existsSync()) {
      return dir;
    }
    final parent = dir.parent;
    if (parent.path == dir.path) break;
    dir = parent;
  }
  throw StateError('Could not find repo root (frontend/.env.local missing). Run from customer_app.');
}

String _appRoot(Directory repoRoot) {
  final fromCwd = Directory.current.path.replaceAll('/', Platform.pathSeparator);
  if (fromCwd.endsWith('customer_app')) return fromCwd;
  return '${repoRoot.path}${Platform.pathSeparator}mobile${Platform.pathSeparator}apps${Platform.pathSeparator}customer_app';
}

String _readMapsKey(Directory repoRoot) {
  final candidates = [
    '${repoRoot.path}${Platform.pathSeparator}frontend${Platform.pathSeparator}.env.local',
    '${repoRoot.path}${Platform.pathSeparator}apps${Platform.pathSeparator}web${Platform.pathSeparator}.env.local',
    '${repoRoot.path}${Platform.pathSeparator}backend${Platform.pathSeparator}.env',
  ];

  for (final path in candidates) {
    final file = File(path);
    if (!file.existsSync()) continue;
    for (final line in file.readAsLinesSync()) {
      final trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.contains('=')) continue;
      final eq = trimmed.indexOf('=');
      final name = trimmed.substring(0, eq).trim();
      final value = trimmed.substring(eq + 1).trim();
      if (name == 'NEXT_PUBLIC_GOOGLE_MAPS_KEY' || name == 'GOOGLE_MAPS_API_KEY') {
        if (value.isNotEmpty && !value.contains('your_')) return value;
      }
    }
  }
  return '';
}

void _writeMobileJson(String appRoot, String key) {
  final dir = Directory('$appRoot${Platform.pathSeparator}assets${Platform.pathSeparator}env');
  if (!dir.existsSync()) dir.createSync(recursive: true);
  File('$appRoot${Platform.pathSeparator}assets${Platform.pathSeparator}env${Platform.pathSeparator}mobile.json').writeAsStringSync(
    jsonEncode({'GOOGLE_MAPS_API_KEY': key}),
  );
}

void _mergeAndroidLocalProperties(String appRoot, String key) {
  final path = '$appRoot${Platform.pathSeparator}android${Platform.pathSeparator}local.properties';
  final file = File(path);
  final lines = file.existsSync() ? file.readAsLinesSync() : <String>[];
  final out = <String>[];
  var found = false;
  for (final line in lines) {
    if (line.startsWith('GOOGLE_MAPS_API_KEY=')) {
      out.add('GOOGLE_MAPS_API_KEY=$key');
      found = true;
    } else {
      out.add(line);
    }
  }
  if (!found) out.add('GOOGLE_MAPS_API_KEY=$key');
  file.writeAsStringSync('${out.join('\n')}\n');
}

void _patchIosInfoPlist(String appRoot, String key) {
  final path = '$appRoot${Platform.pathSeparator}ios${Platform.pathSeparator}Runner${Platform.pathSeparator}Info.plist';
  final file = File(path);
  if (!file.existsSync()) return;
  var content = file.readAsStringSync();
  const marker = '<key>GoogleMapsAPIKey</key>';
  if (!content.contains(marker)) return;
  content = content.replaceAll(
    RegExp(r'(<key>GoogleMapsAPIKey</key>\s*<string>)[^<]*(</string>)'),
    '\$1$key\$2',
  );
  file.writeAsStringSync(content);
}
