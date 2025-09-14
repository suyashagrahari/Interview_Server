const express = require("express");
const {
  signup,
  signin,
  googleAuth,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
  logoutAll,
} = require("../controllers/authController");
const {
  validateSignup,
  validateSignin,
  validateGoogleAuth,
} = require("../middleware/validation");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.post("/signup", validateSignup, signup);
router.post("/signin", validateSignin, signin);
router.post("/google", validateGoogleAuth, googleAuth);
router.post("/refresh", refreshToken);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.post("/logout", authenticateToken, logout);
router.post("/logout-all", authenticateToken, logoutAll);

module.exports = router;
