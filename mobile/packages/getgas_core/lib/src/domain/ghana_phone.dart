/// Normalize local Ghana input (0241234567) to E.164 (+233241234567).
String normalizeGhanaPhone(String local) {
  final digits = local.replaceAll(RegExp(r'\D'), '');
  final stripped = digits.startsWith('233')
      ? digits.substring(3)
      : digits.startsWith('0')
          ? digits.substring(1)
          : digits;
  return '+233$stripped';
}

/// Validate 9-digit local Ghana number (without leading 0).
bool validateGhanaPhoneLocal(String local) {
  final digits = local.replaceAll(RegExp(r'\D'), '');
  final stripped = digits.startsWith('0')
      ? digits.substring(1)
      : digits.startsWith('233')
          ? digits.substring(3)
          : digits;
  return stripped.length == 9;
}

/// Login form validation — mirrors web `/` login page.
Map<String, String> validateLoginForm(String phone, String password) {
  final errors = <String, String>{};
  final digits = phone.replaceAll(RegExp(r'\D'), '').replaceFirst(RegExp(r'^0'), '');
  if (digits.length != 9) {
    errors['phone'] = 'Enter a valid 9-digit Ghana number';
  }
  if (password.isEmpty) {
    errors['password'] = 'Password is required';
  }
  return errors;
}
