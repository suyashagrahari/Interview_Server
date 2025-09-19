// Shared dependencies for all question controller functions
const QuestionPool = require("../../models/QuestionPool");
const Resume = require("../../models/Resume");
const Interview = require("../../models/Interview");
const chatGPTService = require("../../services/chatgptService");
const logger = require("../../utils/logger");

module.exports = {
  QuestionPool,
  Resume,
  Interview,
  chatGPTService,
  logger,
};



