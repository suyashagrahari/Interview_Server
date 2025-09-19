// Shared dependencies for all question management service functions
const QuestionPool = require("../../models/QuestionPool");
const Interview = require("../../models/Interview");
const logger = require("../../utils/logger");

module.exports = {
  QuestionPool,
  Interview,
  logger,
};



