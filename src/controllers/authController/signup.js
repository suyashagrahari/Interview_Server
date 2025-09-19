const { mongoose, User, logger, asyncHandler } = require("./dependencies");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if database is connected
  if (!mongoose.connection.readyState) {
    return res.status(503).json({
      success: false,
      message: "Database is not available. Please try again later.",
    });
  }

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email",
    });
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    provider: "email",
  });

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

  // Remove sensitive data and include profile
  const userResponse = completeUser;

  logger.info(`New user registered: ${user.email}`);

  // Set secure HTTP-only cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: userResponse,
      token: accessToken,
      refreshToken,
    },
  });
});

module.exports = signup;

