const { JobDescription, logger } = require("./dependencies");

/**
 * Delete job description by ID (soft delete)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteJd = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "JD ID is required",
      });
    }

    // Find the JD
    const jd = await JobDescription.findOne({
      _id: id,
      userId: req.user.id,
      isActive: true,
    });

    if (!jd) {
      return res.status(404).json({
        success: false,
        message: "Job description not found",
      });
    }

    // Soft delete the JD
    await jd.softDelete();

    logger.info(`Deleted JD ${id} for user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: "Job description deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting job description:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error while deleting job description",
    });
  }
};

module.exports = deleteJd;
