const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const User  = require('../models/User');
const Token = require('../models/Token');
const transporter = require('../config/mailer');

// ─────────────────────────────────────────
// Helper: Generate a 6-digit numeric OTP
// ─────────────────────────────────────────
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─────────────────────────────────────────
// POST /register – Create a new user account
// ─────────────────────────────────────────
// -----------------------------------------
// Helper: Validate password strength
// -----------------------------------------
const validatePassword = (password) => {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters long.';
  if (!/\d/.test(password))
    return 'Password must contain at least one number.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"|,.<>\/?]/.test(password))
    return 'Password must contain at least one special character.';
  return null;
};

const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError)
      return res.status(400).json({ message: passwordError });

    // Check if the username or email is already taken
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing)
      return res.status(400).json({ message: 'Username or Email already exists!' });

    const hashed  = await bcrypt.hash(password, 10);
    const otpCode = generateOtp();

    await User.create({ username, password: hashed, email, verificationToken: otpCode });

    // Send the verification confirmation email
    transporter.sendMail({
      from: `"NoteSpace" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Account Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
          <h2>Verify Your NoteSpace Account</h2>
          <p>Hi ${username}, your verification code is:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px;">${otpCode}</h1>
          <p>Use this code to activate your account. Please do not share this code with anyone.</p>
        </div>`,
    });

    res.status(201).json({ success: true, message: 'Verification code has been sent to your email!' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ─────────────────────────────────────────
// POST /verify-otp – Verify incoming OTP code
// type: "register" | "reset"
// ─────────────────────────────────────────
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, type } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'Email does not exist.' });

    if (type === 'reset') {
      // Authenticate password recovery verification token matching logic
      if (user.resetPasswordToken !== otp)
        return res.status(400).json({ message: 'Invalid verification code.' });
      if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires)
        return res.status(400).json({ message: 'Code has expired. Please request a new one.' });

      return res.json({ success: true, message: 'Verification successful!' });
    } else {
      // Authenticate signup registration verification token matching logic
      if (user.verificationToken !== otp)
        return res.status(400).json({ message: 'Invalid or expired verification code.' });

      user.isVerified        = true;
      user.verificationToken = undefined;
      await user.save();

      // Auto-login: create a session token so the frontend can go straight to /home
      const token     = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await Token.create({ userId: user._id, token, expiresAt });

      return res.json({
        success: true,
        message: 'Account verification successful!',
        token,
        user: { id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || null },
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'System error during verification processes' });
  }
};

// ─────────────────────────────────────────
// POST /resend-otp – Re-transmit registration OTP code
// ─────────────────────────────────────────
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'Email not found.' });

    const newOtp = generateOtp();
    user.verificationToken = newOtp;
    await user.save();

    await transporter.sendMail({
      from: `"NoteSpace" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Resend Verification Code',
      html: `<h1>${newOtp}</h1>`,
    });

    res.json({ success: true, message: 'A new verification code has been sent!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
};

// ─────────────────────────────────────────
// POST /login – Authenticate application session
// ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    // Validate overall identity criteria
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Incorrect email or password' });

    if (!user.isVerified)
      return res.status(403).json({ message: 'Account is not verified yet!', unverified: true });

    // Generate session token (Expires after 24 hours window boundary)
    const token     = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Token.create({ userId: user._id, token, expiresAt });

    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || null },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};

// ─────────────────────────────────────────
// GET /verify-token – Check session payload validity
// ─────────────────────────────────────────
const verifyToken = async (req, res) => {
  try {
    const tokenStr = req.headers.authorization?.split(' ')[1];
    const record   = await Token.findOne({ token: tokenStr });

    if (!record || new Date() > record.expiresAt)
      return res.status(401).json({ message: 'Unauthorized' });

    res.json({ valid: true, userId: record.userId });
  } catch (err) {
    res.status(500).json({ error: 'Token verification failed' });
  }
};

// ─────────────────────────────────────────
// POST /logout – Terminate session and drop verification assets
// ─────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const tokenStr = req.headers.authorization?.split(' ')[1];
    if (tokenStr) await Token.deleteOne({ token: tokenStr });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

module.exports = { register, verifyOtp, resendOtp, login, verifyToken, logout };