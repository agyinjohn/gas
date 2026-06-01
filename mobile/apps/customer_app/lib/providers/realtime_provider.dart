import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'auth_provider.dart';

/// Socket.IO client for live order tracking — mirrors web `useSocket.ts`.
class RealtimeService {
  RealtimeService(this._ref);

  final Ref _ref;
  io.Socket? _socket;
  String? _connectedToken;
  final _orderListeners = <String, _OrderListeners>{};

  io.Socket _ensureSocket(String token) {
    if (_socket != null && _connectedToken == token) return _socket!;

    _socket?.dispose();
    final config = _ref.read(appConfigProvider);
    _socket = io.io(
      config.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(1000)
          .build(),
    );
    _connectedToken = token;
    return _socket!;
  }

  Future<void> watchOrder({
    required String orderId,
    void Function(String status)? onStatus,
    void Function(double lat, double lng)? onLocation,
  }) async {
    final token = await _ref.read(authRepositoryProvider).currentToken();
    if (token == null || token.isEmpty) return;

    final socket = _ensureSocket(token);
    var listeners = _orderListeners[orderId];
    if (listeners == null) {
      listeners = _OrderListeners();
      _orderListeners[orderId] = listeners;
      socket.emit('join:order', orderId);

      void handleStatus(dynamic data) {
        if (data is! Map) return;
        final status = data['status']?.toString();
        if (status == null) return;
        _orderListeners[orderId]?.onStatus.forEach((cb) => cb(status));
      }

      void handleLocation(dynamic data) {
        if (data is! Map) return;
        final lat = (data['lat'] as num?)?.toDouble();
        final lng = (data['lng'] as num?)?.toDouble();
        if (lat == null || lng == null) return;
        _orderListeners[orderId]?.onLocation.forEach((cb) => cb(lat, lng));
      }

      listeners.statusHandler = handleStatus;
      listeners.locationHandler = handleLocation;
      socket.on('order:status', handleStatus);
      socket.on('rider:location:update', handleLocation);
    }

    if (onStatus != null) listeners.onStatus.add(onStatus);
    if (onLocation != null) listeners.onLocation.add(onLocation);
  }

  void unwatchOrder({
    required String orderId,
    void Function(String status)? onStatus,
    void Function(double lat, double lng)? onLocation,
  }) {
    final listeners = _orderListeners[orderId];
    if (listeners == null) return;

    if (onStatus != null) listeners.onStatus.remove(onStatus);
    if (onLocation != null) listeners.onLocation.remove(onLocation);

    if (listeners.onStatus.isEmpty && listeners.onLocation.isEmpty) {
      _socket?.emit('leave:order', orderId);
      if (listeners.statusHandler != null) {
        _socket?.off('order:status', listeners.statusHandler);
      }
      if (listeners.locationHandler != null) {
        _socket?.off('rider:location:update', listeners.locationHandler);
      }
      _orderListeners.remove(orderId);
    }
  }

  void dispose() {
    for (final orderId in _orderListeners.keys.toList()) {
      _socket?.emit('leave:order', orderId);
    }
    _orderListeners.clear();
    _socket?.dispose();
    _socket = null;
    _connectedToken = null;
  }
}

class _OrderListeners {
  final onStatus = <void Function(String status)>{};
  final onLocation = <void Function(double lat, double lng)>{};
  void Function(dynamic)? statusHandler;
  void Function(dynamic)? locationHandler;
}

final realtimeServiceProvider = Provider<RealtimeService>((ref) {
  final service = RealtimeService(ref);
  ref.onDispose(service.dispose);
  return service;
});

/// Live rider location + status overrides for an order room.
class OrderTrackingState {
  const OrderTrackingState({
    this.riderLat,
    this.riderLng,
    this.statusOverride,
  });

  final double? riderLat;
  final double? riderLng;
  final String? statusOverride;

  OrderTrackingState copyWith({
    double? riderLat,
    double? riderLng,
    String? statusOverride,
  }) {
    return OrderTrackingState(
      riderLat: riderLat ?? this.riderLat,
      riderLng: riderLng ?? this.riderLng,
      statusOverride: statusOverride ?? this.statusOverride,
    );
  }
}

class OrderTrackingNotifier extends StateNotifier<OrderTrackingState> {
  OrderTrackingNotifier(this._ref, this.orderId) : super(const OrderTrackingState()) {
    _start();
  }

  final Ref _ref;
  final String orderId;

  void Function(String)? _onStatus;
  void Function(double, double)? _onLocation;

  Future<void> _start() async {
    _onStatus = (status) => state = state.copyWith(statusOverride: status);
    _onLocation = (lat, lng) => state = state.copyWith(riderLat: lat, riderLng: lng);

    await _ref.read(realtimeServiceProvider).watchOrder(
          orderId: orderId,
          onStatus: _onStatus,
          onLocation: _onLocation,
        );
  }

  void seedRiderLocation(double lat, double lng) {
    if (state.riderLat != null) return;
    state = state.copyWith(riderLat: lat, riderLng: lng);
  }

  @override
  void dispose() {
    if (_onStatus != null || _onLocation != null) {
      _ref.read(realtimeServiceProvider).unwatchOrder(
            orderId: orderId,
            onStatus: _onStatus,
            onLocation: _onLocation,
          );
    }
    super.dispose();
  }
}

final orderTrackingProvider =
    StateNotifierProvider.autoDispose.family<OrderTrackingNotifier, OrderTrackingState, String>(
  (ref, orderId) => OrderTrackingNotifier(ref, orderId),
);
