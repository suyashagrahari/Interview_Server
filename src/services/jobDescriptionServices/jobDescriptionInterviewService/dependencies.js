// Shared dependencies for all job description interview service functions
const JobDescriptionInterview = require("../../../models/JobDescriptionInterview");
const JobDescription = require("../../../models/JobDescription");
const User = require("../../../models/User");
const logger = require("../../../utils/logger");

module.exports = {
  JobDescriptionInterview,
  JobDescription,
  User,
  logger,
};

