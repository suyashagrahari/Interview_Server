// Shared dependencies for all resume interview controller functions
const ResumeInterview = require("../../../models/ResumeInterview");
const Resume = require("../../../models/Resume");
const User = require("../../../models/User");
const logger = require("../../../utils/logger");

// Use resume-specific services for better organization and clarity
const InterviewService = require("../../../services/resumeServices/resumeInterviewService");
const QuestionGenerationService = require("../../../services/resumeServices/resumeQuestionGenerationService");
const QuestionManagementService = require("../../../services/resumeServices/resumeQuestionManagementService");
const AnalysisService = require("../../../services/resumeServices/resumeAnalysisService");
const chatGPTService = require("../../../services/chatgptService");
const {
  validateInterviewRequest,
  validateAnswerSubmission,
  validateQuestionAddition,
  validateStatusUpdate,
  validatePaginationParams,
} = require("../../../utils/validation");
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
} = require("../../../utils/responseHelpers");

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

