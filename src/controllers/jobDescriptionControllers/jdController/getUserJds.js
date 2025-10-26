const { JobDescription, logger } = require("./dependencies");

/**
 * Get all job descriptions for authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserJds = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get all JDs for the user
    const jds = await JobDescription.findByUserId(req.user.id);

    logger.info(`Retrieved ${jds.length} JDs for user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: "Job descriptions retrieved successfully",
      data: jds.map((jd) => ({
        id: jd._id,
        jdName: jd.jdName,
        originalFileName: jd.originalFileName,
        fileSize: jd.fileSize,
        fileType: jd.fileType,
        uploadDate: jd.uploadDate,
        textLength: jd.jdText.length,
      })),
    });
  } catch (error) {
    logger.error("Error retrieving job descriptions:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving job descriptions",
    });
  }
};

module.exports = getUserJds;
