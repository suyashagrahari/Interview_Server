const { User, logger, asyncHandler } = require("./dependencies");

/**
 * @desc    Google OAuth authentication
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  try {
    // Decode the Google JWT token
    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const {
      sub: providerId,
      email,
      given_name: firstName,
      family_name: lastName,
      picture: avatar,
    } = payload;

    // Check if user exists
    let user = await User.findByProvider("google", providerId);

    if (!user) {
      // Check if user exists with same email
      user = await User.findByEmail(email);

      if (user) {
        // Link Google account to existing user
        user.provider = "google";
        user.providerId = providerId;
        user.avatar = avatar;
        user.isEmailVerified = true;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          firstName,
          lastName,
          email,
          avatar,
          provider: "google",
          providerId,
          isEmailVerified: true,
          password: null, // No password for OAuth users
        });
      }
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

    // Remove sensitive data and include profile
    const userResponse = completeUser;

    logger.info(`Google OAuth sign in: ${user.email}`);

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
      message: "Google authentication successful",
      data: {
        user: userResponse,
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Google OAuth error:", error);
    return res.status(400).json({
      success: false,
      message: "Google authentication failed",
    });
  }
});

module.exports = googleAuth;

