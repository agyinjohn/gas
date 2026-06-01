import 'package:getgas_core/getgas_core.dart';

void main() {
  print('GetGas core — ${Brand.name}');
  print('Fee for 5km: ${formatCurrency(calcDeliveryFee(5))}');
  print('Phone valid: ${validateGhanaPhoneLocal('241234567')}');
}
