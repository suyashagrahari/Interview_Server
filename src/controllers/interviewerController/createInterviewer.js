const { Interviewer, logger } = require("./dependencies");

/**
 * Create new interviewer (admin only)
 */
const createInterviewer = async (req, res) => {
  try {
    const interviewerData = req.body;
    logger.info("Creating new interviewer:", interviewerData.name);

    const interviewer = new Interviewer(interviewerData);
    await interviewer.save();

    logger.info(`Interviewer created successfully: ${interviewer.name}`);

    res.status(201).json({
      success: true,
      message: "Interviewer created successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error creating interviewer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create interviewer",
      error: error.message,
    });
  }
};

module.exports = createInterviewer;

