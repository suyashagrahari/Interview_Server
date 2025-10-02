const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  checkActiveInterview,
  resumeInterview,
} = require("../controllers/interviewController");

/**
 * @route   GET /api/interview-active/check
 * @desc    Check for active/incomplete interview (cross-device support)
 * @access  Private
 */
router.get("/check", authenticateToken, checkActiveInterview);

/**
 * @route   GET /api/interview-active/resume/:id
 * @desc    Resume an interview from any device
 * @access  Private
 */
router.get("/resume/:id", authenticateToken, resumeInterview);

module.exports = router;
