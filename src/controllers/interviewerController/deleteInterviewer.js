const { Interviewer, logger } = require("./dependencies");

/**
 * Delete interviewer (admin only)
 */
const deleteInterviewer = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting interviewer with ID: ${id}`);

    const interviewer = await Interviewer.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!interviewer) {
      logger.warn(`Interviewer not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Interviewer not found",
      });
    }

    logger.info(`Interviewer deleted successfully: ${interviewer.name}`);

    res.status(200).json({
      success: true,
      message: "Interviewer deleted successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error deleting interviewer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete interviewer",
      error: error.message,
    });
  }
};

module.exports = deleteInterviewer;

