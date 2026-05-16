const bcrypt = require('bcryptjs');

const User        = require('../models/User');
const transporter = require('../config/mailer');

// ─────────────────────────────────────────
// Helper: Generate a 6-digit numeric OTP
// ─────────────────────────────────────────
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─────────────────────────────────────────
// POST /forgot-password – Forgot Password Workflow
// Transmits an OTP token to user email for identity verification before reset access
// ─────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: 'This email is not registered yet!' });

    // Generate OTP token and persist to database (Expires in 10 minutes)
    const otpCode = generateOtp();
    user.resetPasswordToken   = otpCode;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await transporter.sendMail({
      from: `"NoteSpace" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Recovery Code',
      html: `<h1>${otpCode}</h1>`,
    });

    res.json({ success: true, message: 'Verification code has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: 'System error occurred' });
  }
};

// ─────────────────────────────────────────
// POST /reset-password – Update Restructured Credentials
// Validates recovery OTP token inputs before overriding with a new user password
// ─────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: 'Email does not exist.' });
    if (user.resetPasswordToken !== otp)
      return res.status(400).json({ message: 'Invalid verification code.' });
    if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires)
      return res.status(400).json({ message: 'Verification code has expired.' });
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });

    // Persist new credential hash structure and flush temporary OTP field states
    user.password             = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful!' });
  } catch (err) {
    res.status(500).json({ error: 'System error while resetting your password' });
  }
};

module.exports = { forgotPassword, resetPassword };