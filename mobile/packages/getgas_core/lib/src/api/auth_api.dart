import '../config/app_config.dart';
import '../models/auth_user.dart';
import '../models/login_result.dart';
import 'api_client.dart';

class AuthApi {
  AuthApi(this._client);

  final GetGasApiClient _client;

  static const _prefix = '${AppConfig.apiPrefix}/auth';

  Future<LoginResult> userLogin(String phone, String password) async {
    final data = await _client.postJson(
      '$_prefix/user/login',
      body: {'phone': phone, 'password': password},
    );

    final userJson = data['user'] as Map<String, dynamic>? ?? {};
    return LoginResult(
      token: data['token'] as String? ?? '',
      user: AuthUser.fromJson({...userJson, 'role': 'user'}),
      needsProfile: data['needsPhone'] == true,
    );
  }

  Future<LoginResult> riderLogin(String phone, String password) async {
    final data = await _client.postJson(
      '$_prefix/rider/login',
      body: {'phone': phone, 'password': password},
    );

    final riderJson = data['rider'] as Map<String, dynamic>? ?? {};
    return LoginResult(
      token: data['token'] as String? ?? '',
      user: AuthUser.fromJson({...riderJson, 'role': 'rider'}),
    );
  }

  Future<Map<String, dynamic>> sendOtp(
    String phone,
    String purpose,
  ) async {
    return _client.postJson(
      '$_prefix/user/send-otp',
      body: {'phone': phone, 'purpose': purpose},
    );
  }

  Future<LoginResult> register({
    required String phone,
    required String otp,
    required String name,
    required String password,
  }) async {
    final data = await _client.postJson(
      '$_prefix/user/register',
      body: {
        'phone': phone,
        'otp': otp,
        'name': name,
        'password': password,
      },
    );

    final userJson = data['user'] as Map<String, dynamic>? ?? {};
    return LoginResult(
      token: data['token'] as String? ?? '',
      user: AuthUser.fromJson({...userJson, 'role': 'user'}),
    );
  }

  Future<LoginResult> resetPassword(
    String phone,
    String otp,
    String newPassword,
  ) async {
    final data = await _client.postJson(
      '$_prefix/user/reset-password',
      body: {
        'phone': phone,
        'otp': otp,
        'newPassword': newPassword,
      },
    );

    final userJson = data['user'] as Map<String, dynamic>? ?? {};
    return LoginResult(
      token: data['token'] as String? ?? '',
      user: AuthUser.fromJson({...userJson, 'role': 'user'}),
    );
  }

  Future<void> riderRegister({
    required String name,
    required String phone,
    required String password,
    required String nationalId,
    required String vehicleType,
    required String vehiclePlate,
  }) async {
    await _client.postJson(
      '$_prefix/rider/register',
      body: {
        'name': name,
        'phone': phone,
        'password': password,
        'nationalId': nationalId,
        'vehicleType': vehicleType,
        'vehiclePlate': vehiclePlate,
      },
    );
  }

  Future<LoginResult> addPhone(String phone, {String otp = ''}) async {
    final data = await _client.postJson(
      '$_prefix/user/add-phone',
      body: {'phone': phone, 'otp': otp},
    );

    final userJson = data['user'] as Map<String, dynamic>? ?? {};
    return LoginResult(
      token: data['token'] as String? ?? '',
      user: AuthUser.fromJson({...userJson, 'role': 'user'}),
    );
  }
}
