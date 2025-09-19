// Main resume controller - exports all modular functions
const uploadResume = require("./uploadResume");
const getUserResumes = require("./getUserResumes");
const getResumeById = require("./getResumeById");
const deleteResume = require("./deleteResume");

module.exports = {
  uploadResume,
  getUserResumes,
  getResumeById,
  deleteResume,
};

