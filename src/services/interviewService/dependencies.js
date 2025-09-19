// Shared dependencies for all interview service functions
const Interview = require("../../models/Interview");
const Resume = require("../../models/Resume");
const User = require("../../models/User");
const logger = require("../../utils/logger");

module.exports = {
  Interview,
  Resume,
  User,
  logger,
};



