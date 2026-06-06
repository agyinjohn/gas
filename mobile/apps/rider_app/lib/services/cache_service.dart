import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class CacheService {
  CacheService._();

  static const _kProfile    = 'cache_rider_profile';
  static const _kDashboard  = 'cache_rider_dashboard';
  static const _kActiveOrders = 'cache_active_orders';
  static const _kOrders     = 'cache_orders_';     // + filter key
  static const _kPayouts    = 'cache_payouts';
  static const _kOrder      = 'cache_order_';      // + orderId

  // ── write ──────────────────────────────────────────────────────────────────

  static Future<void> saveProfile(Map<String, dynamic> json) =>
      _writeJson(_kProfile, json);

  static Future<void> saveDashboard(Map<String, dynamic> json) =>
      _writeJson(_kDashboard, json);

  static Future<void> saveActiveOrders(List<Map<String, dynamic>> list) =>
      _writeList(_kActiveOrders, list);

  static Future<void> saveOrders(String filter, List<Map<String, dynamic>> list) =>
      _writeList('$_kOrders$filter', list);

  static Future<void> savePayouts(List<Map<String, dynamic>> list) =>
      _writeList(_kPayouts, list);

  static Future<void> saveOrder(String id, Map<String, dynamic> json) =>
      _writeJson('$_kOrder$id', json);

  // ── read ───────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>?> loadProfile() => _readJson(_kProfile);

  static Future<Map<String, dynamic>?> loadDashboard() => _readJson(_kDashboard);

  static Future<List<Map<String, dynamic>>?> loadActiveOrders() =>
      _readList(_kActiveOrders);

  static Future<List<Map<String, dynamic>>?> loadOrders(String filter) =>
      _readList('$_kOrders$filter');

  static Future<List<Map<String, dynamic>>?> loadPayouts() => _readList(_kPayouts);

  static Future<Map<String, dynamic>?> loadOrder(String id) =>
      _readJson('$_kOrder$id');

  // ── internal ───────────────────────────────────────────────────────────────

  static Future<void> _writeJson(String key, Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, jsonEncode(data));
    } catch (_) {}
  }

  static Future<void> _writeList(String key, List<Map<String, dynamic>> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, jsonEncode(data));
    } catch (_) {}
  }

  static Future<Map<String, dynamic>?> _readJson(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      if (raw == null) return null;
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<List<Map<String, dynamic>>?> _readList(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(key);
      if (raw == null) return null;
      final list = jsonDecode(raw) as List<dynamic>;
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return null;
    }
  }
}
