// Main job description interview controller - exports all modular functions
const startInterview = require("./startInterview");
const getUserInterviews = require("./getUserInterviews");
const getInterviewById = require("./getInterviewById");
const checkActiveInterview = require("./checkActiveInterview");
const endInterview = require("./endInterview");

module.exports = {
  startInterview,
  getUserInterviews,
  getInterviewById,
  checkActiveInterview,
  endInterview,
};
