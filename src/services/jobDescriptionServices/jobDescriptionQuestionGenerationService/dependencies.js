// Shared dependencies for all question generation service functions
const JobDescriptionInterviewQuestionPool = require("../../../models/JobDescriptionInterviewQuestionPool");
const chatGPTService = require("../../chatgptService");
const logger = require("../../../utils/logger");

module.exports = {
  JobDescriptionInterviewQuestionPool,
  chatGPTService,
  logger,
};



