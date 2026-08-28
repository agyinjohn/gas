import 'package:flutter_test/flutter_test.dart';
import 'package:getgas_core/getgas_core.dart';

void main() {
  // ─── Phone validation (login form) ──────────────────────────────────────────
  group('Customer login form validation', () {
    test('valid phone and password passes', () {
      final errors = validateLoginForm('241234567', 'secret123');
      expect(errors, isEmpty);
    });

    test('short phone fails', () {
      final errors = validateLoginForm('2412', 'secret123');
      expect(errors['phone'], isNotNull);
    });

    test('empty password fails', () {
      final errors = validateLoginForm('241234567', '');
      expect(errors['password'], isNotNull);
    });

    test('phone with leading 0 is accepted', () {
      final errors = validateLoginForm('0241234567', 'secret123');
      expect(errors, isEmpty);
    });
  });

  // ─── Cart item subtotal ──────────────────────────────────────────────────────
  group('CartItem subtotal', () {
    test('calculates correctly', () {
      const item = CartItem(size: 12, quantity: 2, unitPrice: 60.0);
      expect(item.subtotal, 120.0);
    });

    test('zero quantity gives zero subtotal', () {
      const item = CartItem(size: 12, quantity: 0, unitPrice: 60.0);
      expect(item.subtotal, 0.0);
    });

    test('copyWith preserves unchanged fields', () {
      const item = CartItem(size: 6, quantity: 1, unitPrice: 40.0);
      final updated = item.copyWith(quantity: 3);
      expect(updated.size, 6);
      expect(updated.unitPrice, 40.0);
      expect(updated.subtotal, 120.0);
    });
  });

  // ─── Order status display ────────────────────────────────────────────────────
  group('Customer order status labels', () {
    test('pending shows Order Placed', () {
      expect(orderStatusLabel('pending'), 'Order Placed');
    });

    test('en_route shows On the Way', () {
      expect(orderStatusLabel('en_route'), 'On the Way');
    });

    test('delivered shows Delivered', () {
      expect(orderStatusLabel('delivered'), 'Delivered');
    });

    test('unknown status returns raw value', () {
      expect(orderStatusLabel('mystery'), 'mystery');
    });
  });

  // ─── Delivery fee ────────────────────────────────────────────────────────────
  group('Customer delivery fee', () {
    const config = PricingConfig(
      baseFee: 5,
      pricePerKm: 2,
      freeKm: 2,
      maxDeliveryFee: 50,
    );

    test('same location returns base fee', () {
      final fee = calcDeliveryFeeFromCoords(
        userLat: 5.6037,
        userLng: -0.1870,
        stationLat: 5.6037,
        stationLng: -0.1870,
        config: config,
      );
      expect(fee, config.baseFee);
    });

    test('fee does not exceed max', () {
      final fee = calcDeliveryFeeFromCoords(
        userLat: 0,
        userLng: 0,
        stationLat: 90,
        stationLng: 180,
        config: config,
      );
      expect(fee, lessThanOrEqualTo(config.maxDeliveryFee));
    });

    test('formatCurrency formats correctly', () {
      expect(formatCurrency(25), 'GH₵25.00');
      expect(formatCurrency(0), 'GH₵0.00');
    });
  });

  // ─── GasOrder model ──────────────────────────────────────────────────────────
  group('GasOrder for customer', () {
    test('active order is not delivered or cancelled', () {
      final order = GasOrder.fromJson({
        '_id': '507f1f77bcf86cd799439011',
        'status': 'en_route',
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

    test('payment method label renders correctly', () {
      expect(paymentMethodLabel('mobile_money'), 'Mobile Money');
      expect(paymentMethodLabel('cash'), 'Cash on Delivery');
      expect(paymentMethodLabel(null), '—');
    });

    test('displayTotal prefers finalAmount', () {
      final order = GasOrder.fromJson({
        '_id': '507f1f77bcf86cd799439011',
        'status': 'delivered',
        'totalAmount': 100,
        'finalAmount': 90,
        'cylinders': [],
      });
      expect(order.displayTotal, 90);
    });
  });

  // ─── AuthUser role ───────────────────────────────────────────────────────────
  group('AuthUser customer role', () {
    test('user role parsed correctly', () {
      final user = AuthUser.fromJson({
        '_id': 'abc123',
        'name': 'Ama',
        'phone': '+233241234567',
        'role': 'user',
      });
      expect(user.role, UserRole.user);
    });

    test('non-user role is not UserRole.user', () {
      final user = AuthUser.fromJson({
        '_id': 'abc123',
        'name': 'Kofi',
        'phone': '+233241234567',
        'role': 'rider',
      });
      expect(user.role, isNot(UserRole.user));
    });
  });
}
