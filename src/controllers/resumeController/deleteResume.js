const { Resume, logger } = require("./dependencies");

/**
 * Delete resume by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteResume = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const resume = await Resume.findOne({
      _id: id,
      userId: req.user.id,
      isActive: true,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // Soft delete the resume
    await resume.softDelete();

    logger.info(
      `Resume deleted successfully for user ${req.user.id}: ${resume.resumeName}`
    );

    res.status(200).json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting resume:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting resume",
    });
  }
};

module.exports = deleteResume;

