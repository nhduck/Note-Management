const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Note = require('../models/Note');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/notes/shared — Must be declared BEFORE /:id routes
router.get('/shared', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        const notes = await Note.find({ 'sharedWith.userId': userId })
            .populate('labels', 'name')
            .populate('userId', 'username avatarUrl')
            .sort({ updatedAt: -1 });

        res.json({ notes });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shared notes' });
    }
});

// Fetch collection list
router.get('/', async (req, res) => {
    try {
        const { userId, labelId } = req.query;
        if (!userId) return res.status(400).json({ error: 'Missing userId' });

        const filter = { userId };
        if (labelId) filter.labels = labelId;

        const notes = await Note.find(filter)
            .populate('labels', 'name')
            .sort({ isPinned: -1, pinnedAt: -1, updatedAt: -1 });
        res.json({ notes });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Save / create a note instance
router.post('/save', async (req, res) => {
    try {
        const { noteId, title, content, images, userId, labels, color } = req.body;
        const io = req.app.get('io');

        let note;
        if (noteId) {
            // Fetch existing note first to verify ownership/permission
            note = await Note.findById(noteId);
            if (!note) return res.status(404).json({ error: 'Note not found' });

            const isOwner = note.userId.toString() === userId;
            const sharedEntry = note.sharedWith?.find(s => s.userId.toString() === userId);
            const canEdit = isOwner || sharedEntry?.permission === 'edit';

            if (!canEdit) {
                return res.status(403).json({ error: 'No edit permission' });
            }

            // Only update content fields — never overwrite userId (ownership)
            const updateData = {
                title,
                content: content || '',
                images: images || [],
                labels: labels || [],
                ...(color !== undefined && { color }),
            };
            note = await Note.findByIdAndUpdate(noteId, updateData, { new: true })
                             .populate('labels', 'name');

            // ── Real-time broadcast to all viewers of this note ──
            // Emit to everyone in the room EXCEPT the sender
            io.to(`note:${noteId}`).emit('note-updated', {
                noteId,
                title:   note.title,
                content: note.content,
                images:  note.images,
                labels:  note.labels,
                color:   note.color,
                updatedAt: note.updatedAt,
                updatedBy: userId,
            });
        } else {
            // Create new note — userId is the creator
            const data = {
                title,
                content: content || '',
                images: images || [],
                userId,
                labels: labels || [],
                ...(color !== undefined && { color }),
            };
            note = await Note.create(data);
        }

        res.json({ success: true, note });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// Delete a note document
router.delete('/:id', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Pin / unpin status mutation toggles
router.patch('/:id/pin', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });

        note.isPinned = !note.isPinned;
        note.pinnedAt = note.isPinned ? new Date() : null;
        await note.save();
        res.json({ success: true, isPinned: note.isPinned, pinnedAt: note.pinnedAt });
    } catch (err) {
        res.status(500).json({ error: 'Failed to pin note' });
    }
});

// Attach / detach tag label components
router.patch('/:id/labels', async (req, res) => {
    try {
        const { labelId, action } = req.body;
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });

        const lid = new mongoose.Types.ObjectId(labelId);
        if (action === 'attach') {
            if (!note.labels.some(l => l.equals(lid))) note.labels.push(lid);
        } else {
            note.labels = note.labels.filter(l => !l.equals(lid));
        }
        await note.save();
        const updated = await Note.findById(note._id).populate('labels', 'name');
        res.json({ success: true, labels: updated.labels });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update label' });
    }
});

// PATCH /api/notes/:id/password — enable/disable/change note restriction passcode
router.patch('/:id/password', async (req, res) => {
    try {
        const { action, currentPassword } = req.body;
        const password = req.body.password ?? req.body.newPassword;
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });

        if (action === 'enable') {
            note.password = await bcrypt.hash(password, 10);
        } else if (action === 'disable') {
            const isMatch = await bcrypt.compare(currentPassword, note.password);
            if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });
            note.password = null;
        } else if (action === 'change') {
            if (!note.password) {
                return res.status(400).json({ error: 'Note does not have a password set' });
            }
            const isMatch = await bcrypt.compare(currentPassword, note.password);
            if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });
            note.password = await bcrypt.hash(password, 10);
        }

        await note.save();
        res.json({ success: true, hasPassword: !!note.password });
    } catch (err) {
        console.error('Password route error:', err);
        res.status(500).json({ error: 'Error updating password configuration' });
    }
});

// ── SHARING ROUTES ────────────────────────────────────────

router.patch('/:id/share', async (req, res) => {
    try {
        const { email, permission, requesterId } = req.body;
        if (!email || !permission || !requesterId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (note.userId.toString() !== requesterId) {
            return res.status(403).json({ error: 'Only the owner can share this note' });
        }

        const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (!targetUser) return res.status(404).json({ error: 'No account found with this email' });
        if (targetUser._id.toString() === requesterId) {
            return res.status(400).json({ error: 'You cannot share a note with yourself' });
        }

        const existing = note.sharedWith.find(s => s.userId.toString() === targetUser._id.toString());
        if (existing) {
            existing.permission = permission;
        } else {
            note.sharedWith.push({ userId: targetUser._id, email: targetUser.email, permission });
        }

        await note.save();
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
        if (note.userId.toString() !== requesterId) {
            return res.status(403).json({ error: 'Only the owner can change permissions' });
        }

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
        if (note.userId.toString() !== requesterId) {
            return res.status(403).json({ error: 'Only the owner can revoke access' });
        }

        note.sharedWith = note.sharedWith.filter(
            s => s.userId.toString() !== req.params.targetUserId
        );
        await note.save();
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
        if (note.userId.toString() !== requesterId) {
            return res.status(403).json({ error: 'Only the owner can revoke all access' });
        }

        note.sharedWith = [];
        await note.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke all shares' });
    }
});

module.exports = router;
