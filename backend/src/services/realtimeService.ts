import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketServer;

export function initSocketIO(socketServer: SocketServer): void {
  io = socketServer;

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      (socket as Socket & { user: unknown }).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    // Join order-specific room for scoped broadcasts
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`[Socket] join:order — socket=${socket.id} room=order:${orderId}`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Rider joins their personal room to receive dispatched orders
    socket.on('join:rider', (riderId: string) => {
      socket.join(`rider:${riderId}`);
      const roomSize = io.sockets.adapter.rooms.get(`rider:${riderId}`)?.size ?? 0;
      console.log(`[Socket] Rider ${riderId} joined room rider:${riderId} — room size now: ${roomSize}`);
    });

    // Rider broadcasts their GPS position
    socket.on('rider:location', async (payload: { orderId: string; lat: number; lng: number }) => {
      const { orderId, lat, lng } = payload;
      console.log(`[Rider:Location] orderId=${orderId} lat=${lat} lng=${lng}`);

      // Persist to DB so the user page can seed from it on load
      try {
        const order = await (await import('../models/Order')).Order.findById(orderId).select('riderId');
        if (order?.riderId) {
          const { Rider } = await import('../models/Rider');
          await Rider.findByIdAndUpdate(order.riderId, {
            location: { lat, lng, updatedAt: new Date() },
          });
        }
      } catch (err) {
        console.error('[Rider:Location] Failed to persist location:', err);
      }

      const roomSize = io.sockets.adapter.rooms.get(`order:${orderId}`)?.size ?? 0;
      console.log(`[Rider:Location] Broadcasting to order:${orderId} — ${roomSize} client(s) in room`);
      io.to(`order:${orderId}`).emit('rider:location:update', { lat, lng, updatedAt: new Date() });
    });

    socket.on('disconnect', () => {
      // Rider going offline is handled via REST PATCH /riders/status
    });
  });
}

/**
 * Broadcast an order status change to all clients watching that order.
 */
export function emitOrderStatus(
  orderId: string,
  status: string,
  extra?: Record<string, unknown>
): void {
  if (!io) return;
  io.to(`order:${orderId}`).emit('order:status', { orderId, status, ...extra, timestamp: new Date() });
}

/**
 * Broadcast a new order to a specific rider.
 */
export function emitOrderToRider(riderId: string, orderSummary: Record<string, unknown>): void {
  if (!io) return;
  io.to(`rider:${riderId}`).emit('order:new', orderSummary);
}

/**
 * Notify station of a new incoming order.
 */
export function emitOrderToStation(stationId: string, order: Record<string, unknown>): void {
  if (!io) return;
  io.to(`station:${stationId}`).emit('order:incoming', order);
}

export { io };
