// Shared dependencies for all question generation service functions
const ResumeQuestionPool = require("../../../models/ResumeInterviewQuestionPool");
const chatGPTService = require("../../chatgptService");
const logger = require("../../../utils/logger");

module.exports = {
  ResumeQuestionPool,
  chatGPTService,
  logger,
};



