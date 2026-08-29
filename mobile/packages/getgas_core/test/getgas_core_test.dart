import 'package:getgas_core/getgas_core.dart';
import 'package:test/test.dart';

void main() {
  // ─── Ghana Phone ────────────────────────────────────────────────────────────
  group('normalizeGhanaPhone', () {
    test('strips leading 0', () {
      expect(normalizeGhanaPhone('0241234567'), '+233241234567');
    });

    test('strips 233 prefix', () {
      expect(normalizeGhanaPhone('233241234567'), '+233241234567');
    });

    test('handles bare 9-digit number', () {
      expect(normalizeGhanaPhone('241234567'), '+233241234567');
    });

    test('strips non-digit characters', () {
      expect(normalizeGhanaPhone('024-123-4567'), '+233241234567');
    });
  });

  group('validateGhanaPhoneLocal', () {
    test('accepts valid 9-digit number', () {
      expect(validateGhanaPhoneLocal('241234567'), isTrue);
    });

    test('accepts number with leading 0 (10 digits)', () {
      expect(validateGhanaPhoneLocal('0241234567'), isTrue);
    });

    test('rejects too short', () {
      expect(validateGhanaPhoneLocal('24123'), isFalse);
    });

    test('rejects too long', () {
      expect(validateGhanaPhoneLocal('02412345678'), isFalse);
    });

    test('rejects empty string', () {
      expect(validateGhanaPhoneLocal(''), isFalse);
    });
  });

  group('validateLoginForm', () {
    test('returns no errors for valid input', () {
      final errors = validateLoginForm('241234567', 'password123');
      expect(errors, isEmpty);
    });

    test('returns phone error for short number', () {
      final errors = validateLoginForm('2412345', 'password123');
      expect(errors['phone'], isNotNull);
    });

    test('returns password error for empty password', () {
      final errors = validateLoginForm('241234567', '');
      expect(errors['password'], isNotNull);
    });

    test('returns both errors for invalid input', () {
      final errors = validateLoginForm('123', '');
      expect(errors['phone'], isNotNull);
      expect(errors['password'], isNotNull);
    });
  });

  // ─── Delivery Fee ───────────────────────────────────────────────────────────
  group('calcDeliveryFee', () {
    test('floors at base fee for 0 km', () {
      expect(calcDeliveryFee(0), deliveryBaseFee);
    });

    test('floors at base fee for very short distance', () {
      expect(calcDeliveryFee(1), deliveryBaseFee);
    });

    test('increases with distance', () {
      expect(calcDeliveryFee(10), greaterThan(calcDeliveryFee(5)));
    });

    test('caps at max value', () {
      expect(calcDeliveryFee(1000), lessThanOrEqualTo(999999));
    });
  });

  group('calcDeliveryFeeFromCoords', () {
    const config = PricingConfig(
      baseFee: 5,
      pricePerKm: 2,
      freeKm: 2,
      maxDeliveryFee: 50,
    );

    test('returns baseFee when within free km', () {
      // Same coordinates = 0 km distance
      final fee = calcDeliveryFeeFromCoords(
        userLat: 5.6037,
        userLng: -0.1870,
        stationLat: 5.6037,
        stationLng: -0.1870,
        config: config,
      );
      expect(fee, config.baseFee);
    });

    test('does not exceed maxDeliveryFee', () {
      final fee = calcDeliveryFeeFromCoords(
        userLat: 5.6037,
        userLng: -0.1870,
        stationLat: 10.0,
        stationLng: 10.0,
        config: config,
      );
      expect(fee, lessThanOrEqualTo(config.maxDeliveryFee));
    });

    test('increases with distance', () {
      final feeNear = calcDeliveryFeeFromCoords(
        userLat: 5.6037,
        userLng: -0.1870,
        stationLat: 5.6100,
        stationLng: -0.1870,
        config: config,
      );
      final feeFar = calcDeliveryFeeFromCoords(
        userLat: 5.6037,
        userLng: -0.1870,
        stationLat: 5.7000,
        stationLng: -0.1870,
        config: config,
      );
      expect(feeFar, greaterThanOrEqualTo(feeNear));
    });
  });

  group('haversineDistanceKm', () {
    test('returns 0 for same coordinates', () {
      expect(haversineDistanceKm(5.6037, -0.1870, 5.6037, -0.1870), 0.0);
    });

    test('returns positive distance for different coordinates', () {
      expect(haversineDistanceKm(5.6037, -0.1870, 5.7000, -0.1870), greaterThan(0));
    });

    test('is symmetric', () {
      final d1 = haversineDistanceKm(5.6037, -0.1870, 5.7000, -0.2000);
      final d2 = haversineDistanceKm(5.7000, -0.2000, 5.6037, -0.1870);
      expect((d1 - d2).abs(), lessThan(0.0001));
    });
  });

  group('formatCurrency', () {
    test('formats integer amount', () {
      expect(formatCurrency(15), 'GH₵15.00');
    });

    test('formats decimal amount', () {
      expect(formatCurrency(12.5), 'GH₵12.50');
    });

    test('formats zero', () {
      expect(formatCurrency(0), 'GH₵0.00');
    });
  });

  // ─── Order Labels ───────────────────────────────────────────────────────────
  group('orderStatusLabel', () {
    test('returns label for known status', () {
      expect(orderStatusLabel('pending'), 'Order Placed');
      expect(orderStatusLabel('accepted'), 'Rider Assigned');
      expect(orderStatusLabel('at_station'), 'Rider at Station');
      expect(orderStatusLabel('en_route'), 'On the Way');
      expect(orderStatusLabel('delivered'), 'Delivered');
      expect(orderStatusLabel('cancelled'), 'Cancelled');
    });

    test('returns raw status for unknown value', () {
      expect(orderStatusLabel('unknown_status'), 'unknown_status');
    });
  });

  group('paymentMethodLabel', () {
    test('returns label for known methods', () {
      expect(paymentMethodLabel('mobile_money'), 'Mobile Money');
      expect(paymentMethodLabel('card'), 'Card');
      expect(paymentMethodLabel('cash'), 'Cash on Delivery');
    });

    test('returns dash for null', () {
      expect(paymentMethodLabel(null), '—');
    });

    test('returns raw value for unknown method', () {
      expect(paymentMethodLabel('crypto'), 'crypto');
    });
  });

  // ─── PricingConfig ──────────────────────────────────────────────────────────
  group('PricingConfig.fromJson', () {
    test('parses all fields', () {
      final config = PricingConfig.fromJson({
        'baseFee': 10,
        'pricePerKm': 3,
        'freeKm': 1,
        'maxDeliveryFee': 80,
      });
      expect(config.baseFee, 10.0);
      expect(config.pricePerKm, 3.0);
      expect(config.freeKm, 1.0);
      expect(config.maxDeliveryFee, 80.0);
    });

    test('falls back to defaults for null json', () {
      final config = PricingConfig.fromJson(null);
      expect(config.baseFee, PricingConfig.defaults.baseFee);
      expect(config.pricePerKm, PricingConfig.defaults.pricePerKm);
    });

    test('falls back to defaults for missing fields', () {
      final config = PricingConfig.fromJson({});
      expect(config.baseFee, PricingConfig.defaults.baseFee);
    });
  });

  // ─── CartItem ───────────────────────────────────────────────────────────────
  group('CartItem', () {
    test('subtotal = unitPrice * quantity', () {
      const item = CartItem(size: 12, quantity: 3, unitPrice: 50.0);
      expect(item.subtotal, 150.0);
    });

    test('copyWith updates fields', () {
      const item = CartItem(size: 12, quantity: 1, unitPrice: 50.0);
      final updated = item.copyWith(quantity: 5);
      expect(updated.quantity, 5);
      expect(updated.size, 12);
      expect(updated.unitPrice, 50.0);
    });

    test('toJson includes subtotal', () {
      const item = CartItem(size: 6, quantity: 2, unitPrice: 30.0);
      final json = item.toJson();
      expect(json['subtotal'], 60.0);
      expect(json['size'], 6);
      expect(json['quantity'], 2);
    });

    test('fromJson round-trips', () {
      const item = CartItem(size: 12, quantity: 2, unitPrice: 45.0);
      final restored = CartItem.fromJson(item.toJson());
      expect(restored.size, item.size);
      expect(restored.quantity, item.quantity);
      expect(restored.unitPrice, item.unitPrice);
    });
  });

  // ─── AuthUser ───────────────────────────────────────────────────────────────
  group('AuthUser.fromJson', () {
    test('parses user role', () {
      final user = AuthUser.fromJson({
        '_id': 'abc123',
        'name': 'Kwame',
        'phone': '+233241234567',
        'role': 'user',
      });
      expect(user.role, UserRole.user);
      expect(user.name, 'Kwame');
    });

    test('parses rider role', () {
      final user = AuthUser.fromJson({
        '_id': 'abc123',
        'name': 'Kofi',
        'phone': '+233241234567',
        'role': 'rider',
      });
      expect(user.role, UserRole.rider);
    });

    test('defaults to user role for unknown role', () {
      final user = AuthUser.fromJson({
        '_id': 'abc123',
        'name': 'Test',
        'phone': '+233241234567',
        'role': 'unknown',
      });
      expect(user.role, UserRole.user);
    });

    test('toJson round-trips', () {
      final user = AuthUser.fromJson({
        '_id': 'abc123',
        'name': 'Ama',
        'phone': '+233241234567',
        'role': 'admin',
      });
      final json = user.toJson();
      expect(json['name'], 'Ama');
      expect(json['role'], 'admin');
    });
  });

  // ─── GasOrder ───────────────────────────────────────────────────────────────
  group('GasOrder', () {
    final validJson = {
      '_id': '507f1f77bcf86cd799439011',
      'status': 'pending',
      'totalAmount': 120,
      'deliveryFee': 15,
      'cylinders': [
        {'size': 12, 'quantity': 2, 'unitPrice': 50},
      ],
    };

    test('fromJson parses status and id', () {
      final order = GasOrder.fromJson(validJson);
      expect(order.status, 'pending');
      expect(order.id, '507f1f77bcf86cd799439011');
    });

    test('isActive is true for pending', () {
      final order = GasOrder.fromJson(validJson);
      expect(order.isActive, isTrue);
    });

    test('isActive is false for delivered', () {
      final order = GasOrder.fromJson({...validJson, 'status': 'delivered'});
      expect(order.isActive, isFalse);
    });

    test('isActive is false for cancelled', () {
      final order = GasOrder.fromJson({...validJson, 'status': 'cancelled'});
      expect(order.isActive, isFalse);
    });

    test('hasValidId accepts 24-char hex id', () {
      final order = GasOrder.fromJson(validJson);
      expect(order.hasValidId, isTrue);
    });

    test('hasValidId rejects short id', () {
      final order = GasOrder.fromJson({...validJson, '_id': 'abc'});
      expect(order.hasValidId, isFalse);
    });

    test('displayTotal prefers finalAmount over totalAmount', () {
      final order = GasOrder.fromJson({...validJson, 'finalAmount': 100, 'totalAmount': 120});
      expect(order.displayTotal, 100);
    });

    test('displayTotal falls back to totalAmount', () {
      final order = GasOrder.fromJson(validJson);
      expect(order.displayTotal, 120);
    });

    test('displayNumber uses last 8 chars of id when no orderNumber', () {
      final order = GasOrder.fromJson(validJson);
      expect(order.displayNumber, '99439011'.toUpperCase());
    });
  });

  // ─── AppConfig ──────────────────────────────────────────────────────────────
  group('AppConfig', () {
    test('socketUrl defaults to apiBaseUrl', () {
      final config = AppConfig(apiBaseUrl: 'https://backend.mandmservicescorp.org/api-gasgo');
      expect(config.socketUrl, 'https://backend.mandmservicescorp.org/api-gasgo');
    });

    test('webBaseUrl keeps same host for non-4000 port', () {
      final config = AppConfig(apiBaseUrl: 'https://backend.mandmservicescorp.org/api-gasgo');
      expect(config.webBaseUrl, contains('mandmservicescorp.org'));
    });

    test('fromEnvironment falls back to defaultApiUrl', () {
      final config = AppConfig.fromEnvironment();
      expect(config.apiBaseUrl, isNotEmpty);
    });
  });
}
