import '../config/app_config.dart';
import '../models/saved_address.dart';
import 'api_client.dart';

class UsersApi {
  UsersApi(this._client);

  final GetGasApiClient _client;

  static const _prefix = '${AppConfig.apiPrefix}/users';

  Future<UserProfile> getMe() async {
    final data = await _client.getJson('$_prefix/me');
    final userJson = data['user'] as Map<String, dynamic>? ?? data;
    return UserProfile.fromJson(userJson);
  }

  Future<UserProfile> updateMe({String? name, String? email}) async {
    final data = await _client.patchJson(
      '$_prefix/me',
      body: {
        'name': ?name,
        'email': ?email,
      },
    );
    final userJson = data['user'] as Map<String, dynamic>? ?? data;
    return UserProfile.fromJson(userJson);
  }

  Future<List<SavedAddress>> addAddress({
    required String label,
    required String street,
    required String city,
    required double lat,
    required double lng,
    bool isDefault = false,
  }) async {
    final data = await _client.postJson(
      '$_prefix/addresses',
      body: {
        'label': label,
        'street': street,
        'city': city,
        'lat': lat,
        'lng': lng,
        'isDefault': isDefault,
      },
    );
    return parseAddressesList(data['addresses']);
  }

  Future<List<SavedAddress>> updateAddress(
    String id, {
    String? label,
    String? street,
    String? city,
    double? lat,
    double? lng,
    bool? isDefault,
  }) async {
    final data = await _client.patchJson(
      '$_prefix/addresses/$id',
      body: {
        'label': ?label,
        'street': ?street,
        'city': ?city,
        'lat': ?lat,
        'lng': ?lng,
        'isDefault': ?isDefault,
      },
    );
    return parseAddressesList(data['addresses']);
  }

  Future<List<SavedAddress>> deleteAddress(String id) async {
    final data = await _client.deleteJson('$_prefix/addresses/$id');
    return parseAddressesList(data['addresses']);
  }

  Future<LoyaltyData> getLoyalty() async {
    final data = await _client.getJson('$_prefix/loyalty');
    final txs = data['transactions'] as List<dynamic>? ?? [];
    return LoyaltyData(
      balance: (data['balance'] as num?)?.toInt() ?? 0,
      transactions: txs.map((e) => LoyaltyTransaction.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<ReferralData> getReferral() async {
    final data = await _client.getJson('$_prefix/referral');
    return ReferralData(
      referralCode: data['referralCode'] as String? ?? '',
      referralCount: (data['referralCount'] as num?)?.toInt() ?? 0,
      pointsBalance: (data['pointsBalance'] as num?)?.toInt() ?? 0,
      shareUrl: data['shareUrl'] as String? ?? '',
    );
  }

  Future<void> registerFcmToken(String token) async {
    await _client.patchJson('$_prefix/me', body: {'fcmToken': token});
  }
}

class LoyaltyData {
  const LoyaltyData({required this.balance, required this.transactions});

  final int balance;
  final List<LoyaltyTransaction> transactions;
}

class LoyaltyTransaction {
  const LoyaltyTransaction({
    required this.type,
    required this.points,
    required this.description,
    required this.createdAt,
  });

  final String type;
  final int points;
  final String description;
  final String? createdAt;

  factory LoyaltyTransaction.fromJson(Map<String, dynamic> json) {
    return LoyaltyTransaction(
      type: json['type'] as String? ?? '',
      points: (json['points'] as num?)?.toInt() ?? 0,
      description: json['description'] as String? ?? '',
      createdAt: json['createdAt']?.toString(),
    );
  }
}

class ReferralData {
  const ReferralData({
    required this.referralCode,
    required this.referralCount,
    required this.pointsBalance,
    required this.shareUrl,
  });

  final String referralCode;
  final int referralCount;
  final int pointsBalance;
  final String shareUrl;
}
