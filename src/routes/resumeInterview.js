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
} = require("../controllers/resumeControllers/resumeInterviewController");
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
 * RESUME INTERVIEW ROUTES
 * ============================================
 * All routes for resume interviews
 * Base path: /api/resume-interview
 */

/**
 * @route   POST /api/resume-interview/start
 * @desc    Start a new resume interview session
 * @access  Private
 */
router.post(
  "/start",
  authenticateToken,
  validateStartInterview,
  startInterview
);

/**
 * @route   GET /api/resume-interview
 * @desc    Get all resume interviews for authenticated user
 * @access  Private
 */
router.get("/", authenticateToken, getUserInterviews);

/**
 * @route   GET /api/resume-interview/check-active
 * @desc    Check for active/incomplete resume interview (cross-device support)
 * @access  Private
 * @note    Using check-active instead of active to avoid route conflicts
 */
router.get("/check-active", authenticateToken, checkActiveInterview);

/**
 * @route   GET /api/resume-interview/resume/:id
 * @desc    Resume a resume interview from any device
 * @access  Private
 * @note    Changed from /:id/resume to resume/:id to avoid conflicts
 */
router.get("/resume/:id", authenticateToken, resumeInterview);

/**
 * @route   GET /api/resume-interview/test-chatgpt
 * @desc    Test ChatGPT API connection
 * @access  Private
 */
router.get("/test-chatgpt", authenticateToken, testChatGPTConnection);

/**
 * @route   GET /api/resume-interview/:id/questions/:questionId/hint
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
 * @route   GET /api/resume-interview/:id
 * @desc    Get specific resume interview by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, getInterviewById);

/**
 * @route   PUT /api/resume-interview/:id/status
 * @desc    Update resume interview status
 * @access  Private
 */
router.put(
  "/:id/status",
  authenticateToken,
  validateUpdateStatus,
  updateInterviewStatus
);

/**
 * @route   POST /api/resume-interview/:id/questions
 * @desc    Add question to resume interview
 * @access  Private
 */
router.post(
  "/:id/questions",
  authenticateToken,
  validateAddQuestion,
  addQuestion
);

/**
 * @route   POST /api/resume-interview/test
 * @desc    Test endpoint for development
 * @access  Public
 */
router.post("/test", testing);

/**
 * @route   PUT /api/resume-interview/:id/questions/:questionId/answer
 * @desc    Update answer for a question in resume interview
 * @access  Private
 */
router.put(
  "/:id/questions/:questionId/answer",
  authenticateToken,
  validateUpdateAnswer,
  updateAnswer
);

/**
 * @route   PUT /api/resume-interview/:id/questions/:questionId/analysis
 * @desc    Update answer analysis for resume interview
 * @access  Private
 */
router.put(
  "/:id/questions/:questionId/analysis",
  authenticateToken,
  validateAnswerAnalysis,
  updateAnswerAnalysis
);

/**
 * @route   DELETE /api/resume-interview/:id
 * @desc    Delete resume interview
 * @access  Private
 */
router.delete("/:id", authenticateToken, deleteInterview);

/**
 * @route   POST /api/resume-interview/:id/generate-first-question
 * @desc    Generate first question (introduction) for resume interview
 * @access  Private
 */
router.post(
  "/:id/generate-first-question",
  authenticateToken,
  validateGenerateFirstQuestion,
  generateFirstQuestion
);

/**
 * @route   GET /api/resume-interview/:id/questions
 * @desc    Get questions for a resume interview
 * @access  Private
 */
router.get("/:id/questions", authenticateToken, getInterviewQuestions);

/**
 * @route   POST /api/resume-interview/:id/generate-questions
 * @desc    Generate questions for a resume interview
 * @access  Private
 */
router.post(
  "/:id/generate-questions",
  authenticateToken,
  generateInterviewQuestions
);

/**
 * @route   POST /api/resume-interview/:id/questions/:questionId/submit-answer
 * @desc    Submit answer and get analysis + next question for resume interview
 * @access  Private
 */
router.post(
  "/:id/questions/:questionId/submit-answer",
  authenticateToken,
  validateSubmitAnswer,
  submitAnswer
);

/**
 * @route   POST /api/resume-interview/:id/end
 * @desc    End resume interview and mark as completed
 * @access  Private
 */
router.post("/:id/end", authenticateToken, endInterview);

module.exports = router;
