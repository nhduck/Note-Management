const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');

router.post('/', (req, res) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(500).json({ error: 'Lỗi upload: ' + err.message });
        }
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'Không có file nào được gửi lên' });
        try {
            const urls = req.files.map(f => f.path);
            res.json({ success: true, urls });
        } catch (e) {
            res.status(500).json({ error: 'Upload thất bại: ' + e.message });
        }
    });
});

module.exports = router;