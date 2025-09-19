// Main interviewer controller - exports all modular functions
const getAllInterviewers = require("./getAllInterviewers");
const getInterviewerById = require("./getInterviewerById");
const createInterviewer = require("./createInterviewer");
const updateInterviewer = require("./updateInterviewer");
const deleteInterviewer = require("./deleteInterviewer");

module.exports = {
  getAllInterviewers,
  getInterviewerById,
  createInterviewer,
  updateInterviewer,
  deleteInterviewer,
};

