const Token = require('../models/Token');

const authMiddleware = async (req, res, next) => {
    try {
        const tokenStr = req.headers.authorization?.split(' ')[1];
        if (!tokenStr) return res.status(401).json({ message: 'Chưa đăng nhập' });

        const record = await Token.findOne({ token: tokenStr });
        if (!record || new Date() > record.expiresAt)
            return res.status(401).json({ message: 'Phiên đăng nhập hết hạn' });

        req.userId = record.userId;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Lỗi xác thực' });
    }
};

module.exports = authMiddleware;