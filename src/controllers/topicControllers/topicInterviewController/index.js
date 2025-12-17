/**
 * Topic Interview Controller
 * Handles HTTP requests for topic-based interviews
 */

const startInterview = require("./startInterview");
const checkActiveInterview = require("./checkActiveInterview");

module.exports = {
  startInterview,
  checkActiveInterview,
};
