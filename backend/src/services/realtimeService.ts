import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import redis from '../config/redis';
import { Order } from '../models/Order';

const RIDERS_GEO_KEY = 'riders:locations';

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

    // Admin joins their room to receive escalation alerts
    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`[Socket] Admin joined admin room — socket=${socket.id}`);
    });

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
    socket.on('rider:location', async (payload: { riderId: string; lat: number; lng: number; source?: string }) => {
      const { riderId, lat, lng, source = 'unknown' } = payload;
      console.log(`[Location:${source}] riderId=${riderId} lat=${lat} lng=${lng}`);

      try {
        await redis.geoadd(RIDERS_GEO_KEY, lng, lat, riderId);
      } catch (err: any) {
        console.error(`[Redis] geoadd failed:`, err.message);
      }

      // Forward to customer only when the rider is en_route for their order
      try {
        const order = await Order.findOne(
          { riderId, status: 'en_route' },
          { _id: 1 }
        ).lean();
        if (order) {
          io.to(`order:${order._id}`).emit('rider:location:update', { lat, lng });
        }
      } catch (err: any) {
        console.error(`[Location] order lookup failed:`, err.message);
      }
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
