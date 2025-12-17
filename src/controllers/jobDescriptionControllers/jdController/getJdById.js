const { JobDescription, logger } = require("./dependencies");

/**
 * Get specific job description by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getJdById = async (req, res) => {
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

    logger.info(`Retrieved JD ${id} for user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: "Job description retrieved successfully",
      data: {
        id: jd._id,
        jdName: jd.jdName,
        jdText: jd.jdText,
        originalFileName: jd.originalFileName,
        fileSize: jd.fileSize,
        fileType: jd.fileType,
        uploadDate: jd.uploadDate,
        parsedSuccessfully: jd.parsedSuccessfully,
        parsingErrors: jd.parsingErrors,
      },
    });
  } catch (error) {
    logger.error("Error retrieving job description:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving job description",
    });
  }
};

module.exports = getJdById;
