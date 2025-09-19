const { User, logger, asyncHandler } = require("./dependencies");

/**
 * @desc    Authenticate user and get token
 * @route   POST /api/auth/signin
 * @access  Public
 */
const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findByEmail(email).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Account is deactivated",
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Add refresh token to user
  await user.addRefreshToken(refreshToken);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Fetch the complete user data again to ensure profile is populated
  const completeUser = await User.findById(user._id);

  // Log profile data for debugging
  logger.info(`User profile data:`, {
    userId: completeUser._id,
    hasProfile: !!completeUser.profile,
    experiences: completeUser.profile?.experiences?.length || 0,
    projects: completeUser.profile?.projects?.length || 0,
    educations: completeUser.profile?.educations?.length || 0,
    skills: completeUser.profile?.skills?.length || 0,
  });

  // Remove sensitive data and include profile
  const userResponse = completeUser;

  logger.info(`User signed in: ${user.email}`);

  // Set secure HTTP-only cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  res.json({
    success: true,
    message: "User signed in successfully",
    data: {
      user: userResponse,
      token: accessToken,
      refreshToken,
    },
  });
});

module.exports = signin;

