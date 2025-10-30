/**
 * Dependencies for Topic Interview Service
 */

const TopicInterview = require("../../../models/TopicInterview");
const Resume = require("../../../models/Resume");
const JobDescription = require("../../../models/JobDescription");
const logger = require("../../../utils/logger");

module.exports = {
  TopicInterview,
  Resume,
  JobDescription,
  logger,
};
