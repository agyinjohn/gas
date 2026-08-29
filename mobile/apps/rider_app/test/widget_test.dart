import 'package:flutter_test/flutter_test.dart';
import 'package:getgas_core/getgas_core.dart';

void main() {
  // ─── Phone validation ────────────────────────────────────────────────────────
  group('Rider login form validation', () {
    test('valid phone and password passes', () {
      final errors = validateLoginForm('244000111', 'pass1234');
      expect(errors, isEmpty);
    });

    test('short phone fails', () {
      final errors = validateLoginForm('244', 'pass1234');
      expect(errors['phone'], isNotNull);
    });

    test('empty password fails', () {
      final errors = validateLoginForm('244000111', '');
      expect(errors['password'], isNotNull);
    });
  });

  group('normalizeGhanaPhone for rider', () {
    test('normalizes 0-prefixed number', () {
      expect(normalizeGhanaPhone('0244000111'), '+233244000111');
    });

    test('normalizes 233-prefixed number', () {
      expect(normalizeGhanaPhone('233244000111'), '+233244000111');
    });

    test('normalizes bare 9-digit number', () {
      expect(normalizeGhanaPhone('244000111'), '+233244000111');
    });
  });

  // ─── Order status labels (rider perspective) ─────────────────────────────────
  group('Rider order status labels', () {
    test('accepted shows Rider Assigned', () {
      expect(orderStatusLabel('accepted'), 'Rider Assigned');
    });

    test('at_station shows Rider at Station', () {
      expect(orderStatusLabel('at_station'), 'Rider at Station');
    });

    test('en_route shows On the Way', () {
      expect(orderStatusLabel('en_route'), 'On the Way');
    });

    test('delivered shows Delivered', () {
      expect(orderStatusLabel('delivered'), 'Delivered');
    });

    test('cancelled shows Cancelled', () {
      expect(orderStatusLabel('cancelled'), 'Cancelled');
    });
  });

  // ─── AuthUser rider role ─────────────────────────────────────────────────────
  group('AuthUser rider role', () {
    test('rider role parsed correctly', () {
      final user = AuthUser.fromJson({
        '_id': 'rider001',
        'name': 'Kweku',
        'phone': '+233244000111',
        'role': 'rider',
      });
      expect(user.role, UserRole.rider);
    });

    test('toJson preserves rider role', () {
      final user = AuthUser.fromJson({
        '_id': 'rider001',
        'name': 'Kweku',
        'phone': '+233244000111',
        'role': 'rider',
      });
      expect(user.toJson()['role'], 'rider');
    });

    test('non-rider role is not UserRole.rider', () {
      final user = AuthUser.fromJson({
        '_id': 'user001',
        'name': 'Ama',
        'phone': '+233241234567',
        'role': 'user',
      });
      expect(user.role, isNot(UserRole.rider));
    });
  });

  // ─── GasOrder for rider ──────────────────────────────────────────────────────
  group('GasOrder for rider', () {
    test('pending order is active', () {
      final order = GasOrder.fromJson({
        '_id': '507f1f77bcf86cd799439011',
        'status': 'pending',
        'cylinders': [],
      });
      expect(order.isActive, isTrue);
    });

    test('accepted order is active', () {
      final order = GasOrder.fromJson({
        '_id': '507f1f77bcf86cd799439011',
        'status': 'accepted',
        'cylinders': [],
      });
      expect(order.isActive, isTrue);
    });

    test('delivered order is not active', () {
      final order = GasOrder.fromJson({
        '_id': '507f1f77bcf86cd799439011',
        'status': 'delivered',
        'cylinders': [],
      });
      expect(order.isActive, isFalse);
    });

    test('hasValidId rejects invalid id', () {
      final order = GasOrder.fromJson({
        '_id': 'bad-id',
        'status': 'pending',
        'cylinders': [],
      });
      expect(order.hasValidId, isFalse);
    });

    test('hasValidId accepts 24-char hex id', () {
      final order = GasOrder.fromJson({
        '_id': '507f1f77bcf86cd799439011',
        'status': 'pending',
        'cylinders': [],
      });
      expect(order.hasValidId, isTrue);
    });

    test('displayNumber falls back to last 8 chars of id', () {
      final order = GasOrder.fromJson({
        '_id': '507f1f77bcf86cd799439011',
        'status': 'pending',
        'cylinders': [],
      });
      expect(order.displayNumber, '99439011'.toUpperCase());
    });
  });

  // ─── Delivery fee (rider earning estimate) ───────────────────────────────────
  group('Delivery fee calculation', () {
    test('calcDeliveryFee floors at base', () {
      expect(calcDeliveryFee(0), deliveryBaseFee);
    });

    test('calcDeliveryFee grows with distance', () {
      expect(calcDeliveryFee(20), greaterThan(calcDeliveryFee(5)));
    });

    test('haversine returns 0 for same point', () {
      expect(haversineDistanceKm(5.6037, -0.1870, 5.6037, -0.1870), 0.0);
    });

    test('haversine is symmetric', () {
      final d1 = haversineDistanceKm(5.6037, -0.1870, 6.0, -0.5);
      final d2 = haversineDistanceKm(6.0, -0.5, 5.6037, -0.1870);
      expect((d1 - d2).abs(), lessThan(0.0001));
    });

    test('formatCurrency formats rider earning', () {
      expect(formatCurrency(35.5), 'GH₵35.50');
    });
  });

  // ─── PricingConfig ───────────────────────────────────────────────────────────
  group('PricingConfig', () {
    test('defaults are sensible', () {
      expect(PricingConfig.defaults.baseFee, greaterThan(0));
      expect(PricingConfig.defaults.maxDeliveryFee, greaterThan(PricingConfig.defaults.baseFee));
    });

    test('fromJson parses correctly', () {
      final config = PricingConfig.fromJson({
        'baseFee': 8,
        'pricePerKm': 2.5,
        'freeKm': 3,
        'maxDeliveryFee': 60,
      });
      expect(config.baseFee, 8.0);
      expect(config.freeKm, 3.0);
    });

    test('fromJson falls back to defaults for null', () {
      final config = PricingConfig.fromJson(null);
      expect(config.baseFee, PricingConfig.defaults.baseFee);
    });
  });
}
