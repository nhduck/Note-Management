// middlewares/auth.js
const Token = require('../models/Token');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];

        if (!tokenStr) {
            return res.status(401).json({ message: 'Không có token xác thực.' });
        }

        const record = await Token.findOne({ token: tokenStr });

        if (!record) {
            return res.status(401).json({ message: 'Token không hợp lệ.' });
        }

        if (new Date() > record.expiresAt) {
            await Token.deleteOne({ token: tokenStr });
            return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
        }

        const user = await User.findById(record.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Người dùng không tồn tại.' });
        }

        req.user = user;
        req.userId = user._id;

        next();
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xác thực middleware.' });
    }
};

module.exports = authMiddleware;