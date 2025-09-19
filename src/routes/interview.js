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

// Routes

/**
 * @route   POST /api/interview/start
 * @desc    Start a new interview session
 * @access  Private
 */
router.post(
  "/start",
  authenticateToken,
  validateStartInterview,
  startInterview
);

/**
 * @route   GET /api/interview
 * @desc    Get all interviews for authenticated user
 * @access  Private
 */
router.get("/", authenticateToken, getUserInterviews);

/**
 * @route   GET /api/interview/:id
 * @desc    Get specific interview by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, getInterviewById);

/**
 * @route   PUT /api/interview/:id/status
 * @desc    Update interview status
 * @access  Private
 */
router.put(
  "/:id/status",
  authenticateToken,
  validateUpdateStatus,
  updateInterviewStatus
);

/**
 * @route   POST /api/interview/:id/questions
 * @desc    Add question to interview
 * @access  Private
 */
router.post(
  "/:id/questions",
  authenticateToken,
  validateAddQuestion,
  addQuestion
);

router.post("/test", testing);

/**
 * @route   PUT /api/interview/:id/questions/:questionId/answer
 * @desc    Update answer for a question
 * @access  Private
 */
router.put(
  "/:id/questions/:questionId/answer",
  authenticateToken,
  validateUpdateAnswer,
  updateAnswer
);

/**
 * @route   PUT /api/interview/:id/questions/:questionId/analysis
 * @desc    Update answer analysis
 * @access  Private
 */
router.put(
  "/:id/questions/:questionId/analysis",
  authenticateToken,
  validateAnswerAnalysis,
  updateAnswerAnalysis
);

/**
 * @route   DELETE /api/interview/:id
 * @desc    Delete interview
 * @access  Private
 */
router.delete("/:id", authenticateToken, deleteInterview);

/**
 * @route   GET /api/interview/test-chatgpt
 * @desc    Test ChatGPT API connection
 * @access  Private
 */
router.get("/test-chatgpt", authenticateToken, testChatGPTConnection);

/**
 * @route   POST /api/interview/:id/generate-first-question
 * @desc    Generate first question (introduction) for interview
 * @access  Private
 */
router.post(
  "/:id/generate-first-question",
  authenticateToken,
  validateGenerateFirstQuestion,
  generateFirstQuestion
);

/**
 * @route   GET /api/interview/:id/questions
 * @desc    Get questions for an interview
 * @access  Private
 */
router.get("/:id/questions", authenticateToken, getInterviewQuestions);

/**
 * @route   POST /api/interview/:id/generate-questions
 * @desc    Generate questions for an interview
 * @access  Private
 */
router.post(
  "/:id/generate-questions",
  authenticateToken,
  generateInterviewQuestions
);

/**
 * @route   POST /api/interview/:id/questions/:questionId/submit-answer
 * @desc    Submit answer and get analysis + next question
 * @access  Private
 */
router.post(
  "/:id/questions/:questionId/submit-answer",
  authenticateToken,
  validateSubmitAnswer,
  submitAnswer
);

/**
 * @route   POST /api/interview/:id/end
 * @desc    End interview and mark as completed
 * @access  Private
 */
router.post("/:id/end", authenticateToken, endInterview);

module.exports = router;
