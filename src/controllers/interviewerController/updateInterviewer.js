const { Interviewer, logger } = require("./dependencies");

/**
 * Update interviewer (admin only)
 */
const updateInterviewer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.info(`Updating interviewer with ID: ${id}`);

    const interviewer = await Interviewer.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!interviewer) {
      logger.warn(`Interviewer not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Interviewer not found",
      });
    }

    logger.info(`Interviewer updated successfully: ${interviewer.name}`);

    res.status(200).json({
      success: true,
      message: "Interviewer updated successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error updating interviewer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update interviewer",
      error: error.message,
    });
  }
};

module.exports = updateInterviewer;



