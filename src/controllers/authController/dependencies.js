// Shared dependencies for all auth controller functions
const mongoose = require("mongoose");
const User = require("../../models/User");
const logger = require("../../utils/logger");
const { asyncHandler } = require("../../middleware/errorHandler");

module.exports = {
  mongoose,
  User,
  logger,
  asyncHandler,
};

