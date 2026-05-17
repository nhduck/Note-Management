const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const User = require('../models/User');

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
        const existing = note.sharedWith.find(s => s.userId.toString() === targetUser._id.toString());
        if (existing) {
            existing.permission = permission;
        } else {
            note.sharedWith.push({ userId: targetUser._id, email: targetUser.email, permission });
        }
        await note.save();
        const io = req.app.get('io');
        const sharePayload = { noteId: note._id.toString() };
        io.to(`user:${targetUser._id.toString()}`).emit('note-shared', sharePayload);
        io.to(`user:${requesterId}`).emit('note-shared', sharePayload);
        res.json({ success: true, sharedWith: note.sharedWith });
    } catch (err) {
        res.status(500).json({ error: 'Failed to share note' });
    }
});

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
        const revokePayload = { noteId: note._id.toString() };
        io.to(`user:${removedUserId}`).emit('note-unshared', revokePayload);
        io.to(`user:${requesterId}`).emit('note-unshared', revokePayload);
        res.json({ success: true, sharedWith: note.sharedWith });
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke access' });
    }
});

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
        const revokeAllPayload = { noteId: note._id.toString() };
        for (const s of removedUsers) {
            io.to(`user:${s.userId.toString()}`).emit('note-unshared', revokeAllPayload);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke all shares' });
    }
});

module.exports = router;
