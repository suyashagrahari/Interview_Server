// Shared dependencies for all resume controller functions
const Resume = require("../../models/Resume");
const { parseFile, validateFile } = require("../../utils/fileParser");
const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");

module.exports = {
  Resume,
  parseFile,
  validateFile,
  fs,
  path,
  logger,
};

