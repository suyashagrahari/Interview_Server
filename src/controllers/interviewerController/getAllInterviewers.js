const { Interviewer, logger } = require("./dependencies");

/**
 * Get all active interviewers
 */
const getAllInterviewers = async (req, res) => {
  try {
    logger.info("Fetching all active interviewers");

    const interviewers = await Interviewer.find({ isActive: true })
      .select("-__v")
      .sort({ rating: -1, createdAt: -1 });

    logger.info(`Found ${interviewers.length} active interviewers`);

    res.status(200).json({
      success: true,
      message: "Interviewers fetched successfully",
      data: interviewers,
      count: interviewers.length,
    });
  } catch (error) {
    logger.error("Error fetching interviewers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interviewers",
      error: error.message,
    });
  }
};

module.exports = getAllInterviewers;



