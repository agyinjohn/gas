import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/api_providers.dart';

// ── Action types ──────────────────────────────────────────────────────────────

enum MutationType {
  setStatus,       // go online / offline
  orderAtStation,  // arrived at station
  orderEnRoute,    // departed for delivery
  orderDelivered,  // mark delivered
  acceptOrder,     // accept incoming order
}

class QueuedMutation {
  QueuedMutation({
    required this.type,
    required this.payload,
    required this.queuedAt,
  });

  final MutationType type;
  final Map<String, dynamic> payload;
  final DateTime queuedAt;

  Map<String, dynamic> toJson() => {
        'type': type.name,
        'payload': payload,
        'queuedAt': queuedAt.toIso8601String(),
      };

  factory QueuedMutation.fromJson(Map<String, dynamic> json) => QueuedMutation(
        type: MutationType.values.byName(json['type'] as String),
        payload: Map<String, dynamic>.from(json['payload'] as Map),
        queuedAt: DateTime.parse(json['queuedAt'] as String),
      );
}

// ── Service ───────────────────────────────────────────────────────────────────

class MutationQueueService {
  static const _kKey = 'mutation_queue';

  // ── Enqueue ────────────────────────────────────────────────────────────────

  static Future<void> enqueue(QueuedMutation mutation) async {
    final queue = await _load();
    queue.add(mutation);
    await _save(queue);
  }

  // ── Replay all queued mutations in order ───────────────────────────────────

  static Future<void> replay(WidgetRef ref) async {
    final queue = await _load();
    if (queue.isEmpty) return;

    final ridersApi = ref.read(ridersApiProvider);
    final failed = <QueuedMutation>[];

    for (final m in queue) {
      try {
        switch (m.type) {
          case MutationType.setStatus:
            await ridersApi.setStatus(m.payload['status'] as String);
          case MutationType.orderAtStation:
            await ridersApi.confirmOtp(
              m.payload['orderId'] as String,
              m.payload['otp'] as String,
            );
          case MutationType.orderEnRoute:
            await ridersApi.departedForDelivery(m.payload['orderId'] as String);
          case MutationType.orderDelivered:
            await ridersApi.confirmOtp(
              m.payload['orderId'] as String,
              m.payload['otp'] as String,
            );
          case MutationType.acceptOrder:
            await ridersApi.acceptOrder(m.payload['orderId'] as String);
        }
      } catch (_) {
        failed.add(m);
      }
    }

    await _save(failed);
  }

  static Future<int> pendingCount() async => (await _load()).length;

  // ── Persistence ────────────────────────────────────────────────────────────

  static Future<List<QueuedMutation>> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kKey);
      if (raw == null) return [];
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => QueuedMutation.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> _save(List<QueuedMutation> queue) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kKey, jsonEncode(queue.map((m) => m.toJson()).toList()));
    } catch (_) {}
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

/// Pending mutation count — drives the queue badge in the offline banner.
final pendingMutationsProvider = FutureProvider.autoDispose<int>((ref) {
  return MutationQueueService.pendingCount();
});
