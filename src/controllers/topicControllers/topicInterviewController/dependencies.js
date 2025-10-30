/**
 * Dependencies for Topic Interview Controller
 */

const TopicInterviewService = require("../../../services/topicServices/topicInterviewService");
const Resume = require("../../../models/Resume");
const JobDescription = require("../../../models/JobDescription");
const logger = require("../../../utils/logger");
const {
  sendAuthRequiredError,
  sendValidationError,
  sendConflictError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  sendCreatedResponse,
} = require("../../../utils/responseHelpers");

module.exports = {
  TopicInterviewService,
  Resume,
  JobDescription,
  logger,
  sendAuthRequiredError,
  sendValidationError,
  sendConflictError,
  sendNotFoundError,
  sendInternalServerError,
  sendSuccessResponse,
  sendCreatedResponse,
};
