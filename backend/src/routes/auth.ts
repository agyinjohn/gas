import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import { Rider } from '../models/Rider';
import { Admin } from '../models/Admin';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import { createOTP, verifyOTP } from '../services/otpService';
import { sendSMS, SMS_TEMPLATES } from '../services/notificationService';

const REFERRAL_REWARD_POINTS = 200;

// ─── Google OAuth config ──────────────────────────────────────────────────────
// PLACEHOLDER: Replace with your actual Google OAuth credentials from
// https://console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL  = process.env.GOOGLE_CALLBACK_URL  || 'http://localhost:4000/api/v1/auth/google/callback';

passport.use(new GoogleStrategy(
  { clientID: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackURL: GOOGLE_CALLBACK_URL },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;
      const name = profile.displayName || profile.name?.givenName || 'User';
      const photo = profile.photos?.[0]?.value;

      // Find by googleId or email
      let user = await User.findOne({ $or: [{ googleId }, ...(email ? [{ email }] : [])] });

      if (!user) {
        // New Google user — create account, phone will be collected later
        let referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        while (await User.exists({ referralCode })) {
          referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        }
        user = await User.create({
          name,
          email,
          googleId,
          profilePhoto: photo,
          phone: `google_${googleId}`, // temporary placeholder — replaced when user adds phone
          isVerified: true,
          referralCode,
        });
      } else {
        // Existing user — update googleId/photo if missing
        if (!user.googleId) user.googleId = googleId;
        if (photo && !user.profilePhoto) user.profilePhoto = photo;
        if (email && !user.email) user.email = email;
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  }
));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 10) return '+233' + digits.slice(1);
  if (digits.length === 9) return '+233' + digits;
  if (phone.startsWith('+')) return phone;
  return phone;
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function signToken(payload: object, expiresIn = '7d'): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn } as jwt.SignOptions);
}

function ve(req: Request, res: Response): boolean {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ success: false, errors: e.array() }); return true; }
  return false;
}

const router = Router();

// ─── USER REGISTRATION ────────────────────────────────────────────────────────

/**
 * Step 1: Send OTP to verify phone before registration
 * POST /api/v1/auth/user/send-otp
 */
router.post('/user/send-otp',
  [body('phone').trim().matches(/^\+233\d{9}$/), body('purpose').isIn(['registration', 'forgot_password'])],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const { phone, purpose } = req.body;

    // For registration: check phone not already taken
    if (purpose === 'registration') {
      const existing = await User.findOne({ phone, passwordHash: { $exists: true } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Phone number already registered' });
      }
    }

    // For forgot_password: check user exists (with or without password)
    if (purpose === 'forgot_password') {
      const user = await User.findOne({ phone });
      if (!user) return res.status(404).json({ success: false, message: 'No account found with this phone number' });
    }

    try {
      const code = await createOTP(phone, purpose);
      try {
        await sendSMS(phone, SMS_TEMPLATES.otpVerification(code));
      } catch (smsErr: any) {
        // In development, log the failure but still return the code
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[send-otp] SMS failed (dev mode — continuing):', smsErr?.message);
        } else {
          throw smsErr;
        }
      }
      res.json({
        success: true,
        message: 'OTP sent',
        ...(process.env.NODE_ENV === 'development' && { _devCode: code }),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  }
);

/**
 * Step 2: Verify OTP then register with name + password
 * POST /api/v1/auth/user/register
 */
router.post('/user/register',
  [
    body('phone').trim().matches(/^\+233\d{9}$/),
    body('otp').isLength({ min: 4, max: 6 }),
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('referralCode').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const { phone, otp, name, password, referralCode } = req.body;

    // Verify OTP
    try {
      await verifyOTP(phone, otp, 'registration');
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid OTP' });
    }

    // Check not already registered
    if (await User.findOne({ phone, passwordHash: { $exists: true } })) {
      return res.status(409).json({ success: false, message: 'Phone already registered' });
    }

    // Resolve referrer
    let referredBy: mongoose.Types.ObjectId | undefined;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase().trim() });
      if (referrer) referredBy = referrer._id;
    }

    // Generate unique referral code
    let newCode = generateReferralCode();
    while (await User.exists({ referralCode: newCode })) {
      newCode = generateReferralCode();
    }

    const user = await User.create({
      phone,
      name: name.trim(),
      passwordHash: password, // pre-save hook hashes it
      isVerified: true,
      referralCode: newCode,
      referredBy,
    });

    // Referral rewards
    if (referredBy) {
      const referrer = await User.findById(referredBy);
      if (referrer) {
        user.loyaltyPoints = (user.loyaltyPoints ?? 0) + REFERRAL_REWARD_POINTS;
        await user.save();
        await LoyaltyTransaction.create({ userId: user._id, type: 'adjustment', points: REFERRAL_REWARD_POINTS, balanceAfter: user.loyaltyPoints, description: `Referral bonus` });
        referrer.loyaltyPoints = (referrer.loyaltyPoints ?? 0) + REFERRAL_REWARD_POINTS;
        referrer.referralCount = (referrer.referralCount ?? 0) + 1;
        await referrer.save();
        await LoyaltyTransaction.create({ userId: referrer._id, type: 'adjustment', points: REFERRAL_REWARD_POINTS, balanceAfter: referrer.loyaltyPoints, description: `Referral bonus — ${name} joined` });
      }
    }

    const token = signToken({ id: user._id, role: 'user', phone: user.phone });
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: 'user' },
    });
  }
);

/**
 * Login with phone + password
 * POST /api/v1/auth/user/login
 */
router.post('/user/login',
  [body('phone').trim().isMobilePhone('any'), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this phone number' });

    // User exists but has no password — redirect to forgot password to create one
    if (!user.passwordHash) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_REQUIRED',
        message: 'Please create a password for your account to continue.',
        phone: user.phone,
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Incorrect phone number or password' });

    const token = signToken({ id: user._id, role: 'user', phone: user.phone });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: 'user' },
      // Flag if phone is a Google placeholder — prompt to add real phone
      needsPhone: user.phone.startsWith('google_'),
    });
  }
);

/**
 * Existing OTP-only users: set password for the first time
 * POST /api/v1/auth/user/set-password
 */
router.post('/user/set-password',
  [
    body('phone').trim().isMobilePhone('any'),
    body('otp').isLength({ min: 4, max: 6 }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const phone = normalizePhone(req.body.phone);
    const { otp, password } = req.body;

    try {
      await verifyOTP(phone, otp, 'registration');
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid OTP' });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    user.passwordHash = password; // pre-save hook hashes
    user.isVerified = true;
    await user.save();

    const token = signToken({ id: user._id, role: 'user', phone: user.phone });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: 'user' },
    });
  }
);

/**
 * Forgot password — step 1: verify OTP (use send-otp with purpose=forgot_password first)
 * POST /api/v1/auth/user/reset-password
 */
router.post('/user/reset-password',
  [
    body('phone').trim().isMobilePhone('any'),
    body('otp').isLength({ min: 4, max: 6 }),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const phone = normalizePhone(req.body.phone);
    const { otp, newPassword } = req.body;

    try {
      await verifyOTP(phone, otp, 'forgot_password');
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid OTP' });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    user.passwordHash = newPassword;
    await user.save();

    const token = signToken({ id: user._id, role: 'user', phone: user.phone });
    res.json({
      success: true,
      message: 'Password reset successfully',
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: 'user' },
    });
  }
);

/**
 * Google user: add phone number after sign-in (no OTP needed — already verified via Google)
 * POST /api/v1/auth/user/add-phone
 * Body: { phone: "0123456789" | "+233123456789" | "233123456789" }
 */
router.post('/user/add-phone',
  [
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
  ],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;

    // Must be authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Authentication required' });
    let userId: string;
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as any;
      userId = decoded.id;
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    let phone = req.body.phone;

    // Normalize phone: accept flexible formats (0..., 233..., +233...)
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      return res.status(400).json({ success: false, message: 'Phone must be at least 9 digits' });
    }
    
    // Normalize to +233 format
    if (digits.startsWith('233') && digits.length === 12) {
      phone = '+' + digits;
    } else if (digits.startsWith('0') && digits.length === 10) {
      phone = '+233' + digits.slice(1);
    } else if (digits.length === 9) {
      phone = '+233' + digits;
    } else if (!phone.startsWith('+')) {
      return res.status(400).json({ success: false, message: 'Invalid phone format. Use: 0123456789, 233123456789, or +233123456789' });
    }

    // Check phone not taken by another account
    const existing = await User.findOne({ phone, _id: { $ne: userId } });
    if (existing) return res.status(409).json({ success: false, message: 'Phone number already in use' });

    const user = await User.findByIdAndUpdate(userId, { phone, isVerified: true }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Re-issue token with real phone
    const token = signToken({ id: user._id, role: 'user', phone: user.phone });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: 'user' },
    });
  }
);

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

/**
 * Initiate Google OAuth
 * GET /api/v1/auth/google
 */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * Google OAuth callback
 * GET /api/v1/auth/google/callback
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/?error=google_auth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signToken({ id: user._id, role: 'user', phone: user.phone });
    const needsPhone = user.phone?.startsWith('google_');

    // Redirect to frontend with token
    const params = new URLSearchParams({
      token,
      userId: user._id.toString(),
      name: user.name,
      needsPhone: needsPhone ? '1' : '0',
    });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`);
  }
);

// ─── KEEP EXISTING ROUTES (Rider, Station, Admin) ────────────────────────────

// Rider Register
router.post('/rider/register',
  [body('name').trim().notEmpty(), body('phone').trim().isMobilePhone('any'),
   body('password').isLength({ min: 6 }), body('nationalId').trim().notEmpty(),
   body('vehicleType').isIn(['motorbike', 'tricycle', 'van']), body('vehiclePlate').trim().notEmpty()],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const { name, password, nationalId, vehicleType, vehiclePlate } = req.body;
    const phone = normalizePhone(req.body.phone);
    if (await Rider.findOne({ phone })) return res.status(409).json({ success: false, message: 'Phone already registered' });
    await Rider.create({ name, phone, passwordHash: password, nationalId, vehicleType, vehiclePlate });
    res.status(201).json({ success: true, message: 'Registration submitted. Await admin approval.' });
  }
);

// Rider Login
router.post('/rider/login',
  [body('phone').trim().isMobilePhone('any'), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const phone = normalizePhone(req.body.phone);
    const rider = await Rider.findOne({ phone });
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    if (rider.kycStatus !== 'approved') return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
    const valid = await rider.comparePassword(req.body.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    const token = signToken({ id: rider._id, role: 'rider', phone });
    res.json({ success: true, token, rider: { id: rider._id, name: rider.name, phone, kycStatus: rider.kycStatus, status: rider.status } });
  }
);

// Unified Staff Login
router.post('/staff/login',
  [body('phone').trim().notEmpty(), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;

    const admin = await Admin.findOne({ $or: [{ phone }, { email: req.body.phone }], isActive: true });
    if (admin) {
      const valid = await admin.comparePassword(password);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const token = signToken({ id: admin._id, role: 'admin', phone: admin.phone }, '7d');
      return res.json({ success: true, token, role: 'admin', user: { id: admin._id, name: admin.name, phone: admin.phone } });
    }

    const rider = await Rider.findOne({ phone });
    if (rider) {
      if (rider.kycStatus !== 'approved') return res.status(403).json({ success: false, message: 'Pending admin approval' });
      const valid = await rider.comparePassword(password);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const token = signToken({ id: rider._id, role: 'rider', phone });
      return res.json({ success: true, token, role: 'rider', user: { id: rider._id, name: rider.name, phone } });
    }

    const user = await User.findOne({ phone });
    if (user) {
      const { Station } = await import('../models/Station');
      const station = await Station.findOne({ ownerId: user._id, status: 'active' });
      if (station) {
        if (!user.passwordHash) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const valid = await user.comparePassword(password);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const token = signToken({ id: user._id, role: 'station', stationId: station._id, phone });
        return res.json({ success: true, token, role: 'station', user: { id: user._id, name: user.name, phone } });
      }
    }

    return res.status(404).json({ success: false, message: 'No staff account found' });
  }
);

// Admin Login
router.post('/admin/login',
  [body('phone').trim().notEmpty(), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const { phone, password } = req.body;
    const admin = await Admin.findOne({ $or: [{ phone }, { email: phone }], isActive: true });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = signToken({ id: admin._id, role: 'admin', phone: admin.phone }, '7d');
    res.json({ success: true, token, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  }
);

// Station Register
router.post('/station/register',
  [body('name').trim().notEmpty(), body('phone').trim().isMobilePhone('any'),
   body('stationName').trim().notEmpty(), body('address').trim().notEmpty(),
   body('city').trim().notEmpty(), body('lat').isFloat({ min: -90, max: 90 }), body('lng').isFloat({ min: -180, max: 180 })],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const { name, phone, stationName, address, city, lat, lng } = req.body;
    if (await User.findOne({ phone })) return res.status(409).json({ success: false, message: 'Phone already registered' });
    const { Station } = await import('../models/Station');
    const { encodeGeohash } = await import('../services/geoService');
    const user = await User.create({ phone, name, isVerified: false });
    await Station.create({ ownerId: user._id, name: stationName, address, city, lat, lng, geohash: encodeGeohash(lat, lng, 7) });
    const code = await createOTP(phone, 'registration');
    await sendSMS(phone, SMS_TEMPLATES.otpVerification(code));
    res.status(201).json({ success: true, message: 'Registration submitted. Verify your phone. Await admin approval.', ...(process.env.NODE_ENV === 'development' && { _devCode: code }) });
  }
);

// Station OTP routes (kept for station login flow)
router.post('/station/send-otp',
  [body('phone').trim().isMobilePhone('any')],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
    const { Station } = await import('../models/Station');
    const station = await Station.findOne({ ownerId: user._id });
    if (!station) return res.status(404).json({ success: false, message: 'No station associated with this account' });
    const code = await createOTP(phone, 'login');
    await sendSMS(phone, SMS_TEMPLATES.otpVerification(code));
    res.json({ success: true, ...(process.env.NODE_ENV === 'development' && { _devCode: code }) });
  }
);

router.post('/station/verify-otp',
  [body('phone').trim().isMobilePhone('any'), body('code').isLength({ min: 4, max: 6 }), body('purpose').isIn(['registration', 'login'])],
  async (req: Request, res: Response) => {
    if (ve(req, res)) return;
    const { phone, code, purpose } = req.body;
    try { await verifyOTP(phone, code, purpose); } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid OTP' });
    }
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
    const { Station } = await import('../models/Station');
    const station = await Station.findOne({ ownerId: user._id });
    if (!station) return res.status(403).json({ success: false, message: 'No station associated' });
    if (station.status === 'pending') return res.status(403).json({ success: false, message: 'Station pending admin approval' });
    if (station.status === 'suspended' || station.status === 'banned') return res.status(403).json({ success: false, message: `Station is ${station.status}` });
    if (!user.isVerified) { user.isVerified = true; await user.save(); }
    const token = signToken({ id: user._id, role: 'station', stationId: station._id, phone });
    res.json({ success: true, token, user: { id: user._id, name: user.name, phone }, station: { id: station._id, name: station.name, status: station.status } });
  }
);

export { passport };
export default router;
