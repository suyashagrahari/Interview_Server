const { Interviewer, logger } = require("./dependencies");

/**
 * Get interviewer by ID
 */
const getInterviewerById = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching interviewer with ID: ${id}`);

    const interviewer = await Interviewer.findOne({
      _id: id,
      isActive: true,
    }).select("-__v");

    if (!interviewer) {
      logger.warn(`Interviewer not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Interviewer not found",
      });
    }

    logger.info(`Found interviewer: ${interviewer.name}`);

    res.status(200).json({
      success: true,
      message: "Interviewer fetched successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error fetching interviewer by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interviewer",
      error: error.message,
    });
  }
};

module.exports = getInterviewerById;

