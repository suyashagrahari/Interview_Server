// Shared dependencies for all question generation service functions
const QuestionPool = require("../../models/QuestionPool");
const chatGPTService = require("../chatgptService");
const logger = require("../../utils/logger");

module.exports = {
  QuestionPool,
  chatGPTService,
  logger,
};

