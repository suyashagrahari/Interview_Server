const { logger, asyncHandler } = require("./dependencies");

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const profileData = req.body;

  // Update profile fields
  if (profileData.jobTitle !== undefined)
    user.profile.jobTitle = profileData.jobTitle;
  if (profileData.phone !== undefined) user.profile.phone = profileData.phone;
  if (profileData.website !== undefined)
    user.profile.website = profileData.website;
  if (profileData.linkedin !== undefined)
    user.profile.linkedin = profileData.linkedin;
  if (profileData.country !== undefined)
    user.profile.country = profileData.country;
  if (profileData.state !== undefined) user.profile.state = profileData.state;
  if (profileData.city !== undefined) user.profile.city = profileData.city;
  if (profileData.showStateOnResume !== undefined)
    user.profile.showStateOnResume = profileData.showStateOnResume;
  if (profileData.showCountryOnResume !== undefined)
    user.profile.showCountryOnResume = profileData.showCountryOnResume;
  if (profileData.showCityOnResume !== undefined)
    user.profile.showCityOnResume = profileData.showCityOnResume;
  if (profileData.summary !== undefined)
    user.profile.summary = profileData.summary;
  if (profileData.experiences !== undefined)
    user.profile.experiences = profileData.experiences;
  if (profileData.projects !== undefined)
    user.profile.projects = profileData.projects;
  if (profileData.educations !== undefined)
    user.profile.educations = profileData.educations;
  if (profileData.skills !== undefined)
    user.profile.skills = profileData.skills;

  // Update basic user info if provided
  if (profileData.firstName !== undefined)
    user.firstName = profileData.firstName;
  if (profileData.lastName !== undefined) user.lastName = profileData.lastName;
  if (profileData.email !== undefined) user.email = profileData.email;
  if (profileData.avatar !== undefined) user.avatar = profileData.avatar;

  await user.save();

  // Remove sensitive data
  const userResponse = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatar: user.avatar,
    provider: user.provider,
    isEmailVerified: user.isEmailVerified,
    profile: user.profile,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  logger.info(`Profile updated for user: ${user.email}`);

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: userResponse,
  });
});

module.exports = updateProfile;

