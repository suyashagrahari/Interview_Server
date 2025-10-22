const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  startInterview,
  getUserInterviews,
  getInterviewById,
  updateInterviewStatus,
  addQuestion,
  updateAnswer,
  updateAnswerAnalysis,
  deleteInterview,
  getInterviewQuestions,
  generateInterviewQuestions,
  testChatGPTConnection,
  generateFirstQuestion,
  submitAnswer,
  endInterview,
  testing,
  checkActiveInterview,
  resumeInterview,
  getExpectedAnswer,
} = require("../controllers/interviewController");
const {
  validateStartInterview,
  validateUpdateStatus,
  validateAddQuestion,
  validateUpdateAnswer,
  validateAnswerAnalysis,
  validateGenerateFirstQuestion,
  validateSubmitAnswer,
} = require("../middleware/interviewValidation");

const router = express.Router();

/**
 * ============================================
 * RESUME-BASED INTERVIEW ROUTES
 * ============================================
 * All routes for resume-based interviews
 * Base path: /api/resume-based-interview
 */

/**
 * @route   POST /api/resume-based-interview/start
 * @desc    Start a new resume-based interview session
 * @access  Private
 */
router.post(
  "/start",
  authenticateToken,
  validateStartInterview,
  startInterview
);

/**
 * @route   GET /api/resume-based-interview
 * @desc    Get all resume-based interviews for authenticated user
 * @access  Private
 */
router.get("/", authenticateToken, getUserInterviews);

/**
 * @route   GET /api/resume-based-interview/check-active
 * @desc    Check for active/incomplete resume-based interview (cross-device support)
 * @access  Private
 * @note    Using check-active instead of active to avoid route conflicts
 */
router.get("/check-active", authenticateToken, checkActiveInterview);

/**
 * @route   GET /api/resume-based-interview/resume/:id
 * @desc    Resume a resume-based interview from any device
 * @access  Private
 * @note    Changed from /:id/resume to resume/:id to avoid conflicts
 */
router.get("/resume/:id", authenticateToken, resumeInterview);

/**
 * @route   GET /api/resume-based-interview/test-chatgpt
 * @desc    Test ChatGPT API connection
 * @access  Private
 */
router.get("/test-chatgpt", authenticateToken, testChatGPTConnection);

/**
 * @route   GET /api/resume-based-interview/:id/questions/:questionId/hint
 * @desc    Get expected answer (hint) for a specific question
 * @access  Private
 * @note    Must come before /:id route to avoid conflicts
 */
router.get(
  "/:id/questions/:questionId/hint",
  authenticateToken,
  getExpectedAnswer
);

/**
 * @route   GET /api/resume-based-interview/:id
 * @desc    Get specific resume-based interview by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, getInterviewById);

/**
 * @route   PUT /api/resume-based-interview/:id/status
 * @desc    Update resume-based interview status
 * @access  Private
 */
router.put(
  "/:id/status",
  authenticateToken,
  validateUpdateStatus,
  updateInterviewStatus
);

/**
 * @route   POST /api/resume-based-interview/:id/questions
 * @desc    Add question to resume-based interview
 * @access  Private
 */
router.post(
  "/:id/questions",
  authenticateToken,
  validateAddQuestion,
  addQuestion
);

/**
 * @route   POST /api/resume-based-interview/test
 * @desc    Test endpoint for development
 * @access  Public
 */
router.post("/test", testing);

/**
 * @route   PUT /api/resume-based-interview/:id/questions/:questionId/answer
 * @desc    Update answer for a question in resume-based interview
 * @access  Private
 */
router.put(
  "/:id/questions/:questionId/answer",
  authenticateToken,
  validateUpdateAnswer,
  updateAnswer
);

/**
 * @route   PUT /api/resume-based-interview/:id/questions/:questionId/analysis
 * @desc    Update answer analysis for resume-based interview
 * @access  Private
 */
router.put(
  "/:id/questions/:questionId/analysis",
  authenticateToken,
  validateAnswerAnalysis,
  updateAnswerAnalysis
);

/**
 * @route   DELETE /api/resume-based-interview/:id
 * @desc    Delete resume-based interview
 * @access  Private
 */
router.delete("/:id", authenticateToken, deleteInterview);

/**
 * @route   POST /api/resume-based-interview/:id/generate-first-question
 * @desc    Generate first question (introduction) for resume-based interview
 * @access  Private
 */
router.post(
  "/:id/generate-first-question",
  authenticateToken,
  validateGenerateFirstQuestion,
  generateFirstQuestion
);

/**
 * @route   GET /api/resume-based-interview/:id/questions
 * @desc    Get questions for a resume-based interview
 * @access  Private
 */
router.get("/:id/questions", authenticateToken, getInterviewQuestions);

/**
 * @route   POST /api/resume-based-interview/:id/generate-questions
 * @desc    Generate questions for a resume-based interview
 * @access  Private
 */
router.post(
  "/:id/generate-questions",
  authenticateToken,
  generateInterviewQuestions
);

/**
 * @route   POST /api/resume-based-interview/:id/questions/:questionId/submit-answer
 * @desc    Submit answer and get analysis + next question for resume-based interview
 * @access  Private
 */
router.post(
  "/:id/questions/:questionId/submit-answer",
  authenticateToken,
  validateSubmitAnswer,
  submitAnswer
);

/**
 * @route   POST /api/resume-based-interview/:id/end
 * @desc    End resume-based interview and mark as completed
 * @access  Private
 */
router.post("/:id/end", authenticateToken, endInterview);

module.exports = router;
