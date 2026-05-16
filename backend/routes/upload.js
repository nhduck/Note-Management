const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');

router.post('/', (req, res) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(500).json({ error: 'Upload error: ' + err.message });
        }
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'No files were uploaded' });
        try {
            const urls = req.files.map(f => f.path);
            res.json({ success: true, urls });
        } catch (e) {
            res.status(500).json({ error: 'Upload failed: ' + e.message });
        }
    });
});

module.exports = router;