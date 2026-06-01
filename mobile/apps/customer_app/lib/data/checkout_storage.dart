import 'dart:convert';

import 'package:getgas_core/getgas_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists checkout cart + photo — mirrors web sessionStorage keys.
class CheckoutStorage {
  static const checkoutCartKey = 'checkoutCart';
  static const quickOrderCartKey = 'quickOrderCart';
  static const editOrderCartKey = 'editOrderCart';
  static const photoKey = 'checkout_photo';

  Future<void> saveCart(String key, List<CartItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(items.map((e) => e.toJson()).toList()));
  }

  Future<List<CartItem>> loadCart(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> clearCart(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }

  Future<void> savePhoto(String? base64) async {
    final prefs = await SharedPreferences.getInstance();
    if (base64 == null) {
      await prefs.remove(photoKey);
    } else {
      await prefs.setString(photoKey, base64);
    }
  }

  Future<String?> loadPhoto() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(photoKey);
  }
}
