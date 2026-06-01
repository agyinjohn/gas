import 'package:flutter_test/flutter_test.dart';
import 'package:getgas_core/getgas_core.dart';

void main() {
  test('Ghana phone validation', () {
    expect(validateGhanaPhoneLocal('241234567'), isTrue);
  });
}
