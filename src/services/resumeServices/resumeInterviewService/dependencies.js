// Shared dependencies for all interview service functions
const ResumeInterview = require("../../../models/ResumeInterview");
const Resume = require("../../../models/Resume");
const User = require("../../../models/User");
const logger = require("../../../utils/logger");

module.exports = {
  ResumeInterview,
  Resume,
  User,
  logger,
};



