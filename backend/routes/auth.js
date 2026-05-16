const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middlewares/auth');

// Import modularized control handlers
const { register, verifyOtp, resendOtp, login, verifyToken, logout } =
  require('../controllers/authController');
const { forgotPassword, resetPassword } =
  require('../controllers/passwordController');
const { updateAvatar, updateProfile, changePassword, deleteAccount } =
  require('../controllers/userController');

// ─────────────────────────────────────────
// Auth routes (Public - No session required)
// ─────────────────────────────────────────
router.post('/register',        register);
router.post('/verify-otp',      verifyOtp);
router.post('/resend-otp',      resendOtp);
router.post('/login',           login);
router.get('/verify-token',     verifyToken);
router.post('/logout',          logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

// ─────────────────────────────────────────
// User routes (Protected - Requires active session)
// ─────────────────────────────────────────
router.patch('/users/:id/avatar',    authMiddleware, updateAvatar);
router.put('/me/profile',            authMiddleware, updateProfile);
router.put('/me/change-password',    authMiddleware, changePassword);
router.delete('/me/delete-account',  authMiddleware, deleteAccount);

module.exports = router;