// Shared dependencies for all question management service functions
const ResumeQuestionPool = require("../../models/QuestionPool");
const ResumeInterview = require("../../models/ResumeInterview");
const logger = require("../../utils/logger");

module.exports = {
  ResumeQuestionPool,
  ResumeInterview,
  logger,
};



