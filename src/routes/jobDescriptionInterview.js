const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  startInterview,
  getUserInterviews,
  getInterviewById,
  checkActiveInterview,
  endInterview,
} = require("../controllers/jobDescriptionControllers/jobDescriptionInterviewController");
const {
  validateStartJobDescriptionInterview,
} = require("../middleware/interviewValidation");

const router = express.Router();

/**
 * ============================================
 * JOB DESCRIPTION INTERVIEW ROUTES
 * ============================================
 * All routes for job description interviews
 * Base path: /api/job-description-interview
 */

/**
 * @route   POST /api/job-description-interview/start
 * @desc    Start a new job description interview session
 * @access  Private
 */
router.post(
  "/start",
  authenticateToken,
  validateStartJobDescriptionInterview,
  startInterview
);

/**
 * @route   GET /api/job-description-interview
 * @desc    Get all job description interviews for authenticated user
 * @access  Private
 */
router.get("/", authenticateToken, getUserInterviews);

/**
 * @route   GET /api/job-description-interview/check-active
 * @desc    Check for active/incomplete job description interview
 * @access  Private
 */
router.get("/check-active", authenticateToken, checkActiveInterview);

/**
 * @route   GET /api/job-description-interview/:id
 * @desc    Get specific job description interview by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, getInterviewById);

/**
 * @route   POST /api/job-description-interview/:id/end
 * @desc    End job description interview and mark as completed
 * @access  Private
 */
router.post("/:id/end", authenticateToken, endInterview);

module.exports = router;
