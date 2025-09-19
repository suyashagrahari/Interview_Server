const { asyncHandler } = require("./dependencies");

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: user,
  });
});

module.exports = getProfile;

