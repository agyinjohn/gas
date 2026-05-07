import 'express-async-errors';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server as SocketServer } from 'socket.io';

import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { initSocketIO } from './services/realtimeService';
import { startAllJobs } from './jobs/cronJobs';
import { swaggerSpec } from './config/swagger';
import swaggerUi from 'swagger-ui-express';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import stationRoutes from './routes/stations';
import riderRoutes from './routes/riders';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payments';
import notificationRoutes from './routes/notifications';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const API = '/api/v1';

// Socket.IO setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*', // Allow all origins in dev — tighten in production
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
initSocketIO(io);

// ─── Webhook (raw body — must be before express.json()) ──────────────────────
app.use(`${API}/payments`, paymentRoutes);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost, local network IPs, and the configured FRONTEND_URL
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
    ];
    // Allow any local network request (192.168.x.x, 10.x.x.x, 172.x.x.x)
    if (!origin || allowed.includes(origin) || /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in dev — tighten in production
    }
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/users`,         userRoutes);
app.use(`${API}/stations`,      stationRoutes);
app.use(`${API}/riders`,        riderRoutes);
app.use(`${API}/orders`,        orderRoutes);
app.use(`${API}/admin`,         adminRoutes);
app.use(`${API}/notifications`, notificationRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const start = Date.now();
  let dbStatus = 'ok';
  let dbLatencyMs = 0;

  try {
    const mongoose = await import('mongoose');
    const t0 = Date.now();
    await mongoose.default.connection.db?.admin().ping();
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = 'error';
  }

  const uptimeSeconds = Math.floor(process.uptime());
  const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status:    dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime:    `${uptimeSeconds}s`,
    memory:    `${memMB}MB`,
    db: {
      status:    dbStatus,
      latencyMs: dbLatencyMs,
    },
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

// ─── Swagger docs (dev only) ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'GetGas API Docs',
    customCss: '.swagger-ui .topbar { background-color: #f97316; }',
  }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
  console.log('📖 Swagger docs → http://localhost:4000/api/docs');
}

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000', 10);

connectDB().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 GasGo API running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Network access: http://192.168.43.206:${PORT}`);
    console.log(`🔌 Socket.IO ready`);
  });
  startAllJobs();
});

export { io };
