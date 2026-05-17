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

            // ── Real-time broadcast ──
            const updatePayload = {
                noteId,
                title:     note.title,
                content:   note.content,
                images:    note.images,
                labels:    note.labels,
                color:     note.color,
                updatedAt: note.updatedAt,
                updatedBy: userId,
            };

            // 1. Emit to the note room (users with the editor open)
            io.to(`note:${noteId}`).emit('note-updated', updatePayload);

            // 2. Emit to each collaborator's personal user room so their
            //    note list on the home page refreshes without a page reload.
            const ownerId = note.userId.toString();
            io.to(`user:${ownerId}`).emit('note-updated', updatePayload);
            for (const s of note.sharedWith || []) {
                io.to(`user:${s.userId.toString()}`).emit('note-updated', updatePayload);
            }
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

            // ── Real-time broadcast: notify the owner's home page ──
            // The owner's note list must refresh so the new card appears instantly
            io.to(`user:${userId}`).emit('note-created', {
                noteId: note._id.toString(),
                note,
            });
        }

        res.json({ success: true, note });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// Delete a note document
router.delete('/:id', async (req, res) => {
    try {
        const io = req.app.get('io');
        const noteId = req.params.id;

        // Fetch note before deletion so we know who to notify
        const note = await Note.findById(noteId);
        if (note) {
            const deletePayload = { noteId };
            // Notify the owner
            io.to(`user:${note.userId.toString()}`).emit('note-deleted', deletePayload);
            // Notify every collaborator so their "Shared with me" list updates
            for (const s of note.sharedWith || []) {
                io.to(`user:${s.userId.toString()}`).emit('note-deleted', deletePayload);
            }
        }

        await Note.findByIdAndDelete(noteId);
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

        // ── Real-time broadcast ──
        // Notify the newly added collaborator so their "Shared with me" appears instantly
        const io = req.app.get('io');
        const sharePayload = { noteId: note._id.toString() };
        io.to(`user:${targetUser._id.toString()}`).emit('note-shared', sharePayload);
        // Refresh the owner's list too (permission badge update)
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

        const removedUserId = req.params.targetUserId;
        note.sharedWith = note.sharedWith.filter(
            s => s.userId.toString() !== removedUserId
        );
        await note.save();

        // ── Real-time broadcast ──
        const io = req.app.get('io');
        const revokePayload = { noteId: note._id.toString() };
        // Tell the removed user their shared note is gone
        io.to(`user:${removedUserId}`).emit('note-unshared', revokePayload);
        // Refresh owner's list
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
        if (note.userId.toString() !== requesterId) {
            return res.status(403).json({ error: 'Only the owner can revoke all access' });
        }

        const removedUsers = [...note.sharedWith];
        note.sharedWith = [];
        await note.save();

        // ── Real-time broadcast ──
        const io = req.app.get('io');
        const revokeAllPayload = { noteId: note._id.toString() };
        // Notify every former collaborator
        for (const s of removedUsers) {
            io.to(`user:${s.userId.toString()}`).emit('note-unshared', revokeAllPayload);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke all shares' });
    }
});

module.exports = router;
