const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');
const Token = require('../models/Token');
const transporter = require('../config/mailer');
const authMiddleware = require('../middlewares/auth');

// Đăng ký
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(400).json({ message: 'Username hoặc Email đã tồn tại!' });

        const hashed = await bcrypt.hash(password, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        await User.create({ username, password: hashed, email, verificationToken: otpCode });

        transporter.sendMail({
            from: `"NoteSpace" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã xác nhận tài khoản của bạn',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
                    <h2>Xác nhận tài khoản NoteSpace</h2>
                    <p>Chào ${username}, mã xác nhận của bạn là:</p>
                    <h1 style="color: #4CAF50; letter-spacing: 5px;">${otpCode}</h1>
                    <p>Mã này dùng để kích hoạt tài khoản của bạn. Vui lòng không chia sẻ cho bất kỳ ai.</p>
                </div>`
        });

        res.status(201).json({ success: true, message: 'Mã xác nhận đã được gửi vào Email!' });
    } catch (err) {
        res.status(500).json({ error: 'Đăng ký thất bại' });
    }
});

// Xác thực OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, type } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'Email không tồn tại.' });

        if (type === 'reset') {
            if (user.resetPasswordToken !== otp) return res.status(400).json({ message: 'Mã xác nhận không đúng.' });
            if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) return res.status(400).json({ message: 'Mã đã hết hạn. Vui lòng yêu cầu lại.' });
            return res.json({ success: true, message: 'Xác thực thành công!' });
        } else {
            if (user.verificationToken !== otp) return res.status(400).json({ message: 'Mã xác nhận không đúng hoặc đã hết hạn.' });
            user.isVerified = true;
            user.verificationToken = undefined;
            await user.save();
            return res.json({ success: true, message: 'Xác thực tài khoản thành công!' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Lỗi hệ thống khi xác thực' });
    }
});

// Gửi lại OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'Không tìm thấy email.' });

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationToken = newOtp;
        await user.save();

        await transporter.sendMail({
            from: `"NoteSpace" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Gửi lại mã xác nhận',
            html: `<h1>${newOtp}</h1>` // Rút gọn HTML trong ví dụ, bạn có thể giữ nguyên bản gốc
        });

        res.json({ success: true, message: 'Mã mới đã được gửi!' });
    } catch (err) {
        res.status(500).json({ error: 'Không thể gửi lại mã' });
    }
});

// Đăng nhập
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password)))
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Tài khoản chưa được xác thực!', unverified: true });
        }

        const token = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await Token.create({ userId: user._id, token, expiresAt });

        res.json({ success: true, token, user: { id: user._id, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: 'Đăng nhập thất bại' });
    }
});

// Verify token
router.get('/verify-token', async (req, res) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];
        const record   = await Token.findOne({ token: tokenStr });
        if (!record || new Date() > record.expiresAt)
            return res.status(401).json({ message: 'Unauthorized' });
        res.json({ valid: true, userId: record.userId });
    } catch (err) {
        res.status(500).json({ error: 'Token verification failed' });
    }
});

// Quên mật khẩu
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'Email này chưa được đăng ký!' });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = otpCode;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await transporter.sendMail({
            from: `"NoteSpace" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã khôi phục mật khẩu',
            html: `<h1>${otpCode}</h1>`
        });

        res.json({ success: true, message: 'Mã đã được gửi về email của bạn.' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

// Đặt lại mật khẩu
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'Email không tồn tại.' });
        if (user.resetPasswordToken !== otp) return res.status(400).json({ message: 'Mã xác nhận không đúng.' });
        if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) return res.status(400).json({ message: 'Mã đã hết hạn.' });
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Đặt lại mật khẩu thành công!' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi hệ thống khi đặt lại mật khẩu' });
    }
});

// Đăng xuất
router.post('/logout', async (req, res) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];
        if (tokenStr) await Token.deleteOne({ token: tokenStr });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Cập nhật avatar user
router.patch('/users/:id/avatar', authMiddleware, async (req, res) => {
    try {
        const { avatarUrl } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { avatarUrl }, { new: true });
        if (!user) return res.status(404).json({ error: 'User không tồn tại' });
        res.json({ success: true, avatarUrl: user.avatarUrl });
    } catch (err) {
        res.status(500).json({ error: 'Cập nhật avatar thất bại' });
    }
});

module.exports = router;