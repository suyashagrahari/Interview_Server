const { logger, asyncHandler } = require("./dependencies");

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAll = asyncHandler(async (req, res) => {
  const user = req.user;

  // Clear all refresh tokens
  user.refreshTokens = [];
  await user.save();

  logger.info(`User logged out from all devices: ${user.email}`);

  // Clear cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.json({
    success: true,
    message: "Logged out from all devices successfully",
  });
});

module.exports = logoutAll;

