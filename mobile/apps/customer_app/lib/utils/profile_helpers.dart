import 'package:getgas_core/getgas_core.dart';

bool userNeedsProfileCompletion(AuthUser user) {
  final missingName =
      user.name.trim().isEmpty || RegExp(r'^user\s+\S+$', caseSensitive: false).hasMatch(user.name.trim());
  final missingPhone = user.phone.isEmpty || user.phone.startsWith('google_');
  return missingName || missingPhone;
}

bool userMissingName(AuthUser user) =>
    user.name.trim().isEmpty || RegExp(r'^user\s+\S+$', caseSensitive: false).hasMatch(user.name.trim());

bool userMissingPhone(AuthUser user) => user.phone.isEmpty || user.phone.startsWith('google_');
