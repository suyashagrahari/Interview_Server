// Shared dependencies for all job description interview controller functions
const JobDescriptionInterview = require("../../../models/JobDescriptionInterview");
const JobDescription = require("../../../models/JobDescription");
const User = require("../../../models/User");
const logger = require("../../../utils/logger");
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
  JobDescriptionInterview,
  JobDescription,
  User,
  logger,
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
