import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'api_exception.dart';

class GetGasApiClient {
  GetGasApiClient({
    required AppConfig config,
    String? token,
    Dio? dio,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: config.apiBaseUrl,
                // Generous timeouts — the production backend (Render free tier)
                // can cold-start and take 30s+ to answer the first request.
                connectTimeout: const Duration(seconds: 30),
                receiveTimeout: const Duration(seconds: 60),
                headers: {'Content-Type': 'application/json'},
              ),
            ) {
    if (token != null && token.isNotEmpty) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  final Dio _dio;

  Dio get dio => _dio;

  void setAuthToken(String? token) {
    if (token == null || token.isEmpty) {
      _dio.options.headers.remove('Authorization');
    } else {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  Never _throwFromDio(DioException e) {
    final data = e.response?.data;
    String? message;
    String? code;

    if (data is Map) {
      message = data['message']?.toString();
      code = data['code']?.toString();
      // express-validator failures come back as {success, errors: [{msg}]}
      // with no top-level message — surface the first validation error.
      if (message == null || message.isEmpty) {
        final errors = data['errors'];
        if (errors is List && errors.isNotEmpty && errors.first is Map) {
          final first = errors.first as Map;
          message = (first['msg'] ?? first['message'])?.toString();
        }
      }
    }

    if (message == null || message.isEmpty) {
      final status = e.response?.statusCode;
      message = status != null
          ? 'Request failed (HTTP $status). Please try again.'
          : 'Cannot reach server (${_dio.options.baseUrl}). '
              'Check your internet connection.';
    }

    throw ApiException(
      message,
      code: code,
      statusCode: e.response?.statusCode,
    );
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(path, data: body);
      return res.data ?? {};
    } on DioException catch (e) {
      _throwFromDio(e);
    }
  }

  Future<Map<String, dynamic>> getJson(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(path, queryParameters: query);
      return res.data ?? {};
    } on DioException catch (e) {
      _throwFromDio(e);
    }
  }

  Future<Map<String, dynamic>> patchJson(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(path, data: body);
      return res.data ?? {};
    } on DioException catch (e) {
      _throwFromDio(e);
    }
  }

  Future<Map<String, dynamic>> deleteJson(String path) async {
    try {
      final res = await _dio.delete<Map<String, dynamic>>(path);
      return res.data ?? {};
    } on DioException catch (e) {
      _throwFromDio(e);
    }
  }
}
