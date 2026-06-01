import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import 'api_providers.dart';

final userProfileProvider = FutureProvider<UserProfile>((ref) {
  return ref.watch(usersApiProvider).getMe();
});
