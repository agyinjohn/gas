import 'package:getgas_core/getgas_core.dart';
import 'package:test/test.dart';

void main() {
  group('Ghana phone', () {
    test('normalize strips leading 0', () {
      expect(normalizeGhanaPhone('0241234567'), '+233241234567');
    });

    test('validate 9 digits', () {
      expect(validateGhanaPhoneLocal('241234567'), isTrue);
      expect(validateGhanaPhoneLocal('24123'), isFalse);
    });
  });

  group('delivery fee', () {
    test('floors at base fee', () {
      expect(calcDeliveryFee(0), deliveryBaseFee);
    });
  });
}
