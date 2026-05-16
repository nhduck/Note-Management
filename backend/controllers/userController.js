const bcrypt = require('bcryptjs');

const User  = require('../models/User');
const Note  = require('../models/Note');
const Label = require('../models/Label');
const Token = require('../models/Token');

// ─────────────────────────────────────────
// Helper: Extract userId compatible with both architectures
// req.user._id (assigned object via middleware) or req.userId
// ─────────────────────────────────────────
const getUserId = (req) => req.user?._id || req.user?.id || req.userId;

// ─────────────────────────────────────────
// PATCH /users/:id/avatar – Update Avatar Image URL
// ─────────────────────────────────────────
const updateAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatarUrl },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User does not exist' });

    res.json({ success: true, avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar image' });
  }
};

// ─────────────────────────────────────────
// PUT /me/profile – Update Profile Display Name
// ─────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = getUserId(req);

    // Validate incoming display name strings
    if (!username || username.trim() === '')
      return res.status(400).json({ message: 'Display name cannot be empty.' });

    // Ensure the chosen name isn't already claimed (ignoring current user instance)
    const existingUser = await User.findOne({
      username: username.trim(),
      _id: { $ne: userId },
    });
    if (existingUser)
      return res.status(400).json({ message: 'This display name is already taken.' });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username: username.trim() },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile information updated successfully!',
      user: { id: updatedUser._id, username: updatedUser.username },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile information.' });
  }
};

// ─────────────────────────────────────────
// PUT /me/change-password – Internal Authenticated Password Rotation
// ─────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = getUserId(req);

    // Baseline validation rules
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Please fill out all required fields.' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User does not exist.' });

    // Verify existing password signature matches database record
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Incorrect current password.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
};

// ─────────────────────────────────────────
// DELETE /me/delete-account – Permanent Account Discard
// Cascade drops all interrelated document footprints (tokens, notes, labels)
// ─────────────────────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const { confirmText } = req.body;
    const userId = getUserId(req);

    // Enforce string matching checks to safe-guard against destructive misclicks
    if (confirmText !== 'CONFIRM')
      return res.status(400).json({ message: 'Confirmation text does not match.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User does not exist.' });

    // Cascade drop all dependencies coupled to user account references
    await Token.deleteMany({ userId });
    await Note.deleteMany({ userId });
    await Label.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account.' });
  }
};

module.exports = { updateAvatar, updateProfile, changePassword, deleteAccount };