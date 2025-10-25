// Shared dependencies for all interview controller functions
const ResumeInterview = require("../../models/ResumeInterview");
const Resume = require("../../models/Resume");
const User = require("../../models/User");
const logger = require("../../utils/logger");
const InterviewService = require("../../services/interviewService");
const QuestionGenerationService = require("../../services/questionGenerationService");
const QuestionManagementService = require("../../services/questionManagementService");
const AnalysisService = require("../../services/analysisService");
const chatGPTService = require("../../services/chatgptService");
const {
  validateInterviewRequest,
  validateAnswerSubmission,
  validateQuestionAddition,
  validateStatusUpdate,
  validatePaginationParams,
} = require("../../utils/validation");
const {
  sendSuccessResponse,
  sendErrorResponse,
  sendAuthRequiredError,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalServerError,
  sendPaginatedResponse,
  sendCreatedResponse,
} = require("../../utils/responseHelpers");

module.exports = {
  ResumeInterview,
  Resume,
  User,
  logger,
  InterviewService,
  QuestionGenerationService,
  QuestionManagementService,
  AnalysisService,
  chatGPTService,
  validateInterviewRequest,
  validateAnswerSubmission,
  validateQuestionAddition,
  validateStatusUpdate,
  validatePaginationParams,
  sendSuccessResponse,
  sendErrorResponse,
  sendAuthRequiredError,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalServerError,
  sendPaginatedResponse,
  sendCreatedResponse,
};

