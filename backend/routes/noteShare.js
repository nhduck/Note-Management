const express = require('express');
const router  = express.Router();
const Note    = require('../models/Note');
const User    = require('../models/User');
const transporter = require('../config/mailer');

// ── Helper: gửi email thông báo được share note ──────────
async function sendShareNotification({ toEmail, toName, ownerName, noteTitle, permission }) {
  const permLabel = permission === 'edit' ? 'chỉnh sửa' : 'xem';
  const mailOptions = {
    from: `"NoteSpace" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${ownerName} đã chia sẻ một ghi chú với bạn`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#5147d4;margin-bottom:8px">📒 NoteSpace</h2>
        <p style="font-size:16px;color:#0f172a">Xin chào <strong>${toName || toEmail}</strong>,</p>
        <p style="color:#334155">
          <strong>${ownerName}</strong> vừa chia sẻ ghi chú
          <strong>"${noteTitle || 'Untitled'}"</strong> với bạn.
        </p>
        <div style="background:#f1f5f9;border-left:4px solid #5147d4;padding:12px 16px;border-radius:6px;margin:20px 0">
          <span style="color:#5147d4;font-weight:600">Quyền của bạn: ${permLabel}</span>
        </div>
        <p style="color:#64748b;font-size:13px">Đăng nhập vào NoteSpace để xem ghi chú được chia sẻ.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:12px">Email này được gửi tự động từ NoteSpace. Vui lòng không trả lời.</p>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[Mail] Failed to send share notification:', err.message);
  }
}

// PATCH /:id/share — Chia sẻ note với người dùng khác
router.patch('/:id/share', async (req, res) => {
  try {
    const { email, permission, requesterId } = req.body;
    if (!email || !permission || !requesterId)
      return res.status(400).json({ error: 'Missing required fields' });

    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId.toString() !== requesterId)
      return res.status(403).json({ error: 'Only the owner can share this note' });

    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) return res.status(404).json({ error: 'No account found with this email' });
    if (targetUser._id.toString() === requesterId)
      return res.status(400).json({ error: 'You cannot share a note with yourself' });

    const owner = await User.findById(requesterId).select('username email');

    const isNew = !note.sharedWith.find(s => s.userId.toString() === targetUser._id.toString());
    const existing = note.sharedWith.find(s => s.userId.toString() === targetUser._id.toString());
    if (existing) {
      existing.permission = permission;
    } else {
      note.sharedWith.push({ userId: targetUser._id, email: targetUser.email, permission });
    }
    await note.save();

    // Socket broadcast
    const io = req.app.get('io');
    const sharePayload = { noteId: note._id.toString() };
    io.to(`user:${targetUser._id.toString()}`).emit('note-shared', sharePayload);
    io.to(`user:${requesterId}`).emit('note-shared', sharePayload);

    // Gửi email thông báo (chỉ khi share mới, không gửi khi đổi quyền)
    if (isNew) {
      sendShareNotification({
        toEmail:    targetUser.email,
        toName:     targetUser.username,
        ownerName:  owner?.username || 'Ai đó',
        noteTitle:  note.title,
        permission,
      });
    }

    res.json({ success: true, sharedWith: note.sharedWith });
  } catch (err) {
    res.status(500).json({ error: 'Failed to share note' });
  }
});

// PATCH /:id/share/permission — Đổi quyền
router.patch('/:id/share/permission', async (req, res) => {
  try {
    const { targetUserId, permission, requesterId } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId.toString() !== requesterId)
      return res.status(403).json({ error: 'Only the owner can change permissions' });
    const entry = note.sharedWith.find(s => s.userId.toString() === targetUserId);
    if (!entry) return res.status(404).json({ error: 'Share entry not found' });
    entry.permission = permission;
    await note.save();
    res.json({ success: true, sharedWith: note.sharedWith });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// DELETE /:id/share/:targetUserId — Thu hồi quyền 1 người
router.delete('/:id/share/:targetUserId', async (req, res) => {
  try {
    const { requesterId } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId.toString() !== requesterId)
      return res.status(403).json({ error: 'Only the owner can revoke access' });

    const removedUserId = req.params.targetUserId;
    note.sharedWith = note.sharedWith.filter(s => s.userId.toString() !== removedUserId);
    await note.save();

    const io = req.app.get('io');
    io.to(`user:${removedUserId}`).emit('note-unshared', { noteId: note._id.toString() });
    io.to(`user:${requesterId}`).emit('note-unshared', { noteId: note._id.toString() });

    res.json({ success: true, sharedWith: note.sharedWith });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

// DELETE /:id/share — Thu hồi tất cả
router.delete('/:id/share', async (req, res) => {
  try {
    const { requesterId } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId.toString() !== requesterId)
      return res.status(403).json({ error: 'Only the owner can revoke all access' });

    const removedUsers = [...note.sharedWith];
    note.sharedWith = [];
    await note.save();

    const io = req.app.get('io');
    for (const s of removedUsers) {
      io.to(`user:${s.userId.toString()}`).emit('note-unshared', { noteId: note._id.toString() });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke all shares' });
  }
});

module.exports = router;
