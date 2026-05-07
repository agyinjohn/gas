import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { Notification } from '../models/Notification';

const router = Router();
router.use(authenticate);

/** GET /api/v1/notifications — list for current user */
router.get('/', async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'user') return res.status(403).json({ success: false, message: 'Forbidden' });
  const notifications = await Notification.find({ userId: req.user!.id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.user!.id, read: false });
  res.json({ success: true, notifications, unreadCount });
});

/** PATCH /api/v1/notifications/read-all — mark all read */
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'user') return res.status(403).json({ success: false, message: 'Forbidden' });
  await Notification.updateMany({ userId: req.user!.id, read: false }, { read: true });
  res.json({ success: true });
});

/** PATCH /api/v1/notifications/:id/read — mark one read */
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { read: true }
  );
  res.json({ success: true });
});

/** PATCH /api/v1/notifications/fcm-token — Register device token */
router.patch('/fcm-token', async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  const { role, id } = req.user!;
  if (role === 'user') {
    const { User } = await import('../models/User');
    await User.findByIdAndUpdate(id, { fcmToken: token });
  } else if (role === 'rider') {
    const { Rider } = await import('../models/Rider');
    await Rider.findByIdAndUpdate(id, { fcmToken: token });
  } else if (role === 'station') {
    const { Station } = await import('../models/Station');
    await Station.findByIdAndUpdate(id, { fcmToken: token });
  }
  res.json({ success: true });
});

export default router;
