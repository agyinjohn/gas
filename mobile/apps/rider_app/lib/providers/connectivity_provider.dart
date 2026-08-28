import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

bool _hasInterface(List<ConnectivityResult> results) =>
    results.any((r) => r != ConnectivityResult.none);

/// Emits true/false as connectivity changes.
/// Seeds with the current state immediately on subscribe.
final connectivityProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();

  // Seed with current state so we don't start as null
  final initial = await connectivity.checkConnectivity();
  yield _hasInterface(initial);

  await for (final results in connectivity.onConnectivityChanged) {
    yield _hasInterface(results);
  }
});

/// Synchronous snapshot — use this to gate mutations.
/// Defaults to true (optimistic) until the first emission resolves.
final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).valueOrNull ?? true;
});

/// Does a real TCP socket check to confirm actual internet access.
/// Use this when you need to distinguish "connected interface" from "real internet".
Future<bool> checkRealConnectivity() async {
  try {
    final result = await InternetAddress.lookup('google.com')
        .timeout(const Duration(seconds: 3));
    return result.isNotEmpty && result.first.rawAddress.isNotEmpty;
  } catch (_) {
    return false;
  }
}
