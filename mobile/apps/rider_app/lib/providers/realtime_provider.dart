import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'auth_provider.dart';

// ── Socket service ────────────────────────────────────────────────────────────

class RiderRealtimeService {
  RiderRealtimeService(this._ref);

  final Ref _ref;
  io.Socket? _socket;
  String? _connectedToken;

  Future<io.Socket> _ensureSocket() async {
    final token = await _ref.read(authRepositoryProvider).currentToken();
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

  Future<void> joinRiderRoom(String riderId) async {
    final socket = await _ensureSocket();
    void doJoin(_) => socket.emit('join:rider', riderId);
    if (socket.connected) {
      doJoin(null);
    } else {
      socket.once('connect', doJoin);
    }
    socket.on('connect', doJoin);
  }

  void onNewOrder(void Function(IncomingOrder) handler) {
    _socket?.on('order:new', (data) {
      if (data is! Map) return;
      handler(IncomingOrder.fromJson(Map<String, dynamic>.from(data)));
    });
  }

  void offNewOrder() => _socket?.off('order:new');

  void emitLocation(double lat, double lng, {required String riderId}) {
    _socket?.emit('rider:location', {
      'riderId': riderId,
      'lat': lat,
      'lng': lng,
      'source': 'foreground',
    });
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _connectedToken = null;
  }
}

final riderRealtimeProvider = Provider<RiderRealtimeService>((ref) {
  final service = RiderRealtimeService(ref);
  ref.onDispose(service.dispose);
  return service;
});

// ── Incoming order state ──────────────────────────────────────────────────────

class IncomingOrderState {
  const IncomingOrderState({this.order, this.countdown = 0});

  final IncomingOrder? order;
  final int countdown;

  bool get hasOrder => order != null;
}

class IncomingOrderNotifier extends StateNotifier<IncomingOrderState> {
  IncomingOrderNotifier() : super(const IncomingOrderState());

  void incoming(IncomingOrder order) {
    state = IncomingOrderState(order: order, countdown: 120);
  }

  void tick() {
    if (!state.hasOrder) return;
    if (state.countdown <= 1) {
      state = const IncomingOrderState();
    } else {
      state = IncomingOrderState(order: state.order, countdown: state.countdown - 1);
    }
  }

  void dismiss() => state = const IncomingOrderState();
}

final incomingOrderProvider =
    StateNotifierProvider<IncomingOrderNotifier, IncomingOrderState>(
  (ref) => IncomingOrderNotifier(),
);
