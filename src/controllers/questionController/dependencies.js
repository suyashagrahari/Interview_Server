// Shared dependencies for all question controller functions
const ResumeQuestionPool = require("../../models/QuestionPool");
const Resume = require("../../models/Resume");
const ResumeInterview = require("../../models/ResumeInterview");
const chatGPTService = require("../../services/chatgptService");
const logger = require("../../utils/logger");

module.exports = {
  ResumeQuestionPool,
  Resume,
  ResumeInterview,
  chatGPTService,
  logger,
};



