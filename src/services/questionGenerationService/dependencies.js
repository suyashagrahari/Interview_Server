// Shared dependencies for all question generation service functions
const ResumeQuestionPool = require("../../models/QuestionPool");
const chatGPTService = require("../chatgptService");
const logger = require("../../utils/logger");

module.exports = {
  ResumeQuestionPool,
  chatGPTService,
  logger,
};



