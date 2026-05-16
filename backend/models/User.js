const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username:  { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    avatarUrl: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);